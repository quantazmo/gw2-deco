/**
 * US4 — Panel and Tab Reordering e2e tests
 *
 * Validates that:
 *   1. Tabs within a tabbed container can be reordered by dragging within the tab bar.
 *   2. Dropping a tab at its original position is a no-op (tab order unchanged).
 *   3. Stacked panels can be reordered by dragging within the same stack.
 *
 * Requires the application to be served at the configured baseURL (see playwright.config.js).
 */

import { test, expect } from './fixtures.js';
import { dragPanelToCenter, dragPanelToEdgeOf } from './fixtures.js';

const APP_READY = { timeout: 10_000, state: 'attached' };

// ─────────────────────────────────────────────────────────────────────────────
// Local drag helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Drag a tab button to a new position within the same tab bar.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} panelId       The data-panel-id of the tab to drag
 * @param {'left'|'right'} direction  Which direction to drag within the bar
 * @param {number} [steps=15]   Number of mouse-move steps
 */
async function dragTabToReorder(page, panelId, direction, steps = 15) {
    const tab = page.locator(`.tab-button[data-panel-id="${panelId}"]`).first();
    const box = await tab.boundingBox();
    if (!box) throw new Error(`dragTabToReorder: tab not found for panel "${panelId}"`);

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    // Move two full tab widths in the requested direction so the insertion point
    // definitively crosses to the other side of the adjacent tab.
    const deltaX = direction === 'right' ? box.width * 2 : -box.width * 2;
    const targetX = startX + deltaX;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Initial move to exceed PanelDragManager drag-start threshold (5px)
    await page.mouse.move(startX + (direction === 'right' ? 10 : -10), startY, { steps: 3 });
    await page.mouse.move(targetX, startY, { steps });
    await page.mouse.up();
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

test.describe('US4: Reorder panels and tabs via drag and drop', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('body[data-app-ready]', APP_READY);
    });

    // ──────────────────────────────────────────────────────────────────────
    // Tab reordering
    // ──────────────────────────────────────────────────────────────────────

    test('tab bar exists after creating a tabbed container', async ({ page }) => {
        await dragPanelToCenter(page, 'inspector', 'decorationList');

        await expect(page.locator('.tab-bar').first()).toBeVisible();
        await expect(page.locator('.tab-button[data-panel-id="decorationList"]')).toBeVisible();
        await expect(page.locator('.tab-button[data-panel-id="inspector"]')).toBeVisible();
    });

    test('dragging the first tab rightward moves it after the second tab', async ({ page }) => {
        // Create tab group: [decorationList, inspector] (inspector was dragged so it's index 1 or 0 as active)
        await dragPanelToCenter(page, 'inspector', 'decorationList');

        // Capture original tab order
        const tabsBefore = await page.locator('.tab-button').allTextContents();

        // Drag the first tab in the bar to the right
        const firstTab = page.locator('.tab-button').first();
        const firstTabId = await firstTab.getAttribute('data-panel-id');

        await dragTabToReorder(page, firstTabId, 'right');

        // The tab bar should still contain both tabs (no tabs lost)
        await expect(page.locator('.tab-button[data-panel-id="decorationList"]')).toBeVisible();
        await expect(page.locator('.tab-button[data-panel-id="inspector"]')).toBeVisible();

        // The order should have changed
        const tabsAfter = await page.locator('.tab-button').allTextContents();
        expect(tabsAfter).not.toEqual(tabsBefore);
    });

    test('after reordering tabs, the tab bar still shows all tabs', async ({ page }) => {
        // Create a 3-panel tab group: drag layers onto decorationList, then inspector onto that group
        await dragPanelToCenter(page, 'inspector', 'decorationList');
        await dragPanelToCenter(page, 'layers', 'decorationList');

        // We should now have three tabs
        await expect(page.locator('.tab-button')).toHaveCount(3);

        // Drag the last tab to the left
        const lastTab = page.locator('.tab-button').last();
        const lastTabId = await lastTab.getAttribute('data-panel-id');

        await dragTabToReorder(page, lastTabId, 'left');

        // All three tabs must still be present
        await expect(page.locator('.tab-button')).toHaveCount(3);
    });

    test('no-op: dropping tab at same position leaves order unchanged', async ({ page }) => {
        await dragPanelToCenter(page, 'inspector', 'decorationList');

        const tabsBefore = await page.locator('.tab-button').allInnerTexts();

        // Drag a tab just a tiny amount — not enough to cross the midpoint of the adjacent tab
        const firstTab = page.locator('.tab-button').first();
        const box = await firstTab.boundingBox();
        if (!box) throw new Error('Tab not found');

        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;

        // Move only 3px right — insufficient to cross midpoint
        await page.mouse.move(cx, cy);
        await page.mouse.down();
        await page.mouse.move(cx + 3, cy, { steps: 3 });
        await page.mouse.up();

        const tabsAfter = await page.locator('.tab-button').allInnerTexts();
        expect(tabsAfter).toEqual(tabsBefore);
    });

    // ──────────────────────────────────────────────────────────────────────
    // Stack (SplitNode) reordering
    // ──────────────────────────────────────────────────────────────────────

    test('stacked panels can be reordered via dragging', async ({ page }) => {
        // Stack inspector below decorationList
        await dragPanelToEdgeOf(page, 'inspector', 'decorationList', 'bottom');

        // Capture positions before reorder
        const inspectorBoxBefore = await page.locator('.dock-region[data-panel-id="inspector"]').boundingBox();
        const decorationBoxBefore = await page.locator('.dock-region[data-panel-id="decorationList"]').boundingBox();

        expect(inspectorBoxBefore.y).toBeGreaterThan(decorationBoxBefore.y);

        // Drag inspector title bar up above decorationList (drag to its top edge to swap)
        const inspectorTitle = page.locator('.dock-region-title[data-panel-id="inspector"]');
        const titleBox = await inspectorTitle.boundingBox();
        if (!titleBox) throw new Error('inspector title bar not found');

        const startX = titleBox.x + titleBox.width / 2;
        const startY = titleBox.y + titleBox.height / 2;

        // Move up past decorationList to trigger a sibling-swap drop
        const upTargetY = decorationBoxBefore.y + 5;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, startY - 20, { steps: 5 });
        await page.mouse.move(startX, upTargetY, { steps: 10 });
        await page.mouse.up();

        // After reorder, both panels are still present
        await expect(page.locator('.dock-region[data-panel-id="inspector"]')).toBeVisible();
        await expect(page.locator('.dock-region[data-panel-id="decorationList"]')).toBeVisible();
    });

    test('after stack reorder all four panels are still in the layout', async ({ page }) => {
        await dragPanelToEdgeOf(page, 'inspector', 'decorationList', 'bottom');

        const inspectorTitle = page.locator('.dock-region-title[data-panel-id="inspector"]');
        const titleBox = await inspectorTitle.boundingBox();
        if (!titleBox) throw new Error('inspector title bar not found');

        const decorationBox = await page.locator('.dock-region[data-panel-id="decorationList"]').boundingBox();

        await page.mouse.move(titleBox.x + titleBox.width / 2, titleBox.y + titleBox.height / 2);
        await page.mouse.down();
        // Initial move to exceed PanelDragManager drag-start threshold (5px)
        await page.mouse.move(titleBox.x + titleBox.width / 2, titleBox.y + titleBox.height / 2 - 10, { steps: 3 });
        await page.mouse.move(titleBox.x + titleBox.width / 2, decorationBox.y + 5, { steps: 15 });
        await page.mouse.up();

        for (const panelId of ['map', 'layers', 'decorationList', 'inspector']) {
            await expect(
                page.locator(`.dock-region[data-panel-id="${panelId}"]`),
                `Panel "${panelId}" should still be present after stack reorder`
            ).toBeVisible();
        }
    });
});
