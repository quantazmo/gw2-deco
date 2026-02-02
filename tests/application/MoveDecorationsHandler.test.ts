// @ts-nocheck
/**
 * Tests for MoveDecorationsHandler (Phase 9 — US6: Move Decorations)
 *
 * Covers:
 * - Move across layers
 * - Skip same-layer no-op
 * - Skip missing IDs
 * - Undo record with source mapping
 * - Multi-source-layer move
 * - DecorationsMovedEvent emission
 * - Backward compatibility without undoRedoManager
 */
import { MoveDecorationsHandler } from '../../src/application/handlers/MoveDecorationsHandler.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { Layer } from '../../src/domain/Layer.js';
import { Decoration } from '../../src/domain/Decoration.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';
import { UndoRedoManager } from '../../src/application/UndoRedoManager.js';
import { UndoRecord } from '../../src/application/UndoRecord.js';

describe('MoveDecorationsHandler', () => {
    let layout;
    let handler;
    let layer1;
    let layer2;
    let layer3;
    let deco1;
    let deco2;
    let deco3;

    beforeEach(() => {
        UndoRecord._resetIdCounter();
        layout = new HomesteadLayout('test-layout', 'Test Layout');
        layer1 = new Layer('layer-1', 'Layer 1');
        layer2 = new Layer('layer-2', 'Layer 2');
        layer3 = new Layer('layer-3', 'Layer 3');

        deco1 = new Decoration('deco-1', 'Decoration 1', new WorldCoordinate(10, 20));
        deco2 = new Decoration('deco-2', 'Decoration 2', new WorldCoordinate(30, 40));
        deco3 = new Decoration('deco-3', 'Decoration 3', new WorldCoordinate(50, 60));

        layer1.addDecoration(deco1);
        layer1.addDecoration(deco2);
        layer2.addDecoration(deco3);

        layout.addLayer(layer1);
        layout.addLayer(layer2);
        layout.addLayer(layer3);

        handler = new MoveDecorationsHandler(layout);
    });

    test('should move decorations across layers', () => {
        const result = handler.execute({
            decorationIds: ['deco-1', 'deco-2'],
            targetLayerId: 'layer-2'
        });

        expect(result.success).toBe(true);
        expect(result.moved).toBe(2);
        expect(result.skipped).toBe(0);
        expect(result.sourceMapping).toEqual({ 'deco-1': 'layer-1', 'deco-2': 'layer-1' });

        // Verify decorations moved in domain
        expect(layer1.getDecoration('deco-1')).toBeNull();
        expect(layer1.getDecoration('deco-2')).toBeNull();
        expect(layer2.getDecoration('deco-1')).toBeTruthy();
        expect(layer2.getDecoration('deco-2')).toBeTruthy();
    });

    test('should skip same-layer no-op', () => {
        const result = handler.execute({
            decorationIds: ['deco-1'],
            targetLayerId: 'layer-1'
        });

        expect(result.success).toBe(true);
        expect(result.moved).toBe(0);
        expect(result.skipped).toBe(1);

        // Decoration still in layer-1
        expect(layer1.getDecoration('deco-1')).toBeTruthy();
    });

    test('should skip missing IDs', () => {
        const result = handler.execute({
            decorationIds: ['nonexistent', 'deco-1'],
            targetLayerId: 'layer-2'
        });

        expect(result.success).toBe(true);
        expect(result.moved).toBe(1);
        expect(result.skipped).toBe(1);
    });

    test('should handle empty decorationIds', () => {
        const result = handler.execute({
            decorationIds: [],
            targetLayerId: 'layer-2'
        });

        expect(result.success).toBe(true);
        expect(result.moved).toBe(0);
        expect(result.skipped).toBe(0);
    });

    test('should throw when target layer not found', () => {
        expect(() => handler.execute({
            decorationIds: ['deco-1'],
            targetLayerId: 'nonexistent'
        })).toThrow('target layer "nonexistent" not found');
    });

    test('should handle multi-source-layer move', () => {
        // deco-1 in layer-1, deco-3 in layer-2 → both to layer-3
        const result = handler.execute({
            decorationIds: ['deco-1', 'deco-3'],
            targetLayerId: 'layer-3'
        });

        expect(result.success).toBe(true);
        expect(result.moved).toBe(2);
        expect(result.sourceMapping).toEqual({ 'deco-1': 'layer-1', 'deco-3': 'layer-2' });

        expect(layer3.getDecoration('deco-1')).toBeTruthy();
        expect(layer3.getDecoration('deco-3')).toBeTruthy();
    });

    test('should emit DecorationsMovedEvent', () => {
        handler.execute({
            decorationIds: ['deco-1'],
            targetLayerId: 'layer-2'
        });

        const events = layout.pendingEvents;
        expect(events).toHaveLength(1);
        expect(events[0].constructor.name).toBe('DecorationsMovedEvent');
        expect(events[0].decorationIds).toEqual(['deco-1']);
        expect(events[0].targetLayerId).toBe('layer-2');
    });

    test('should not emit event when no decorations moved', () => {
        handler.execute({
            decorationIds: ['deco-1'],
            targetLayerId: 'layer-1' // same layer
        });

        expect(layout.pendingEvents).toHaveLength(0);
    });

    describe('with UndoRedoManager', () => {
        let undoRedoManager;

        beforeEach(() => {
            undoRedoManager = new UndoRedoManager();
            handler = new MoveDecorationsHandler(layout, undoRedoManager);
        });

        test('should produce undo record with source mapping', () => {
            handler.execute({
                decorationIds: ['deco-1', 'deco-2'],
                targetLayerId: 'layer-2'
            });

            expect(undoRedoManager.canUndo()).toBe(true);
            const record = undoRedoManager.peekUndo();
            expect(record.commandType).toBe('MoveDecorationsCommand');
            expect(record.label).toContain('2 decorations');
            expect(record.forwardData.decorationIds).toEqual(['deco-1', 'deco-2']);
            expect(record.forwardData.targetLayerId).toBe('layer-2');
            expect(record.reverseData.sourceMapping).toEqual({
                'deco-1': 'layer-1',
                'deco-2': 'layer-1'
            });
        });

        test('should store original indices in undo record for order preservation', () => {
            handler.execute({
                decorationIds: ['deco-2'],
                targetLayerId: 'layer-2'
            });

            const record = undoRedoManager.peekUndo();
            expect(record.reverseData.originalIndices).toBeDefined();
            // deco-2 was at index 1 in layer-1 (after deco-1)
            expect(record.reverseData.originalIndices['deco-2']).toBe(1);
        });

        test('should not push undo record when no decorations moved', () => {
            handler.execute({
                decorationIds: ['deco-1'],
                targetLayerId: 'layer-1' // same layer
            });

            expect(undoRedoManager.canUndo()).toBe(false);
        });

        test('undo record label uses singular for 1 decoration', () => {
            handler.execute({
                decorationIds: ['deco-1'],
                targetLayerId: 'layer-2'
            });

            const record = undoRedoManager.peekUndo();
            expect(record.label).toContain('1 decoration');
            expect(record.label).not.toContain('1 decorations');
        });
    });
});
