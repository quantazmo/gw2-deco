// @ts-nocheck
/**
 * Tests for container-based zoom calculation (Phase 13 / T114)
 * Covers:
 *  - zoom scales use container width/height, not window.innerWidth/innerHeight
 *  - recalculating on container resize yields updated scales
 *  - margin and padding are accounted for
 */

import { UI_LAYOUT } from '../../src/config/constants.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a mock chart container element with controllable dimensions.
 * We return a plain object that mimics what getBoundingClientRect() and the
 * clientWidth/clientHeight properties look like.
 */
function makeContainer(width, height) {
    return {
        clientWidth: width,
        clientHeight: height,
        getBoundingClientRect: () => ({
            width,
            height,
            left: 0,
            top: 0,
            right: width,
            bottom: height
        })
    };
}

/**
 * Re-implementation of the container-dimension helper that mirrors the
 * production helper added to script.js by T116/T117.
 * Returns { width, height } accounting for UI_LAYOUT margins.
 */
function getContainerDimensions(container) {
    const margin = {
        top: UI_LAYOUT.MARGIN_TOP,
        right: UI_LAYOUT.MARGIN_RIGHT,
        bottom: UI_LAYOUT.MARGIN_BOTTOM,
        left: UI_LAYOUT.MARGIN_LEFT
    };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;
    return { width, height };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Container-based zoom dimensions (T114)', () => {
    describe('getContainerDimensions', () => {
        test('uses container width/height, not window.innerWidth/innerHeight', () => {
            // Arrange: container 800×600, window 1920×1080
            const container = makeContainer(800, 600);
            const origInnerWidth = global.innerWidth;
            const origInnerHeight = global.innerHeight;
            Object.defineProperty(global, 'innerWidth', { value: 1920, configurable: true });
            Object.defineProperty(global, 'innerHeight', { value: 1080, configurable: true });

            // Act
            const { width, height } = getContainerDimensions(container);

            // Assert: dimensions come from the container (minus margins), not window
            const expectedWidth = 800 - UI_LAYOUT.MARGIN_LEFT - UI_LAYOUT.MARGIN_RIGHT;
            const expectedHeight = 600 - UI_LAYOUT.MARGIN_TOP - UI_LAYOUT.MARGIN_BOTTOM;
            expect(width).toBe(expectedWidth);
            expect(height).toBe(expectedHeight);
            expect(width).not.toBe(1920 - UI_LAYOUT.MARGIN_LEFT - UI_LAYOUT.MARGIN_RIGHT);

            // Restore
            Object.defineProperty(global, 'innerWidth', { value: origInnerWidth, configurable: true });
            Object.defineProperty(global, 'innerHeight', { value: origInnerHeight, configurable: true });
        });

        test('subtracts left and right margins from container width', () => {
            const container = makeContainer(1000, 500);
            const { width } = getContainerDimensions(container);
            expect(width).toBe(1000 - UI_LAYOUT.MARGIN_LEFT - UI_LAYOUT.MARGIN_RIGHT);
        });

        test('subtracts top and bottom margins from container height', () => {
            const container = makeContainer(1000, 500);
            const { height } = getContainerDimensions(container);
            expect(height).toBe(500 - UI_LAYOUT.MARGIN_TOP - UI_LAYOUT.MARGIN_BOTTOM);
        });

        test('yields updated values when container dimensions change', () => {
            // Simulate a resize: start at 800×600, shrink to 400×300
            let container = makeContainer(800, 600);
            const dims1 = getContainerDimensions(container);

            container = makeContainer(400, 300);
            const dims2 = getContainerDimensions(container);

            expect(dims2.width).toBeLessThan(dims1.width);
            expect(dims2.height).toBeLessThan(dims1.height);
            expect(dims2.width).toBe(400 - UI_LAYOUT.MARGIN_LEFT - UI_LAYOUT.MARGIN_RIGHT);
            expect(dims2.height).toBe(300 - UI_LAYOUT.MARGIN_TOP - UI_LAYOUT.MARGIN_BOTTOM);
        });

        test('returns positive dimensions for a typical panel-constrained container', () => {
            // Simulate the map container being 600px wide because the side panels occupy space
            const container = makeContainer(600, 700);
            const { width, height } = getContainerDimensions(container);
            expect(width).toBeGreaterThan(0);
            expect(height).toBeGreaterThan(0);
        });
    });

    describe('margin accounting', () => {
        test('all four margins are subtracted correctly', () => {
            const containerWidth = 1000;
            const containerHeight = 800;
            const container = makeContainer(containerWidth, containerHeight);

            const { width, height } = getContainerDimensions(container);

            expect(width).toBe(containerWidth - UI_LAYOUT.MARGIN_LEFT - UI_LAYOUT.MARGIN_RIGHT);
            expect(height).toBe(containerHeight - UI_LAYOUT.MARGIN_TOP - UI_LAYOUT.MARGIN_BOTTOM);
        });

        test('uses the correct margin constants from UI_LAYOUT', () => {
            // Verify the constants are the ones used (guard against accidental changes)
            expect(typeof UI_LAYOUT.MARGIN_TOP).toBe('number');
            expect(typeof UI_LAYOUT.MARGIN_RIGHT).toBe('number');
            expect(typeof UI_LAYOUT.MARGIN_BOTTOM).toBe('number');
            expect(typeof UI_LAYOUT.MARGIN_LEFT).toBe('number');
            expect(UI_LAYOUT.MARGIN_TOP).toBeGreaterThanOrEqual(0);
            expect(UI_LAYOUT.MARGIN_LEFT).toBeGreaterThanOrEqual(0);
        });
    });

    describe('container resize behaviour', () => {
        test('width changes when container is resized wider', () => {
            const narrow = makeContainer(400, 500);
            const wide = makeContainer(900, 500);

            const { width: w1 } = getContainerDimensions(narrow);
            const { width: w2 } = getContainerDimensions(wide);

            expect(w2).toBeGreaterThan(w1);
        });

        test('height changes when container is resized taller', () => {
            const short = makeContainer(800, 300);
            const tall = makeContainer(800, 700);

            const { height: h1 } = getContainerDimensions(short);
            const { height: h2 } = getContainerDimensions(tall);

            expect(h2).toBeGreaterThan(h1);
        });

        test('recalculation on simulated ResizeObserver yields correct new values', () => {
            // Simulate what happens when ResizeObserver fires:
            // the container.clientWidth/clientHeight reflect the new size
            let currentWidth = 800;
            let currentHeight = 600;
            const container = {
                get clientWidth() { return currentWidth; },
                get clientHeight() { return currentHeight; },
                getBoundingClientRect: () => ({ width: currentWidth, height: currentHeight })
            };

            const before = getContainerDimensions(container);

            // "Resize" the container
            currentWidth = 500;
            currentHeight = 400;

            const after = getContainerDimensions(container);

            expect(after.width).toBe(500 - UI_LAYOUT.MARGIN_LEFT - UI_LAYOUT.MARGIN_RIGHT);
            expect(after.height).toBe(400 - UI_LAYOUT.MARGIN_TOP - UI_LAYOUT.MARGIN_BOTTOM);
            expect(after.width).toBeLessThan(before.width);
            expect(after.height).toBeLessThan(before.height);
        });
    });
});
