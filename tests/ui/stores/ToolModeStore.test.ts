// @ts-nocheck
/**
 * Tests for src/ui/stores/ToolModeStore.js
 * Covers: getMode, setMode, subscribe, default mode is 'pan'
 */
import { ToolModeStore } from '../../../src/ui/stores/ToolModeStore.js';

describe('ToolModeStore', () => {
    let store;

    beforeEach(() => {
        store = new ToolModeStore();
    });

    describe('constructor / defaults', () => {
        test('default mode is "pan"', () => {
            expect(store.getMode()).toBe('pan');
        });
    });

    describe('getMode', () => {
        test('returns current mode', () => {
            expect(store.getMode()).toBe('pan');
            store.setMode('select');
            expect(store.getMode()).toBe('select');
        });
    });

    describe('setMode', () => {
        test('can set mode to "pan"', () => {
            store.setMode('select');
            store.setMode('pan');
            expect(store.getMode()).toBe('pan');
        });

        test('can set mode to "select"', () => {
            store.setMode('select');
            expect(store.getMode()).toBe('select');
        });

        test('throws on invalid mode', () => {
            expect(() => store.setMode('rotate')).toThrow(/invalid tool mode/i);
        });

        test('setting same mode twice does not fire extra notifications', () => {
            const calls = [];
            store.subscribe((m) => calls.push(m));
            store.setMode('pan'); // same as default — no change
            expect(calls).toHaveLength(0);
        });

        test('setting a different mode fires notification', () => {
            const calls = [];
            store.subscribe((m) => calls.push(m));
            store.setMode('select');
            expect(calls).toEqual(['select']);
        });
    });

    describe('subscribe', () => {
        test('listener receives new mode on change', () => {
            const received = [];
            store.subscribe((m) => received.push(m));
            store.setMode('select');
            expect(received).toEqual(['select']);
            store.setMode('pan');
            expect(received).toEqual(['select', 'pan']);
        });

        test('multiple listeners all receive notification', () => {
            const a = [];
            const b = [];
            store.subscribe((m) => a.push(m));
            store.subscribe((m) => b.push(m));
            store.setMode('select');
            expect(a).toEqual(['select']);
            expect(b).toEqual(['select']);
        });

        test('returns an unsubscribe function', () => {
            const calls = [];
            const unsub = store.subscribe((m) => calls.push(m));
            store.setMode('select');
            unsub();
            store.setMode('pan');
            // should only have received the first change
            expect(calls).toEqual(['select']);
        });

        test('unsubscribing a non-registered listener is a no-op', () => {
            const unsub = store.subscribe(() => { });
            unsub();
            expect(() => unsub()).not.toThrow();
        });
    });
});
