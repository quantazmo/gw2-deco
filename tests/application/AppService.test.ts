// @ts-nocheck
import { AppService } from '../../src/application/AppService.js';

function makeLayout(pendingEvents = [], hasClear = false) {
    const t = {
        getPendingEvents: vi.fn(() => pendingEvents),
    };
    if (hasClear) {
        t.clearPendingEvents = vi.fn();
    }
    return t;
}

describe('AppService', () => {
    describe('constructor', () => {
        it('initializes with layout and xmlAdapter', () => {
            const layout = makeLayout();
            const svc = new AppService(layout, null);
            expect(svc.layout).toBe(layout);
            expect(svc.xmlAdapter).toBeNull();
            expect(svc.appStore).toBeNull();
            expect(svc.commandHandlers).toBeInstanceOf(Map);
            expect(svc.queryHandlers).toBeInstanceOf(Map);
        });
    });

    describe('setAppStore', () => {
        it('sets the appStore reference', () => {
            const svc = new AppService(makeLayout(), null);
            const store = { dispatch: vi.fn() };
            svc.setAppStore(store);
            expect(svc.appStore).toBe(store);
        });
    });

    describe('registerCommandHandler', () => {
        it('adds handler to commandHandlers map', () => {
            const svc = new AppService(makeLayout(), null);
            const handler = { execute: vi.fn() };
            svc.registerCommandHandler('TestCommand', handler);
            expect(svc.commandHandlers.get('TestCommand')).toBe(handler);
        });
    });

    describe('setupHandlers', () => {
        it('is a no-op and does not throw', () => {
            const svc = new AppService(makeLayout(), null);
            expect(() => svc.setupHandlers()).not.toThrow();
        });
    });

    describe('executeCommand', () => {
        it('executes command by constructor name and returns result', () => {
            const svc = new AppService(makeLayout(), null);
            const mockResult = { id: 'test' };
            const mockHandler = { execute: vi.fn(() => mockResult) };

            class TestCmd { }
            svc.commandHandlers.set('TestCmd', mockHandler);

            const result = svc.executeCommand(new TestCmd());
            expect(result).toBe(mockResult);
            expect(mockHandler.execute).toHaveBeenCalled();
        });

        it('throws when no handler found for command', () => {
            const svc = new AppService(makeLayout(), null);
            class UnknownCmd { }
            expect(() => svc.executeCommand(new UnknownCmd())).toThrow(
                'No handler found for command: UnknownCmd'
            );
        });

        it('calls publishEvents after execution', () => {
            const layout = makeLayout();
            const svc = new AppService(layout, null);
            const mockHandler = { execute: vi.fn(() => null) };
            class TestCmd { }
            svc.commandHandlers.set('TestCmd', mockHandler);

            svc.executeCommand(new TestCmd());
            expect(layout.getPendingEvents).toHaveBeenCalled();
        });
    });

    describe('execute (async)', () => {
        it('throws when commandOrObject is null', async () => {
            const svc = new AppService(makeLayout(), null);
            await expect(svc.execute(null)).rejects.toThrow('Command is required');
        });

        it('throws when commandOrObject is undefined', async () => {
            const svc = new AppService(makeLayout(), null);
            await expect(svc.execute(undefined)).rejects.toThrow('Command is required');
        });

        it('throws when type is set but no handler found', async () => {
            const svc = new AppService(makeLayout(), null);
            await expect(svc.execute({ type: 'NoSuchCommand' })).rejects.toThrow(
                'No handler found for command: NoSuchCommand'
            );
        });

        it('executes command with type property and returns result', async () => {
            const svc = new AppService(makeLayout(), null);
            const mockHandler = { execute: vi.fn(async () => 42) };
            svc.commandHandlers.set('MyCommand', mockHandler);

            const result = await svc.execute({ type: 'MyCommand', payload: { val: 1 } });
            expect(result).toBe(42);
            expect(mockHandler.execute).toHaveBeenCalledWith({ val: 1 });
        });

        it('calls executeCommand when no type property (command instance path)', async () => {
            const svc = new AppService(makeLayout(), null);
            class InstanceCmd { }
            const mockHandler = { execute: vi.fn(() => 'instance-result') };
            svc.commandHandlers.set('InstanceCmd', mockHandler);

            const result = await svc.execute(new InstanceCmd());
            expect(result).toBe('instance-result');
        });
    });

    describe('executeQuery', () => {
        it('executes query by constructor name', () => {
            const svc = new AppService(makeLayout(), null);
            const mockResult = { data: 'test' };
            const mockHandler = { execute: vi.fn(() => mockResult) };
            class TestQuery { }
            svc.queryHandlers.set('TestQuery', mockHandler);

            const result = svc.executeQuery(new TestQuery());
            expect(result).toBe(mockResult);
        });

        it('throws when no handler found for query', () => {
            const svc = new AppService(makeLayout(), null);
            class UnknownQuery { }
            expect(() => svc.executeQuery(new UnknownQuery())).toThrow(
                'No handler found for query: UnknownQuery'
            );
        });
    });

    describe('subscribe / unsubscribe', () => {
        it('subscribes to event type', () => {
            const svc = new AppService(makeLayout(), null);
            const handler = vi.fn();
            svc.subscribe('TestEvent', handler);
            expect(svc.eventHandlers['TestEvent']).toContain(handler);
        });

        it('subscribes multiple handlers to same event type', () => {
            const svc = new AppService(makeLayout(), null);
            const h1 = vi.fn();
            const h2 = vi.fn();
            svc.subscribe('TestEvent', h1);
            svc.subscribe('TestEvent', h2);
            expect(svc.eventHandlers['TestEvent']).toHaveLength(2);
        });

        it('unsubscribes a specific handler', () => {
            const svc = new AppService(makeLayout(), null);
            const h1 = vi.fn();
            const h2 = vi.fn();
            svc.subscribe('TestEvent', h1);
            svc.subscribe('TestEvent', h2);
            svc.unsubscribe('TestEvent', h1);
            expect(svc.eventHandlers['TestEvent']).not.toContain(h1);
            expect(svc.eventHandlers['TestEvent']).toContain(h2);
        });

        it('unsubscribe on unknown event type does nothing', () => {
            const svc = new AppService(makeLayout(), null);
            expect(() => svc.unsubscribe('NoSuchEvent', vi.fn())).not.toThrow();
        });
    });

    describe('publishEvents', () => {
        it('calls publish for each pending event', () => {
            const mockEvent = { constructor: { name: 'MockEvent' } };
            const layout = makeLayout([mockEvent]);
            const svc = new AppService(layout, null);
            const handler = vi.fn();
            svc.subscribe('MockEvent', handler);

            svc.publishEvents();
            expect(handler).toHaveBeenCalledWith(mockEvent);
        });

        it('calls clearPendingEvents when defined on layout', () => {
            const mockEvent = { constructor: { name: 'TestEvent' } };
            const layout = makeLayout([mockEvent], true);
            const svc = new AppService(layout, null);

            svc.publishEvents();
            expect(layout.clearPendingEvents).toHaveBeenCalled();
        });

        it('does not fail when layout has no getPendingEvents', () => {
            const svc = new AppService({}, null);
            expect(() => svc.publishEvents()).not.toThrow();
        });
    });

    describe('publish', () => {
        it('calls all subscribed handlers for event type', () => {
            const svc = new AppService(makeLayout(), null);
            const h1 = vi.fn();
            const h2 = vi.fn();
            svc.subscribe('MyEvent', h1);
            svc.subscribe('MyEvent', h2);

            const event = { constructor: { name: 'MyEvent' } };
            svc.publish(event);
            expect(h1).toHaveBeenCalledWith(event);
            expect(h2).toHaveBeenCalledWith(event);
        });

        it('does not throw when no handlers registered for event', () => {
            const svc = new AppService(makeLayout(), null);
            const event = { constructor: { name: 'UnknownEvent' } };
            expect(() => svc.publish(event)).not.toThrow();
        });

        it('catches errors thrown by event handlers (line 313)', () => {
            const svc = new AppService(makeLayout(), null);
            const badHandler = vi.fn(() => { throw new Error('handler blew up'); });
            svc.subscribe('BoomEvent', badHandler);

            const event = { constructor: { name: 'BoomEvent' } };
            expect(() => svc.publish(event)).not.toThrow();
            expect(badHandler).toHaveBeenCalled();
        });

        it('continues calling other handlers after one throws', () => {
            const svc = new AppService(makeLayout(), null);
            const badHandler = vi.fn(() => { throw new Error('boom'); });
            const goodHandler = vi.fn();
            svc.subscribe('MultiEvent', badHandler);
            svc.subscribe('MultiEvent', goodHandler);

            const event = { constructor: { name: 'MultiEvent' } };
            svc.publish(event);
            expect(goodHandler).toHaveBeenCalledWith(event);
        });
    });

    describe('_dispatchToStore', () => {
        let svc;
        let mockAppStore;

        beforeEach(() => {
            svc = new AppService(makeLayout(), null);
            mockAppStore = { dispatch: vi.fn() };
            svc.appStore = mockAppStore;
        });

        it('dispatches CREATE_LAYER when result is truthy', () => {
            svc._dispatchToStore('CreateLayerCommand', {}, { id: 'layer1' });
            expect(mockAppStore.dispatch).toHaveBeenCalledWith('CREATE_LAYER', { id: 'layer1' });
        });

        it('does not dispatch CREATE_LAYER when result is falsy', () => {
            svc._dispatchToStore('CreateLayerCommand', {}, null);
            expect(mockAppStore.dispatch).not.toHaveBeenCalled();
        });

        it('dispatches DELETE_LAYER with layerId', () => {
            svc._dispatchToStore('DeleteLayerCommand', { layerId: 'abc' }, null);
            expect(mockAppStore.dispatch).toHaveBeenCalledWith('DELETE_LAYER', 'abc');
        });

        it('dispatches RENAME_LAYER with payload', () => {
            const payload = { layerId: '1', name: 'New Name' };
            svc._dispatchToStore('RenameLayerCommand', payload, null);
            expect(mockAppStore.dispatch).toHaveBeenCalledWith('RENAME_LAYER', payload);
        });

        it('dispatches ADD_DECORATION when result is truthy', () => {
            const payload = { layerId: 'l1' };
            const result = { id: 'd1' };
            svc._dispatchToStore('AddDecorationCommand', payload, result);
            expect(mockAppStore.dispatch).toHaveBeenCalledWith('ADD_DECORATION', {
                layerId: 'l1',
                decoration: result
            });
        });

        it('does not dispatch ADD_DECORATION when result is falsy', () => {
            svc._dispatchToStore('AddDecorationCommand', { layerId: 'l1' }, null);
            expect(mockAppStore.dispatch).not.toHaveBeenCalled();
        });

        it('dispatches DELETE_DECORATION with payload', () => {
            const payload = { decorationId: 'd1' };
            svc._dispatchToStore('DeleteDecorationCommand', payload, null);
            expect(mockAppStore.dispatch).toHaveBeenCalledWith('DELETE_DECORATION', payload);
        });

        it('dispatches LOAD_LAYOUT when result is truthy', () => {
            const result = { layout: 'data' };
            svc._dispatchToStore('LoadLayoutCommand', {}, result);
            expect(mockAppStore.dispatch).toHaveBeenCalledWith('LOAD_LAYOUT', result);
        });

        it('does not dispatch LOAD_LAYOUT when result is falsy', () => {
            svc._dispatchToStore('LoadLayoutCommand', {}, null);
            expect(mockAppStore.dispatch).not.toHaveBeenCalled();
        });

        it('does nothing for unknown command type', () => {
            svc._dispatchToStore('UnknownCommand', {}, {});
            expect(mockAppStore.dispatch).not.toHaveBeenCalled();
        });
    });
});
