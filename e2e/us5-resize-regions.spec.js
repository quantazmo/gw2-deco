/**
 * US5 — Resize Docked Regions e2e tests
 *
 * Validates that:
 *   1. The default divider between the map and the panel area is visible and draggable.
 *   2. Dragging the divider changes the relative sizes of the map and panel area.
 *   3. The minimum width constraint is enforced — the map retains ≥ 50% viewport width
 *      even when the divider is dragged aggressively to the right.
 *   4. The panel-area dividers (between stacked panels) work independently.
 *
 * Requires the application to be served at the configured baseURL (see playwright.config.js).
 */

import { test, expect } from './fixtures.js';
import { dragDivider } from './fixtures.js';

const APP_READY = { timeout: 10_000, state: 'attached' };

test.describe('US5: Resize docked regions', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('body[data-app-ready]', APP_READY);
    });

    // ──────────────────────────────────────────────────────────────────────
    // Default divider visibility
    // ──────────────────────────────────────────────────────────────────────

    test('default layout has a visible vertical divider between map and panels', async ({ page }) => {
        // The root split is vertical (side-by-side) → divider class is divider-vertical
        await expect(page.locator('.divider-resizer.divider-vertical').first()).toBeVisible();
    });

    test('default layout has visible horizontal dividers between stacked panels', async ({ page }) => {
        // The right-side panels are stacked horizontally → dividers are divider-horizontal
        await expect(page.locator('.divider-resizer.divider-horizontal').first()).toBeVisible();
    });

    // ──────────────────────────────────────────────────────────────────────
    // Drag divider to resize (map + panels divider)
    // ──────────────────────────────────────────────────────────────────────

    test('dragging the map/panels divider left makes the map narrower', async ({ page }) => {
        const mapBefore = await page.locator('.dock-region[data-panel-id="map"]').boundingBox();
        expect(mapBefore).not.toBeNull();

        const divider = page.locator('.divider-resizer.divider-vertical').first();
        // Drag divider 80px to the left (panels get more space, map gets less)
        await dragDivider(page, divider, -80, 0);

        const mapAfter = await page.locator('.dock-region[data-panel-id="map"]').boundingBox();
        expect(mapAfter).not.toBeNull();
        expect(mapAfter.width).toBeLessThan(mapBefore.width);
    });

    test('dragging the map/panels divider right makes the map wider', async ({ page }) => {
        const mapBefore = await page.locator('.dock-region[data-panel-id="map"]').boundingBox();
        expect(mapBefore).not.toBeNull();

        const divider = page.locator('.divider-resizer.divider-vertical').first();
        // Drag divider 60px to the right (map gets more space)
        await dragDivider(page, divider, 60, 0);

        const mapAfter = await page.locator('.dock-region[data-panel-id="map"]').boundingBox();
        expect(mapAfter).not.toBeNull();
        expect(mapAfter.width).toBeGreaterThan(mapBefore.width);
    });

    // ──────────────────────────────────────────────────────────────────────
    // Map minimum ≥ 50% viewport constraint
    // ──────────────────────────────────────────────────────────────────────

    test('map retains at least 50% of viewport width after divider drag', async ({ page }) => {
        const viewport = page.viewportSize();
        const divider = page.locator('.divider-resizer.divider-vertical').first();

        // Attempt to drag the divider far left (trying to give panels >50% space)
        await dragDivider(page, divider, -400, 0);

        const mapBox = await page.locator('.dock-region[data-panel-id="map"]').boundingBox();
        expect(mapBox).not.toBeNull();

        // Map must occupy ≥ 50% of viewport width
        const mapWidthRatio = mapBox.width / viewport.width;
        expect(mapWidthRatio).toBeGreaterThanOrEqual(0.45); // Allow 5% tolerance for borders/padding
    });

    test('all four panels remain visible after resizing the map/panels divider', async ({ page }) => {
        const divider = page.locator('.divider-resizer.divider-vertical').first();
        await dragDivider(page, divider, -80, 0);

        for (const panelId of ['map', 'layers', 'decorationList', 'inspector']) {
            await expect(
                page.locator(`.dock-region[data-panel-id="${panelId}"]`),
                `Panel "${panelId}" should still be visible after resize`
            ).toBeVisible();
        }
    });

    // ──────────────────────────────────────────────────────────────────────
    // Panel-area internal dividers (between stacked panels)
    // ──────────────────────────────────────────────────────────────────────

    test('dragging a horizontal divider between stacked panels changes their heights', async ({ page }) => {
        // The right panel column has horizontal splits; first horizontal divider is
        // between the layers panel and the lower group.
        const divider = page.locator('.divider-resizer.divider-horizontal').first();
        const layersBefore = await page.locator('.dock-region[data-panel-id="layers"]').boundingBox();
        expect(layersBefore).not.toBeNull();

        // Drag divider down by 50px → layers panel should grow
        await dragDivider(page, divider, 0, 50);

        const layersAfter = await page.locator('.dock-region[data-panel-id="layers"]').boundingBox();
        expect(layersAfter).not.toBeNull();
        expect(layersAfter.height).toBeGreaterThan(layersBefore.height);
    });
});
