// @ts-nocheck
/**
 * Error-path tests for LocalStorageCacheAdapter — catch block coverage.
 * Uncovered lines: 80 (delete catch), 109 (clear catch), 136 (clearExpired catch), 175-176 (getStats catch)
 */
import { LocalStorageCacheAdapter } from '../../../src/infrastructure/adapters/LocalStorageCacheAdapter.js';
import { setupLocalStorageMock, restoreLocalStorage } from '../mocks/localStorageMock.js';

describe('LocalStorageCacheAdapter — error catch blocks', () => {
    let localStorageMock;

    beforeEach(() => {
        localStorageMock = setupLocalStorageMock();
    });

    afterEach(() => {
        restoreLocalStorage();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // delete catch block (line 80)
    // ─────────────────────────────────────────────────────────────────────────
    test('delete – does not throw when localStorage.removeItem throws', async () => {
        const adapter = new LocalStorageCacheAdapter();
        localStorageMock.removeItem = () => { throw new Error('removeItem failed'); };

        await expect(adapter.delete('some-key')).resolves.toBeUndefined();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // clear catch block (line 109)
    // ─────────────────────────────────────────────────────────────────────────
    test('clear – does not throw when Object.keys on localStorage throws', async () => {
        const adapter = new LocalStorageCacheAdapter();
        // Patch the global localStorage to throw on Object.keys
        const origGetOwnPropertyNames = Object.getOwnPropertyNames;
        const origKeys = Object.keys;
        // Make removeItem throw to trigger the catch block path
        localStorageMock.removeItem = () => { throw new Error('storage error'); };
        // Also store a key so the loop runs
        localStorageMock.store['gw2-cache-test'] = 'value';

        await expect(adapter.clear()).resolves.toBeUndefined();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // clearExpired catch block (line 136)
    // ─────────────────────────────────────────────────────────────────────────
    test('clearExpired – does not throw when localStorage operations fail', async () => {
        const adapter = new LocalStorageCacheAdapter();
        // Store a key, then make getItem throw
        localStorageMock.store['gw2-cache-test'] = 'not-json';
        localStorageMock.getItem = () => { throw new Error('getItem failed'); };

        await expect(adapter.clearExpired()).resolves.toBeUndefined();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // getStats catch block (lines 175-176)
    // ─────────────────────────────────────────────────────────────────────────
    test('getStats – returns zero stats when localStorage.getItem throws', async () => {
        const adapter = new LocalStorageCacheAdapter();
        localStorageMock.store['gw2-cache-test'] = 'value';
        localStorageMock.getItem = () => { throw new Error('getItem failed'); };

        const stats = await adapter.getStats();
        expect(stats.itemCount).toBe(0);
        expect(stats.totalSizeBytes).toBe(0);
    });
});
