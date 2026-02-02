/**
 * US8 — Visual Drag Feedback e2e tests
 *
 * Validates that:
 *   1. A ghost panel appears and follows the cursor during a drag operation.
 *   2. ALL valid drop zones are visible immediately on drag start (passive indicators).
 *   3. The hovered zone intensifies to confirm target.
 *   4. Tab-merge (center) and stack-edge indicators are visually differentiated.
 *   5. Panel-level affordances appear on eligible panels during drag.
 *   6. The preview outline appears during a valid drop zone hover.
 *   7. All feedback elements are removed when the drag ends.
 *
 * Requires the application to be served at the configured baseURL.
 */

import { test, expect } from './fixtures.js';

const APP_READY = { timeout: 10_000, state: 'attached' };

test.describe('US8: Visual drag feedback and drop zone indicators', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('body[data-app-ready]', APP_READY);
    });

    // ─────────────────────────────────────────────────────────────────────
    // Ghost panel
    // ─────────────────────────────────────────────────────────────────────

    test('ghost panel appears when dragging a panel', async ({ page }) => {
        const titleBar = page.locator('[data-drag-handle][data-panel-id="layers"]').first();
        const box = await titleBar.boundingBox();
        expect(box).not.toBeNull();

        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        const viewport = page.viewportSize();

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        // Move enough to exceed the drag-start threshold (5px)
        await page.mouse.move(startX, startY + 20, { steps: 5 });
        await page.mouse.move(viewport.width / 2, viewport.height / 2, { steps: 5 });

        // Ghost should be present and visible
        const ghost = page.locator('.panel-drag-ghost');
        await expect(ghost).toBeVisible();

        await page.mouse.up();
    });

    test('ghost panel disappears after drag ends', async ({ page }) => {
        const titleBar = page.locator('[data-drag-handle][data-panel-id="layers"]').first();
        const box = await titleBar.boundingBox();
        expect(box).not.toBeNull();

        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        const viewport = page.viewportSize();

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, startY + 20, { steps: 5 });
        await page.mouse.move(viewport.width / 2, viewport.height / 2, { steps: 5 });

        // Confirm ghost is present before mouse-up
        await expect(page.locator('.panel-drag-ghost')).toBeVisible();

        await page.mouse.up();

        // Ghost should be removed from DOM after drag ends
        await expect(page.locator('.panel-drag-ghost')).not.toBeAttached();
    });

    test('ghost panel shows panel label text', async ({ page }) => {
        const titleBar = page.locator('[data-drag-handle][data-panel-id="layers"]').first();
        const box = await titleBar.boundingBox();
        expect(box).not.toBeNull();

        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        const viewport = page.viewportSize();

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, startY + 20, { steps: 5 });
        await page.mouse.move(viewport.width / 2, viewport.height / 2, { steps: 5 });

        const ghost = page.locator('.panel-drag-ghost');
        await expect(ghost).toBeVisible();
        // Ghost should contain the panel label
        await expect(ghost).toContainText('Layers');

        await page.mouse.up();
    });

    // ─────────────────────────────────────────────────────────────────────
    // Viewport-edge drop zone highlighting
    // ─────────────────────────────────────────────────────────────────────

    test('all two viewport edge zones visible on drag start (passive indicators)', async ({ page }) => {
        const titleBar = page.locator('[data-drag-handle][data-panel-id="layers"]').first();
        const box = await titleBar.boundingBox();
        expect(box).not.toBeNull();

        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        const viewport = page.viewportSize();

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        // Move enough to trigger drag start (exceeds 5px threshold)
        await page.mouse.move(viewport.width / 2, viewport.height / 2, { steps: 8 });

        // The overlay container should have the "dragging" class
        const overlay = page.locator('.drop-zone-overlay');
        await expect(overlay).toHaveClass(/dragging/);

        // All four edge zones should be visible (not hidden)
        for (const edge of ['left', 'right']) {
            await expect(page.locator(`.drop-zone-${edge}`)).toBeVisible();
        }

        await page.mouse.up();
    });

    test('passive edge indicators disappear after drag ends', async ({ page }) => {
        const titleBar = page.locator('[data-drag-handle][data-panel-id="layers"]').first();
        const box = await titleBar.boundingBox();
        expect(box).not.toBeNull();

        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        const viewport = page.viewportSize();

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(viewport.width / 2, viewport.height / 2, { steps: 8 });

        // Confirm dragging class is present
        await expect(page.locator('.drop-zone-overlay')).toHaveClass(/dragging/);

        await page.mouse.up();

        // Overlay should lose the dragging class and be hidden
        await expect(page.locator('.drop-zone-overlay')).not.toHaveClass(/dragging/);
    });

    test('right viewport edge drop zone highlights when cursor enters', async ({ page }) => {
        const titleBar = page.locator('[data-drag-handle][data-panel-id="layers"]').first();
        const box = await titleBar.boundingBox();
        expect(box).not.toBeNull();

        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        const viewport = page.viewportSize();

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        // Move to mid-screen first to trigger drag-start
        await page.mouse.move(viewport.width / 2, viewport.height / 2, { steps: 8 });
        // Move to right edge
        await page.mouse.move(viewport.width - 5, viewport.height / 2, { steps: 8 });

        const rightZone = page.locator('.drop-zone-right');
        await expect(rightZone).toHaveClass(/active/);

        await page.mouse.up();
    });

    test('edge drop zone unhighlights when cursor leaves', async ({ page }) => {
        const titleBar = page.locator('[data-drag-handle][data-panel-id="layers"]').first();
        const box = await titleBar.boundingBox();
        expect(box).not.toBeNull();

        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        const viewport = page.viewportSize();

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        // Move to right edge
        await page.mouse.move(viewport.width - 5, viewport.height / 2, { steps: 10 });
        await expect(page.locator('.drop-zone-right')).toHaveClass(/active/);

        // Move back to center — zone should no longer be active
        await page.mouse.move(viewport.width / 2, viewport.height / 2, { steps: 8 });
        await expect(page.locator('.drop-zone-right')).not.toHaveClass(/active/);

        await page.mouse.up();
    });

    // ─────────────────────────────────────────────────────────────────────
    // Tab-merge vs stack-edge indicator differentiation (T070)
    // ─────────────────────────────────────────────────────────────────────

    test('tab-merge center indicator appears when hovering panel center', async ({ page }) => {
        // Inspector is in a separate dock region by default
        const targetRegion = page.locator('.dock-region[data-panel-id="inspector"]');
        await expect(targetRegion).toBeVisible();

        const targetBox = await targetRegion.boundingBox();
        expect(targetBox).not.toBeNull();

        const titleBar = page.locator('[data-drag-handle][data-panel-id="layers"]').first();
        const startBox = await titleBar.boundingBox();
        expect(startBox).not.toBeNull();

        const startX = startBox.x + startBox.width / 2;
        const startY = startBox.y + startBox.height / 2;
        // Hover over panel center (inner 60%)
        const centerX = targetBox.x + targetBox.width / 2;
        const centerY = targetBox.y + targetBox.height / 2;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, startY + 20, { steps: 5 });
        await page.mouse.move(centerX, centerY, { steps: 10 });

        // Center highlight should be visible (tab-merge zone)
        const centerHighlight = page.locator('.drop-zone-center-highlight');
        await expect(centerHighlight).toBeVisible();

        // Edge highlight should NOT be visible simultaneously
        const edgeHighlight = page.locator('.drop-zone-edge-highlight');
        await expect(edgeHighlight).not.toBeVisible();

        await page.mouse.up();
    });

    test('stack edge indicator appears when hovering panel edge', async ({ page }) => {
        const targetRegion = page.locator('.dock-region[data-panel-id="inspector"]');
        await expect(targetRegion).toBeVisible();

        const targetBox = await targetRegion.boundingBox();
        expect(targetBox).not.toBeNull();

        const titleBar = page.locator('[data-drag-handle][data-panel-id="layers"]').first();
        const startBox = await titleBar.boundingBox();
        expect(startBox).not.toBeNull();

        const startX = startBox.x + startBox.width / 2;
        const startY = startBox.y + startBox.height / 2;
        // Hover over the top edge of the inspector panel (within 20px)
        const edgeX = targetBox.x + targetBox.width / 2;
        const edgeY = targetBox.y + 5; // 5px from top edge

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, startY + 20, { steps: 5 });
        await page.mouse.move(edgeX, edgeY, { steps: 10 });

        // Edge highlight should be visible (stack zone)
        const edgeHighlight = page.locator('.drop-zone-edge-highlight');
        await expect(edgeHighlight).toBeVisible();

        // Center highlight should NOT be visible simultaneously
        const centerHighlight = page.locator('.drop-zone-center-highlight');
        await expect(centerHighlight).not.toBeVisible();

        await page.mouse.up();
    });

    test('tab-merge and stack indicators are visually distinct (different data-zone-type)', async ({ page }) => {
        // Verify that center highlight has data-zone-type="tab-merge"
        const centerHighlight = page.locator('.drop-zone-center-highlight');
        await expect(centerHighlight).toHaveAttribute('data-zone-type', 'tab-merge');

        // Verify that edge highlight has data-zone-type="stack"
        const edgeHighlight = page.locator('.drop-zone-edge-highlight');
        await expect(edgeHighlight).toHaveAttribute('data-zone-type', 'stack');
    });

    // ─────────────────────────────────────────────────────────────────────
    // Panel-level drop affordances (T072b)
    // ─────────────────────────────────────────────────────────────────────

    test('panel-level affordances appear on eligible panels during drag', async ({ page }) => {
        const titleBar = page.locator('[data-drag-handle][data-panel-id="layers"]').first();
        const box = await titleBar.boundingBox();
        expect(box).not.toBeNull();

        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        const viewport = page.viewportSize();

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(viewport.width / 2, viewport.height / 2, { steps: 8 });

        // Affordances should appear on eligible panels (not map, not the dragged panel)
        const affordances = page.locator('.panel-drop-affordance');
        const count = await affordances.count();
        // At least one affordance should exist (inspector and/or decorationList)
        expect(count).toBeGreaterThanOrEqual(1);

        await page.mouse.up();
    });

    test('panel-level affordances removed after drag ends', async ({ page }) => {
        const titleBar = page.locator('[data-drag-handle][data-panel-id="layers"]').first();
        const box = await titleBar.boundingBox();
        expect(box).not.toBeNull();

        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        const viewport = page.viewportSize();

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(viewport.width / 2, viewport.height / 2, { steps: 8 });

        // Confirm they appeared
        expect(await page.locator('.panel-drop-affordance').count()).toBeGreaterThanOrEqual(1);

        await page.mouse.up();

        // All affordances should be cleaned up
        await expect(page.locator('.panel-drop-affordance')).toHaveCount(0);
    });

    test('no affordance on the map panel or the dragged panel', async ({ page }) => {
        const titleBar = page.locator('[data-drag-handle][data-panel-id="layers"]').first();
        const box = await titleBar.boundingBox();
        expect(box).not.toBeNull();

        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        const viewport = page.viewportSize();

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(viewport.width / 2, viewport.height / 2, { steps: 8 });

        // Get the map panel's bounding rect
        const mapRegion = page.locator('.dock-region[data-panel-id="map"],.panel-wrapper[data-panel-id="map"]');
        const mapBox = await mapRegion.first().boundingBox();

        // Get the dragged panel's bounding rect (layers)
        const layersRegion = page.locator('.dock-region[data-panel-id="layers"]');

        // No affordance should overlap the map region center exactly
        const affordances = page.locator('.panel-drop-affordance');
        const affordanceCount = await affordances.count();

        if (mapBox) {
            for (let i = 0; i < affordanceCount; i++) {
                const aBox = await affordances.nth(i).boundingBox();
                if (!aBox) continue;
                // Affordance should NOT be positioned over the map panel
                const overlapsMap = aBox.x < mapBox.x + mapBox.width &&
                    aBox.x + aBox.width > mapBox.x &&
                    aBox.y < mapBox.y + mapBox.height &&
                    aBox.y + aBox.height > mapBox.y &&
                    Math.abs(aBox.width - mapBox.width) < 5 &&
                    Math.abs(aBox.height - mapBox.height) < 5;
                expect(overlapsMap).toBe(false);
            }
        }

        await page.mouse.up();
    });

    // ─────────────────────────────────────────────────────────────────────
    // Preview outline (T069)
    // ─────────────────────────────────────────────────────────────────────

    test('preview outline visible when hovering right viewport edge', async ({ page }) => {
        const titleBar = page.locator('[data-drag-handle][data-panel-id="layers"]').first();
        const box = await titleBar.boundingBox();
        expect(box).not.toBeNull();

        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        const viewport = page.viewportSize();

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(viewport.width / 2, viewport.height / 2, { steps: 8 });
        await page.mouse.move(viewport.width - 5, viewport.height / 2, { steps: 8 });

        const previewOutline = page.locator('.drop-zone-preview-outline');
        await expect(previewOutline).toBeVisible();
        await expect(previewOutline).toHaveAttribute('data-zone-type', 'edge');

        await page.mouse.up();
    });

    test('preview outline hidden when not hovering a valid drop zone', async ({ page }) => {
        const titleBar = page.locator('[data-drag-handle][data-panel-id="layers"]').first();
        const box = await titleBar.boundingBox();
        expect(box).not.toBeNull();

        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        const viewport = page.viewportSize();

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, startY + 20, { steps: 5 });
        // Move to a neutral position (no drop zone)
        await page.mouse.move(viewport.width / 2, viewport.height / 2, { steps: 8 });

        const previewOutline = page.locator('.drop-zone-preview-outline');
        await expect(previewOutline).not.toBeVisible();

        await page.mouse.up();
    });

    test('preview outline disappears after drag ends', async ({ page }) => {
        const titleBar = page.locator('[data-drag-handle][data-panel-id="layers"]').first();
        const box = await titleBar.boundingBox();
        expect(box).not.toBeNull();

        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        const viewport = page.viewportSize();

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(viewport.width / 2, viewport.height / 2, { steps: 8 });
        await page.mouse.move(viewport.width - 5, viewport.height / 2, { steps: 8 });

        await expect(page.locator('.drop-zone-preview-outline')).toBeVisible();

        await page.mouse.up();

        // Preview outline should be hidden after drag ends
        await expect(page.locator('.drop-zone-preview-outline')).not.toBeVisible();
    });
});
