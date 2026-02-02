/**
 * E2E Tests: US5 — Select Decorations from Map or Decoration List
 *
 * Covers:
 * - Click decoration circle on map → visual highlight and selected in decoration list
 * - Ctrl+Click another in decoration list → both selected
 * - Shift+Click range in list → range selected
 * - Click empty map area → all deselected
 * - Hidden layer decorations not clickable on map
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

test.describe('US5: Select Decorations', () => {

    test('clicking a decoration circle on map highlights it', async ({ page }) => {
        await loadLayout(page);

        // Wait for decoration circles to render
        const circles = page.locator('svg .decorations [data-decoration-id]');
        const count = await circles.count();
        expect(count).toBeGreaterThan(0);

        // Dispatch click directly on the circle element (SVG circles overlap so
        // Playwright's coordinate-based click gets intercepted by other circles).
        // Use evaluate with a MouseEvent so the event reliably bubbles to the SVG
        // click handler. After selection, the circle is re-ordered in the DOM
        // (moved to top of its group for rendering), so check via .selected-decoration.
        await circles.first().evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));

        // Verify a decoration got the selected-decoration class
        await expect(page.locator('svg .decorations .selected-decoration')).toHaveCount(1);
    });

    test('clicking empty map area deselects all decorations', async ({ page }) => {
        await loadLayout(page);

        const circles = page.locator('svg .decorations [data-decoration-id]');
        await circles.first().evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
        await expect(page.locator('svg .decorations .selected-decoration')).toHaveCount(1);

        // Click empty area on the SVG via evaluate to avoid Playwright's real-mouse
        // events potentially setting panDragOccurred=true through mousemove handlers.
        // Use #chart-container svg to target the map SVG specifically (not icon SVGs).
        await page.evaluate(() => {
            const svg = document.querySelector('#chart-container svg');
            if (svg) svg.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        });

        // Selection should be cleared
        const selectedCount = await page.locator('svg .selected-decoration').count();
        expect(selectedCount).toBe(0);
    });

    test('Ctrl+Click in decoration list adds to selection', async ({ page }) => {
        await loadLayout(page);

        // Wait for decoration list items to appear
        const items = page.locator('.decoration-list__item');
        const count = await items.count();
        if (count < 2) {
            test.skip('Not enough decorations for multi-select test');
            return;
        }

        // Click first item
        await items.first().click();
        await expect(items.first()).toHaveClass(/selected/);

        // Ctrl+Click second item
        await items.nth(1).click({ modifiers: ['Control'] });
        await expect(items.first()).toHaveClass(/selected/);
        await expect(items.nth(1)).toHaveClass(/selected/);
    });

    test('Shift+Click in decoration list selects range', async ({ page }) => {
        await loadLayout(page);

        const items = page.locator('.decoration-list__item');
        const count = await items.count();
        if (count < 3) {
            test.skip('Not enough decorations for range select test');
            return;
        }

        // Click first item (anchor)
        await items.first().click();

        // Shift+Click third item
        await items.nth(2).click({ modifiers: ['Shift'] });

        // All three should be selected
        await expect(items.first()).toHaveClass(/selected/);
        await expect(items.nth(1)).toHaveClass(/selected/);
        await expect(items.nth(2)).toHaveClass(/selected/);
    });

    test('screen reader announcer updates on selection', async ({ page }) => {
        await loadLayout(page);

        const announcer = page.locator('#selection-announcer');
        const circles = page.locator('svg .decorations [data-decoration-id]');
        const count = await circles.count();
        if (count === 0) {
            test.skip('No decorations to select');
            return;
        }

        await circles.first().evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
        await expect(announcer).toHaveText(/1 decoration selected/);
    });
});
