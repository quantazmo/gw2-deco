// @ts-nocheck
/**
 * Tests for DeleteDecorationsHandler (Phase 10 — US7: Delete Selected Decorations)
 *
 * Covers:
 * - Bulk delete across layers
 * - Undo record with full decoration data for restore
 * - No-op on empty selection
 * - DecorationsDeletedEvent emission
 * - Selection auto-clear after delete
 * - Backward compatibility without undoRedoManager
 * - Skip missing IDs gracefully
 */
import { DeleteDecorationsHandler } from '../../src/application/handlers/DeleteDecorationsHandler.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { Layer } from '../../src/domain/Layer.js';
import { Decoration } from '../../src/domain/Decoration.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';
import { UndoRedoManager } from '../../src/application/UndoRedoManager.js';
import { UndoRecord } from '../../src/application/UndoRecord.js';

describe('DeleteDecorationsHandler', () => {
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

        handler = new DeleteDecorationsHandler(layout);
    });

    test('should delete decorations from their layers', () => {
        const result = handler.execute({
            decorationIds: ['deco-1', 'deco-3']
        });

        expect(result.success).toBe(true);
        expect(result.deleted).toBe(2);

        // Verify decorations removed from domain
        expect(layer1.getDecoration('deco-1')).toBeNull();
        expect(layer2.getDecoration('deco-3')).toBeNull();
        // deco-2 should still be in layer1
        expect(layer1.getDecoration('deco-2')).toBeTruthy();
    });

    test('should return no-op on empty selection', () => {
        const result = handler.execute({
            decorationIds: []
        });

        expect(result.success).toBe(true);
        expect(result.deleted).toBe(0);
    });

    test('should return no-op on null/undefined decorationIds', () => {
        const result = handler.execute({
            decorationIds: null
        });

        expect(result.success).toBe(true);
        expect(result.deleted).toBe(0);
    });

    test('should skip missing IDs gracefully', () => {
        const result = handler.execute({
            decorationIds: ['nonexistent', 'deco-1']
        });

        expect(result.success).toBe(true);
        expect(result.deleted).toBe(1);

        expect(layer1.getDecoration('deco-1')).toBeNull();
    });

    test('should emit DecorationsDeletedEvent', () => {
        handler.execute({
            decorationIds: ['deco-1', 'deco-3']
        });

        const events = layout.pendingEvents;
        expect(events).toHaveLength(1);
        expect(events[0].constructor.name).toBe('DecorationsDeletedEvent');
        expect(events[0].decorationIds).toEqual(['deco-1', 'deco-3']);
        expect(events[0].sourceMapping.get('deco-1')).toBe('layer-1');
        expect(events[0].sourceMapping.get('deco-3')).toBe('layer-2');
    });

    test('should not emit event when no decorations deleted', () => {
        handler.execute({
            decorationIds: ['nonexistent']
        });

        expect(layout.pendingEvents).toHaveLength(0);
    });

    describe('with SelectionStore', () => {
        let selectionStore;

        beforeEach(() => {
            selectionStore = {
                clearSelection: vi.fn()
            };
            handler = new DeleteDecorationsHandler(layout, selectionStore);
        });

        test('should clear selection after deleting decorations', () => {
            handler.execute({
                decorationIds: ['deco-1']
            });

            expect(selectionStore.clearSelection).toHaveBeenCalled();
        });

        test('should not clear selection when no decorations deleted', () => {
            handler.execute({
                decorationIds: ['nonexistent']
            });

            expect(selectionStore.clearSelection).not.toHaveBeenCalled();
        });
    });

    describe('with UndoRedoManager', () => {
        let undoRedoManager;

        beforeEach(() => {
            undoRedoManager = new UndoRedoManager();
            handler = new DeleteDecorationsHandler(layout, null, undoRedoManager);
        });

        test('should produce undo record with full decoration data for restore', () => {
            handler.execute({
                decorationIds: ['deco-1', 'deco-3']
            });

            expect(undoRedoManager.canUndo()).toBe(true);
            const record = undoRedoManager.peekUndo();
            expect(record.commandType).toBe('DeleteDecorationsCommand');
            expect(record.label).toBe('Delete 2 decorations');
            expect(record.forwardData.decorationIds).toEqual(['deco-1', 'deco-3']);

            // Verify reverseData contains full decoration data for restore
            const { removedData } = record.reverseData;
            expect(removedData['deco-1'].sourceLayerId).toBe('layer-1');
            expect(removedData['deco-1'].decoration.id).toBe('deco-1');
            expect(removedData['deco-1'].decoration.name).toBe('Decoration 1');
            expect(removedData['deco-3'].sourceLayerId).toBe('layer-2');
            expect(removedData['deco-3'].decoration.id).toBe('deco-3');
        });

        test('should store original indices in undo record for order preservation', () => {
            handler.execute({
                decorationIds: ['deco-2']
            });

            const record = undoRedoManager.peekUndo();
            const removedData = record.reverseData.removedData;
            // deco-2 was at index 1 in layer-1 (after deco-1)
            expect(removedData['deco-2'].originalIndex).toBe(1);
        });

        test('should not push undo record when no decorations deleted', () => {
            handler.execute({
                decorationIds: ['nonexistent']
            });

            expect(undoRedoManager.canUndo()).toBe(false);
        });

        test('undo record label uses singular for 1 decoration', () => {
            handler.execute({
                decorationIds: ['deco-1']
            });

            const record = undoRedoManager.peekUndo();
            expect(record.label).toBe('Delete 1 decoration');
            expect(record.label).not.toContain('1 decorations');
        });
    });

    describe('with SelectionStore and UndoRedoManager', () => {
        let selectionStore;
        let undoRedoManager;

        beforeEach(() => {
            selectionStore = {
                clearSelection: vi.fn()
            };
            undoRedoManager = new UndoRedoManager();
            handler = new DeleteDecorationsHandler(layout, selectionStore, undoRedoManager);
        });

        test('should produce undo record and clear selection', () => {
            handler.execute({
                decorationIds: ['deco-1', 'deco-2']
            });

            expect(undoRedoManager.canUndo()).toBe(true);
            expect(selectionStore.clearSelection).toHaveBeenCalled();

            const record = undoRedoManager.peekUndo();
            expect(record.forwardData.decorationIds).toEqual(['deco-1', 'deco-2']);
        });
    });
});
