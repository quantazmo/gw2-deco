/**
 * US2 — Tabbed Panels e2e tests
 *
 * Validates that:
 *   1. Dragging a panel onto the center of another panel creates a tabbed container.
 *   2. Clicking a tab in the tab bar switches the active panel content.
 *   3. Two-panel tab groups revert to a single panel when one tab is dragged out
 *      (drag the last merged tab to a viewport edge to detach it).
 *   4. Dragging a tab onto another panel's edge extracts it into a stacked layout.
 *
 * Requires the application to be served at the configured baseURL (see playwright.config.js).
 */

import { test, expect } from './fixtures.js';
import { dragPanelToCenter, dragPanelToEdge, dragPanelToEdgeOf } from './fixtures.js';

const APP_READY = { timeout: 10_000, state: 'attached' };

test.describe('US2: Create tabbed panels by dropping onto existing panel', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('body[data-app-ready]', APP_READY);
    });

    // ──────────────────────────────────────────────────────────────────────
    // Tab group creation
    // ──────────────────────────────────────────────────────────────────────

    test('drag inspector onto decoration list — tabbed container appears', async ({ page }) => {
        await dragPanelToCenter(page, 'inspector', 'decorationList');

        // A tabbed container should be present
        const tabBar = page.locator('.tab-bar').first();
        await expect(tabBar).toBeVisible();
    });

    test('drag inspector onto decoration list — both panels appear as tabs', async ({ page }) => {
        await dragPanelToCenter(page, 'inspector', 'decorationList');

        // Both panels represented as tab buttons
        await expect(page.locator('.tab-button[data-panel-id="decorationList"]')).toBeVisible();
        await expect(page.locator('.tab-button[data-panel-id="inspector"]')).toBeVisible();
    });

    test('after tab-merge, all four panels are still present in the layout', async ({ page }) => {
        await dragPanelToCenter(page, 'inspector', 'decorationList');

        // Panels now live inside the tabbed container
        await expect(page.locator('.tab-button[data-panel-id="decorationList"]')).toBeVisible();
        await expect(page.locator('.tab-button[data-panel-id="inspector"]')).toBeVisible();
        // Map and layers still as individual DockRegion panels
        await expect(page.locator('.dock-region[data-panel-id="map"]')).toBeVisible();
        await expect(page.locator('.dock-region[data-panel-id="layers"]')).toBeVisible();
    });

    test('dragged panel (inspector) becomes the active tab after merge', async ({ page }) => {
        await dragPanelToCenter(page, 'inspector', 'decorationList');

        // The dragged panel's tab should be marked active
        const activeTab = page.locator('.tab-button.active[data-panel-id="inspector"]');
        await expect(activeTab).toBeVisible();
    });

    // ──────────────────────────────────────────────────────────────────────
    // Tab switching
    // ──────────────────────────────────────────────────────────────────────

    test('clicking a tab switches the active tab indicator', async ({ page }) => {
        await dragPanelToCenter(page, 'inspector', 'decorationList');

        // Inspector should be active initially (dragged = active)
        await expect(page.locator('.tab-button.active[data-panel-id="inspector"]')).toBeVisible();

        // Click decorationList tab
        await page.locator('.tab-button[data-panel-id="decorationList"]').click();

        // decorationList should now be active
        await expect(page.locator('.tab-button.active[data-panel-id="decorationList"]')).toBeVisible();
        // inspector should no longer be active
        await expect(page.locator('.tab-button[data-panel-id="inspector"]')).not.toHaveClass(/active/);
    });

    test('clicking inspector tab after switching back makes inspector active again', async ({ page }) => {
        await dragPanelToCenter(page, 'inspector', 'decorationList');

        // Switch to decorationList
        await page.locator('.tab-button[data-panel-id="decorationList"]').click();
        await expect(page.locator('.tab-button.active[data-panel-id="decorationList"]')).toBeVisible();

        // Switch back to inspector
        await page.locator('.tab-button[data-panel-id="inspector"]').click();
        await expect(page.locator('.tab-button.active[data-panel-id="inspector"]')).toBeVisible();
    });

    // ──────────────────────────────────────────────────────────────────────
    // Tab extraction (drag out to detach)
    // ──────────────────────────────────────────────────────────────────────

    test('dragging a tab out to an edge detaches it from the group', async ({ page }) => {
        // First create a tab group
        await dragPanelToCenter(page, 'inspector', 'decorationList');

        // Now drag inspector (via its tab) to the left edge
        await dragPanelToEdge(page, 'inspector', 'left');

        // The tabbed container should be gone (only 1 panel left = reverts to PanelNode)
        // decorationList should now be a standalone dock-region (no tab bar)
        await expect(page.locator('.dock-region[data-panel-id="decorationList"]')).toBeVisible();

        // inspector should be at the left edge as its own dock-region
        await expect(page.locator('.dock-region[data-panel-id="inspector"]')).toBeVisible();
    });

    test('after tab extraction all four panels are still visible', async ({ page }) => {
        await dragPanelToCenter(page, 'inspector', 'decorationList');
        await dragPanelToEdge(page, 'inspector', 'left');

        for (const panelId of ['map', 'layers', 'decorationList', 'inspector']) {
            await expect(
                page.locator(`.dock-region[data-panel-id="${panelId}"]`),
                `Panel "${panelId}" should be visible after tab extraction`
            ).toBeVisible();
        }
    });

    // ──────────────────────────────────────────────────────────────────────
    // Tab extraction to panel edge (tab → stacked layout)
    // ──────────────────────────────────────────────────────────────────────

    test('dragging a tab onto another panel edge creates a stacked layout', async ({ page }) => {
        // Create a tab group: [decorationList, inspector]
        await dragPanelToCenter(page, 'inspector', 'decorationList');

        // Drag inspector tab to the bottom edge of the layers panel
        await dragPanelToEdgeOf(page, 'inspector', 'layers', 'bottom');

        // Inspector should now be a standalone dock-region (extracted from the tab group)
        await expect(page.locator('.dock-region[data-panel-id="inspector"]')).toBeVisible();

        // decorationList should revert to a standalone dock-region (tab group dissolved)
        await expect(page.locator('.dock-region[data-panel-id="decorationList"]')).toBeVisible();

        // All four panels should be present
        for (const panelId of ['map', 'layers', 'decorationList', 'inspector']) {
            await expect(
                page.locator(`.dock-region[data-panel-id="${panelId}"]`),
                `Panel "${panelId}" should be visible after tab-to-stack extraction`
            ).toBeVisible();
        }
    });
});
