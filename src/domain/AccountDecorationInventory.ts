// @ts-nocheck
/**
 * AccountDecorationInventory
 *
 * Value object representing the decoration inventory of a GW2 account.
 * Provides fast count lookups by decoration id.
 */
export class AccountDecorationInventory {
    /**
     * @param {Array<{id: number, count: number}>} entries
     */
    constructor(entries) {
        this._counts = new Map(entries.map(e => [e.id, e.count]));
    }

    /**
     * Returns the count for a given decoration id, or 0 if not owned.
     * @param {number} id
     * @returns {number}
     */
    getCount(id) {
        return this._counts.get(id) ?? 0;
    }

    /**
     * The number of distinct decoration ids in this inventory.
     * @returns {number}
     */
    get size() {
        return this._counts.size;
    }
}
