/**
 * US7 — Ribbon Toolbar e2e tests
 *
 * Validates that:
 *   1. The ribbon toolbar renders with the correct three groups (File, View, Edit).
 *   2. Each group contains the expected buttons.
 *   3. The Export button is disabled when no file is loaded.
 *   4. The ribbon position and appearance are unchanged by panel docking operations.
 *
 * Per spec clarification: tests verify rendering and disabled states only.
 * Actual command effects (zoom, file load) are covered by unit / integration tests.
 */

import { test, expect } from './fixtures.js';
import { dragPanelToEdge } from './fixtures.js';

const APP_READY = { timeout: 10_000, state: 'attached' };

test.describe('US7: Ribbon toolbar with grouped commands', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('body[data-app-ready]', APP_READY);
    });

    // ───────────────────────────────────────────────────────────────────────
    // Rendering
    // ───────────────────────────────────────────────────────────────────────

    test('ribbon toolbar is present and visible', async ({ page }) => {
        const ribbon = page.locator('.ribbon-toolbar');
        await expect(ribbon).toBeVisible();
    });

    test('ribbon toolbar contains a File group', async ({ page }) => {
        const fileGroup = page.locator('.ribbon-group[data-group="file"]');
        await expect(fileGroup).toBeVisible();
        await expect(fileGroup.locator('.ribbon-group-label')).toHaveText('File');
    });

    test('ribbon toolbar contains a View group', async ({ page }) => {
        const viewGroup = page.locator('.ribbon-group[data-group="view"]');
        await expect(viewGroup).toBeVisible();
        await expect(viewGroup.locator('.ribbon-group-label')).toHaveText('View');
    });

    test('ribbon toolbar contains an Edit group', async ({ page }) => {
        const editGroup = page.locator('.ribbon-group[data-group="edit"]');
        await expect(editGroup).toBeVisible();
        await expect(editGroup.locator('.ribbon-group-label')).toHaveText('Edit');
    });

    test('ribbon toolbar contains a Layout group', async ({ page }) => {
        const layoutGroup = page.locator('.ribbon-group[data-group="layout"]');
        await expect(layoutGroup).toBeVisible();
        await expect(layoutGroup.locator('.ribbon-group-label')).toHaveText('Layout');
    });

    // ───────────────────────────────────────────────────────────────────────
    // File group buttons
    // ───────────────────────────────────────────────────────────────────────

    test('File group contains Load button', async ({ page }) => {
        const btn = page.locator('.ribbon-btn[data-action="ribbon-load"]');
        await expect(btn).toBeVisible();
    });

    test('File group contains Export button', async ({ page }) => {
        const btn = page.locator('.ribbon-btn[data-action="ribbon-export"]');
        await expect(btn).toBeVisible();
    });

    // ───────────────────────────────────────────────────────────────────────
    // View group buttons
    // ───────────────────────────────────────────────────────────────────────

    test('View group contains Zoom In button', async ({ page }) => {
        const btn = page.locator('.ribbon-btn[data-action="ribbon-zoom-in"]');
        await expect(btn).toBeVisible();
    });

    test('View group contains Zoom Out button', async ({ page }) => {
        const btn = page.locator('.ribbon-btn[data-action="ribbon-zoom-out"]');
        await expect(btn).toBeVisible();
    });

    test('View group contains Fit button', async ({ page }) => {
        const btn = page.locator('.ribbon-btn[data-action="ribbon-fit"]');
        await expect(btn).toBeVisible();
    });

    // ───────────────────────────────────────────────────────────────────────
    // Edit group buttons
    // ───────────────────────────────────────────────────────────────────────

    test('Edit group contains Undo button', async ({ page }) => {
        const btn = page.locator('.ribbon-btn[data-action="ribbon-undo"]');
        await expect(btn).toBeVisible();
    });

    test('Edit group contains Redo button', async ({ page }) => {
        const btn = page.locator('.ribbon-btn[data-action="ribbon-redo"]');
        await expect(btn).toBeVisible();
    });

    // ───────────────────────────────────────────────────────────────────────
    // Layout group buttons
    // ───────────────────────────────────────────────────────────────────────

    test('Layout group contains Reset Layout button', async ({ page }) => {
        const btn = page.locator('.ribbon-btn[data-action="reset-layout"]');
        await expect(btn).toBeVisible();
    });

    // ───────────────────────────────────────────────────────────────────────
    // Disabled states
    // ───────────────────────────────────────────────────────────────────────

    test('Export button is disabled when no file is loaded', async ({ page }) => {
        const exportBtn = page.locator('.ribbon-btn[data-action="ribbon-export"]');
        await expect(exportBtn).toBeDisabled();
    });

    test('Load button is always enabled regardless of file state', async ({ page }) => {
        const loadBtn = page.locator('.ribbon-btn[data-action="ribbon-load"]');
        await expect(loadBtn).not.toBeDisabled();
    });

    // ───────────────────────────────────────────────────────────────────────
    // Position stability
    // ───────────────────────────────────────────────────────────────────────

    test('ribbon occupies the full viewport width', async ({ page }) => {
        const ribbon = page.locator('.ribbon-toolbar');
        await expect(ribbon).toBeVisible();

        const box = await ribbon.boundingBox();
        const viewport = page.viewportSize();
        expect(box).not.toBeNull();
        expect(box.width).toBeCloseTo(viewport.width, -1);
    });

    test('ribbon is positioned at the top of the viewport', async ({ page }) => {
        const ribbon = page.locator('.ribbon-toolbar');
        await expect(ribbon).toBeVisible();

        const box = await ribbon.boundingBox();
        expect(box).not.toBeNull();
        expect(box.y).toBeCloseTo(0, 0);
    });

    test('ribbon height is 80px', async ({ page }) => {
        const ribbon = page.locator('.ribbon-toolbar');
        const box = await ribbon.boundingBox();
        expect(box).not.toBeNull();
        expect(box.height).toBe(80);
    });

    test('ribbon position is unchanged after panel docking operation', async ({ page }) => {
        const ribbon = page.locator('.ribbon-toolbar');
        const boxBefore = await ribbon.boundingBox();

        // Perform a docking operation
        await dragPanelToEdge(page, 'layers', 'right');

        const boxAfter = await ribbon.boundingBox();
        expect(boxAfter).not.toBeNull();
        expect(boxAfter.y).toBe(boxBefore.y);
        expect(boxAfter.width).toBe(boxBefore.width);
        expect(boxAfter.height).toBe(boxBefore.height);
    });
});
