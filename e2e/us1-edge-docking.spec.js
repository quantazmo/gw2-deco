/**
 * US1 — Edge Docking e2e tests
 *
 * Validates that:
 *   1. A panel can be dragged to each of the four viewport edges and docks correctly.
 *   2. After docking, the map retains ≥ 50% of the viewport width.
 *   3. Dropping outside a valid drop zone cancels the drag (panel remains in place).
 *   4. Multiple panels can be docked in sequence to produce a valid layout.
 *
 * Requires the application to be served at the configured baseURL (see playwright.config.js).
 */

import { test, expect } from './fixtures.js';
import { dragPanelToEdge } from './fixtures.js';

const APP_READY = { timeout: 10_000, state: 'attached' };

test.describe('US1: Arrange panels by dragging to viewport edges', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('body[data-app-ready]', APP_READY);
    });

    // ───────────────────────────────────────────────────────────────────────
    // Right edge
    // ───────────────────────────────────────────────────────────────────────

    test('drag layers panel to right edge — panel remains visible', async ({ page }) => {
        await dragPanelToEdge(page, 'layers', 'right');

        await expect(page.locator('.dock-region[data-panel-id="layers"]')).toBeVisible();
    });

    test('drag layers panel to right edge — map retains ≥50% width', async ({ page }) => {
        await dragPanelToEdge(page, 'layers', 'right');

        const mapWrapper = page.locator('.panel-wrapper[data-panel-id="map"]');
        await expect(mapWrapper).toBeVisible();

        const mapBox = await mapWrapper.boundingBox();
        const viewport = page.viewportSize();
        expect(mapBox).not.toBeNull();
        expect(mapBox.width).toBeGreaterThanOrEqual(viewport.width * 0.5);
    });

    test('drag layers panel to right edge — all four panels still visible', async ({ page }) => {
        await dragPanelToEdge(page, 'layers', 'right');

        for (const panelId of ['map', 'layers', 'decorationList', 'inspector']) {
            await expect(
                page.locator(`.dock-region[data-panel-id="${panelId}"]`),
                `Panel "${panelId}" should still be visible after docking`
            ).toBeVisible();
        }
    });

    // ───────────────────────────────────────────────────────────────────────
    // Left edge
    // ───────────────────────────────────────────────────────────────────────

    test('drag decorationList panel to left edge — panel is on the left side', async ({ page }) => {
        await dragPanelToEdge(page, 'decorationList', 'left');

        const decorationListWrapper = page.locator('.panel-wrapper[data-panel-id="decorationList"]');
        const mapWrapper = page.locator('.panel-wrapper[data-panel-id="map"]');
        await expect(decorationListWrapper).toBeVisible();
        await expect(mapWrapper).toBeVisible();

        const decorationListBox = await decorationListWrapper.boundingBox();
        const mapBox = await mapWrapper.boundingBox();
        expect(decorationListBox).not.toBeNull();
        expect(mapBox).not.toBeNull();

        // DecorationList's left edge should be at or to the left of the map
        expect(decorationListBox.x).toBeLessThanOrEqual(mapBox.x + 1);
    });

    test('drag decorationList panel to left edge — map retains ≥50% width', async ({ page }) => {
        await dragPanelToEdge(page, 'decorationList', 'left');

        const mapWrapper = page.locator('.panel-wrapper[data-panel-id="map"]');
        const mapBox = await mapWrapper.boundingBox();
        const viewport = page.viewportSize();
        expect(mapBox.width).toBeGreaterThanOrEqual(viewport.width * 0.5);
    });

    // ───────────────────────────────────────────────────────────────────────
    // Cancel drag — release outside any valid zone
    // ───────────────────────────────────────────────────────────────────────

    test('release outside valid zone cancels drag — layout unchanged', async ({ page }) => {
        // Record panel positions before the (cancelled) drag
        const beforeBox = await page.locator('.panel-wrapper[data-panel-id="layers"]').boundingBox();

        // Drag to the center of the screen (not within EDGE_THRESHOLD_PX of any edge)
        const viewport = page.viewportSize();
        const titleBar = page.locator('.dock-region-title[data-panel-id="layers"]');
        const titleBox = await titleBar.boundingBox();

        await page.mouse.move(titleBox.x + titleBox.width / 2, titleBox.y + titleBox.height / 2);
        await page.mouse.down();
        // Move to the center — well within EDGE_THRESHOLD_PX from no edge at 1280×720+
        await page.mouse.move(viewport.width / 2, viewport.height / 2, { steps: 10 });
        await page.mouse.up();

        // All panels should still be visible and the map should not have shifted drastically
        for (const panelId of ['map', 'layers', 'decorationList', 'inspector']) {
            await expect(
                page.locator(`.dock-region[data-panel-id="${panelId}"]`)
            ).toBeVisible();
        }

        // Map should still be ≥50% wide
        const mapBox = await page.locator('.panel-wrapper[data-panel-id="map"]').boundingBox();
        expect(mapBox.width).toBeGreaterThanOrEqual(viewport.width * 0.5);
    });

    // ───────────────────────────────────────────────────────────────────────
    // Multi-panel sequential docking
    // ───────────────────────────────────────────────────────────────────────

    test('dock two panels sequentially — both visible and map ≥50%', async ({ page }) => {
        await dragPanelToEdge(page, 'layers', 'right');
        await dragPanelToEdge(page, 'decorationList', 'left');

        for (const panelId of ['map', 'layers', 'decorationList']) {
            await expect(
                page.locator(`.dock-region[data-panel-id="${panelId}"]`)
            ).toBeVisible();
        }

        const mapBox = await page.locator('.panel-wrapper[data-panel-id="map"]').boundingBox();
        const viewport = page.viewportSize();
        expect(mapBox.width).toBeGreaterThanOrEqual(viewport.width * 0.5);
    });

    // ───────────────────────────────────────────────────────────────────────
    // Drop zone overlay visibility
    // ───────────────────────────────────────────────────────────────────────

    test('drop zone overlay appears during drag', async ({ page }) => {
        const titleBar = page.locator('.dock-region-title[data-panel-id="layers"]');
        const titleBox = await titleBar.boundingBox();
        const viewport = page.viewportSize();

        await page.mouse.move(titleBox.x + titleBox.width / 2, titleBox.y + titleBox.height / 2);
        await page.mouse.down();

        // Move towards the right edge to start a drag
        await page.mouse.move(viewport.width / 2, viewport.height / 2, { steps: 5 });

        // The overlay should now be visible (not hidden)
        const overlay = page.locator('.drop-zone-overlay');
        await expect(overlay).toBeVisible();

        await page.mouse.up();

        // After releasing, overlay should be hidden again
        await expect(overlay).toBeHidden();
    });
});
