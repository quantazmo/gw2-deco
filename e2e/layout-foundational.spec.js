/**
 * Foundational layout e2e tests — Phase 2 baseline.
 *
 * Validates that:
 *   1. The DockManager renders the default binary-split-tree layout on load.
 *   2. The map panel occupies ≥ 50% of the viewport width (left side).
 *   3. All three sidebar panels (layers, decorationList, inspector) are visible
 *      and positioned to the right of the map panel.
 *
 * These tests serve as a regression baseline for all subsequent user-story phases.
 * They do not test any drag-and-drop behaviour — that is covered by us1+ specs.
 */

import { test, expect } from './fixtures.js';

test.describe('Foundational layout', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for ApplicationInitializer to complete and set the ready marker
        await page.waitForSelector('body[data-app-ready]', { timeout: 10_000, state: 'attached' });
    });

    test('dock-manager root is present and rendered', async ({ page }) => {
        const dockRoot = page.locator('#dock-manager-root');
        await expect(dockRoot).toBeVisible();

        // The root must contain at least one child node (the layout tree root)
        const childCount = await dockRoot.evaluate(el => el.children.length);
        expect(childCount).toBeGreaterThanOrEqual(1);
    });

    test('all four panels are visible in the default layout', async ({ page }) => {
        await expect(page.locator('.dock-region[data-panel-id="map"]')).toBeVisible();
        await expect(page.locator('.dock-region[data-panel-id="layers"]')).toBeVisible();
        await expect(page.locator('.dock-region[data-panel-id="decorationList"]')).toBeVisible();
        await expect(page.locator('.dock-region[data-panel-id="inspector"]')).toBeVisible();
    });

    test('map panel occupies at least 50% of the viewport width', async ({ page }) => {
        const mapWrapper = page.locator('.panel-wrapper[data-panel-id="map"]');
        await expect(mapWrapper).toBeVisible();

        const mapBox = await mapWrapper.boundingBox();
        const viewport = page.viewportSize();

        expect(mapBox).not.toBeNull();
        expect(mapBox.width).toBeGreaterThanOrEqual(viewport.width * 0.5);
    });

    test('three sidebar panels are positioned to the right of the map panel', async ({ page }) => {
        const mapWrapper = page.locator('.panel-wrapper[data-panel-id="map"]');
        const mapBox = await mapWrapper.boundingBox();
        expect(mapBox).not.toBeNull();

        const mapRightEdge = mapBox.x + mapBox.width;

        for (const panelId of ['layers', 'decorationList', 'inspector']) {
            const wrapper = page.locator(`.panel-wrapper[data-panel-id="${panelId}"]`);
            await expect(wrapper).toBeVisible();

            const box = await wrapper.boundingBox();
            expect(box, `Panel "${panelId}" bounding box should exist`).not.toBeNull();

            // The panel's left edge must start at or after the map panel's right edge
            expect(
                box.x,
                `Panel "${panelId}" (x=${box.x}) should start at or after map right edge (${mapRightEdge})`
            ).toBeGreaterThanOrEqual(mapRightEdge - 1); // 1px tolerance for rounding
        }
    });

    test('renders without console errors', async ({ page }) => {
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') errors.push(msg.text());
        });
        page.on('pageerror', err => errors.push(err.message));

        // Re-navigate so the error listeners are registered before page load
        await page.goto('/');
        await page.waitForSelector('body[data-app-ready]', { timeout: 10_000, state: 'attached' });

        expect(errors, `Console errors:\n${errors.join('\n')}`).toHaveLength(0);
    });
});
