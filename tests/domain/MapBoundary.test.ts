// @ts-nocheck
/**
 * Tests for src/domain/MapBoundary.js
 */
import { MapBoundary } from '../../src/domain/MapBoundary.js';

const triangle = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }];
const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];

describe('MapBoundary', () => {
    describe('constructor / validate', () => {
        test('creates from array of 3+ points', () => {
            const b = new MapBoundary(triangle);
            expect(b.points).toHaveLength(3);
        });

        test('stores numeric copies of points', () => {
            const b = new MapBoundary(triangle);
            expect(b.points[0]).toEqual({ x: 0, y: 0 });
        });

        test('throws for non-array', () => {
            expect(() => new MapBoundary('bad')).toThrow();
        });

        test('throws for fewer than 3 points', () => {
            expect(() => new MapBoundary([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toThrow();
        });

        test('throws for non-numeric point coordinates', () => {
            expect(() => new MapBoundary([
                { x: 'a', y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }
            ])).toThrow();
        });

        test('throws for non-finite point coordinates', () => {
            expect(() => new MapBoundary([
                { x: NaN, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }
            ])).toThrow();
        });
    });

    describe('contains (ray-casting)', () => {
        const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
        const boundary = new MapBoundary(square);

        test('returns true for point clearly inside', () => {
            expect(boundary.contains({ x: 5, y: 5 })).toBe(true);
        });

        test('returns false for point clearly outside', () => {
            expect(boundary.contains({ x: 20, y: 5 })).toBe(false);
        });

        test('throws for point without x/y', () => {
            expect(() => boundary.contains({ z: 5 })).toThrow();
        });
    });

    describe('getBounds', () => {
        test('returns correct bounding box', () => {
            const b = new MapBoundary(square);
            const bounds = b.getBounds();
            expect(bounds.min).toEqual({ x: 0, y: 0 });
            expect(bounds.max).toEqual({ x: 10, y: 10 });
            expect(bounds.width).toBe(10);
            expect(bounds.height).toBe(10);
        });
    });

    describe('validateState', () => {
        test('returns isValid true for valid boundary', () => {
            const b = new MapBoundary(triangle);
            expect(b.validateState().isValid).toBe(true);
            expect(b.validateState().errors).toHaveLength(0);
        });
    });

    describe('getCentroid', () => {
        test('returns centroid of square', () => {
            const b = new MapBoundary(square);
            const c = b.getCentroid();
            expect(c.x).toBe(5);
            expect(c.y).toBe(5);
        });
    });

    describe('toObject', () => {
        test('returns points array', () => {
            const b = new MapBoundary(triangle);
            expect(b.toObject()).toEqual({ points: triangle });
        });
    });

    describe('clone', () => {
        test('creates a deep copy', () => {
            const b = new MapBoundary(triangle);
            const c = b.clone();
            expect(c.points).toEqual(b.points);
            expect(c).not.toBe(b);
        });
    });

    describe('equals', () => {
        test('equal boundaries', () => {
            const a = new MapBoundary(triangle);
            const b = new MapBoundary(triangle);
            expect(a.equals(b)).toBe(true);
        });

        test('different number of points', () => {
            const a = new MapBoundary(triangle);
            const b = new MapBoundary(square);
            expect(a.equals(b)).toBe(false);
        });

        test('same count but different values', () => {
            const a = new MapBoundary([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }]);
            const b = new MapBoundary([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }]);
            expect(a.equals(b)).toBe(false);
        });

        test('non-MapBoundary returns false', () => {
            expect(new MapBoundary(triangle).equals(null)).toBe(false);
        });
    });

    describe('toString', () => {
        test('includes point count', () => {
            const b = new MapBoundary(triangle);
            expect(b.toString()).toContain('3');
        });
    });

    describe('static fromObject', () => {
        test('creates from object', () => {
            const b = MapBoundary.fromObject({ points: triangle });
            expect(b.points).toHaveLength(3);
        });
    });
});
