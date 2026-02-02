// @ts-nocheck
/**
 * Additional tests for src/domain/BoundaryCalculationService.js
 * Covers: expandBoundsToAspectRatio, centerBoundsInViewport, calculateCenteringPadding,
 *         calculateBoundsFromTiles (invalid tiles)
 */
import { BoundaryCalculationService } from '../../src/domain/BoundaryCalculationService.js';

const squareBounds = {
    min: { x: 0, y: 0 },
    max: { x: 100, y: 100 },
    width: 100,
    height: 100
};

const tallBounds = {
    min: { x: 0, y: 0 },
    max: { x: 50, y: 100 },
    width: 50,
    height: 100
};

const wideBounds = {
    min: { x: 0, y: 0 },
    max: { x: 200, y: 100 },
    width: 200,
    height: 100
};

describe('BoundaryCalculationService — additional coverage', () => {

    describe('calculateBoundsFromTiles — invalid inputs', () => {
        test('throws on empty array', () => {
            expect(() => BoundaryCalculationService.calculateBoundsFromTiles([])).toThrow();
        });

        test('throws on non-array', () => {
            expect(() => BoundaryCalculationService.calculateBoundsFromTiles(null)).toThrow();
        });

        test('throws on tile missing x property', () => {
            expect(() =>
                BoundaryCalculationService.calculateBoundsFromTiles([{ y: 10 }])
            ).toThrow();
        });

        test('throws on tile missing y property', () => {
            expect(() =>
                BoundaryCalculationService.calculateBoundsFromTiles([{ x: 10 }])
            ).toThrow();
        });
    });

    describe('expandBoundsToAspectRatio', () => {
        test('expands width when bounds are taller than target aspect', () => {
            // tall: 0.5 aspect (50/100), target: 1 (square) → needs to expand width
            const result = BoundaryCalculationService.expandBoundsToAspectRatio(tallBounds, 1);
            expect(result.width).toBeCloseTo(100);
            expect(result.height).toBeCloseTo(100);
        });

        test('expands height when bounds are wider than target aspect', () => {
            // wide: 2.0 aspect (200/100), target: 1 (square) → needs to expand height
            const result = BoundaryCalculationService.expandBoundsToAspectRatio(wideBounds, 1);
            expect(result.width).toBeCloseTo(200);
            expect(result.height).toBeCloseTo(200);
        });

        test('returns unchanged bounds when aspect ratios match', () => {
            // squareBounds is 1:1, target is 1
            const result = BoundaryCalculationService.expandBoundsToAspectRatio(squareBounds, 1);
            expect(result.width).toBeCloseTo(100);
            expect(result.height).toBeCloseTo(100);
        });

        test('centers the original bounds in expanded bounds', () => {
            const result = BoundaryCalculationService.expandBoundsToAspectRatio(tallBounds, 1);
            // Center should be at (25, 50) — same as original center
            const centerX = (result.min.x + result.max.x) / 2;
            const centerY = (result.min.y + result.max.y) / 2;
            expect(centerX).toBeCloseTo(25); // original center x = 25
            expect(centerY).toBeCloseTo(50); // original center y = 50
        });

        test('throws on invalid bounds', () => {
            expect(() =>
                BoundaryCalculationService.expandBoundsToAspectRatio(null, 1)
            ).toThrow();
        });

        test('throws on non-positive targetAspect', () => {
            expect(() =>
                BoundaryCalculationService.expandBoundsToAspectRatio(squareBounds, 0)
            ).toThrow();
            expect(() =>
                BoundaryCalculationService.expandBoundsToAspectRatio(squareBounds, -1)
            ).toThrow();
        });

        test('throws on non-number targetAspect', () => {
            expect(() =>
                BoundaryCalculationService.expandBoundsToAspectRatio(squareBounds, 'wide')
            ).toThrow();
        });
    });

    describe('centerBoundsInViewport', () => {
        test('calculates offsets to center bounds in viewport', () => {
            const viewport = { width: 800, height: 600 };
            const result = BoundaryCalculationService.centerBoundsInViewport(squareBounds, viewport);
            // Center of squareBounds (0..100,0..100) = (50,50)
            // Center of viewport (800,600) = (400,300)
            // Offset x = 400 - 50 = 350; offset y = 300 - 50 = 250
            expect(result.x).toBeCloseTo(350);
            expect(result.y).toBeCloseTo(250);
        });

        test('includes margin in boundsWidth/boundsHeight', () => {
            const viewport = { width: 800, height: 600 };
            const result = BoundaryCalculationService.centerBoundsInViewport(squareBounds, viewport, 10);
            expect(result.boundsWidth).toBeCloseTo(120);
            expect(result.boundsHeight).toBeCloseTo(120);
        });

        test('default margin is 0', () => {
            const viewport = { width: 400, height: 400 };
            const result = BoundaryCalculationService.centerBoundsInViewport(squareBounds, viewport, 0);
            expect(result.boundsWidth).toBeCloseTo(100);
        });

        test('throws on invalid bounds', () => {
            expect(() =>
                BoundaryCalculationService.centerBoundsInViewport(null, { width: 400, height: 400 })
            ).toThrow();
        });

        test('throws on invalid viewport', () => {
            expect(() =>
                BoundaryCalculationService.centerBoundsInViewport(squareBounds, null)
            ).toThrow();
        });

        test('throws on non-number margin', () => {
            expect(() =>
                BoundaryCalculationService.centerBoundsInViewport(squareBounds, { width: 400, height: 400 }, 'big')
            ).toThrow();
        });
    });

    describe('calculateCenteringPadding', () => {
        test('calculates equal left/right/top/bottom padding', () => {
            const content = { width: 100, height: 80 };
            const container = { width: 200, height: 200 };
            const result = BoundaryCalculationService.calculateCenteringPadding(content, container);
            expect(result.left).toBeCloseTo(50);
            expect(result.right).toBeCloseTo(50);
            expect(result.top).toBeCloseTo(60);
            expect(result.bottom).toBeCloseTo(60);
        });

        test('returns 0 padding when content equals container', () => {
            const size = { width: 200, height: 200 };
            const result = BoundaryCalculationService.calculateCenteringPadding(size, size);
            expect(result.left).toBe(0);
            expect(result.top).toBe(0);
        });

        test('returns 0 when container is smaller than content (not negative)', () => {
            const content = { width: 400, height: 400 };
            const container = { width: 100, height: 100 };
            const result = BoundaryCalculationService.calculateCenteringPadding(content, container);
            expect(result.left).toBe(0);
            expect(result.top).toBe(0);
        });

        test('throws on invalid contentSize', () => {
            expect(() =>
                BoundaryCalculationService.calculateCenteringPadding(null, { width: 100, height: 100 })
            ).toThrow();
        });

        test('throws on invalid containerSize', () => {
            expect(() =>
                BoundaryCalculationService.calculateCenteringPadding({ width: 100, height: 100 }, null)
            ).toThrow();
        });
    });
});
