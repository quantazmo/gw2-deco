/**
 * SelectionSet - Value Object representing a set of selected decoration IDs
 * Immutable — all mutation methods return new instances
 * Business rules: IDs must be non-empty strings, duplicates are silently ignored
 */
class SelectionSet {
    private _ids: Set<string>;

    constructor(ids?: Iterable<string>) {
        this._ids = new Set(ids);
    }

    /**
     * Returns a new SelectionSet with the given id added
     * @param {string} id - Decoration ID to add
     * @returns {SelectionSet}
     */
    add(id: string): SelectionSet {
        if (typeof id !== 'string' || id.trim().length === 0) {
            return this;
        }
        const newIds = new Set(this._ids);
        newIds.add(id);
        return new SelectionSet(newIds);
    }

    /**
     * Returns a new SelectionSet with the given id removed
     * @param {string} id - Decoration ID to remove
     * @returns {SelectionSet}
     */
    remove(id: string): SelectionSet {
        const newIds = new Set(this._ids);
        newIds.delete(id);
        return new SelectionSet(newIds);
    }

    /**
     * Returns a new SelectionSet with the given id toggled
     * @param {string} id - Decoration ID to toggle
     * @returns {SelectionSet}
     */
    toggle(id: string): SelectionSet {
        if (typeof id !== 'string' || id.trim().length === 0) {
            return this;
        }
        if (this._ids.has(id)) {
            return this.remove(id);
        }
        return this.add(id);
    }

    /**
     * Returns a new SelectionSet with all given ids added
     * @param {string[]} ids - Array of decoration IDs to add
     * @returns {SelectionSet}
     */
    addRange(ids: string[]): SelectionSet {
        if (!Array.isArray(ids)) {
            return this;
        }
        const newIds = new Set(this._ids);
        for (const id of ids) {
            if (typeof id === 'string' && id.trim().length > 0) {
                newIds.add(id);
            }
        }
        return new SelectionSet(newIds);
    }

    /**
     * Returns a new SelectionSet with all given ids removed
     * @param {string[]} ids - Array of decoration IDs to remove
     * @returns {SelectionSet}
     */
    removeRange(ids: string[]): SelectionSet {
        if (!Array.isArray(ids)) {
            return this;
        }
        const newIds = new Set(this._ids);
        for (const id of ids) {
            newIds.delete(id);
        }
        return new SelectionSet(newIds);
    }

    /**
     * Returns a new empty SelectionSet
     * @returns {SelectionSet}
     */
    clear(): SelectionSet {
        return new SelectionSet();
    }

    /**
     * Whether the given id is in the selection
     * @param {string} id - Decoration ID to check
     * @returns {boolean}
     */
    contains(id: string): boolean {
        return this._ids.has(id);
    }

    /**
     * Returns a new SelectionSet without items matching the predicate
     * @param {function(string): boolean} predicate - Filter function
     * @returns {SelectionSet}
     */
    removeByFilter(predicate: (id: string) => boolean): SelectionSet {
        if (typeof predicate !== 'function') {
            return this;
        }
        const newIds = new Set<string>();
        for (const id of this._ids) {
            if (!predicate(id)) {
                newIds.add(id);
            }
        }
        return new SelectionSet(newIds);
    }

    /**
     * Array of selected IDs
     * @returns {string[]}
     */
    toArray(): string[] {
        return Array.from(this._ids);
    }

    /**
     * Number of selected items
     * @returns {number}
     */
    get size() {
        return this._ids.size;
    }

    /**
     * Whether the selection is empty
     * @returns {boolean}
     */
    isEmpty() {
        return this._ids.size === 0;
    }

    /**
     * Value equality check
     * @param {SelectionSet} other - Other SelectionSet to compare
     * @returns {boolean}
     */
    equals(other: unknown): boolean {
        if (!(other instanceof SelectionSet)) {
            return false;
        }
        if (this._ids.size !== other._ids.size) {
            return false;
        }
        for (const id of this._ids) {
            if (!other._ids.has(id)) {
                return false;
            }
        }
        return true;
    }
}

export { SelectionSet };
export default SelectionSet;
