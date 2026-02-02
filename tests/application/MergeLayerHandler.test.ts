// @ts-nocheck
/**
 * Tests for MergeLayerHandler
 *
 * Covers:
 * - All decorations moved from source to target
 * - Source layer deleted after merge
 * - Target layer retains existing decorations
 * - Empty source layer merge (no decorations)
 * - Auto-deselect of source layer's decorations via SelectionStore
 * - Undo record creation with full reverse data
 * - Error cases: missing IDs, same layer, non-existent layers
 * - Backward compatibility without selectionStore / undoRedoManager
 */
import { MergeLayerHandler } from '../../src/application/handlers/MergeLayerHandler.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { Layer } from '../../src/domain/Layer.js';
import { Decoration } from '../../src/domain/Decoration.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';
import { SelectionStore } from '../../src/ui/stores/SelectionStore.js';
import { UndoRedoManager } from '../../src/application/UndoRedoManager.js';
import { UndoRecord } from '../../src/application/UndoRecord.js';

describe('MergeLayerHandler', () => {
    let layout;
    let handler;
    let layer1;
    let layer2;
    let deco1;
    let deco2;
    let deco3;

    beforeEach(() => {
        UndoRecord._resetIdCounter();
        layout = new HomesteadLayout('test-layout', 'Test Layout');
        layer1 = new Layer('layer-1', 'Layer 1');
        layer2 = new Layer('layer-2', 'Layer 2');

        deco1 = new Decoration('deco-1', 'Decoration 1', new WorldCoordinate(10, 20));
        deco2 = new Decoration('deco-2', 'Decoration 2', new WorldCoordinate(30, 40));
        deco3 = new Decoration('deco-3', 'Decoration 3', new WorldCoordinate(50, 60));

        layer1.addDecoration(deco1);
        layer1.addDecoration(deco2);
        layer2.addDecoration(deco3);

        layout.addLayer(layer1);
        layout.addLayer(layer2);

        handler = new MergeLayerHandler(layout);
    });

    describe('basic merge', () => {
        test('moves all decorations from source to target', () => {
            handler.execute({ sourceLayerId: 'layer-1', targetLayerId: 'layer-2' });

            expect(layer2.getDecoration('deco-1')).toBeTruthy();
            expect(layer2.getDecoration('deco-2')).toBeTruthy();
        });

        test('target layer retains its existing decorations', () => {
            handler.execute({ sourceLayerId: 'layer-1', targetLayerId: 'layer-2' });

            expect(layer2.getDecoration('deco-3')).toBeTruthy();
        });

        test('deletes the source layer from the layout', () => {
            handler.execute({ sourceLayerId: 'layer-1', targetLayerId: 'layer-2' });

            expect(layout.getLayer('layer-1')).toBeNull();
            expect(layout.getLayerCount()).toBe(1);
        });

        test('target layer has all decorations after merge', () => {
            handler.execute({ sourceLayerId: 'layer-1', targetLayerId: 'layer-2' });

            expect(layer2.getAllDecorations()).toHaveLength(3);
        });
    });

    describe('empty source layer', () => {
        test('deletes source layer even when it has no decorations', () => {
            const emptyLayer = new Layer('layer-empty', 'Empty Layer');
            layout.addLayer(emptyLayer);

            handler.execute({ sourceLayerId: 'layer-empty', targetLayerId: 'layer-2' });

            expect(layout.getLayer('layer-empty')).toBeNull();
            expect(layer2.getAllDecorations()).toHaveLength(1); // only deco-3
        });
    });

    describe('error cases', () => {
        test('throws when sourceLayerId is missing', () => {
            expect(() => handler.execute({ sourceLayerId: '', targetLayerId: 'layer-2' }))
                .toThrow('sourceLayerId and targetLayerId are required');
        });

        test('throws when targetLayerId is missing', () => {
            expect(() => handler.execute({ sourceLayerId: 'layer-1', targetLayerId: '' }))
                .toThrow('sourceLayerId and targetLayerId are required');
        });

        test('throws when source and target are the same layer', () => {
            expect(() => handler.execute({ sourceLayerId: 'layer-1', targetLayerId: 'layer-1' }))
                .toThrow('source and target layers must be different');
        });

        test('throws when source layer does not exist', () => {
            expect(() => handler.execute({ sourceLayerId: 'nonexistent', targetLayerId: 'layer-2' }))
                .toThrow('source layer "nonexistent" not found');
        });

        test('throws when target layer does not exist', () => {
            expect(() => handler.execute({ sourceLayerId: 'layer-1', targetLayerId: 'nonexistent' }))
                .toThrow('target layer "nonexistent" not found');
        });
    });

    describe('auto-deselect via SelectionStore', () => {
        let selectionStore;

        beforeEach(() => {
            const eventBus = { publish: vi.fn() };
            selectionStore = new SelectionStore(eventBus);
            handler = new MergeLayerHandler(layout, selectionStore);
        });

        test('deselects decorations from the source layer', () => {
            selectionStore.selectAll(['deco-1', 'deco-2', 'deco-3']);
            expect(selectionStore.getSelectionCount()).toBe(3);

            handler.execute({ sourceLayerId: 'layer-1', targetLayerId: 'layer-2' });

            expect(selectionStore.isSelected('deco-1')).toBe(false);
            expect(selectionStore.isSelected('deco-2')).toBe(false);
        });

        test('keeps decorations from the target layer selected', () => {
            selectionStore.selectAll(['deco-1', 'deco-2', 'deco-3']);

            handler.execute({ sourceLayerId: 'layer-1', targetLayerId: 'layer-2' });

            expect(selectionStore.isSelected('deco-3')).toBe(true);
        });

        test('does not deselect when source layer has no decorations', () => {
            const emptyLayer = new Layer('layer-empty', 'Empty Layer');
            layout.addLayer(emptyLayer);
            selectionStore.selectAll(['deco-3']);

            handler = new MergeLayerHandler(layout, selectionStore);
            handler.execute({ sourceLayerId: 'layer-empty', targetLayerId: 'layer-2' });

            expect(selectionStore.isSelected('deco-3')).toBe(true);
        });
    });

    describe('with UndoRedoManager', () => {
        let undoRedoManager;

        beforeEach(() => {
            undoRedoManager = new UndoRedoManager();
            handler = new MergeLayerHandler(layout, null, undoRedoManager);
        });

        test('pushes an undo record', () => {
            handler.execute({ sourceLayerId: 'layer-1', targetLayerId: 'layer-2' });

            expect(undoRedoManager.canUndo()).toBe(true);
        });

        test('undo record has correct commandType', () => {
            handler.execute({ sourceLayerId: 'layer-1', targetLayerId: 'layer-2' });

            const record = undoRedoManager.peekUndo();
            expect(record.commandType).toBe('MergeLayerCommand');
        });

        test('undo record label includes source and target layer names', () => {
            handler.execute({ sourceLayerId: 'layer-1', targetLayerId: 'layer-2' });

            const record = undoRedoManager.peekUndo();
            expect(record.label).toContain('Layer 1');
            expect(record.label).toContain('Layer 2');
        });

        test('undo record forwardData contains source and target IDs', () => {
            handler.execute({ sourceLayerId: 'layer-1', targetLayerId: 'layer-2' });

            const record = undoRedoManager.peekUndo();
            expect(record.forwardData.sourceLayerId).toBe('layer-1');
            expect(record.forwardData.targetLayerId).toBe('layer-2');
        });

        test('undo record reverseData contains source layer name', () => {
            handler.execute({ sourceLayerId: 'layer-1', targetLayerId: 'layer-2' });

            const record = undoRedoManager.peekUndo();
            expect(record.reverseData.sourceLayerName).toBe('Layer 1');
        });

        test('undo record reverseData contains decoration DTOs', () => {
            handler.execute({ sourceLayerId: 'layer-1', targetLayerId: 'layer-2' });

            const record = undoRedoManager.peekUndo();
            expect(record.reverseData.decorationDTOs).toHaveLength(2);
            const ids = record.reverseData.decorationDTOs.map(d => d.id);
            expect(ids).toContain('deco-1');
            expect(ids).toContain('deco-2');
        });

        test('undo record reverseData records wasActive=true when source was active', () => {
            layout.setActiveLayer('layer-1');

            handler.execute({ sourceLayerId: 'layer-1', targetLayerId: 'layer-2' });

            const record = undoRedoManager.peekUndo();
            expect(record.reverseData.wasActive).toBe(true);
        });

        test('undo record reverseData records wasActive=false when source was not active', () => {
            layout.setActiveLayer('layer-2');

            handler.execute({ sourceLayerId: 'layer-1', targetLayerId: 'layer-2' });

            const record = undoRedoManager.peekUndo();
            expect(record.reverseData.wasActive).toBe(false);
        });

        test('does not push undo record when source layer has no decorations (edge case: still pushes for layer deletion)', () => {
            const emptyLayer = new Layer('layer-empty', 'Empty Layer');
            layout.addLayer(emptyLayer);
            handler = new MergeLayerHandler(layout, null, undoRedoManager);

            handler.execute({ sourceLayerId: 'layer-empty', targetLayerId: 'layer-2' });

            // Record is still pushed because the layer deletion needs to be undoable
            expect(undoRedoManager.canUndo()).toBe(true);
            const record = undoRedoManager.peekUndo();
            expect(record.reverseData.decorationDTOs).toHaveLength(0);
        });
    });

    describe('backward compatibility', () => {
        test('works without selectionStore', () => {
            handler = new MergeLayerHandler(layout, null);
            expect(() => handler.execute({ sourceLayerId: 'layer-1', targetLayerId: 'layer-2' })).not.toThrow();
        });

        test('works without undoRedoManager', () => {
            handler = new MergeLayerHandler(layout);
            expect(() => handler.execute({ sourceLayerId: 'layer-1', targetLayerId: 'layer-2' })).not.toThrow();
        });
    });
});
