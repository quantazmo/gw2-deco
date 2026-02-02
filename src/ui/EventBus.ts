// @ts-nocheck
/**
 * EventBus
 * Simple pub/sub event system for decoupling components
 * Supports subscribe, publish, unsubscribe operations
 */

class EventBus {
    constructor() {
        this.subscribers = {};
        this.debugEnabled = true; // Enable debug logging
        console.log('[EventBus] 🚀 EventBus initialized');
    }

    /**
     * Subscribe to an event
     * @param {string} eventType - Event type to listen for
     * @param {Function} handler - Handler function to call when event is published
     * @returns {Function} Unsubscribe function
     */
    subscribe(eventType, handler) {
        if (typeof eventType !== 'string' || !eventType) {
            throw new Error('Event type must be a non-empty string');
        }

        if (typeof handler !== 'function') {
            throw new Error('Handler must be a function');
        }

        // Create subscribers array if it doesn't exist
        if (!this.subscribers[eventType]) {
            this.subscribers[eventType] = [];
        }

        // Add handler
        this.subscribers[eventType].push(handler);

        const subscriberCount = this.subscribers[eventType].length;
        if (this.debugEnabled) {
            console.log(`[EventBus] 📥 SUBSCRIBE: "${eventType}" (${subscriberCount} subscriber${subscriberCount > 1 ? 's' : ''})`);
            if (subscriberCount > 1) {
                console.log(`[EventBus] ⚠️  WARNING: Multiple subscribers (${subscriberCount}) for "${eventType}"`);
            }
        }

        // Return unsubscribe function
        return () => {
            this.unsubscribe(eventType, handler);
        };
    }

    /**
     * Publish an event to all subscribers
     * @param {string} eventType - Event type
     * @param {any} data - Event data to pass to handlers
     */
    publish(eventType, data) {
        if (typeof eventType !== 'string' || !eventType) {
            throw new Error('Event type must be a non-empty string');
        }

        const handlerCount = this.subscribers[eventType] ? this.subscribers[eventType].length : 0;

        if (this.debugEnabled) {
            console.log(`[EventBus] 📤 PUBLISH: "${eventType}" (${handlerCount} handler${handlerCount !== 1 ? 's' : ''})`, data);
        }

        // Call all handlers for this event type
        if (this.subscribers[eventType]) {
            this.subscribers[eventType].forEach((handler, index) => {
                try {
                    if (this.debugEnabled) {
                        console.log(`[EventBus]   ↳ Calling handler ${index + 1}/${handlerCount}`);
                    }
                    handler(data);
                } catch (error) {
                    console.error(`[EventBus] ❌ Error in event handler ${index + 1}/${handlerCount} for ${eventType}:`, error);
                }
            });
        } else {
            if (this.debugEnabled) {
                console.log(`[EventBus] ⚠️  No subscribers for "${eventType}"`);
            }
        }
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventType - Event type
     * @param {Function} handler - Handler function to remove
     */
    unsubscribe(eventType, handler) {
        if (!this.subscribers[eventType]) {
            if (this.debugEnabled) {
                console.log(`[EventBus] ❌ UNSUBSCRIBE failed: No subscribers for "${eventType}"`);
            }
            return;
        }

        const beforeCount = this.subscribers[eventType].length;
        const index = this.subscribers[eventType].indexOf(handler);
        if (index > -1) {
            this.subscribers[eventType].splice(index, 1);
        }
        const afterCount = this.subscribers[eventType].length;

        if (this.debugEnabled) {
            console.log(`[EventBus] 📤 UNSUBSCRIBE: "${eventType}" (${afterCount} remaining)`);
        }

        // Remove empty subscriber list
        if (this.subscribers[eventType].length === 0) {
            delete this.subscribers[eventType];
            if (this.debugEnabled) {
                console.log(`[EventBus] 🗑️  Removed empty subscriber list for "${eventType}"`);
            }
        }
    }

    /**
     * Check if there are subscribers for an event
     * @param {string} eventType - Event type
     * @returns {boolean}
     */
    hasSubscribers(eventType) {
        return !!(this.subscribers[eventType] && this.subscribers[eventType].length > 0);
    }

    /**
     * Get subscriber count for an event
     * @param {string} eventType - Event type
     * @returns {number}
     */
    getSubscriberCount(eventType) {
        return this.subscribers[eventType] ? this.subscribers[eventType].length : 0;
    }

    /**
     * Clear all subscribers (useful for testing)
     */
    clearAll() {
        this.subscribers = {};
    }

    /**
     * Clear subscribers for a specific event type
     * @param {string} eventType - Event type
     */
    clear(eventType) {
        if (this.subscribers[eventType]) {
            delete this.subscribers[eventType];
        }
    }
}

// Export as singleton
const eventBus = new EventBus();

export { EventBus, eventBus };
