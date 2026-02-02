// @ts-nocheck
/**
 * Tests for src/ui/stores/ZoomStore.js
 * Covers: ZoomEventEmitter (on, emit, once) and ZoomStore (initialize, setZoom,
 * zoom, pan, undo/redo, reset, limits, canUndo/canRedo, onChange, getters).
 */
import { ZoomStore } from '../../../src/ui/stores/ZoomStore.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeScale(label = 'scale') {
    const instance = { _label: label, _copy: 0 };
    instance.copy = () => makeScale(`${label}-copy${++instance._copy}`);
    return instance;
}

function makeInitializedStore() {
    const store = new ZoomStore();
    const xZoom = makeScale('xZoom');
    const yZoom = makeScale('yZoom');
    const xBase = makeScale('xBase');
    const yBase = makeScale('yBase');
    store.initialize(xZoom, yZoom, xBase, yBase);
    return { store, xZoom, yZoom, xBase, yBase };
}

// ─── constructor ─────────────────────────────────────────────────────────────

describe('ZoomStore – constructor', () => {
    test('starts uninitialized', () => {
        const store = new ZoomStore();
        expect(store.isInitialized()).toBe(false);
        expect(store.getXZoom()).toBeNull();
        expect(store.getYZoom()).toBeNull();
    });

    test('default transform is identity', () => {
        const store = new ZoomStore();
        const t = store.getTransform();
        expect(t).toEqual({ scaleX: 1, scaleY: 1, translateX: 0, translateY: 0 });
    });

    test('default zoom limits', () => {
        const store = new ZoomStore();
        expect(store.getZoomLimits()).toEqual({ min: 0.1, max: 10 });
    });
});

// ─── initialize ──────────────────────────────────────────────────────────────

describe('ZoomStore – initialize', () => {
    test('stores the four scales and becomes initialized', () => {
        const { store, xZoom, yZoom, xBase, yBase } = makeInitializedStore();
        expect(store.isInitialized()).toBe(true);
        expect(store.getXZoom()).toBe(xZoom);
        expect(store.getYZoom()).toBe(yZoom);
        expect(store.getXZoomBase()).toBe(xBase);
        expect(store.getYZoomBase()).toBe(yBase);
    });

    test('throws when any scale is missing', () => {
        const store = new ZoomStore();
        const s = makeScale();
        expect(() => store.initialize(null, s, s, s)).toThrow();
        expect(() => store.initialize(s, null, s, s)).toThrow();
        expect(() => store.initialize(s, s, null, s)).toThrow();
        expect(() => store.initialize(s, s, s, null)).toThrow();
    });

    test('emits a change event with type "initialize"', () => {
        const store = new ZoomStore();
        const events = [];
        store.onChange(e => events.push(e));
        store.initialize(makeScale(), makeScale(), makeScale(), makeScale());
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe('initialize');
    });

    test('resets undo history (historyIndex = 0)', () => {
        const { store } = makeInitializedStore();
        expect(store.canUndo()).toBe(false); // at index 0 – nothing to undo
    });
});

// ─── setZoom ─────────────────────────────────────────────────────────────────

describe('ZoomStore – setZoom', () => {
    test('updates xZoom and yZoom', () => {
        const { store } = makeInitializedStore();
        const newX = makeScale('newX');
        const newY = makeScale('newY');
        store.setZoom(newX, newY);
        expect(store.getXZoom()).toBe(newX);
        expect(store.getYZoom()).toBe(newY);
    });

    test('throws when either scale is null', () => {
        const { store } = makeInitializedStore();
        expect(() => store.setZoom(null, makeScale())).toThrow();
        expect(() => store.setZoom(makeScale(), null)).toThrow();
    });

    test('emits change event with type "zoom"', () => {
        const { store } = makeInitializedStore();
        const events = [];
        store.onChange(e => events.push(e));
        store.setZoom(makeScale(), makeScale());
        expect(events[0].type).toBe('zoom');
    });
});

// ─── getState ─────────────────────────────────────────────────────────────────

describe('ZoomStore – getState', () => {
    test('returns all four scales', () => {
        const { store, xZoom, yZoom, xBase, yBase } = makeInitializedStore();
        const state = store.getState();
        expect(state.xZoom).toBe(xZoom);
        expect(state.yZoom).toBe(yZoom);
        expect(state.xZoomBase).toBe(xBase);
        expect(state.yZoomBase).toBe(yBase);
    });
});

// ─── zoom (transform) ─────────────────────────────────────────────────────────

describe('ZoomStore – zoom()', () => {
    test('updates scaleX and scaleY', () => {
        const { store } = makeInitializedStore();
        store.zoom(2);
        const t = store.getTransform();
        expect(t.scaleX).toBe(2);
        expect(t.scaleY).toBe(2);
    });

    test('no-op when constrained factor results in no change (already at limit)', () => {
        const { store } = makeInitializedStore();
        const events = [];
        store.onChange(e => events.push(e));
        // zoom out below minZoom → constrained to minZoom (0.1), actual factor ~= 0.1
        // After first zoom, zooming again with 0 factor should produce no change
        store.zoom(1); // factor 1 → no change
        expect(events).toHaveLength(0);
    });

    test('emits change event with type "zoom"', () => {
        const { store } = makeInitializedStore();
        const events = [];
        store.onChange(e => events.push(e));
        store.zoom(2);
        expect(events[0].type).toBe('zoom');
    });

    test('clamps zoom to minZoom', () => {
        const { store } = makeInitializedStore();
        store.zoom(0.001); // should clamp to minZoom (0.1)
        expect(store.getTransform().scaleX).toBeCloseTo(0.1);
    });

    test('clamps zoom to maxZoom', () => {
        const { store } = makeInitializedStore();
        store.zoom(100); // should clamp to maxZoom (10)
        expect(store.getTransform().scaleX).toBeCloseTo(10);
    });
});

// ─── pan ─────────────────────────────────────────────────────────────────────

describe('ZoomStore – pan()', () => {
    test('updates translateX and translateY', () => {
        const { store } = makeInitializedStore();
        store.pan(50, 30);
        const t = store.getTransform();
        expect(t.translateX).toBe(50);
        expect(t.translateY).toBe(30);
    });

    test('no-op for zero delta', () => {
        const { store } = makeInitializedStore();
        const events = [];
        store.onChange(e => events.push(e));
        store.pan(0, 0);
        expect(events).toHaveLength(0);
    });

    test('emits change event with type "pan"', () => {
        const { store } = makeInitializedStore();
        const events = [];
        store.onChange(e => events.push(e));
        store.pan(10, 20);
        expect(events[0].type).toBe('pan');
    });

    test('accumulates multiple pan calls', () => {
        const { store } = makeInitializedStore();
        store.pan(10, 5);
        store.pan(20, 15);
        const t = store.getTransform();
        expect(t.translateX).toBe(30);
        expect(t.translateY).toBe(20);
    });
});

// ─── undo / redo ──────────────────────────────────────────────────────────────

describe('ZoomStore – undo / redo', () => {
    test('canUndo is false before any zoom/pan', () => {
        const { store } = makeInitializedStore();
        expect(store.canUndo()).toBe(false);
    });

    test('canUndo is true after a zoom', () => {
        const { store } = makeInitializedStore();
        store.zoom(2);
        expect(store.canUndo()).toBe(true);
    });

    test('undo reverts zoom change', () => {
        const { store } = makeInitializedStore();
        store.zoom(2);
        store.undo();
        expect(store.getTransform().scaleX).toBe(1);
    });

    test('undo returns false at history start', () => {
        const { store } = makeInitializedStore();
        expect(store.undo()).toBe(false);
    });

    test('undo emits change event with type "undo"', () => {
        const { store } = makeInitializedStore();
        store.zoom(2);
        const events = [];
        store.onChange(e => events.push(e));
        store.undo();
        expect(events[0].type).toBe('undo');
    });

    test('canRedo is true after undo', () => {
        const { store } = makeInitializedStore();
        store.zoom(2);
        store.undo();
        expect(store.canRedo()).toBe(true);
    });

    test('redo re-applies the undone change', () => {
        const { store } = makeInitializedStore();
        store.zoom(2);
        store.undo();
        store.redo();
        expect(store.getTransform().scaleX).toBe(2);
    });

    test('redo returns false at history end', () => {
        const { store } = makeInitializedStore();
        expect(store.redo()).toBe(false);
    });

    test('redo emits change event with type "redo"', () => {
        const { store } = makeInitializedStore();
        store.zoom(2);
        store.undo();
        const events = [];
        store.onChange(e => events.push(e));
        store.redo();
        expect(events[0].type).toBe('redo');
    });

    test('new action after undo clears redo history', () => {
        const { store } = makeInitializedStore();
        store.zoom(2);
        store.undo();
        store.pan(5, 0); // new action – redo should no longer be possible
        expect(store.canRedo()).toBe(false);
    });
});

// ─── reset ────────────────────────────────────────────────────────────────────

describe('ZoomStore – reset()', () => {
    test('restores transform to identity', () => {
        const { store } = makeInitializedStore();
        store.zoom(3);
        store.pan(100, 50);
        store.reset();
        expect(store.getTransform()).toEqual({ scaleX: 1, scaleY: 1, translateX: 0, translateY: 0 });
    });

    test('emits change event with type "reset"', () => {
        const { store } = makeInitializedStore();
        const events = [];
        store.onChange(e => events.push(e));
        store.reset();
        expect(events[0].type).toBe('reset');
    });

    test('throws when base scales are not set', () => {
        const store = new ZoomStore();
        expect(() => store.reset()).toThrow();
    });

    test('canUndo is false after reset', () => {
        const { store } = makeInitializedStore();
        store.zoom(2);
        store.reset();
        expect(store.canUndo()).toBe(false);
    });
});

// ─── clearHistory ─────────────────────────────────────────────────────────────

describe('ZoomStore – clearHistory()', () => {
    test('clears history so canUndo returns false', () => {
        const { store } = makeInitializedStore();
        store.zoom(2);
        expect(store.canUndo()).toBe(true);
        store.clearHistory();
        expect(store.canUndo()).toBe(false);
    });
});

// ─── setZoomLimits ────────────────────────────────────────────────────────────

describe('ZoomStore – setZoomLimits()', () => {
    test('updates min and max', () => {
        const store = new ZoomStore();
        store.setZoomLimits(0.5, 5);
        expect(store.getZoomLimits()).toEqual({ min: 0.5, max: 5 });
    });

    test('throws when min >= max', () => {
        const store = new ZoomStore();
        expect(() => store.setZoomLimits(5, 5)).toThrow();
        expect(() => store.setZoomLimits(6, 5)).toThrow();
    });

    test('throws when min or max is <= 0', () => {
        const store = new ZoomStore();
        expect(() => store.setZoomLimits(0, 5)).toThrow();
        expect(() => store.setZoomLimits(-1, 5)).toThrow();
    });
});

// ─── onChange / onceChange ────────────────────────────────────────────────────

describe('ZoomStore – onChange / onceChange', () => {
    test('onChange receives all events', () => {
        const { store } = makeInitializedStore();
        const types = [];
        store.onChange(e => types.push(e.type));
        store.zoom(2);
        store.pan(1, 0);
        expect(types).toEqual(['zoom', 'pan']);
    });

    test('onChange returns unsubscribe function', () => {
        const { store } = makeInitializedStore();
        const calls = [];
        const unsub = store.onChange(e => calls.push(e));
        unsub();
        store.zoom(2);
        expect(calls).toHaveLength(0);
    });

    test('onceChange fires exactly once', () => {
        const { store } = makeInitializedStore();
        const calls = [];
        store.onceChange(e => calls.push(e));
        store.zoom(2);
        store.pan(1, 0);
        expect(calls).toHaveLength(1);
    });

    test('getEmitter returns the ZoomEventEmitter', () => {
        const store = new ZoomStore();
        const emitter = store.getEmitter();
        expect(typeof emitter.on).toBe('function');
        expect(typeof emitter.emit).toBe('function');
    });
});
