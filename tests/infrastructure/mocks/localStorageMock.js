/**
 * Mock localStorage for testing
 * Simulates browser localStorage API with in-memory storage
 */
export class LocalStorageMock {
    constructor() {
        this.store = {};
        this.quotaExceeded = false;
    }

    getItem(key) {
        return this.store[key] || null;
    }

    setItem(key, value) {
        if (this.quotaExceeded) {
            const error = new Error('QuotaExceededError');
            error.name = 'QuotaExceededError';
            throw error;
        }
        this.store[key] = String(value);
    }

    removeItem(key) {
        delete this.store[key];
    }

    clear() {
        this.store = {};
    }

    key(index) {
        const keys = Object.keys(this.store);
        return keys[index] || null;
    }

    get length() {
        return Object.keys(this.store).length;
    }

    // Test helpers
    simulateQuotaExceeded(enabled = true) {
        this.quotaExceeded = enabled;
    }

    getAll() {
        return { ...this.store };
    }
}

/**
 * Create a fresh localStorage mock instance
 */
export function createLocalStorageMock() {
    return new LocalStorageMock();
}

/**
 * Setup localStorage mock in global scope
 * Makes localStorage enumerable so Object.keys(localStorage) works
 */
export function setupLocalStorageMock() {
    const localStorageMock = new LocalStorageMock();

    // Create a proxy that makes the store keys enumerable
    const proxy = new Proxy(localStorageMock, {
        ownKeys(target) {
            return Object.keys(target.store);
        },
        getOwnPropertyDescriptor(target, prop) {
            if (prop in target.store) {
                return {
                    enumerable: true,
                    configurable: true,
                    value: target.store[prop]
                };
            }
            return Object.getOwnPropertyDescriptor(target, prop);
        },
        get(target, prop) {
            // If accessing a store key, return from store
            if (typeof prop === 'string' && prop in target.store) {
                return target.store[prop];
            }
            // Otherwise return from the actual object
            return target[prop];
        }
    });

    global.localStorage = proxy;
    return proxy;
}

/**
 * Restore original localStorage (if any)
 */
export function restoreLocalStorage() {
    delete global.localStorage;
}
