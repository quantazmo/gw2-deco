// @ts-nocheck
/**
 * Tests for AccountDecorationInventory domain value object
 */
import { AccountDecorationInventory } from '../../src/domain/AccountDecorationInventory.js';

describe('AccountDecorationInventory', () => {
    const sampleEntries = [
        { id: 35, count: 92 },
        { id: 70, count: 6 },
        { id: 125, count: 1 },
        { id: 131, count: 4 },
        { id: 154, count: 1 },
    ];

    describe('construction', () => {
        it('constructs from an array of {id, count} entries', () => {
            const inventory = new AccountDecorationInventory(sampleEntries);
            expect(inventory).toBeDefined();
        });

        it('constructs from an empty array', () => {
            const inventory = new AccountDecorationInventory([]);
            expect(inventory.size).toBe(0);
        });
    });

    describe('getCount', () => {
        it('returns the count for a known decoration id', () => {
            const inventory = new AccountDecorationInventory(sampleEntries);
            expect(inventory.getCount(35)).toBe(92);
            expect(inventory.getCount(70)).toBe(6);
            expect(inventory.getCount(125)).toBe(1);
        });

        it('returns 0 for an unknown decoration id', () => {
            const inventory = new AccountDecorationInventory(sampleEntries);
            expect(inventory.getCount(999)).toBe(0);
            expect(inventory.getCount(0)).toBe(0);
        });
    });

    describe('size', () => {
        it('reports the number of distinct decoration ids', () => {
            const inventory = new AccountDecorationInventory(sampleEntries);
            expect(inventory.size).toBe(5);
        });

        it('returns 0 for an empty inventory', () => {
            const inventory = new AccountDecorationInventory([]);
            expect(inventory.size).toBe(0);
        });
    });
});
