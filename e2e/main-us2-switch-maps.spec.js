/**
 * E2E Tests: US2 — Switch Maps with Confirmation Dialog
 *
 * Covers:
 * - Load layout for Map A then load layout for Map B → confirmation dialog appears with correct map names
 * - Click confirm → map switches and layers cleared
 * - Click cancel → existing layers and map unchanged
 */
import { test, expect } from './fixtures.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOMESTEAD_XML = path.resolve(__dirname, '../homestead.xml');
const DIFFERENT_MAP_XML = path.resolve(__dirname, 'data/different-map.xml');

/**
 * Helper: wait for app to be ready and load the first layout.
 */
async function loadFirstLayout(page) {
    await page.goto('/');
    await page.waitForSelector('body[data-app-ready]', { state: 'attached', timeout: 15_000 });

    // Load the first layout (homestead.xml — mapId 1558 "Hearth's Glow")
    await page.locator('#file-input').setInputFiles(HOMESTEAD_XML);

    // Wait for layers to appear
    await expect(page.locator('#layers-list .layer-item').first()).toBeVisible({ timeout: 10_000 });
}

test.describe('US2: Switch Maps with Confirmation Dialog', () => {

    test('shows confirmation dialog when loading layout for a different map', async ({ page }) => {
        await loadFirstLayout(page);

        // Verify first layout layer exists
        const layersBefore = page.locator('#layers-list .layer-item');
        await expect(layersBefore.first()).toBeVisible();
        const countBefore = await layersBefore.count();
        expect(countBefore).toBeGreaterThanOrEqual(1);

        // Load a layout for a different map (mapId 1542)
        await page.locator('#file-input').setInputFiles(DIFFERENT_MAP_XML);

        // The confirmation dialog should appear
        const dialog = page.locator('dialog.confirm-dialog[data-dialog-type="mapSwitch"]');
        await expect(dialog).toBeVisible({ timeout: 5_000 });

        // Verify dialog contains the correct map names
        const dialogTitle = dialog.locator('.confirm-dialog__title');
        await expect(dialogTitle).toHaveText('Switch Map?');

        const dialogMessage = dialog.locator('.confirm-dialog__message');
        const messageText = await dialogMessage.textContent();
        expect(messageText).toContain("Hearth's Glow");
        expect(messageText).toContain('Finding Balance');
    });

    test('clicking confirm switches the map and clears layers', async ({ page }) => {
        await loadFirstLayout(page);

        // Load a layout for a different map
        await page.locator('#file-input').setInputFiles(DIFFERENT_MAP_XML);

        // Wait for dialog to appear
        const dialog = page.locator('dialog.confirm-dialog[data-dialog-type="mapSwitch"]');
        await expect(dialog).toBeVisible({ timeout: 5_000 });

        // Click confirm ("Switch Map" button)
        await dialog.locator('.confirm-dialog__confirm').click();

        // Dialog should close
        await expect(dialog).not.toBeVisible({ timeout: 5_000 });

        // Wait for the new layer to appear (from the different map layout)
        const layers = page.locator('#layers-list .layer-item');
        await expect(layers.first()).toBeVisible({ timeout: 10_000 });

        // Should have exactly 1 layer (the new layout's layer)
        await expect(layers).toHaveCount(1);

        // The layer name should reflect the new layout (named after the file)
        const layerName = layers.first().locator('.layer-name');
        await expect(layerName).toContainText('different-map');
    });

    test('clicking cancel preserves existing layers and map', async ({ page }) => {
        await loadFirstLayout(page);

        // Record the layer count and name before attempting switch
        const layersBefore = page.locator('#layers-list .layer-item');
        await expect(layersBefore.first()).toBeVisible();
        const countBefore = await layersBefore.count();
        const firstLayerNameBefore = await layersBefore.first().locator('.layer-name').textContent();

        // Load a layout for a different map
        await page.locator('#file-input').setInputFiles(DIFFERENT_MAP_XML);

        // Wait for dialog to appear
        const dialog = page.locator('dialog.confirm-dialog[data-dialog-type="mapSwitch"]');
        await expect(dialog).toBeVisible({ timeout: 5_000 });

        // Click cancel
        await dialog.locator('.confirm-dialog__cancel').click();

        // Dialog should close
        await expect(dialog).not.toBeVisible({ timeout: 5_000 });

        // Layers should be unchanged
        const layersAfter = page.locator('#layers-list .layer-item');
        await expect(layersAfter).toHaveCount(countBefore);

        // First layer name should be unchanged
        const firstLayerNameAfter = await layersAfter.first().locator('.layer-name').textContent();
        expect(firstLayerNameAfter).toBe(firstLayerNameBefore);
    });
});
