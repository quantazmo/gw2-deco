/**
 * Mock fetch API for testing
 */
export function createMockFetch(responses = {}) {
    const mockFetch = jest.fn(async (url) => {
        const response = responses[url];

        if (!response) {
            return {
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: async () => ({ error: 'Not Found' })
            };
        }

        if (response.error) {
            throw new Error(response.error);
        }

        return {
            ok: response.status >= 200 && response.status < 300,
            status: response.status || 200,
            statusText: response.statusText || 'OK',
            json: async () => response.data
        };
    });

    return mockFetch;
}

/**
 * Create a mock fetch that simulates network errors
 */
export function createFailingFetch(errorMessage = 'Network error') {
    return jest.fn(async () => {
        throw new Error(errorMessage);
    });
}

/**
 * Create a mock fetch that succeeds after N failures
 */
export function createRetryableFetch(successAfter = 2, successData = {}) {
    let callCount = 0;

    return jest.fn(async () => {
        callCount++;

        if (callCount <= successAfter) {
            throw new Error('Network error');
        }

        return {
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => successData
        };
    });
}

/**
 * Create a mock fetch with delay simulation
 */
export function createDelayedFetch(delay = 100, data = {}) {
    return jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, delay));

        return {
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => data
        };
    });
}
