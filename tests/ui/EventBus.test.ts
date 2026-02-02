// @ts-nocheck
/**
 * Tests for src/ui/EventBus.js
 */
import { EventBus } from '../../src/ui/EventBus.js';

describe('EventBus', () => {
    let bus;

    beforeEach(() => {
        bus = new EventBus();
        // Silence console output during tests
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── subscribe ─────────────────────────────────────────────────────────────
    describe('subscribe', () => {
        test('subscribes handler and returns unsubscribe function', () => {
            const handler = vi.fn();
            const unsub = bus.subscribe('test:event', handler);
            expect(typeof unsub).toBe('function');
        });

        test('throws for non-string event type', () => {
            expect(() => bus.subscribe(42, () => { })).toThrow();
            expect(() => bus.subscribe('', () => { })).toThrow();
        });

        test('throws for non-function handler', () => {
            expect(() => bus.subscribe('event', 'not-a-fn')).toThrow();
        });

        test('unsubscribe function removes the handler', () => {
            const handler = vi.fn();
            const unsub = bus.subscribe('x', handler);
            unsub();
            bus.publish('x', 'data');
            expect(handler).not.toHaveBeenCalled();
        });

        test('multiple subscribers for same event', () => {
            const h1 = vi.fn();
            const h2 = vi.fn();
            bus.subscribe('ev', h1);
            bus.subscribe('ev', h2);
            bus.publish('ev', 1);
            expect(h1).toHaveBeenCalledWith(1);
            expect(h2).toHaveBeenCalledWith(1);
        });
    });

    // ── publish ───────────────────────────────────────────────────────────────
    describe('publish', () => {
        test('calls subscriber with data', () => {
            const handler = vi.fn();
            bus.subscribe('msg', handler);
            bus.publish('msg', { foo: 'bar' });
            expect(handler).toHaveBeenCalledWith({ foo: 'bar' });
        });

        test('publishes to event with no subscribers without error', () => {
            expect(() => bus.publish('no-subscribers', {})).not.toThrow();
        });

        test('throws for non-string event type', () => {
            expect(() => bus.publish(null, {})).toThrow();
            expect(() => bus.publish('', {})).toThrow();
        });

        test('handler errors are caught and logged, not propagated', () => {
            const badHandler = vi.fn(() => { throw new Error('boom'); });
            const goodHandler = vi.fn();
            bus.subscribe('err-event', badHandler);
            bus.subscribe('err-event', goodHandler);
            expect(() => bus.publish('err-event', {})).not.toThrow();
            expect(goodHandler).toHaveBeenCalled();
        });
    });

    // ── unsubscribe ───────────────────────────────────────────────────────────
    describe('unsubscribe', () => {
        test('removes specific handler', () => {
            const h = vi.fn();
            bus.subscribe('ev', h);
            bus.unsubscribe('ev', h);
            bus.publish('ev', null);
            expect(h).not.toHaveBeenCalled();
        });

        test('no-op when event has no subscribers', () => {
            expect(() => bus.unsubscribe('unknown', () => { })).not.toThrow();
        });

        test('no-op when handler is not registered', () => {
            bus.subscribe('ev', () => { });
            expect(() => bus.unsubscribe('ev', () => { })).not.toThrow();
        });

        test('cleans up empty subscriber list after last unsubscribe', () => {
            const h = vi.fn();
            bus.subscribe('ev', h);
            bus.unsubscribe('ev', h);
            expect(bus.hasSubscribers('ev')).toBe(false);
        });
    });

    // ── hasSubscribers / getSubscriberCount ───────────────────────────────────
    describe('hasSubscribers / getSubscriberCount', () => {
        test('hasSubscribers returns false for unknown event', () => {
            expect(bus.hasSubscribers('none')).toBe(false);
        });

        test('hasSubscribers returns true after subscribe', () => {
            bus.subscribe('ev', () => { });
            expect(bus.hasSubscribers('ev')).toBe(true);
        });

        test('getSubscriberCount returns 0 for unknown event', () => {
            expect(bus.getSubscriberCount('none')).toBe(0);
        });

        test('getSubscriberCount returns correct count', () => {
            bus.subscribe('ev', () => { });
            bus.subscribe('ev', () => { });
            expect(bus.getSubscriberCount('ev')).toBe(2);
        });
    });

    // ── clearAll / clear ──────────────────────────────────────────────────────
    describe('clearAll / clear', () => {
        test('clearAll removes all subscribers', () => {
            bus.subscribe('a', () => { });
            bus.subscribe('b', () => { });
            bus.clearAll();
            expect(bus.hasSubscribers('a')).toBe(false);
            expect(bus.hasSubscribers('b')).toBe(false);
        });

        test('clear removes subscribers for specific event', () => {
            bus.subscribe('a', () => { });
            bus.subscribe('b', () => { });
            bus.clear('a');
            expect(bus.hasSubscribers('a')).toBe(false);
            expect(bus.hasSubscribers('b')).toBe(true);
        });

        test('clear is no-op for non-existent event', () => {
            expect(() => bus.clear('nonexistent')).not.toThrow();
        });
    });

    // ── debugEnabled toggle ───────────────────────────────────────────────────
    describe('debugEnabled flag', () => {
        test('can disable debug logging', () => {
            bus.debugEnabled = false;
            const h = vi.fn();
            bus.subscribe('ev', h);
            bus.publish('ev', 42);
            expect(h).toHaveBeenCalledWith(42);
        });
    });
});
