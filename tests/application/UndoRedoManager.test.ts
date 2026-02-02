// @ts-nocheck
/**
 * Tests for src/application/UndoRedoManager.js
 * Tests push/undo/redo cycles, redo-clear-on-new-action, max size eviction,
 * clear, subscribe notifications, peek methods
 */
import { UndoRedoManager } from '../../src/application/UndoRedoManager.js';
import { UndoRecord } from '../../src/application/UndoRecord.js';

describe('UndoRedoManager Application Service', () => {

    beforeEach(() => {
        UndoRecord._resetIdCounter();
    });

    function createRecord(label = 'Test action', commandType = 'TEST_CMD') {
        return new UndoRecord({
            label,
            commandType,
            forwardData: { action: label },
            reverseData: { action: `undo-${label}` }
        });
    }

    describe('constructor', () => {
        test('should create manager with empty stacks', () => {
            const mgr = new UndoRedoManager();
            expect(mgr.canUndo()).toBe(false);
            expect(mgr.canRedo()).toBe(false);
        });

        test('should accept custom max size', () => {
            const mgr = new UndoRedoManager(3);
            // Push 4 records, oldest should be evicted
            mgr.push(createRecord('A'));
            mgr.push(createRecord('B'));
            mgr.push(createRecord('C'));
            mgr.push(createRecord('D'));

            // Undo 3 times (max size)
            expect(mgr.undo().label).toBe('D');
            expect(mgr.undo().label).toBe('C');
            expect(mgr.undo().label).toBe('B');
            // 'A' was evicted
            expect(mgr.undo()).toBeNull();
        });
    });

    describe('push', () => {
        test('should add record to undo stack', () => {
            const mgr = new UndoRedoManager();
            const record = createRecord('Move decorations');

            mgr.push(record);

            expect(mgr.canUndo()).toBe(true);
            expect(mgr.peekUndo()).toBe(record);
        });

        test('should clear redo stack on push', () => {
            const mgr = new UndoRedoManager();
            mgr.push(createRecord('A'));
            mgr.undo(); // redo stack now has 'A'
            expect(mgr.canRedo()).toBe(true);

            mgr.push(createRecord('B')); // new action clears redo
            expect(mgr.canRedo()).toBe(false);
        });

        test('should enforce max size by evicting oldest', () => {
            const mgr = new UndoRedoManager(2);
            mgr.push(createRecord('A'));
            mgr.push(createRecord('B'));
            mgr.push(createRecord('C')); // 'A' evicted

            expect(mgr.undo().label).toBe('C');
            expect(mgr.undo().label).toBe('B');
            expect(mgr.undo()).toBeNull();
        });

        test('should throw on invalid record', () => {
            const mgr = new UndoRedoManager();
            expect(() => mgr.push(null)).toThrow();
            expect(() => mgr.push({})).toThrow();
            expect(() => mgr.push('string')).toThrow();
        });
    });

    describe('undo', () => {
        test('should return null when stack is empty', () => {
            const mgr = new UndoRedoManager();
            expect(mgr.undo()).toBeNull();
        });

        test('should return the most recent record', () => {
            const mgr = new UndoRedoManager();
            mgr.push(createRecord('A'));
            mgr.push(createRecord('B'));

            const result = mgr.undo();
            expect(result.label).toBe('B');
        });

        test('should move record to redo stack', () => {
            const mgr = new UndoRedoManager();
            mgr.push(createRecord('A'));
            mgr.undo();

            expect(mgr.canUndo()).toBe(false);
            expect(mgr.canRedo()).toBe(true);
        });

        test('should support multiple undos', () => {
            const mgr = new UndoRedoManager();
            mgr.push(createRecord('A'));
            mgr.push(createRecord('B'));
            mgr.push(createRecord('C'));

            expect(mgr.undo().label).toBe('C');
            expect(mgr.undo().label).toBe('B');
            expect(mgr.undo().label).toBe('A');
            expect(mgr.undo()).toBeNull();
        });
    });

    describe('redo', () => {
        test('should return null when redo stack is empty', () => {
            const mgr = new UndoRedoManager();
            expect(mgr.redo()).toBeNull();
        });

        test('should return the most recently undone record', () => {
            const mgr = new UndoRedoManager();
            mgr.push(createRecord('A'));
            mgr.undo();

            const result = mgr.redo();
            expect(result.label).toBe('A');
        });

        test('should move record back to undo stack', () => {
            const mgr = new UndoRedoManager();
            mgr.push(createRecord('A'));
            mgr.undo();
            mgr.redo();

            expect(mgr.canUndo()).toBe(true);
            expect(mgr.canRedo()).toBe(false);
        });

        test('should support undo-redo-undo cycle', () => {
            const mgr = new UndoRedoManager();
            mgr.push(createRecord('A'));

            mgr.undo();
            expect(mgr.canRedo()).toBe(true);

            mgr.redo();
            expect(mgr.canUndo()).toBe(true);
            expect(mgr.canRedo()).toBe(false);

            mgr.undo();
            expect(mgr.canRedo()).toBe(true);
        });
    });

    describe('redo-clear-on-new-action', () => {
        test('should clear redo stack when new action is pushed after undo', () => {
            const mgr = new UndoRedoManager();
            mgr.push(createRecord('A'));
            mgr.push(createRecord('B'));
            mgr.undo(); // 'B' on redo stack
            expect(mgr.canRedo()).toBe(true);

            mgr.push(createRecord('C')); // redo cleared
            expect(mgr.canRedo()).toBe(false);

            // Only A and C on undo stack
            expect(mgr.undo().label).toBe('C');
            expect(mgr.undo().label).toBe('A');
            expect(mgr.undo()).toBeNull();
        });
    });

    describe('canUndo / canRedo', () => {
        test('canUndo is false when empty', () => {
            expect(new UndoRedoManager().canUndo()).toBe(false);
        });

        test('canUndo is true after push', () => {
            const mgr = new UndoRedoManager();
            mgr.push(createRecord('A'));
            expect(mgr.canUndo()).toBe(true);
        });

        test('canRedo is false when empty', () => {
            expect(new UndoRedoManager().canRedo()).toBe(false);
        });

        test('canRedo is true after undo', () => {
            const mgr = new UndoRedoManager();
            mgr.push(createRecord('A'));
            mgr.undo();
            expect(mgr.canRedo()).toBe(true);
        });
    });

    describe('peekUndo / peekRedo', () => {
        test('peekUndo returns null when empty', () => {
            expect(new UndoRedoManager().peekUndo()).toBeNull();
        });

        test('peekUndo returns top without popping', () => {
            const mgr = new UndoRedoManager();
            const record = createRecord('A');
            mgr.push(record);

            expect(mgr.peekUndo()).toBe(record);
            expect(mgr.canUndo()).toBe(true); // still there
        });

        test('peekRedo returns null when empty', () => {
            expect(new UndoRedoManager().peekRedo()).toBeNull();
        });

        test('peekRedo returns top of redo stack without popping', () => {
            const mgr = new UndoRedoManager();
            mgr.push(createRecord('A'));
            mgr.undo();

            expect(mgr.peekRedo().label).toBe('A');
            expect(mgr.canRedo()).toBe(true); // still there
        });
    });

    describe('clear', () => {
        test('should clear both stacks', () => {
            const mgr = new UndoRedoManager();
            mgr.push(createRecord('A'));
            mgr.push(createRecord('B'));
            mgr.undo(); // 'B' on redo

            mgr.clear();

            expect(mgr.canUndo()).toBe(false);
            expect(mgr.canRedo()).toBe(false);
            expect(mgr.peekUndo()).toBeNull();
            expect(mgr.peekRedo()).toBeNull();
        });
    });

    describe('subscribe', () => {
        test('should notify on push', () => {
            const mgr = new UndoRedoManager();
            const events = [];
            mgr.subscribe(state => events.push(state));

            mgr.push(createRecord('A'));

            expect(events).toHaveLength(1);
            expect(events[0].canUndo).toBe(true);
            expect(events[0].canRedo).toBe(false);
            expect(events[0].undoLabel).toBe('A');
            expect(events[0].redoLabel).toBeNull();
        });

        test('should notify on undo', () => {
            const mgr = new UndoRedoManager();
            mgr.push(createRecord('A'));
            const events = [];
            mgr.subscribe(state => events.push(state));

            mgr.undo();

            expect(events).toHaveLength(1);
            expect(events[0].canUndo).toBe(false);
            expect(events[0].canRedo).toBe(true);
            expect(events[0].redoLabel).toBe('A');
        });

        test('should notify on redo', () => {
            const mgr = new UndoRedoManager();
            mgr.push(createRecord('A'));
            mgr.undo();
            const events = [];
            mgr.subscribe(state => events.push(state));

            mgr.redo();

            expect(events).toHaveLength(1);
            expect(events[0].canUndo).toBe(true);
            expect(events[0].canRedo).toBe(false);
        });

        test('should notify on clear', () => {
            const mgr = new UndoRedoManager();
            mgr.push(createRecord('A'));
            const events = [];
            mgr.subscribe(state => events.push(state));

            mgr.clear();

            expect(events).toHaveLength(1);
            expect(events[0].canUndo).toBe(false);
            expect(events[0].canRedo).toBe(false);
        });

        test('should return unsubscribe function', () => {
            const mgr = new UndoRedoManager();
            const events = [];
            const unsubscribe = mgr.subscribe(state => events.push(state));

            mgr.push(createRecord('A'));
            expect(events).toHaveLength(1);

            unsubscribe();

            mgr.push(createRecord('B'));
            expect(events).toHaveLength(1); // no more notifications
        });

        test('should throw on non-function listener', () => {
            const mgr = new UndoRedoManager();
            expect(() => mgr.subscribe('not-a-function')).toThrow();
            expect(() => mgr.subscribe(null)).toThrow();
        });

        test('should notify multiple listeners', () => {
            const mgr = new UndoRedoManager();
            const events1 = [];
            const events2 = [];
            mgr.subscribe(state => events1.push(state));
            mgr.subscribe(state => events2.push(state));

            mgr.push(createRecord('A'));

            expect(events1).toHaveLength(1);
            expect(events2).toHaveLength(1);
        });
    });

    describe('max size eviction', () => {
        test('should evict oldest when pushing beyond max size', () => {
            const mgr = new UndoRedoManager(3);
            mgr.push(createRecord('A'));
            mgr.push(createRecord('B'));
            mgr.push(createRecord('C'));
            mgr.push(createRecord('D')); // A is evicted

            const results = [];
            let r;
            while ((r = mgr.undo()) !== null) {
                results.push(r.label);
            }
            expect(results).toEqual(['D', 'C', 'B']);
        });

        test('should handle max size of 1', () => {
            const mgr = new UndoRedoManager(1);
            mgr.push(createRecord('A'));
            mgr.push(createRecord('B'));

            expect(mgr.undo().label).toBe('B');
            expect(mgr.undo()).toBeNull();
        });
    });

    describe('complex scenarios', () => {
        test('push-undo-push should clear redo and add new action', () => {
            const mgr = new UndoRedoManager();
            mgr.push(createRecord('A'));
            mgr.push(createRecord('B'));
            mgr.push(createRecord('C'));

            mgr.undo(); // C to redo
            mgr.undo(); // B to redo

            mgr.push(createRecord('D')); // redo cleared

            expect(mgr.canRedo()).toBe(false);
            expect(mgr.undo().label).toBe('D');
            expect(mgr.undo().label).toBe('A');
            expect(mgr.undo()).toBeNull();
        });

        test('undo when empty should return null gracefully', () => {
            const mgr = new UndoRedoManager();
            expect(mgr.undo()).toBeNull();
            expect(mgr.undo()).toBeNull();
        });

        test('redo when empty should return null gracefully', () => {
            const mgr = new UndoRedoManager();
            expect(mgr.redo()).toBeNull();
            expect(mgr.redo()).toBeNull();
        });
    });
});
