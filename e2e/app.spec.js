import { test, expect } from './fixtures.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('loads the app without console errors', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
    });
    page.on('pageerror', (err) => {
        errors.push(err.message);
    });

    await page.goto('/');

    await expect(page).toHaveTitle(/GW2/);

    // DockManager architecture: wait for app-ready signal then check DockManager root
    await page.waitForSelector('body[data-app-ready]', { timeout: 15_000, state: 'attached' });
    await expect(page.locator('#dock-manager-root')).toBeVisible();
    // The map panel is rendered inside a DockRegion by DockManager
    await expect(page.locator('.dock-region[data-panel-id="map"]')).toBeVisible();

    expect(errors, `Console errors: ${errors.join('\n')}`).toHaveLength(0);
});

test('loads homestead.xml via file input and renders layers', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
    });
    page.on('pageerror', (err) => {
        errors.push(err.message);
    });

    await page.goto('/');

    // Wait for the async architecture initialization to complete.
    // script.js sets data-app-ready on <body> once FileDropZone and all listeners are attached.
    await page.waitForSelector('body[data-app-ready]', { state: 'attached' });

    const xmlPath = path.resolve(__dirname, '../homestead.xml');

    // Set the file on the hidden input — triggers the FileDropZone change handler
    await page.locator('#file-input').setInputFiles(xmlPath);

    // Wait for at least one layer item to appear in the layers list
    await expect(page.locator('#layers-list .layer-item').first()).toBeVisible({ timeout: 10000 });
});
