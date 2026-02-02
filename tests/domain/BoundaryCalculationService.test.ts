// @ts-nocheck
/**
 * Tests for src/domain/BoundaryCalculationService.js
 * Tests map boundary calculations and bounds operations
 */
import { BoundaryCalculationService } from '../../src/domain/BoundaryCalculationService.js';
import { MapBoundary } from '../../src/domain/MapBoundary.js';
import { Coordinate } from '../../src/domain/Coordinate.js';
import { MapRect } from '../../src/domain/MapRect.js';

describe('BoundaryCalculationService', () => {

    test('calculateBoundsFromBoundary should calculate correct bounds', () => {
        const points = [
            new Coordinate(0, 0),
            new Coordinate(100, 0),
            new Coordinate(100, 100),
            new Coordinate(0, 100)
        ];
        const boundary = new MapBoundary(points);

        const bounds = BoundaryCalculationService.calculateBoundsFromBoundary(boundary);

        expect(bounds).toBeTruthy();
        expect(bounds.min.x).toBe(0);
        expect(bounds.min.y).toBe(0);
        expect(bounds.max.x).toBe(100);
        expect(bounds.max.y).toBe(100);
    });

    test('calculateBoundsFromBoundary should handle negative coordinates', () => {
        const points = [
            new Coordinate(-100, -100),
            new Coordinate(50, -100),
            new Coordinate(50, 50),
            new Coordinate(-100, 50)
        ];
        const boundary = new MapBoundary(points);

        const bounds = BoundaryCalculationService.calculateBoundsFromBoundary(boundary);

        expect(bounds.min.x).toBe(-100);
        expect(bounds.min.y).toBe(-100);
        expect(bounds.max.x).toBe(50);
        expect(bounds.max.y).toBe(50);
    });

    test('calculateBoundsFromBoundary should throw on null boundary', () => {
        expect(() => {
            BoundaryCalculationService.calculateBoundsFromBoundary(null);
        }).toThrow();
    });

    test('calculateBoundsFromBoundary should throw on invalid boundary', () => {
        expect(() => {
            BoundaryCalculationService.calculateBoundsFromBoundary({ points: null });
        }).toThrow();
    });

    test('calculateBoundsFromTiles should calculate bounds from tile array', () => {
        const tiles = [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: 1, y: 1 }
        ];

        const bounds = BoundaryCalculationService.calculateBoundsFromTiles(tiles);

        expect(bounds).toBeTruthy();
        expect(bounds.min.x).toBe(0);
        expect(bounds.min.y).toBe(0);
        expect(bounds.max.x > 0).toBeTruthy();
        expect(bounds.max.y > 0).toBeTruthy();
    });

    test('calculateBoundsFromTiles should throw on null tiles', () => {
        expect(() => {
            BoundaryCalculationService.calculateBoundsFromTiles(null);
        }).toThrow();
    });

    test('calculateBoundsFromTiles should throw on empty tiles array', () => {
        expect(() => {
            BoundaryCalculationService.calculateBoundsFromTiles([]);
        }).toThrow();
    });

    test('expandBoundsToAspectRatio should expand bounds to match aspect ratio', () => {
        const bounds = {
            min: { x: 0, y: 0 },
            max: { x: 100, y: 100 },
            width: 100,
            height: 100
        };
        const aspectRatio = 2; // 2:1 width to height

        const expanded = BoundaryCalculationService.expandBoundsToAspectRatio(bounds, aspectRatio);

        expect(expanded).toBeTruthy();
        const width = expanded.max.x - expanded.min.x;
        const height = expanded.max.y - expanded.min.y;
        const ratio = width / height;

        expect(Math.abs(ratio - aspectRatio) < 0.01).toBeTruthy();
    });

    test('expandBoundsToAspectRatio should throw on null bounds', () => {
        expect(() => {
            BoundaryCalculationService.expandBoundsToAspectRatio(null, 1.5);
        }).toThrow();
    });

    test('expandBoundsToAspectRatio should throw on invalid aspect ratio', () => {
        const bounds = {
            min: { x: 0, y: 0 },
            max: { x: 100, y: 100 },
            width: 100,
            height: 100
        };

        expect(() => {
            BoundaryCalculationService.expandBoundsToAspectRatio(bounds, 0);
        }).toThrow();

        expect(() => {
            BoundaryCalculationService.expandBoundsToAspectRatio(bounds, -1);
        }).toThrow();

        expect(() => {
            BoundaryCalculationService.expandBoundsToAspectRatio(bounds, null);
        }).toThrow();
    });

    test('centerBoundsInViewport should center bounds with proper offsets', () => {
        const bounds = {
            min: { x: 0, y: 0 },
            max: { x: 100, y: 100 },
            width: 100,
            height: 100
        };
        const viewport = {
            width: 200,
            height: 200
        };

        const centered = BoundaryCalculationService.centerBoundsInViewport(bounds, viewport);

        expect(centered).toBeTruthy();
        expect(centered.x !== undefined).toBeTruthy();
        expect(centered.y !== undefined).toBeTruthy();
        expect(centered.boundsWidth !== undefined).toBeTruthy();
        expect(centered.boundsHeight !== undefined).toBeTruthy();
    });

    test('centerBoundsInViewport should throw on null bounds', () => {
        const viewport = {
            width: 200,
            height: 200
        };

        expect(() => {
            BoundaryCalculationService.centerBoundsInViewport(null, viewport);
        }).toThrow();
    });

    test('centerBoundsInViewport should throw on null viewport', () => {
        const bounds = {
            min: { x: 0, y: 0 },
            max: { x: 100, y: 100 },
            width: 100,
            height: 100
        };

        expect(() => {
            BoundaryCalculationService.centerBoundsInViewport(bounds, null);
        }).toThrow();
    });

    test('centerBoundsInViewport should throw on invalid viewport', () => {
        const bounds = {
            min: { x: 0, y: 0 },
            max: { x: 100, y: 100 },
            width: 100,
            height: 100
        };

        expect(() => {
            BoundaryCalculationService.centerBoundsInViewport(bounds, { width: 'invalid' });
        }).toThrow();

        expect(() => {
            BoundaryCalculationService.centerBoundsInViewport(bounds, {});
        }).toThrow();
    });

    test('service should handle complex boundary calculations', () => {
        const points = [
            new Coordinate(10, 10),
            new Coordinate(200, 10),
            new Coordinate(200, 300),
            new Coordinate(10, 300)
        ];
        const boundary = new MapBoundary(points);

        const bounds = BoundaryCalculationService.calculateBoundsFromBoundary(boundary);
        const aspectRatio = 1.5;
        const expanded = BoundaryCalculationService.expandBoundsToAspectRatio(bounds, aspectRatio);
        const viewport = { width: 800, height: 600 };
        const centered = BoundaryCalculationService.centerBoundsInViewport(expanded, viewport);

        expect(centered).toBeTruthy();
        expect(centered.x !== undefined).toBeTruthy();
    });

});
