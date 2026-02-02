/**
 * E2E Tests: US9 — Create New Empty Layer
 *
 * Covers:
 * - Click "New Layer" button in Layer Panel → new empty layer appears with auto-generated name
 * - Ctrl+Z → layer removed from panel
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

    // Wait for layers to appear
    await expect(page.locator('#layers-list .layer-item').first()).toBeVisible({ timeout: 10_000 });
}

test.describe('US9: Create New Empty Layer', () => {

    test('clicking "New Layer" button creates an empty layer with auto-generated name', async ({ page }) => {
        await loadLayout(page);

        const layers = page.locator('#layers-list .layer-item');
        const countBefore = await layers.count();
        const decorationsBefore = await page.locator('svg .decorations .decoration').count();

        // Click the "Add Layer" button
        await page.locator('#add-layer-btn').click();

        // New layer should appear in the panel
        await expect(layers).toHaveCount(countBefore + 1, { timeout: 5_000 });

        // The new layer should have an auto-generated name containing "Layer"
        const newLayer = layers.last();
        const layerName = await newLayer.locator('.layer-name').textContent();
        expect(layerName).toMatch(/Layer/i);

        // Decoration count on map should be unchanged (new layer is empty)
        const decorationsAfter = await page.locator('svg .decorations .decoration').count();
        expect(decorationsAfter).toBe(decorationsBefore);
    });

    test('Ctrl+Z after creating a layer removes it from the panel', async ({ page }) => {
        await loadLayout(page);

        const layers = page.locator('#layers-list .layer-item');
        const countBefore = await layers.count();

        // Create a new empty layer
        await page.locator('#add-layer-btn').click();
        await expect(layers).toHaveCount(countBefore + 1, { timeout: 5_000 });

        // Undo via Ctrl+Z
        await page.keyboard.press('Control+z');

        // Layer should be removed
        await expect(layers).toHaveCount(countBefore, { timeout: 5_000 });
    });
});
