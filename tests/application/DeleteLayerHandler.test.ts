// @ts-nocheck
/**
 * Tests for DeleteLayerHandler (Phase 6 — US4: Delete Layer with Undo)
 *
 * Covers:
 * - Layer removal from layout
 * - Auto-deselect of deleted layer's decorations via SelectionStore.deselectByLayer()
 * - Undo record creation with full layer data (layer + decorations) for restore
 * - LayerDeletedEvent emission
 * - Backward compatibility without selectionStore / undoRedoManager
 */
import { DeleteLayerHandler } from '../../src/application/handlers/DeleteLayerHandler.js';
import { DeleteLayerCommand } from '../../src/application/commands/DeleteLayerCommand.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { Layer } from '../../src/domain/Layer.js';
import { Decoration } from '../../src/domain/Decoration.js';
import { SelectionStore } from '../../src/ui/stores/SelectionStore.js';
import { UndoRedoManager } from '../../src/application/UndoRedoManager.js';
import { UndoRecord } from '../../src/application/UndoRecord.js';

describe('DeleteLayerHandler', () => {
    let layout;
    let handler;
    let layer1;
    let layer2;

    beforeEach(() => {
        UndoRecord._resetIdCounter();
        layout = new HomesteadLayout('test-layout', 'Test Layout');
        layer1 = new Layer('layer-1', 'Layer 1');
        layer2 = new Layer('layer-2', 'Layer 2');
        layout.addLayer(layer1);
        layout.addLayer(layer2);

        handler = new DeleteLayerHandler(layout);
    });

    test('should remove layer from layout', () => {
        const command = new DeleteLayerCommand('layer-1');

        handler.execute(command);

        expect(layout.getLayer('layer-1')).toBeNull();
        expect(layout.getLayerCount()).toBe(1);
    });

    test('should emit LayerDeletedEvent', () => {
        const command = new DeleteLayerCommand('layer-1');

        handler.execute(command);

        const events = layout.getPendingEvents();
        expect(events).toHaveLength(1);
        expect(events[0].constructor.name).toBe('LayerDeletedEvent');
        expect(events[0].layerId).toBe('layer-1');
    });

    test('should throw error when layer does not exist', () => {
        const command = new DeleteLayerCommand('nonexistent');

        expect(() => handler.execute(command)).toThrow();
    });

    test('should switch active layer when deleting active layer', () => {
        layout.setActiveLayer('layer-1');
        const command = new DeleteLayerCommand('layer-1');

        handler.execute(command);

        expect(layout.activeLayerId).toBe('layer-2');
    });

    describe('auto-deselect on delete (US4)', () => {
        let selectionStore;
        let eventBus;
        let decoration1;
        let decoration2;

        beforeEach(() => {
            eventBus = { publish: vi.fn() };
            selectionStore = new SelectionStore(eventBus);

            decoration1 = new Decoration('dec-1', 'Decoration 1', { x: 10, y: 20 });
            decoration2 = new Decoration('dec-2', 'Decoration 2', { x: 30, y: 40 });
            layer1.addDecoration(decoration1);
            layer1.addDecoration(decoration2);

            handler = new DeleteLayerHandler(layout, selectionStore);
        });

        test('should deselect decorations in deleted layer', () => {
            selectionStore.selectAll(['dec-1', 'dec-2']);
            expect(selectionStore.getSelectionCount()).toBe(2);

            const command = new DeleteLayerCommand('layer-1');
            handler.execute(command);

            expect(selectionStore.isSelected('dec-1')).toBe(false);
            expect(selectionStore.isSelected('dec-2')).toBe(false);
            expect(selectionStore.getSelectionCount()).toBe(0);
        });

        test('should not deselect decorations from other layers', () => {
            const decoration3 = new Decoration('dec-3', 'Decoration 3', { x: 50, y: 60 });
            layer2.addDecoration(decoration3);

            selectionStore.selectAll(['dec-1', 'dec-2', 'dec-3']);
            expect(selectionStore.getSelectionCount()).toBe(3);

            const command = new DeleteLayerCommand('layer-1');
            handler.execute(command);

            expect(selectionStore.isSelected('dec-3')).toBe(true);
            expect(selectionStore.getSelectionCount()).toBe(1);
        });

        test('should work without selectionStore (backward compatibility)', () => {
            const handlerNoStore = new DeleteLayerHandler(layout);
            const command = new DeleteLayerCommand('layer-1');

            expect(() => handlerNoStore.execute(command)).not.toThrow();
        });
    });

    describe('undo record creation (US4)', () => {
        let undoRedoManager;
        let selectionStore;
        let eventBus;
        let decoration1;
        let decoration2;

        beforeEach(() => {
            eventBus = { publish: vi.fn() };
            selectionStore = new SelectionStore(eventBus);
            undoRedoManager = new UndoRedoManager();

            decoration1 = new Decoration('dec-1', 'Decoration 1', { x: 10, y: 20 });
            decoration2 = new Decoration('dec-2', 'Decoration 2', { x: 30, y: 40 });
            layer1.addDecoration(decoration1);
            layer1.addDecoration(decoration2);

            handler = new DeleteLayerHandler(layout, selectionStore, undoRedoManager);
        });

        test('should push UndoRecord to UndoRedoManager', () => {
            const command = new DeleteLayerCommand('layer-1');
            handler.execute(command);

            expect(undoRedoManager.canUndo()).toBe(true);
            const record = undoRedoManager.peekUndo();
            expect(record).toBeDefined();
            expect(record.commandType).toBe('DeleteLayerCommand');
        });

        test('should store full layer data in reverseData for undo', () => {
            const command = new DeleteLayerCommand('layer-1');
            handler.execute(command);

            const record = undoRedoManager.peekUndo();
            expect(record.reverseData.layerId).toBe('layer-1');
            expect(record.reverseData.layerName).toBe('Layer 1');
            expect(record.reverseData.isVisible).toBe(true);
            expect(record.reverseData.decorations).toHaveLength(2);
        });

        test('should store decoration DTOs in reverseData', () => {
            const command = new DeleteLayerCommand('layer-1');
            handler.execute(command);

            const record = undoRedoManager.peekUndo();
            const decorations = record.reverseData.decorations;

            expect(decorations[0].id).toBe('dec-1');
            expect(decorations[0].name).toBe('Decoration 1');
            expect(decorations[0].position).toBeDefined();
            expect(decorations[0].position.x).toBe(10);
            expect(decorations[0].position.y).toBe(20);

            expect(decorations[1].id).toBe('dec-2');
            expect(decorations[1].name).toBe('Decoration 2');
        });

        test('should store layerId in forwardData for redo', () => {
            const command = new DeleteLayerCommand('layer-1');
            handler.execute(command);

            const record = undoRedoManager.peekUndo();
            expect(record.forwardData.layerId).toBe('layer-1');
        });

        test('should have descriptive label', () => {
            const command = new DeleteLayerCommand('layer-1');
            handler.execute(command);

            const record = undoRedoManager.peekUndo();
            expect(record.label).toContain('Layer 1');
        });

        test('should work without undoRedoManager (backward compatibility)', () => {
            const handlerNoUndo = new DeleteLayerHandler(layout, selectionStore);
            const command = new DeleteLayerCommand('layer-1');

            expect(() => handlerNoUndo.execute(command)).not.toThrow();
            expect(layout.getLayer('layer-1')).toBeNull();
        });

        test('should capture wasActive state for undo', () => {
            layout.setActiveLayer('layer-1');
            const command = new DeleteLayerCommand('layer-1');
            handler.execute(command);

            const record = undoRedoManager.peekUndo();
            expect(record.reverseData.wasActive).toBe(true);
        });

        test('should store empty decorations array when layer has no decorations', () => {
            const command = new DeleteLayerCommand('layer-2');
            handler.execute(command);

            const record = undoRedoManager.peekUndo();
            expect(record.reverseData.decorations).toHaveLength(0);
            expect(record.reverseData.layerId).toBe('layer-2');
        });
    });
});
