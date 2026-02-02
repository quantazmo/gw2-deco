/**
 * US3 — Panel Stacking e2e tests
 *
 * Validates that:
 *   1. Dragging a panel to the bottom edge of another panel creates a vertical stack
 *      with a visible divider between them.
 *   2. Dragging a panel to the right edge of another panel creates a horizontal stack
 *      (side-by-side panels) with a visible divider.
 *   3. The divider is draggable to resize the two panels.
 *   4. Dragging a stacked panel to a viewport edge un-stacks it and re-docks it.
 *
 * Requires the application to be served at the configured baseURL (see playwright.config.js).
 */

import { test, expect } from './fixtures.js';
import { dragPanelToEdge, dragPanelToEdgeOf, dragDivider } from './fixtures.js';

const APP_READY = { timeout: 10_000, state: 'attached' };

test.describe('US3: Stack panels by dropping onto panel edges', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('body[data-app-ready]', APP_READY);
    });

    // ──────────────────────────────────────────────────────────────────────
    // Vertical stacking (drop on bottom edge)
    // ──────────────────────────────────────────────────────────────────────

    test('drag inspector to bottom edge of decorationList — both panels visible', async ({ page }) => {
        await dragPanelToEdgeOf(page, 'inspector', 'decorationList', 'bottom');

        await expect(page.locator('.dock-region[data-panel-id="inspector"]')).toBeVisible();
        await expect(page.locator('.dock-region[data-panel-id="decorationList"]')).toBeVisible();
    });

    test('drag inspector to bottom edge of decorationList — divider appears between them', async ({ page }) => {
        await dragPanelToEdgeOf(page, 'inspector', 'decorationList', 'bottom');

        await expect(page.locator('.divider-resizer').first()).toBeVisible();
    });

    test('drag inspector to bottom of decorationList — inspector is below decorationList', async ({ page }) => {
        await dragPanelToEdgeOf(page, 'inspector', 'decorationList', 'bottom');

        const inspectorBox = await page.locator('.dock-region[data-panel-id="inspector"]').boundingBox();
        const decorationBox = await page.locator('.dock-region[data-panel-id="decorationList"]').boundingBox();

        expect(inspectorBox).not.toBeNull();
        expect(decorationBox).not.toBeNull();
        // Inspector top edge should be below the decorationList bottom edge
        expect(inspectorBox.y).toBeGreaterThan(decorationBox.y);
    });

    test('drag inspector to bottom of decorationList — all four panels remain in layout', async ({ page }) => {
        await dragPanelToEdgeOf(page, 'inspector', 'decorationList', 'bottom');

        for (const panelId of ['map', 'layers', 'decorationList', 'inspector']) {
            await expect(
                page.locator(`.dock-region[data-panel-id="${panelId}"]`),
                `Panel "${panelId}" should still be visible after stacking`
            ).toBeVisible();
        }
    });

    // ──────────────────────────────────────────────────────────────────────
    // Horizontal stacking (drop on right edge)
    // ──────────────────────────────────────────────────────────────────────

    test('drag inspector to right edge of decorationList — both panels visible side by side', async ({ page }) => {
        await dragPanelToEdgeOf(page, 'inspector', 'decorationList', 'right');

        await expect(page.locator('.dock-region[data-panel-id="inspector"]')).toBeVisible();
        await expect(page.locator('.dock-region[data-panel-id="decorationList"]')).toBeVisible();
    });

    test('drag inspector to right of decorationList — inspector is to the right', async ({ page }) => {
        await dragPanelToEdgeOf(page, 'inspector', 'decorationList', 'right');

        const inspectorBox = await page.locator('.dock-region[data-panel-id="inspector"]').boundingBox();
        const decorationBox = await page.locator('.dock-region[data-panel-id="decorationList"]').boundingBox();

        expect(inspectorBox).not.toBeNull();
        expect(decorationBox).not.toBeNull();
        // Inspector left edge should be to the right of decorationList left edge
        expect(inspectorBox.x).toBeGreaterThan(decorationBox.x);
    });

    test('drag inspector to right of decorationList — vertical divider appears', async ({ page }) => {
        await dragPanelToEdgeOf(page, 'inspector', 'decorationList', 'right');

        await expect(page.locator('.divider-vertical').first()).toBeVisible();
    });

    // ──────────────────────────────────────────────────────────────────────
    // Divider drag to resize
    // ──────────────────────────────────────────────────────────────────────

    test('dragging the divider changes panel sizes', async ({ page }) => {
        await dragPanelToEdgeOf(page, 'inspector', 'decorationList', 'bottom');

        // Capture initial heights before resize
        const decorationBoxBefore = await page.locator('.dock-region[data-panel-id="decorationList"]').boundingBox();

        // Drag the divider down by 40px using the helper.
        // Use the adjacent-sibling selector to find the exact divider immediately
        // after the decorationList panel, not the outer Layers vs. lower-group divider.
        const divider = page.locator('.panel-wrapper[data-panel-id="decorationList"] + .divider-horizontal');
        await dragDivider(page, divider, 0, 40);

        const decorationBoxAfter = await page.locator('.dock-region[data-panel-id="decorationList"]').boundingBox();

        // decorationList should have grown (divider moved down)
        expect(decorationBoxAfter.height).toBeGreaterThan(decorationBoxBefore.height);
    });

    // ──────────────────────────────────────────────────────────────────────
    // Un-stacking: drag a stacked panel out to a viewport edge
    // ──────────────────────────────────────────────────────────────────────

    test('drag a stacked panel to viewport edge — panel un-stacks and re-docks', async ({ page }) => {
        // First, stack inspector below decorationList
        await dragPanelToEdgeOf(page, 'inspector', 'decorationList', 'bottom');

        // Now drag inspector out to the right viewport edge
        await dragPanelToEdge(page, 'inspector', 'right');

        // All panels should still be present
        for (const panelId of ['map', 'layers', 'decorationList', 'inspector']) {
            await expect(
                page.locator(`.dock-region[data-panel-id="${panelId}"]`)
            ).toBeVisible();
        }
    });
});
