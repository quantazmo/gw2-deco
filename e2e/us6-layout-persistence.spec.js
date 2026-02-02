/**
 * US6 — Layout Persistence e2e tests
 *
 * Validates that:
 *   1. A custom layout arrangement survives a full page reload.
 *   2. Clicking "Reset Layout" restores the canonical default layout.
 *   3. Corrupt / missing stored data falls back silently to the default layout.
 *
 * Requires the application to be served at the configured baseURL (see playwright.config.js).
 */

import { test, expect } from './fixtures.js';
import { dragPanelToEdge } from './fixtures.js';

const APP_READY = { timeout: 10_000, state: 'attached' };

test.describe('US6: Persist and restore layout configuration', () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage before each test so tests are isolated
        await page.goto('/');
        await page.waitForSelector('body[data-app-ready]', APP_READY);
        await page.evaluate(() => {
            localStorage.removeItem('gw2-decoration-editor-layout');
        });
        await page.reload();
        await page.waitForSelector('body[data-app-ready]', APP_READY);
    });

    // ───────────────────────────────────────────────────────────────────────
    // Layout restore across reload
    // ───────────────────────────────────────────────────────────────────────

    test('custom layout is restored after page reload', async ({ page }) => {
        // Arrange: drag the layers panel to the left edge to create a custom layout
        await dragPanelToEdge(page, 'layers', 'left');

        // Confirm layers is now on the left side of the map
        const mapWrapper = page.locator('.panel-wrapper[data-panel-id="map"]');
        const layersWrapper = page.locator('.panel-wrapper[data-panel-id="layers"]');
        const mapBox1 = await mapWrapper.boundingBox();
        const layersBox1 = await layersWrapper.boundingBox();
        expect(layersBox1.x).toBeLessThan(mapBox1.x);

        // Act: reload the page
        await page.reload();
        await page.waitForSelector('body[data-app-ready]', APP_READY);

        // Assert: layers is still on the left after reload
        const mapBox2 = await mapWrapper.boundingBox();
        const layersBox2 = await layersWrapper.boundingBox();
        expect(layersBox2.x).toBeLessThan(mapBox2.x);
    });

    test('all four panels are visible after reload with custom layout', async ({ page }) => {
        // Arrange: dock a panel to the top edge
        await dragPanelToEdge(page, 'inspector', 'top');

        // Act: reload
        await page.reload();
        await page.waitForSelector('body[data-app-ready]', APP_READY);

        // Assert: all panels remain visible
        for (const panelId of ['map', 'layers', 'decorationList', 'inspector']) {
            await expect(
                page.locator(`.dock-region[data-panel-id="${panelId}"]`),
                `Panel "${panelId}" should be visible after reload`
            ).toBeVisible();
        }
    });

    // ───────────────────────────────────────────────────────────────────────
    // Reset Layout button
    // ───────────────────────────────────────────────────────────────────────

    test('Reset Layout button is present on the page', async ({ page }) => {
        await expect(page.locator('button[data-action="reset-layout"]')).toBeVisible();
    });

    test('clicking Reset Layout restores the default layout', async ({ page }) => {
        // Arrange: move layers to the left
        await dragPanelToEdge(page, 'layers', 'left');

        // Confirm layers is to the left of the map
        const mapWrapper = page.locator('.panel-wrapper[data-panel-id="map"]');
        const layersWrapper = page.locator('.panel-wrapper[data-panel-id="layers"]');
        const mapBoxCustom = await mapWrapper.boundingBox();
        const layersBoxCustom = await layersWrapper.boundingBox();
        expect(layersBoxCustom.x).toBeLessThan(mapBoxCustom.x);

        // Act: click Reset Layout
        await page.locator('button[data-action="reset-layout"]').click();

        // Assert: layers is back to the right of the map (default layout has map on left)
        const mapBoxReset = await mapWrapper.boundingBox();
        const layersBoxReset = await layersWrapper.boundingBox();
        expect(layersBoxReset.x).toBeGreaterThan(mapBoxReset.x);
    });

    test('after Reset Layout the map retains ≥50% viewport width', async ({ page }) => {
        // Arrange: create a custom layout
        await dragPanelToEdge(page, 'inspector', 'left');

        // Act: reset
        await page.locator('button[data-action="reset-layout"]').click();

        // Assert map constraint
        const mapWrapper = page.locator('.panel-wrapper[data-panel-id="map"]');
        const mapBox = await mapWrapper.boundingBox();
        const viewport = page.viewportSize();
        expect(mapBox.width).toBeGreaterThanOrEqual(viewport.width * 0.5);
    });

    // ───────────────────────────────────────────────────────────────────────
    // Corrupt / missing stored data
    // ───────────────────────────────────────────────────────────────────────

    test('corrupt localStorage data falls back to default layout', async ({ page }) => {
        // Arrange: write corrupt JSON to localStorage before load
        await page.evaluate(() => {
            localStorage.setItem('gw2-decoration-editor-layout', '{ corrupt json !!');
        });

        // Act: reload so ApplicationInitializer reads from localStorage
        await page.reload();
        await page.waitForSelector('body[data-app-ready]', APP_READY);

        // Assert: default layout is used — all four panels visible
        for (const panelId of ['map', 'layers', 'decorationList', 'inspector']) {
            await expect(
                page.locator(`.dock-region[data-panel-id="${panelId}"]`)
            ).toBeVisible();
        }

        // Map should still occupy ≥50% viewport width
        const mapBox = await page.locator('.panel-wrapper[data-panel-id="map"]').boundingBox();
        const viewport = page.viewportSize();
        expect(mapBox.width).toBeGreaterThanOrEqual(viewport.width * 0.5);
    });

    test('Reset Layout clears persisted layout so next reload uses default', async ({ page }) => {
        // Arrange: create custom layout then reset it
        await dragPanelToEdge(page, 'layers', 'bottom');
        await page.locator('button[data-action="reset-layout"]').click();

        // Act: reload page — should load with default because reset cleared storage
        await page.reload();
        await page.waitForSelector('body[data-app-ready]', APP_READY);

        // Assert: default layout — layers must be to the right of map
        const mapWrapper = page.locator('.panel-wrapper[data-panel-id="map"]');
        const layersWrapper = page.locator('.panel-wrapper[data-panel-id="layers"]');
        const mapBox = await mapWrapper.boundingBox();
        const layersBox = await layersWrapper.boundingBox();
        expect(layersBox.x).toBeGreaterThan(mapBox.x);
    });
});
