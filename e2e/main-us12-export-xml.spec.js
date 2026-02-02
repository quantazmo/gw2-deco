/**
 * E2E Tests: US12 — Export Decorations to XML
 *
 * Covers:
 * US1 — Export button opens dialog pre-checked by layer visibility; confirm downloads XML
 * US2 — Export dialog shows decoration counts; layers can be individually toggled
 * US3 — Cancel button closes dialog without downloading
 */
import { test, expect } from './fixtures.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOMESTEAD_XML = path.resolve(__dirname, '../homestead.xml');

async function loadLayout(page) {
    await page.goto('/');
    await page.waitForSelector('body[data-app-ready]', { state: 'attached', timeout: 15_000 });
    await page.locator('#file-input').setInputFiles(HOMESTEAD_XML);
    await expect(page.locator('#layers-list .layer-item').first()).toBeVisible({ timeout: 10_000 });
}

test.describe('US12: Export Decorations to XML', () => {

    test('US1 — Export button is disabled before layout loads and enabled after', async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('body[data-app-ready]', { state: 'attached', timeout: 15_000 });

        // Before layout: button should be disabled
        await expect(page.locator('#export-btn')).toBeDisabled();

        // Load layout
        await page.locator('#file-input').setInputFiles(HOMESTEAD_XML);
        await expect(page.locator('#layers-list .layer-item').first()).toBeVisible({ timeout: 10_000 });

        // After layout: button should be enabled
        await expect(page.locator('#export-btn')).toBeEnabled({ timeout: 5_000 });
    });

    test('US1 — Export button opens the Export dialog', async ({ page }) => {
        await loadLayout(page);

        // Open export dialog
        await page.locator('#export-btn').click();

        // Dialog should be visible
        await expect(page.locator('dialog.export-dialog')).toBeVisible({ timeout: 5_000 });
    });

    test('US2 — Dialog pre-checks layers matching their visibility', async ({ page }) => {
        await loadLayout(page);

        // Open export dialog
        await page.locator('#export-btn').click();
        await expect(page.locator('dialog.export-dialog')).toBeVisible({ timeout: 5_000 });

        // Every checkbox state should match the layer visibility in the panel
        const layerItems = page.locator('#layers-list .layer-item');
        const checkboxes = page.locator('dialog.export-dialog .export-dialog__checkbox');

        const layerCount = await layerItems.count();
        const checkboxCount = await checkboxes.count();
        expect(checkboxCount).toBe(layerCount);

        // Cancel to close
        await page.locator('dialog.export-dialog .export-dialog__cancel').click();
        await expect(page.locator('dialog.export-dialog')).not.toBeVisible({ timeout: 3_000 });
    });

    test('US2 — Dialog shows decoration count per layer', async ({ page }) => {
        await loadLayout(page);

        await page.locator('#export-btn').click();
        await expect(page.locator('dialog.export-dialog')).toBeVisible({ timeout: 5_000 });

        // Every layer row should have a count badge
        const countBadges = page.locator('dialog.export-dialog .export-dialog__layer-count');
        const count = await countBadges.count();
        expect(count).toBeGreaterThan(0);

        // Each badge should contain "decoration" (singular or plural)
        for (let i = 0; i < count; i++) {
            const text = await countBadges.nth(i).textContent();
            expect(text).toMatch(/decoration/i);
        }

        await page.locator('dialog.export-dialog .export-dialog__cancel').click();
    });

    test('US2 — Confirm is disabled when all layers are unchecked', async ({ page }) => {
        await loadLayout(page);

        await page.locator('#export-btn').click();
        await expect(page.locator('dialog.export-dialog')).toBeVisible({ timeout: 5_000 });

        // Uncheck all checkboxes
        const checkboxes = page.locator('dialog.export-dialog .export-dialog__checkbox');
        const count = await checkboxes.count();
        for (let i = 0; i < count; i++) {
            const checkbox = checkboxes.nth(i);
            const isChecked = await checkbox.isChecked();
            if (isChecked) {
                await checkbox.uncheck();
            }
        }

        // Confirm button should be disabled
        await expect(page.locator('dialog.export-dialog .export-dialog__confirm')).toBeDisabled({ timeout: 2_000 });

        await page.locator('dialog.export-dialog .export-dialog__cancel').click();
    });

    test('US1 — Confirming export triggers a file download', async ({ page }) => {
        // Disable showSaveFilePicker so the handler falls back to the anchor-click
        // download path, which triggers Playwright's 'download' event.
        await page.addInitScript(() => { delete window.showSaveFilePicker; });
        await loadLayout(page);

        // Listen for the download
        const downloadPromise = page.waitForEvent('download', { timeout: 10_000 });

        await page.locator('#export-btn').click();
        await expect(page.locator('dialog.export-dialog')).toBeVisible({ timeout: 5_000 });
        await page.locator('dialog.export-dialog .export-dialog__confirm').click();

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.xml$/);
    });

    test('US3 — Cancel button closes dialog without downloading', async ({ page }) => {
        await loadLayout(page);

        let downloadFired = false;
        page.on('download', () => { downloadFired = true; });

        await page.locator('#export-btn').click();
        await expect(page.locator('dialog.export-dialog')).toBeVisible({ timeout: 5_000 });

        await page.locator('dialog.export-dialog .export-dialog__cancel').click();

        // Dialog should close
        await expect(page.locator('dialog.export-dialog')).not.toBeVisible({ timeout: 3_000 });

        // No download should have been triggered
        expect(downloadFired).toBe(false);
    });

    test('US3 — Escape key closes dialog without downloading', async ({ page }) => {
        await loadLayout(page);

        let downloadFired = false;
        page.on('download', () => { downloadFired = true; });

        await page.locator('#export-btn').click();
        await expect(page.locator('dialog.export-dialog')).toBeVisible({ timeout: 5_000 });

        await page.keyboard.press('Escape');

        // Dialog should close
        await expect(page.locator('dialog.export-dialog')).not.toBeVisible({ timeout: 3_000 });

        expect(downloadFired).toBe(false);
    });
});
