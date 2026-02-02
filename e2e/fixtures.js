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

// ─────────────────────────────────────────────────────────────────────────────
// Drag helper utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Drag a panel by its title bar to a viewport edge.
 *
 * The mouse moves in three steps (start → mid-screen → target) to give any
 * drag-start threshold a chance to fire before the cursor leaves the element.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} panelId   e.g. 'layers', 'decorationList'
 * @param {'left'|'right'|'top'|'bottom'} edge
 */
export async function dragPanelToEdge(page, panelId, edge) {
    // Use the generic drag-handle selector so this works whether the panel is
    // a standalone DockRegion (title bar) or inside a TabbedContainer (tab button).
    const titleBar = page.locator(`[data-drag-handle][data-panel-id="${panelId}"]`).first();
    const box = await titleBar.boundingBox();
    if (!box) throw new Error(`dragPanelToEdge: drag handle not found for panel "${panelId}"`);

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    const viewport = page.viewportSize();
    const EDGE_OFFSET = 10; // pixels inside viewport boundary
    let targetX, targetY;
    switch (edge) {
        case 'left': targetX = EDGE_OFFSET; targetY = viewport.height / 2; break;
        case 'right': targetX = viewport.width - EDGE_OFFSET; targetY = viewport.height / 2; break;
        case 'top': targetX = viewport.width / 2; targetY = EDGE_OFFSET; break;
        case 'bottom': targetX = viewport.width / 2; targetY = viewport.height - EDGE_OFFSET; break;
        default: throw new Error(`dragPanelToEdge: unknown edge "${edge}"`);
    }

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Intermediate step so drag-start threshold fires before reaching the edge
    await page.mouse.move(viewport.width / 2, viewport.height / 2, { steps: 5 });
    await page.mouse.move(targetX, targetY, { steps: 10 });
    await page.mouse.up();
}

/**
 * Drag a panel by its title bar and drop it onto the center of another panel.
 * Used to create tabbed containers (panel-center drop zone).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} dragPanelId    Panel being dragged
 * @param {string} targetPanelId  Panel to drop onto
 */
export async function dragPanelToCenter(page, dragPanelId, targetPanelId) {
    // Use the generic drag-handle selector so this works from standalone panels or tab buttons.
    const titleBar = page.locator(`[data-drag-handle][data-panel-id="${dragPanelId}"]`).first();
    const startBox = await titleBar.boundingBox();
    if (!startBox) throw new Error(`dragPanelToCenter: drag handle not found for panel "${dragPanelId}"`);

    // Try standalone dock-region first, fall back to tabbed container housing the target
    let targetRegion = page.locator(`.dock-region[data-panel-id="${targetPanelId}"]`);
    if (await targetRegion.count() === 0) {
        targetRegion = page.locator(`.tabbed-container`).filter({
            has: page.locator(`.tab-button[data-panel-id="${targetPanelId}"]`)
        });
    }
    const targetBox = await targetRegion.boundingBox();
    if (!targetBox) throw new Error(`dragPanelToCenter: target region not found for panel "${targetPanelId}"`);

    const startX = startBox.x + startBox.width / 2;
    const startY = startBox.y + startBox.height / 2;
    const targetX = targetBox.x + targetBox.width / 2;
    const targetY = targetBox.y + targetBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Initial move to exceed PanelDragManager drag-start threshold (5px)
    await page.mouse.move(startX, startY + 10, { steps: 3 });
    await page.mouse.move(targetX, targetY, { steps: 10 });
    await page.mouse.up();
}

/**
 * Drag a panel by its title bar and drop it onto an edge of another panel.
 * Used to create stacked (split) containers (panel-edge drop zone).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} dragPanelId    Panel being dragged
 * @param {string} targetPanelId  Panel to drop onto
 * @param {'left'|'right'|'top'|'bottom'} edge  Which edge of the target panel
 */
export async function dragPanelToEdgeOf(page, dragPanelId, targetPanelId, edge) {
    // Try standalone title bar first, fall back to tab button inside a tabbed container
    let handle = page.locator(`.dock-region-title[data-panel-id="${dragPanelId}"]`);
    let isTab = false;
    if (await handle.count() === 0) {
        handle = page.locator(`.tab-button[data-panel-id="${dragPanelId}"]`).first();
        isTab = true;
    }
    const startBox = await handle.boundingBox();
    if (!startBox) throw new Error(`dragPanelToEdgeOf: drag handle not found for panel "${dragPanelId}"`);

    // Try standalone dock-region first, fall back to tabbed container housing the target
    let targetRegion = page.locator(`.dock-region[data-panel-id="${targetPanelId}"]`);
    if (await targetRegion.count() === 0) {
        targetRegion = page.locator(`.tabbed-container`).filter({
            has: page.locator(`.tab-button[data-panel-id="${targetPanelId}"]`)
        });
    }
    const targetBox = await targetRegion.boundingBox();
    if (!targetBox) throw new Error(`dragPanelToEdgeOf: target region not found for panel "${targetPanelId}"`);

    const EDGE_OFFSET = 10; // pixels from panel boundary
    let targetX, targetY;
    switch (edge) {
        case 'left': targetX = targetBox.x + EDGE_OFFSET; targetY = targetBox.y + targetBox.height / 2; break;
        case 'right': targetX = targetBox.x + targetBox.width - EDGE_OFFSET; targetY = targetBox.y + targetBox.height / 2; break;
        case 'top': targetX = targetBox.x + targetBox.width / 2; targetY = targetBox.y + EDGE_OFFSET; break;
        case 'bottom': targetX = targetBox.x + targetBox.width / 2; targetY = targetBox.y + targetBox.height - EDGE_OFFSET; break;
        default: throw new Error(`dragPanelToEdgeOf: unknown edge "${edge}"`);
    }

    const startX = startBox.x + startBox.width / 2;
    const startY = startBox.y + startBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // For tab-sourced drags, move vertically out of the tab bar first so
    // PanelDragManager promotes it to a real drag (it waits for cursor to
    // leave the tab bar). For title bars, a small downward offset suffices.
    if (isTab) {
        await page.mouse.move(startX, startBox.y + startBox.height + 15, { steps: 3 });
    } else {
        await page.mouse.move(startX, startY + 10, { steps: 3 });
    }
    await page.mouse.move(targetX, targetY, { steps: 10 });
    await page.mouse.up();
}

/**
 * Drag a divider element by a pixel delta (for resize tests).
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} dividerLocator  Locator for the divider
 * @param {number} deltaX  Horizontal offset in pixels
 * @param {number} deltaY  Vertical offset in pixels
 */
export async function dragDivider(page, dividerLocator, deltaX, deltaY) {
    const box = await dividerLocator.boundingBox();
    if (!box) throw new Error('dragDivider: divider element not found');

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 10 });
    await page.mouse.up();
}
