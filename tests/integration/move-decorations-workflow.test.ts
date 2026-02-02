// @ts-nocheck
/**
 * Integration tests for move-decorations workflow
 * Covers: move from list to layer, move from map to layer, context menu move,
 * Ctrl+N shortcut move, undo after move
 */
import { SelectionStore } from '../../src/ui/stores/SelectionStore.js';
import { EventBus } from '../../src/ui/EventBus.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { Layer } from '../../src/domain/Layer.js';
import { Decoration } from '../../src/domain/Decoration.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';
import { UndoRedoManager } from '../../src/application/UndoRedoManager.js';
import { UndoRecord } from '../../src/application/UndoRecord.js';
import { MoveDecorationsHandler } from '../../src/application/handlers/MoveDecorationsHandler.js';

function createTestLayout() {
    const layout = new HomesteadLayout('t1', 'Test');
    const layer1 = new Layer('l1', 'Layer 1', true);
    layer1.addDecoration(new Decoration('d1', 'Oak Tree', new WorldCoordinate(100, 200)));
    layer1.addDecoration(new Decoration('d2', 'Stone Bench', new WorldCoordinate(300, 400)));

    const layer2 = new Layer('l2', 'Layer 2', true);
    layer2.addDecoration(new Decoration('d3', 'Lamp Post', new WorldCoordinate(500, 600)));

    const layer3 = new Layer('l3', 'Layer 3', true);

    layout.addLayer(layer1);
    layout.addLayer(layer2);
    layout.addLayer(layer3);
    return layout;
}

describe('Move Decorations Workflow Integration Tests', () => {
    let layout;
    let undoRedoManager;
    let handler;
    let selectionStore;
    let eventBus;

    beforeEach(() => {
        UndoRecord._resetIdCounter();
        eventBus = new EventBus();
        eventBus.debugEnabled = false;
        selectionStore = new SelectionStore(eventBus);
        layout = createTestLayout();
        undoRedoManager = new UndoRedoManager();
        handler = new MoveDecorationsHandler(layout, undoRedoManager);
    });

    describe('drag from decoration list to layer', () => {
        test('moving selected decorations to another layer succeeds', () => {
            // Select d1 and d2 from Layer 1
            selectionStore.selectAll(['d1', 'd2']);
            const selectedIds = selectionStore.getSelectedIds();

            // Execute move (simulating what a drop handler would do)
            const result = handler.execute({
                decorationIds: selectedIds,
                targetLayerId: 'l2'
            });

            expect(result.moved).toBe(2);
            expect(layout.getLayer('l1').getDecoration('d1')).toBeNull();
            expect(layout.getLayer('l1').getDecoration('d2')).toBeNull();
            expect(layout.getLayer('l2').getDecoration('d1')).toBeTruthy();
            expect(layout.getLayer('l2').getDecoration('d2')).toBeTruthy();
        });

        test('drop on same layer is a no-op', () => {
            selectionStore.selectAll(['d1']);
            const result = handler.execute({
                decorationIds: ['d1'],
                targetLayerId: 'l1'
            });

            expect(result.moved).toBe(0);
            expect(result.skipped).toBe(1);
            expect(layout.getLayer('l1').getDecoration('d1')).toBeTruthy();
        });
    });

    describe('context menu move', () => {
        test('move via context menu moves decoration to target layer', () => {
            const result = handler.execute({
                decorationIds: ['d3'],
                targetLayerId: 'l1'
            });

            expect(result.moved).toBe(1);
            expect(layout.getLayer('l2').getDecoration('d3')).toBeNull();
            expect(layout.getLayer('l1').getDecoration('d3')).toBeTruthy();
        });
    });

    describe('Ctrl+N shortcut move', () => {
        test('move to Nth layer by index', () => {
            // Simulate Ctrl+3 → move to layer 3 (l3)
            selectionStore.selectAll(['d1', 'd2']);
            const layers = layout.getAllLayers();
            const targetLayer = layers[2]; // 0-indexed → layer 3

            const result = handler.execute({
                decorationIds: selectionStore.getSelectedIds(),
                targetLayerId: targetLayer.id
            });

            expect(result.moved).toBe(2);
            expect(layout.getLayer('l3').getDecoration('d1')).toBeTruthy();
            expect(layout.getLayer('l3').getDecoration('d2')).toBeTruthy();
        });
    });

    describe('undo after move', () => {
        test('undo restores decorations to original layers', () => {
            // Move d1 from l1 → l2
            handler.execute({
                decorationIds: ['d1'],
                targetLayerId: 'l2'
            });

            expect(layout.getLayer('l2').getDecoration('d1')).toBeTruthy();
            expect(layout.getLayer('l1').getDecoration('d1')).toBeNull();

            // Undo
            const record = undoRedoManager.undo();
            expect(record).not.toBeNull();
            expect(record.commandType).toBe('MoveDecorationsCommand');

            // Execute reverse: move each decoration back to its source
            const { sourceMapping } = record.reverseData;
            for (const [decorationId, sourceLayerId] of Object.entries(sourceMapping)) {
                layout.moveDecorations([decorationId], sourceLayerId);
            }

            expect(layout.getLayer('l1').getDecoration('d1')).toBeTruthy();
            expect(layout.getLayer('l2').getDecoration('d1')).toBeNull();
        });

        test('redo re-applies the move', () => {
            handler.execute({
                decorationIds: ['d1'],
                targetLayerId: 'l2'
            });

            // Undo
            const undoRecord = undoRedoManager.undo();
            const { sourceMapping } = undoRecord.reverseData;
            for (const [decorationId, sourceLayerId] of Object.entries(sourceMapping)) {
                layout.moveDecorations([decorationId], sourceLayerId);
            }

            // Redo
            const redoRecord = undoRedoManager.redo();
            expect(redoRecord).not.toBeNull();
            const { decorationIds, targetLayerId } = redoRecord.forwardData;
            layout.moveDecorations(decorationIds, targetLayerId);

            expect(layout.getLayer('l2').getDecoration('d1')).toBeTruthy();
            expect(layout.getLayer('l1').getDecoration('d1')).toBeNull();
        });

        test('multi-source undo restores decorations to their original source layers', () => {
            // d1 in l1, d3 in l2 → move both to l3
            handler.execute({
                decorationIds: ['d1', 'd3'],
                targetLayerId: 'l3'
            });

            expect(layout.getLayer('l3').getDecoration('d1')).toBeTruthy();
            expect(layout.getLayer('l3').getDecoration('d3')).toBeTruthy();

            // Undo
            const record = undoRedoManager.undo();
            const { sourceMapping } = record.reverseData;
            for (const [decorationId, sourceLayerId] of Object.entries(sourceMapping)) {
                layout.moveDecorations([decorationId], sourceLayerId);
            }

            // Each decoration returns to its original layer
            expect(layout.getLayer('l1').getDecoration('d1')).toBeTruthy();
            expect(layout.getLayer('l2').getDecoration('d3')).toBeTruthy();
            expect(layout.getLayer('l3').getDecoration('d1')).toBeNull();
            expect(layout.getLayer('l3').getDecoration('d3')).toBeNull();
        });
    });
});
