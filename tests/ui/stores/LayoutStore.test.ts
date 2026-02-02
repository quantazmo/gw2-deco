// @ts-nocheck
/**
 * Tests for src/ui/stores/LayoutStore.js
 * Covers: constructor, getState, setState, subscribe/unsubscribe,
 *         EventBus integration, repository persistence.
 */
import { DockPanelLayoutStore } from '../../../src/ui/stores/DockPanelLayoutStore.js';
import { DockLayoutConfiguration } from '../../../src/domain/DockLayoutConfiguration.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeEventBus() {
    const published = [];
    return {
        published,
        publish(eventType, data) { published.push({ eventType, data }); },
    };
}

function makeRepository() {
    const saved = [];
    return {
        saved,
        save(layout) { saved.push(layout); },
    };
}

// ─── constructor ─────────────────────────────────────────────────────────────

describe('LayoutStore – constructor', () => {
    test('initializes with a default LayoutConfiguration', () => {
        const store = new DockPanelLayoutStore();
        const state = store.getState();
        expect(state).toBeInstanceOf(DockLayoutConfiguration);
    });

    test('works without eventBus or repository', () => {
        expect(() => new DockPanelLayoutStore()).not.toThrow();
    });
});

// ─── getState ─────────────────────────────────────────────────────────────────

describe('LayoutStore – getState', () => {
    test('returns the current LayoutConfiguration', () => {
        const store = new DockPanelLayoutStore();
        expect(store.getState()).toBeInstanceOf(DockLayoutConfiguration);
    });
});

// ─── setState ─────────────────────────────────────────────────────────────────

describe('LayoutStore – setState', () => {
    test('updates the internal state', () => {
        const store = new DockPanelLayoutStore();
        const newLayout = DockLayoutConfiguration.createDefault();
        store.setState(newLayout);
        expect(store.getState()).toBe(newLayout);
    });

    test('notifies all subscribers with the new layout', () => {
        const store = new DockPanelLayoutStore();
        const received = [];
        store.subscribe(layout => received.push(layout));

        const newLayout = DockLayoutConfiguration.createDefault();
        store.setState(newLayout);

        expect(received).toHaveLength(1);
        expect(received[0]).toBe(newLayout);
    });

    test('publishes "layout:changed" on the eventBus when provided', () => {
        const bus = makeEventBus();
        const store = new DockPanelLayoutStore(bus);
        const layout = DockLayoutConfiguration.createDefault();
        store.setState(layout);

        expect(bus.published).toHaveLength(1);
        expect(bus.published[0].eventType).toBe('layout:changed');
        expect(bus.published[0].data).toBe(layout);
    });

    test('does NOT publish to eventBus when none is provided', () => {
        // No error should be thrown; just verify it runs cleanly
        const store = new DockPanelLayoutStore();
        expect(() => store.setState(DockLayoutConfiguration.createDefault())).not.toThrow();
    });

    test('persists to repository when provided', () => {
        const repo = makeRepository();
        const store = new DockPanelLayoutStore(null, repo);
        const layout = DockLayoutConfiguration.createDefault();
        store.setState(layout);

        expect(repo.saved).toHaveLength(1);
        expect(repo.saved[0]).toBe(layout);
    });

    test('does NOT call repository when none is provided', () => {
        // Should run without error
        const store = new DockPanelLayoutStore();
        expect(() => store.setState(DockLayoutConfiguration.createDefault())).not.toThrow();
    });
});

// ─── subscribe ────────────────────────────────────────────────────────────────

describe('LayoutStore – subscribe', () => {
    test('throws when listener is not a function', () => {
        const store = new DockPanelLayoutStore();
        expect(() => store.subscribe('not-a-fn')).toThrow('Listener must be a function');
    });

    test('multiple subscribers all receive notifications', () => {
        const store = new DockPanelLayoutStore();
        const a = [], b = [];
        store.subscribe(l => a.push(l));
        store.subscribe(l => b.push(l));

        store.setState(DockLayoutConfiguration.createDefault());
        expect(a).toHaveLength(1);
        expect(b).toHaveLength(1);
    });

    test('returns an unsubscribe function that stops future notifications', () => {
        const store = new DockPanelLayoutStore();
        const calls = [];
        const unsub = store.subscribe(l => calls.push(l));
        unsub();

        store.setState(DockLayoutConfiguration.createDefault());
        expect(calls).toHaveLength(0);
    });

    test('surviving subscribers still receive notifications after one unsubscribes', () => {
        const store = new DockPanelLayoutStore();
        const a = [], b = [];
        const unsubA = store.subscribe(l => a.push(l));
        store.subscribe(l => b.push(l));

        unsubA();
        store.setState(DockLayoutConfiguration.createDefault());

        expect(a).toHaveLength(0);
        expect(b).toHaveLength(1);
    });
});

// ─── listener error isolation ─────────────────────────────────────────────────

describe('LayoutStore – listener error isolation', () => {
    test('a throwing listener does not prevent other listeners from being called', () => {
        const store = new DockPanelLayoutStore();
        const called = [];
        store.subscribe(() => { throw new Error('boom'); });
        store.subscribe(l => called.push(l));

        expect(() => store.setState(DockLayoutConfiguration.createDefault())).not.toThrow();
        expect(called).toHaveLength(1);
    });
});
