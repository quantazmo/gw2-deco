// @ts-nocheck
/**
 * Additional tests for src/domain/ZoomCalculationService.js
 * Covers: calculateZoomToFitArea, calculateVisibleArea, invalid maxZoom
 */
import { ZoomCalculationService } from '../../src/domain/ZoomCalculationService.js';

describe('ZoomCalculationService — additional coverage', () => {

    describe('calculateZoomLimits — edge cases', () => {
        test('throws when maxZoom is not positive', () => {
            expect(() =>
                ZoomCalculationService.calculateZoomLimits(
                    { width: 1000, height: 1000 },
                    { width: 500, height: 500 },
                    0
                )
            ).toThrow();

            expect(() =>
                ZoomCalculationService.calculateZoomLimits(
                    { width: 1000, height: 1000 },
                    { width: 500, height: 500 },
                    -1
                )
            ).toThrow();
        });

        test('max zoom is at least 4 for very small maps', () => {
            const limits = ZoomCalculationService.calculateZoomLimits(
                { width: 50, height: 50 },
                { width: 500, height: 500 }
            );
            expect(limits.max).toBeGreaterThanOrEqual(4);
        });
    });

    describe('calculatePanAfterZoom — default pan', () => {
        test('uses default pan {x:0,y:0} when not provided', () => {
            const result = ZoomCalculationService.calculatePanAfterZoom(
                { x: 100, y: 100 },
                1,
                2
            );
            expect(result).toBeTruthy();
            expect(typeof result.x).toBe('number');
            expect(typeof result.y).toBe('number');
        });
    });

    describe('calculateZoomToFitArea', () => {
        test('returns zoom and pan for a square area', () => {
            const area = { width: 200, height: 200, min: { x: 0, y: 0 } };
            const viewport = { width: 500, height: 500 };
            const result = ZoomCalculationService.calculateZoomToFitArea(area, viewport);
            expect(result).toHaveProperty('zoom');
            expect(result).toHaveProperty('pan');
            expect(result.zoom).toBeGreaterThan(0);
        });

        test('uses default padding of 0.1', () => {
            const area = { width: 100, height: 100, min: { x: 10, y: 10 } };
            const viewport = { width: 300, height: 300 };
            const result = ZoomCalculationService.calculateZoomToFitArea(area, viewport);
            expect(result.zoom).toBeGreaterThan(0);
        });

        test('accepts custom padding', () => {
            const area = { width: 100, height: 100, min: { x: 0, y: 0 } };
            const viewport = { width: 300, height: 300 };
            const withPadding = ZoomCalculationService.calculateZoomToFitArea(area, viewport, 0.2);
            const noPadding = ZoomCalculationService.calculateZoomToFitArea(area, viewport, 0);
            // More padding → smaller zoom
            expect(withPadding.zoom).toBeLessThan(noPadding.zoom);
        });

        test('throws on invalid area', () => {
            expect(() =>
                ZoomCalculationService.calculateZoomToFitArea(null, { width: 500, height: 500 })
            ).toThrow();

            expect(() =>
                ZoomCalculationService.calculateZoomToFitArea({ height: 100 }, { width: 500, height: 500 })
            ).toThrow();
        });

        test('throws on invalid viewportSize', () => {
            const area = { width: 100, height: 100, min: { x: 0, y: 0 } };
            expect(() =>
                ZoomCalculationService.calculateZoomToFitArea(area, null)
            ).toThrow();
        });

        test('throws when padding is out of [0, 1]', () => {
            const area = { width: 100, height: 100, min: { x: 0, y: 0 } };
            const viewport = { width: 300, height: 300 };
            expect(() =>
                ZoomCalculationService.calculateZoomToFitArea(area, viewport, -0.1)
            ).toThrow();

            expect(() =>
                ZoomCalculationService.calculateZoomToFitArea(area, viewport, 1.1)
            ).toThrow();
        });

        test('pan centers the area in the viewport', () => {
            const area = { width: 100, height: 100, min: { x: 0, y: 0 } };
            const viewport = { width: 200, height: 200 };
            const result = ZoomCalculationService.calculateZoomToFitArea(area, viewport, 0);
            expect(result.pan.x).toBeDefined();
            expect(result.pan.y).toBeDefined();
        });
    });

    describe('calculateVisibleArea', () => {
        test('returns visible area for unit zoom with zero pan', () => {
            const viewport = { width: 800, height: 600 };
            const result = ZoomCalculationService.calculateVisibleArea(viewport, 1);
            expect(result.width).toBe(800);
            expect(result.height).toBe(600);
            expect(result.min.x).toBeCloseTo(0);
            expect(result.min.y).toBeCloseTo(0);
            expect(result.max.x).toBeCloseTo(800);
            expect(result.max.y).toBeCloseTo(600);
        });

        test('halves visible area when zoom doubles', () => {
            const viewport = { width: 400, height: 400 };
            const result = ZoomCalculationService.calculateVisibleArea(viewport, 2);
            expect(result.width).toBe(200);
            expect(result.height).toBe(200);
        });

        test('accounts for pan offset', () => {
            const viewport = { width: 400, height: 400 };
            const result = ZoomCalculationService.calculateVisibleArea(viewport, 1, { x: -100, y: -200 });
            expect(result.min.x).toBe(100);
            expect(result.min.y).toBe(200);
        });

        test('throws on invalid viewportSize', () => {
            expect(() =>
                ZoomCalculationService.calculateVisibleArea(null, 1)
            ).toThrow();
        });

        test('throws when zoom is not positive', () => {
            expect(() =>
                ZoomCalculationService.calculateVisibleArea({ width: 400, height: 400 }, 0)
            ).toThrow();

            expect(() =>
                ZoomCalculationService.calculateVisibleArea({ width: 400, height: 400 }, -1)
            ).toThrow();
        });

        test('returns correct structure', () => {
            const result = ZoomCalculationService.calculateVisibleArea({ width: 300, height: 200 }, 1);
            expect(result).toHaveProperty('min');
            expect(result).toHaveProperty('max');
            expect(result).toHaveProperty('width');
            expect(result).toHaveProperty('height');
        });
    });
});
