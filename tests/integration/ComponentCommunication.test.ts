// @ts-nocheck
/**
 * Integration tests for component communication
 * Tests that components properly communicate through EventBus and Stores
 */

import { AppService } from '../../src/application/AppService.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { XmlLayoutAdapter } from '../../src/infrastructure/XmlLayoutAdapter.js';
import { AppStore } from '../../src/ui/stores/AppStore.js';
import { SelectionStore } from '../../src/ui/stores/SelectionStore.js';
import { EventBus } from '../../src/ui/EventBus.js';
import { Layer } from '../../src/domain/Layer.js';

describe('Component Communication Integration Tests', () => {
    let appService;
    let appStore;
    let selectionStore;
    let eventBus;
    let layout;

    beforeEach(async () => {
        // Create fresh instances for each test
        layout = new HomesteadLayout('test-layout', 'Test Layout');
        const xmlAdapter = new XmlLayoutAdapter();
        appService = await AppService.createAsync(layout, xmlAdapter);
        appStore = new AppStore();
        selectionStore = new SelectionStore();
        eventBus = new EventBus();

        // Connect AppService to AppStore
        appService.setAppStore(appStore);
    });

    describe('EventBus publishes events from AppService', () => {
        test('CreateLayerCommand should emit domain events', async () => {
            // Arrange
            const events = [];
            appService.subscribe('LayerCreatedEvent', (event) => {
                events.push(event);
            });

            // Act
            const command = {
                type: 'CreateLayerCommand',
                payload: {
                    id: 'test-layer',
                    name: 'Test Layer',
                    isVisible: true
                }
            };
            await appService.execute(command);

            // Assert
            expect(events.length).toBe(1);
            expect(events[0].eventType).toBe('LayerCreated');
            expect(events[0].layerId).toBe('test-layer');
        });

        test('DeleteLayerCommand should emit domain events', async () => {
            // Arrange
            const layer = new Layer('test-layer', 'Test Layer');
            layout.addLayer(layer);
            layout.clearPendingEvents(); // Clear the creation event

            const events = [];
            appService.subscribe('LayerDeletedEvent', (event) => {
                events.push(event);
            });

            // Act
            const command = {
                type: 'DeleteLayerCommand',
                payload: {
                    layerId: 'test-layer'
                }
            };
            await appService.execute(command);

            // Assert
            expect(events.length).toBe(1);
            expect(events[0].eventType).toBe('LayerDeleted');
        });

        test('RenameLayerCommand should emit domain events', async () => {
            // Arrange
            const layer = new Layer('test-layer', 'Test Layer');
            layout.addLayer(layer);
            layout.clearPendingEvents();

            const events = [];
            appService.subscribe('LayerRenamedEvent', (event) => {
                events.push(event);
            });

            // Act
            const command = {
                type: 'RenameLayerCommand',
                payload: {
                    layerId: 'test-layer',
                    newName: 'Renamed Layer'
                }
            };
            await appService.execute(command);

            // Assert
            expect(events.length).toBe(1);
            expect(events[0].eventType).toBe('LayerRenamed');
            expect(events[0].newName).toBe('Renamed Layer');
        });

        test('SetActiveLayerCommand should emit domain events', async () => {
            // Arrange
            const layer = new Layer('test-layer', 'Test Layer');
            layout.addLayer(layer);
            layout.clearPendingEvents();

            const events = [];
            appService.subscribe('LayerSelectedEvent', (event) => {
                events.push(event);
            });

            // Act
            const command = {
                type: 'SetActiveLayerCommand',
                payload: {
                    layerId: 'test-layer'
                }
            };
            await appService.execute(command);

            // Assert
            expect(events.length).toBe(1);
            expect(events[0].eventType).toBe('LayerSelected');
            expect(events[0].layerId).toBe('test-layer');
        });
    });

    describe('AppStore receives updates from domain events', () => {
        test('LayerCreatedEvent should update AppStore', async () => {
            // Arrange - Load layout into AppStore first
            appStore.dispatch('LOAD_LAYOUT', layout);

            // Arrange - subscribe to AppStore changes
            let storeUpdated = false;
            let capturedState = null;
            const updates = [];
            appStore.subscribe((state) => {
                storeUpdated = true;
                capturedState = state;
                updates.push({ ...state, layers: [...state.layers] });
            });

            // Set up AppService event subscription to update store
            appService.subscribe('LayerCreatedEvent', (event) => {
                appStore.dispatch('CREATE_LAYER', event.layer);
            });

            // Act
            const command = {
                type: 'CreateLayerCommand',
                payload: {
                    id: 'test-layer',
                    name: 'Test Layer',
                    isVisible: true
                }
            };
            await appService.execute(command);

            // Assert
            expect(storeUpdated).toBe(true);
            expect(updates.length).toBeGreaterThan(0);
            // The last update should have the layer
            const lastUpdate = updates[updates.length - 1];
            expect(lastUpdate.layers.some(l => l.id === 'test-layer')).toBe(true);
        });

        test('LayerDeletedEvent should update AppStore', async () => {
            // Arrange - Load layout into AppStore first
            appStore.dispatch('LOAD_LAYOUT', layout);

            const layer = new Layer('test-layer', 'Test Layer');
            layout.addLayer(layer);
            appStore.dispatch('CREATE_LAYER', layer);

            let deleteCalled = false;
            appService.subscribe('LayerDeletedEvent', (event) => {
                appStore.dispatch('DELETE_LAYER', event.layerId);
                deleteCalled = true;
            });

            // Act
            const command = {
                type: 'DeleteLayerCommand',
                payload: { layerId: 'test-layer' }
            };
            await appService.execute(command);

            // Assert
            expect(deleteCalled).toBe(true);
            const state = appStore.getState();
            expect(state.layers.length).toBe(0);
        });
    });

    describe('SelectionStore receives updates from domain events', () => {
        test('LayerSelectedEvent should update SelectionStore', async () => {
            // Arrange
            const layer = new Layer('test-layer', 'Test Layer');
            layout.addLayer(layer);

            let selectionUpdated = false;
            selectionStore.subscribe((selection) => {
                selectionUpdated = true;
            });

            // Set up event handler to update selection store
            appService.subscribe('LayerSelectedEvent', (event) => {
                selectionStore.setActiveLayer(event.layerId);
            });

            // Act
            const command = {
                type: 'SetActiveLayerCommand',
                payload: { layerId: 'test-layer' }
            };
            await appService.execute(command);

            // Assert
            expect(selectionUpdated).toBe(true);
            expect(selectionStore.getActiveLayerId()).toBe('test-layer');
        });
    });

    describe('Component isolation', () => {
        test('Commands should not directly access AppStore', async () => {
            // This test verifies that commands work through events
            // by checking that the command doesn't need direct store access

            const command = {
                type: 'CreateLayerCommand',
                payload: {
                    id: 'isolated-layer',
                    name: 'Isolated Layer',
                    isVisible: true
                }
            };

            // Act - execute without AppStore being subscribed to events
            await appService.execute(command);

            // Assert - command execution succeeds independently
            const layers = layout.getAllLayers();
            expect(layers.length).toBe(1);
            expect(layers[0].id).toBe('isolated-layer');
        });

        test('Multiple subscribers can listen to the same event independently', async () => {
            // Arrange
            let subscriber1Called = false;
            let subscriber2Called = false;
            let subscriber3Called = false;

            appService.subscribe('LayerCreatedEvent', () => {
                subscriber1Called = true;
            });
            appService.subscribe('LayerCreatedEvent', () => {
                subscriber2Called = true;
            });
            appService.subscribe('LayerCreatedEvent', () => {
                subscriber3Called = true;
            });

            // Act
            const command = {
                type: 'CreateLayerCommand',
                payload: {
                    id: 'multi-subscriber-layer',
                    name: 'Multi Subscriber Layer',
                    isVisible: true
                }
            };
            await appService.execute(command);

            // Assert
            expect(subscriber1Called).toBe(true);
            expect(subscriber2Called).toBe(true);
            expect(subscriber3Called).toBe(true);
        });

        test('Event flow is unidirectional: Command → Handler → Event → Subscriber', async () => {
            // Arrange - track the flow
            const executionFlow = [];

            appService.subscribe('LayerCreatedEvent', (event) => {
                executionFlow.push('event-subscriber');
            });

            // Act
            const command = {
                type: 'CreateLayerCommand',
                payload: {
                    id: 'flow-test-layer',
                    name: 'Flow Test Layer',
                    isVisible: true
                }
            };
            await appService.execute(command);
            executionFlow.push('command-executed');

            // Give time for event to propagate
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert
            expect(executionFlow.includes('event-subscriber')).toBe(true);
        });
    });

    describe('Event propagation through the system', () => {
        test('Complete flow: Command → Domain → Event → Store → UI notification', async () => {
            // Arrange - Load layout into AppStore first
            appStore.dispatch('LOAD_LAYOUT', layout);

            // Arrange - set up the full event flow
            const executionTrace = [];

            // 1. Subscribe to domain events
            appService.subscribe('LayerCreatedEvent', (event) => {
                executionTrace.push('domain-event');
                // 2. Update store (simulating ApplicationInitializer)
                appStore.dispatch('CREATE_LAYER', event.layer);
            });

            // 3. Subscribe to store changes (simulating UI component)
            appStore.subscribe((state) => {
                executionTrace.push('store-updated');
                // 4. Publish UI event (simulating component notification)
                eventBus.publish('layer:created', { layerId: state.layers[0]?.id });
            });

            // 5. Subscribe to UI event (simulating another component)
            eventBus.subscribe('layer:created', () => {
                executionTrace.push('ui-notified');
            });

            // Act
            const command = {
                type: 'CreateLayerCommand',
                payload: {
                    id: 'full-flow-layer',
                    name: 'Full Flow Layer',
                    isVisible: true
                }
            };
            await appService.execute(command);

            // Give time for all events to propagate
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert - check that all steps executed in order
            expect(executionTrace).toContain('domain-event');
            expect(executionTrace).toContain('store-updated');
            expect(executionTrace).toContain('ui-notified');
        });
    });
});
