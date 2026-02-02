/**
 * UndoRedoManager - Application Service managing undo/redo stacks
 * Dual-stack pattern: undoStack and redoStack of UndoRecord instances
 * Max 50 entries by default; oldest records are dropped when exceeded
 * Pushing a new record clears the redo stack
 */

import type { UndoRecord } from './UndoRecord.ts';

const DEFAULT_MAX_SIZE = 50;

type StackState = { canUndo: boolean; canRedo: boolean; undoLabel: string | null; redoLabel: string | null };

class UndoRedoManager {
    _undoStack: UndoRecord[];
    _redoStack: UndoRecord[];
    _maxSize: number;
    _listeners: Array<(state: StackState) => void>;

    constructor(maxSize = DEFAULT_MAX_SIZE) {
        this._undoStack = [];
        this._redoStack = [];
        this._maxSize = maxSize;
        this._listeners = [];
    }

    /**
     * Push a new undo record onto the stack.
     * Clears the redo stack (standard undo/redo behavior).
     * If the undo stack exceeds maxSize, the oldest record is dropped.
     * @param {UndoRecord} undoRecord
     */
    push(undoRecord: UndoRecord): void {
        if (!undoRecord || typeof undoRecord.id !== 'string') {
            throw new Error('UndoRedoManager.push: undoRecord must be a valid UndoRecord');
        }
        this._redoStack = [];
        this._undoStack.push(undoRecord);
        if (this._undoStack.length > this._maxSize) {
            this._undoStack.shift();
        }
        this._notifyListeners();
    }

    /**
     * Undo the most recent action.
     * Pops from undo stack, pushes to redo stack, returns the record.
     * @returns {UndoRecord|null}
     */
    undo(): UndoRecord | null {
        if (this._undoStack.length === 0) {
            return null;
        }
        const record = this._undoStack.pop()!;
        this._redoStack.push(record);
        this._notifyListeners();
        return record;
    }

    /**
     * Redo the most recently undone action.
     * Pops from redo stack, pushes to undo stack, returns the record.
     * @returns {UndoRecord|null}
     */
    redo(): UndoRecord | null {
        if (this._redoStack.length === 0) {
            return null;
        }
        const record = this._redoStack.pop()!;
        this._undoStack.push(record);
        this._notifyListeners();
        return record;
    }

    /**
     * Whether the undo stack is non-empty
     * @returns {boolean}
     */
    canUndo() {
        return this._undoStack.length > 0;
    }

    /**
     * Whether the redo stack is non-empty
     * @returns {boolean}
     */
    canRedo() {
        return this._redoStack.length > 0;
    }

    /**
     * Inspect the next undo record without executing
     * @returns {UndoRecord|null}
     */
    peekUndo() {
        if (this._undoStack.length === 0) {
            return null;
        }
        return this._undoStack[this._undoStack.length - 1];
    }

    /**
     * Inspect the next redo record without executing
     * @returns {UndoRecord|null}
     */
    peekRedo() {
        if (this._redoStack.length === 0) {
            return null;
        }
        return this._redoStack[this._redoStack.length - 1];
    }

    /**
     * Clear both undo and redo stacks
     */
    clear() {
        this._undoStack = [];
        this._redoStack = [];
        this._notifyListeners();
    }

    /**
     * Subscribe to state changes (stack push, undo, redo, clear)
     * @param {function} listener - Callback invoked on state changes
     * @returns {function} Unsubscribe function
     */
    subscribe(listener: (state: StackState) => void): () => void {
        if (typeof listener !== 'function') {
            throw new Error('UndoRedoManager.subscribe: listener must be a function');
        }
        this._listeners.push(listener);
        return () => {
            this._listeners = this._listeners.filter(l => l !== listener);
        };
    }

    /** @private */
    _notifyListeners() {
        for (const listener of this._listeners) {
            listener({
                canUndo: this.canUndo(),
                canRedo: this.canRedo(),
                undoLabel: this.peekUndo()?.label ?? null,
                redoLabel: this.peekRedo()?.label ?? null
            });
        }
    }
}

export { UndoRedoManager };
export default UndoRedoManager;
