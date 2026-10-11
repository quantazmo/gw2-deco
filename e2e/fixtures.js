/**
 * Playwright test fixtures with automatic GW2 API mocking.
 *
 * Intercepts all requests to https://api.guildwars2.com and serves static JSON
 * files from e2e/fixtures/api/<path>.json.
 *
 * URL-to-file mapping rules:
 *  - /v2/maps/1558            → e2e/fixtures/api/v2/maps/1558.json
 *  - /v1/map_floor.json?continent_id=2&floor=1
 *                             → e2e/fixtures/api/v1/map_floor/continent_id=2&floor=1.json
 *
 * If no fixture file exists for a request the route is aborted so tests fail
 * loudly rather than hitting the real network.
 *
 * To add a fixture for a new endpoint just drop the matching .json file under
 * e2e/fixtures/api/ and commit it alongside the test that needs it.
 */

import { test as base, expect } from '@playwright/test';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'api');

/**
 * Derive the fixture file path from a GW2 API request URL.
 *
 * @param {string} requestUrl
 * @returns {string} Absolute path to the expected .json fixture file
 */
function fixturePathFor(requestUrl) {
    const url = new URL(requestUrl);

    // Strip leading slash and any trailing .json extension from the pathname
    let filePath = url.pathname.replace(/^\//, '').replace(/\.json$/, '');

    if (url.search) {
        // Normalise query params: sort by key so param order doesn't matter
        const params = new URLSearchParams(url.search);
        const sortedParams = [...params.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('&');
        filePath = `${filePath}/${sortedParams}`;
    }

    return path.join(FIXTURES_DIR, `${filePath}.json`);
}

export const test = base.extend({
    /**
     * Override the default `page` fixture to transparently intercept every
     * request to api.guildwars2.com and serve the matching static fixture.
     */
    page: async ({ page }, use) => {
        await page.route('https://api.guildwars2.com/**', async (route) => {
            const fixtureFile = fixturePathFor(route.request().url());

            try {
                const body = await readFile(fixtureFile, 'utf-8');
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body,
                });
            } catch {
                // No fixture exists – abort loudly so missing fixtures surface immediately
                console.error(
                    `[gw2-mock] No fixture for ${route.request().url()}\n` +
                    `  Expected file: ${fixtureFile}`
                );
                await route.abort('failed');
            }
        });

        await use(page);
    },
});

export { expect };
