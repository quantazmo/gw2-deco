/**
 * Application Service that orchestrates command and query handling
 */
export class AppService {
    layout: any; // JS domain object � fully typed once domain migrates to TypeScript
    xmlAdapter: any; // JS domain object � fully typed once domain migrates to TypeScript
    appStore: any; // JS domain object � fully typed once domain migrates to TypeScript
    eventHandlers: Record<string, Array<(event: unknown) => void>>;
    commandHandlers: Map<string, { execute(command: unknown): unknown }>;
    queryHandlers: Map<string, { execute?(query: unknown): any; handle?(query: unknown): unknown }>; // JS domain object – fully typed once domain migrates to TypeScript

    constructor(layout: unknown, xmlAdapter: unknown) {
        console.log('[AppService] 🚀 AppService constructor called');
        this.layout = layout;
        this.xmlAdapter = xmlAdapter;
        this.appStore = null; // Will be set by ApplicationInitializer
        this.eventHandlers = {};
        this.commandHandlers = new Map();
        this.queryHandlers = new Map();
        console.log('[AppService] ✅ AppService constructed');
    }

    /**
     * Set the AppStore reference for dispatching updates
     * @param {AppStore} store - The AppStore instance
     */
    setAppStore(store: unknown): void {
        console.log('[AppService] ⚡ setAppStore() called');
        this.appStore = store;
        console.log('[AppService] ✅ AppStore reference set');
    }

    /**
     * Sets up all command and query handlers
     * Static factory method for ES module compatibility
     * @param {HomesteadLayout} layout - Domain layout
     * @param {XmlLayoutAdapter} xmlAdapter - XML adapter
     * @param {Object} handlers - Pre-instantiated handler instances
     * @returns {AppService} Initialized AppService instance
     */
    static async createAsync(layout: unknown, xmlAdapter: unknown): Promise<AppService> {
        console.log('[AppService] ⚡ createAsync() called - loading handlers...');
        // Import all handlers dynamically using ES modules
        const { CreateLayerHandler } = await import('./handlers/CreateLayerHandler.js');
        const { DeleteLayerHandler } = await import('./handlers/DeleteLayerHandler.js');
        const { RenameLayerHandler } = await import('./handlers/RenameLayerHandler.js');
        const { SetActiveLayerHandler } = await import('./handlers/SetActiveLayerHandler.js');
        const { LoadLayoutHandler } = await import('./handlers/LoadLayoutHandler.js');
        const { AddDecorationHandler } = await import('./handlers/AddDecorationHandler.js');
        const { DeleteDecorationHandler } = await import('./handlers/DeleteDecorationHandler.js');
        const { UpdateDecorationHandler } = await import('./handlers/UpdateDecorationHandler.js');
        const { ToggleLayerVisibilityHandler } = await import('./handlers/ToggleLayerVisibilityHandler.js');
        const { SetZoomHandler } = await import('./handlers/SetZoomHandler.js');
        const { SetPanHandler } = await import('./handlers/SetPanHandler.js');
        const { LoadAdditionalLayoutHandler } = await import('./handlers/LoadAdditionalLayoutHandler.js');
        const { SwitchMapHandler } = await import('./handlers/SwitchMapHandler.js');
        const { SetLayerColorHandler } = await import('./handlers/SetLayerColorHandler.js');

        const { GetLayersHandler } = await import('./handlers/GetLayersHandler.js');
        const { GetMapHandler } = await import('./handlers/GetMapHandler.js');
        const { GetLayoutHandler } = await import('./handlers/GetLayoutHandler.js');
        const { DockPanelHandler } = await import('./handlers/DockPanelHandler.js');

        console.log('[AppService]   ↳ All handlers imported, creating instance...');
        const instance = new AppService(layout, xmlAdapter);

        // Register command handlers
        console.log('[AppService]   ↳ Registering command handlers...');
        instance.commandHandlers.set(
            'CreateLayerCommand',
            new CreateLayerHandler(layout)
        );
        instance.commandHandlers.set(
            'DeleteLayerCommand',
            new DeleteLayerHandler(layout)
        );
        instance.commandHandlers.set(
            'RenameLayerCommand',
            new RenameLayerHandler(layout)
        );
        instance.commandHandlers.set(
            'SetActiveLayerCommand',
            new SetActiveLayerHandler(layout)
        );
        instance.commandHandlers.set(
            'LoadLayoutCommand',
            new LoadLayoutHandler(xmlAdapter)
        );
        instance.commandHandlers.set(
            'AddDecorationCommand',
            new AddDecorationHandler(layout)
        );
        instance.commandHandlers.set(
            'DeleteDecorationCommand',
            new DeleteDecorationHandler(layout)
        );
        instance.commandHandlers.set(
            'UpdateDecorationCommand',
            new UpdateDecorationHandler(layout)
        );
        instance.commandHandlers.set(
            'ToggleLayerVisibilityCommand',
            new ToggleLayerVisibilityHandler(layout)
        );
        instance.commandHandlers.set(
            'SetZoomCommand',
            new SetZoomHandler(layout)
        );
        instance.commandHandlers.set(
            'SetPanCommand',
            new SetPanHandler(layout)
        );
        instance.commandHandlers.set(
            'LoadAdditionalLayoutCommand',
            new LoadAdditionalLayoutHandler(layout, xmlAdapter)
        );
        instance.commandHandlers.set(
            'SetLayerColorCommand',
            new SetLayerColorHandler(layout)
        );
        // SwitchMapCommand handler is registered later via registerCommandHandler
        // after UndoRedoManager is created in ApplicationInitializer

        // Register query handlers
        console.log('[AppService]   ↳ Registering query handlers...');
        instance.queryHandlers.set('GetLayersQuery', new GetLayersHandler(layout));
        instance.queryHandlers.set('GetMapQuery', new GetMapHandler(layout));
        instance.queryHandlers.set(
            'GetLayoutQuery',
            new GetLayoutHandler(layout)
        );

        console.log(`[AppService] ✅ createAsync() complete - ${instance.commandHandlers.size} commands, ${instance.queryHandlers.size} queries registered`);
        return instance;
    }

    /**
     * Register an additional command handler at runtime.
     * Used to register handlers that depend on services created after AppService
     * (e.g. layout handlers that require LayoutStore).
     *
     * @param {string} commandType   The command class name (e.g. 'DockPanelCommand')
     * @param {object} handler       Handler instance with an execute() method
     */
    registerCommandHandler(commandType: string, handler: { execute(command: unknown): unknown }): void {
        this.commandHandlers.set(commandType, handler);
        console.log(`[AppService] ✅ Registered command handler for "${commandType}"`);
    }

    /**
     * Sets up all command and query handlers (removed CommonJS compatibility method)
     * @private
     */
    setupHandlers() {
        // Handlers are now set up via createAsync() using ES modules
        // This method is retained for interface compatibility but does nothing
    }

    /**
     * Executes a command
     * @param {object} command - The command to execute
     * @returns {*} The result of the command execution
     */
    executeCommand(command: { constructor: { name: string } }): unknown {
        const commandName = command.constructor.name;
        const handler = this.commandHandlers.get(commandName);

        if (!handler) {
            throw new Error(`No handler found for command: ${commandName}`);
        }

        const result = handler.execute(command);
        this.publishEvents();
        return result;
    }

    /**
     * Generic execute method that handles both command objects and plain objects with type property
     * @param {object} commandOrObject - The command or plain object with type property
     * @returns {*} The result of the command execution
     */
    async execute(commandOrObject: unknown): Promise<unknown> {
        console.log('[AppService] ⚡ execute() called with:', commandOrObject);

        if (!commandOrObject) {
            throw new Error('Command is required');
        }

        // Check if it's a plain object with type property (CQRS pattern)
        if (typeof (commandOrObject as { type?: string }).type === 'string') {
            const commandType = (commandOrObject as { type: string }).type;
            console.log(`[AppService]   ↳ Command type: "${commandType}"`);

            const handler = this.commandHandlers.get(commandType);

            if (!handler) {
                console.error(`[AppService] ❌ No handler found for command: ${commandType}`);
                throw new Error(`No handler found for command: ${commandType}`);
            }

            console.log(`[AppService]   ↳ Executing handler for "${commandType}"...`);
            // Pass the payload to the handler (await in case it's async)
            // The handler expects properties as direct object properties
            const result = await handler.execute((commandOrObject as { payload?: unknown }).payload);

            console.log(`[AppService]   ↳ Handler execution complete, publishing events...`);
            // Publish domain events - this will trigger event handlers
            // which update the AppStore (event-driven architecture)
            this.publishEvents();

            // NOTE: AppStore updates are now handled by domain event subscribers
            // in ApplicationInitializer.js. We don't dispatch directly here anymore
            // to avoid double-dispatching. This is the event-driven pattern.

            console.log(`[AppService] ✅ execute() complete for "${commandType}"`);
            return result;
        } else {
            // Assume it's a command instance
            console.log(`[AppService]   ↳ Executing command instance...`);
            return this.executeCommand(commandOrObject);
        }
    }

    /**
     * Dispatch command results to AppStore
     * @private
     */
    _dispatchToStore(commandType: string, payload: unknown, result: unknown): void {
        const store = this.appStore as { dispatch(action: string, data?: unknown): void } | null;
        if (!store) return;
        const p = payload as Record<string, unknown>;
        switch (commandType) {
            case 'CreateLayerCommand':
                if (result) {
                    store.dispatch('CREATE_LAYER', result);
                }
                break;
            case 'DeleteLayerCommand':
                store.dispatch('DELETE_LAYER', p['layerId']);
                break;
            case 'RenameLayerCommand':
                store.dispatch('RENAME_LAYER', payload);
                break;
            case 'AddDecorationCommand':
                if (result) {
                    store.dispatch('ADD_DECORATION', {
                        layerId: p['layerId'],
                        decoration: result
                    });
                }
                break;
            case 'DeleteDecorationCommand':
                store.dispatch('DELETE_DECORATION', payload);
                break;
            case 'LoadLayoutCommand':
                if (result) {
                    store.dispatch('LOAD_LAYOUT', result);
                }
                break;
            // Add more command types as needed
        }
    }

    /**
     * Executes a query
     * @param {object} query - The query to execute
     * @returns {*} The result of the query execution
     */
    executeQuery(query: { constructor: { name: string } }): unknown {
        const queryName = query.constructor.name;
        const handler = this.queryHandlers.get(queryName);

        if (!handler) {
            throw new Error(`No handler found for query: ${queryName}`);
        }

        return handler.execute!(query);
    }

    /**
     * Subscribes to domain events
     * @param {string} eventType - The event type to subscribe to
     * @param {Function} handler - The handler function
     */
    subscribe(eventType: string, handler: (event: unknown) => void): void {
        if (!this.eventHandlers[eventType]) {
            this.eventHandlers[eventType] = [];
        }
        this.eventHandlers[eventType].push(handler);
    }

    /**
     * Unsubscribes from domain events
     * @param {string} eventType - The event type to unsubscribe from
     * @param {Function} handler - The handler function
     */
    unsubscribe(eventType: string, handler: (event: unknown) => void): void {
        if (this.eventHandlers[eventType]) {
            this.eventHandlers[eventType] = this.eventHandlers[eventType].filter(
                h => h !== handler
            );
        }
    }

    /**
     * Publishes all pending domain events
     * @private
     */
    publishEvents() {
        console.log('[AppService] ⚡ publishEvents() called');
        // Get pending events from layout if it supports them
        const tmpl = this.layout as { getPendingEvents?(): unknown[]; clearPendingEvents?(): void };
        if (tmpl.getPendingEvents) {
            const events = tmpl.getPendingEvents();
            console.log(`[AppService]   ↳ Found ${events.length} pending event(s)`);
            events.forEach((event, index) => {
                console.log(`[AppService]   ↳ Publishing event ${index + 1}/${events.length}: ${(event as { constructor: { name: string } }).constructor.name}`, event);
                this.publish(event as { constructor: { name: string } });
            });
            if (tmpl.clearPendingEvents) {
                tmpl.clearPendingEvents();
                console.log('[AppService]   ↳ Pending events cleared');
            }
        } else {
            console.log('[AppService]   🚫 No pending events or getPendingEvents not supported');
        }
    }

    /**
     * Publishes a single domain event
     * @param {DomainEvent} event - The event to publish
     */
    publish(event: { constructor: { name: string } }): void {
        const eventType = event.constructor.name;
        const handlerCount = this.eventHandlers[eventType] ? this.eventHandlers[eventType].length : 0;
        console.log(`[AppService] 📤 publish("${eventType}") - ${handlerCount} handler(s)`);

        if (this.eventHandlers[eventType]) {
            this.eventHandlers[eventType].forEach((handler, index) => {
                try {
                    console.log(`[AppService]   ↳ Calling handler ${index + 1}/${handlerCount} for "${eventType}"`);
                    handler(event);
                } catch (error) {
                    console.error(
                        `[AppService] ❌ Error handling event ${eventType} (handler ${index + 1}/${handlerCount}):`,
                        error
                    );
                }
            });
        } else {
            console.log(`[AppService] ⚠️  No handlers registered for "${eventType}"`);
        }
    }
}

export default AppService;
