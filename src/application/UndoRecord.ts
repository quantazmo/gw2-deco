/**
 * UndoRecord - Value Object representing a reversible action in the undo/redo stack
 * Immutable after creation
 * Properties: id, label, commandType, forwardData, reverseData, timestamp
 */

let _nextId = 1;

class UndoRecord {
    id: string;
    label: string;
    commandType: string;
    forwardData: Readonly<Record<string, unknown>>;
    reverseData: Readonly<Record<string, unknown>>;
    timestamp: Date;
    static _resetIdCounter: () => void;

    constructor({ label, commandType, forwardData, reverseData }: { label: string; commandType: string; forwardData: Record<string, unknown>; reverseData: Record<string, unknown> }) {
        if (typeof label !== 'string' || label.trim().length === 0) {
            throw new Error('UndoRecord: label must be a non-empty string');
        }
        if (typeof commandType !== 'string' || commandType.trim().length === 0) {
            throw new Error('UndoRecord: commandType must be a non-empty string');
        }
        if (!forwardData || typeof forwardData !== 'object') {
            throw new Error('UndoRecord: forwardData must be a non-null object');
        }
        if (!reverseData || typeof reverseData !== 'object') {
            throw new Error('UndoRecord: reverseData must be a non-null object');
        }

        this.id = `undo-${_nextId++}`;
        this.label = label.trim();
        this.commandType = commandType.trim();
        this.forwardData = Object.freeze({ ...forwardData });
        this.reverseData = Object.freeze({ ...reverseData });
        this.timestamp = new Date();

        Object.freeze(this);
    }
}

/**
 * Reset the internal ID counter (for testing only)
 */
UndoRecord._resetIdCounter = (): void => {
    _nextId = 1;
};

export { UndoRecord };
export default UndoRecord;
