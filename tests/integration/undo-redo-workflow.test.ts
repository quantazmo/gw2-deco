// @ts-nocheck
/**
 * Integration tests for undo/redo workflow
 * Covers: move-then-undo, delete-layer-then-undo, delete-decorations-then-undo,
 * redo after undo, redo-cleared-on-new-action, undo-when-empty
 */
import { UndoRedoManager } from '../../src/application/UndoRedoManager.js';
import { UndoRecord } from '../../src/application/UndoRecord.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { Layer } from '../../src/domain/Layer.js';
import { Decoration } from '../../src/domain/Decoration.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';
import { DeleteLayerHandler } from '../../src/application/handlers/DeleteLayerHandler.js';
import { SelectionStore } from '../../src/ui/stores/SelectionStore.js';
import { EventBus } from '../../src/ui/EventBus.js';

function createTestLayout() {
    const layout = new HomesteadLayout('t1', 'Test');

    const layer1 = new Layer('l1', 'Layer 1', true);
    layer1.addDecoration(new Decoration('d1', 'Oak Tree', new WorldCoordinate(100, 200, 0, 0)));
    layer1.addDecoration(new Decoration('d2', 'Stone Bench', new WorldCoordinate(300, 400, 0, 0)));

    const layer2 = new Layer('l2', 'Layer 2', true);
    layer2.addDecoration(new Decoration('d3', 'Lamp Post', new WorldCoordinate(500, 600, 0, 0)));
    layer2.addDecoration(new Decoration('d4', 'Rock', new WorldCoordinate(700, 800, 0, 0)));

    layout.addLayer(layer1);
    layout.addLayer(layer2);
    return layout;
}

describe('Undo/Redo Workflow Integration Tests', () => {
    let undoRedoManager;
    let layout;
    let selectionStore;
    let eventBus;

    beforeEach(() => {
        UndoRecord._resetIdCounter();
        undoRedoManager = new UndoRedoManager();
        layout = createTestLayout();
        eventBus = new EventBus();
        eventBus.debugEnabled = false;
        selectionStore = new SelectionStore(eventBus);
    });

    describe('move-then-undo', () => {
        test('moving decorations and undoing restores them to original layer', () => {
            // Move d1 from l1 to l2
            const result = layout.moveDecorations(['d1'], 'l2');
            expect(result.moved.get('d1')).toBe('l1');

            // Record the undo entry
            const sourceMapping = Object.fromEntries(result.moved);
            const record = new UndoRecord({
                label: 'Move 1 decoration to Layer 2',
                commandType: 'MoveDecorationsCommand',
                forwardData: { decorationIds: ['d1'], targetLayerId: 'l2' },
                reverseData: { sourceMapping }
            });
            undoRedoManager.push(record);

            // Verify d1 is in l2
            expect(layout.getLayer('l2').getDecoration('d1')).toBeTruthy();
            expect(layout.getLayer('l1').getDecoration('d1')).toBeNull();

            // Undo: move d1 back to l1
            const undoneRecord = undoRedoManager.undo();
            expect(undoneRecord).not.toBeNull();
            expect(undoneRecord.commandType).toBe('MoveDecorationsCommand');

            // Execute reverse: move each decoration back to source layer
            for (const [decId, sourceLayerId] of Object.entries(undoneRecord.reverseData.sourceMapping)) {
                layout.moveDecorations([decId], sourceLayerId);
            }

            // Verify d1 is back in l1
            expect(layout.getLayer('l1').getDecoration('d1')).toBeTruthy();
            expect(layout.getLayer('l2').getDecoration('d1')).toBeNull();
        });
    });

    describe('delete-layer-then-undo', () => {
        test('deleting a layer and undoing restores the layer with its decorations', () => {
            const handler = new DeleteLayerHandler(layout, selectionStore, undoRedoManager);

            // Capture decoration count before
            const layer1DecsBefore = layout.getLayer('l1').getDecorationCount();
            expect(layer1DecsBefore).toBe(2);

            // Delete layer l1
            handler.execute({ layerId: 'l1' });

            // Verify layer is gone
            expect(layout.getLayer('l1')).toBeNull();
            expect(layout.getLayerCount()).toBe(1);
            expect(undoRedoManager.canUndo()).toBe(true);

            // Undo
            const record = undoRedoManager.undo();
            expect(record.commandType).toBe('DeleteLayerCommand');

            // Re-add the layer from reverseData
            const { layerId, layerName, isVisible, decorations } = record.reverseData;
            const restoredLayer = new Layer(layerId, layerName, isVisible);
            for (const dto of decorations) {
                const position = new WorldCoordinate(
                    dto.position.x, dto.position.y,
                    dto.position.z || 0, dto.position.rotation || 0
                );
                const decoration = new Decoration(dto.id, dto.name, position, dto.rotation, dto.scale);
                restoredLayer.addDecoration(decoration);
            }
            layout.addLayer(restoredLayer);

            // Verify restoration
            expect(layout.getLayer('l1')).toBeTruthy();
            expect(layout.getLayerCount()).toBe(2);
            expect(layout.getLayer('l1').getDecorationCount()).toBe(2);
        });
    });

    describe('delete-decorations-then-undo', () => {
        test('deleting decorations and undoing restores them to their original layers', () => {
            // Remove d1 and d3 (from different layers)
            const result = layout.removeDecorations(['d1', 'd3']);
            expect(result.removed.size).toBe(2);

            // Create undo record with removed decoration data
            const removedData = {};
            for (const [decId, { sourceLayerId, decoration }] of result.removed) {
                removedData[decId] = {
                    sourceLayerId,
                    decorationDTO: decoration.toDTO()
                };
            }

            const record = new UndoRecord({
                label: 'Delete 2 decorations',
                commandType: 'DeleteDecorationsCommand',
                forwardData: { decorationIds: ['d1', 'd3'] },
                reverseData: { removedData }
            });
            undoRedoManager.push(record);

            // Verify decorations are gone
            expect(layout.getLayer('l1').getDecoration('d1')).toBeNull();
            expect(layout.getLayer('l2').getDecoration('d3')).toBeNull();

            // Undo
            const undoneRecord = undoRedoManager.undo();
            for (const [decId, info] of Object.entries(undoneRecord.reverseData.removedData)) {
                const dto = info.decorationDTO;
                const position = new WorldCoordinate(
                    dto.position.x, dto.position.y,
                    dto.position.z || 0, dto.position.rotation || 0
                );
                const decoration = new Decoration(dto.id, dto.name, position, dto.rotation, dto.scale);
                const targetLayer = layout.getLayer(info.sourceLayerId);
                targetLayer.addDecoration(decoration);
            }

            // Verify decorations are restored
            expect(layout.getLayer('l1').getDecoration('d1')).toBeTruthy();
            expect(layout.getLayer('l2').getDecoration('d3')).toBeTruthy();
        });
    });

    describe('redo after undo', () => {
        test('redo re-applies the forward action after undo', () => {
            // Move d1 to l2
            layout.moveDecorations(['d1'], 'l2');
            const record = new UndoRecord({
                label: 'Move d1 to Layer 2',
                commandType: 'MoveDecorationsCommand',
                forwardData: { decorationIds: ['d1'], targetLayerId: 'l2' },
                reverseData: { sourceMapping: { d1: 'l1' } }
            });
            undoRedoManager.push(record);

            // Undo: move back
            const undoneRecord = undoRedoManager.undo();
            for (const [decId, sourceLayerId] of Object.entries(undoneRecord.reverseData.sourceMapping)) {
                layout.moveDecorations([decId], sourceLayerId);
            }
            expect(layout.getLayer('l1').getDecoration('d1')).toBeTruthy();

            // Redo: re-apply forward
            expect(undoRedoManager.canRedo()).toBe(true);
            const redoneRecord = undoRedoManager.redo();
            layout.moveDecorations(
                redoneRecord.forwardData.decorationIds,
                redoneRecord.forwardData.targetLayerId
            );

            // Verify d1 is back in l2
            expect(layout.getLayer('l2').getDecoration('d1')).toBeTruthy();
            expect(layout.getLayer('l1').getDecoration('d1')).toBeNull();
        });
    });

    describe('redo-cleared-on-new-action', () => {
        test('new action clears redo stack', () => {
            const record1 = new UndoRecord({
                label: 'Action 1',
                commandType: 'TestCommand',
                forwardData: { id: 1 },
                reverseData: { id: 1 }
            });
            undoRedoManager.push(record1);
            undoRedoManager.undo();
            expect(undoRedoManager.canRedo()).toBe(true);

            // Push new action
            const record2 = new UndoRecord({
                label: 'Action 2',
                commandType: 'TestCommand',
                forwardData: { id: 2 },
                reverseData: { id: 2 }
            });
            undoRedoManager.push(record2);

            // Redo should be cleared
            expect(undoRedoManager.canRedo()).toBe(false);
        });
    });

    describe('undo-when-empty', () => {
        test('undo on empty stack returns null', () => {
            expect(undoRedoManager.undo()).toBeNull();
            expect(undoRedoManager.canUndo()).toBe(false);
        });

        test('redo on empty stack returns null', () => {
            expect(undoRedoManager.redo()).toBeNull();
            expect(undoRedoManager.canRedo()).toBe(false);
        });
    });
});
