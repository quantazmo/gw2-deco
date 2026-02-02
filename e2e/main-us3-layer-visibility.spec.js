/**
 * E2E Tests: US3 — Toggle Layer Visibility
 *
 * Covers:
 * - Load two layers → toggle Layer 1 visibility off → Layer 1 decorations hidden on map while Layer 2 remains visible
 * - Toggle back on → both visible
 * - Hidden layer shows dimmed visual indicator in Layer Panel
 */
import { test, expect } from './fixtures.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOMESTEAD_XML = path.resolve(__dirname, '../homestead.xml');

/**
 * Helper: wait for app to be ready and load a layout.
 */
async function loadLayout(page) {
    await page.goto('/');
    await page.waitForSelector('body[data-app-ready]', { state: 'attached', timeout: 15_000 });

    // Load the layout
    await page.locator('#file-input').setInputFiles(HOMESTEAD_XML);

    // Wait for layers to appear in the panel
    await expect(page.locator('#layers-list .layer-item').first()).toBeVisible({ timeout: 10_000 });
}

test.describe('US3: Toggle Layer Visibility', () => {

    test('toggling visibility hides layer decorations on map', async ({ page }) => {
        await loadLayout(page);

        // Verify decorations are rendered on map (SVG circles in the decorations group)
        const decorationCircles = page.locator('svg .decorations .decoration');
        const countBefore = await decorationCircles.count();
        expect(countBefore).toBeGreaterThan(0);

        // Click the visibility icon on the first layer to hide it
        const firstLayer = page.locator('#layers-list .layer-item').first();
        const visibilityIcon = firstLayer.locator('.visibility-icon');
        await visibilityIcon.click();

        // Wait for the visibility attribute to update
        await expect(visibilityIcon).toHaveAttribute('data-visible', 'false');

        // The layer group for the hidden layer should no longer be in the DOM
        // (MapViewer.renderLayers skips hidden layers)
        // Verify fewer decorations are rendered on map
        const countAfter = await decorationCircles.count();
        expect(countAfter).toBeLessThan(countBefore);
    });

    test('toggling visibility back on restores decorations on map', async ({ page }) => {
        await loadLayout(page);

        const decorationCircles = page.locator('svg .decorations .decoration');
        const countBefore = await decorationCircles.count();

        // Hide layer
        const firstLayer = page.locator('#layers-list .layer-item').first();
        const visibilityIcon = firstLayer.locator('.visibility-icon');
        await visibilityIcon.click();
        await expect(visibilityIcon).toHaveAttribute('data-visible', 'false');

        // Show layer again
        await visibilityIcon.click();
        await expect(visibilityIcon).toHaveAttribute('data-visible', 'true');

        // Decorations should be restored
        const countAfter = await decorationCircles.count();
        expect(countAfter).toBe(countBefore);
    });

    test('hidden layer shows dimmed visual indicator in Layer Panel', async ({ page }) => {
        await loadLayout(page);

        const firstLayer = page.locator('#layers-list .layer-item').first();

        // Initially not dimmed
        await expect(firstLayer).not.toHaveClass(/layer-hidden/);

        // Hide layer
        const visibilityIcon = firstLayer.locator('.visibility-icon');
        await visibilityIcon.click();

        // Should have dimmed class
        await expect(firstLayer).toHaveClass(/layer-hidden/);

        // Show layer again
        await visibilityIcon.click();

        // Dimmed class should be removed
        await expect(firstLayer).not.toHaveClass(/layer-hidden/);
    });
});
