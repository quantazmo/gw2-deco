// @ts-nocheck
/**
 * Tests for src/domain/MapRect.js
 */
import { MapRect } from '../../src/domain/MapRect.js';

describe('MapRect', () => {
    describe('constructor – (minX, minY, maxX, maxY) signature', () => {
        test('creates rect with numeric values', () => {
            const r = new MapRect(0, 0, 100, 200);
            expect(r.minX).toBe(0);
            expect(r.minY).toBe(0);
            expect(r.maxX).toBe(100);
            expect(r.maxY).toBe(200);
        });

        test('accepts negative values', () => {
            const r = new MapRect(-50, -100, 50, 100);
            expect(r.minX).toBe(-50);
        });

        test('allows equal min and max (zero-size rect)', () => {
            const r = new MapRect(5, 5, 5, 5);
            expect(r.getWidth()).toBe(0);
        });

        test('throws if min > max on X', () => {
            expect(() => new MapRect(100, 0, 50, 200)).toThrow();
        });

        test('throws if min > max on Y', () => {
            expect(() => new MapRect(0, 100, 50, 50)).toThrow();
        });

        test('throws for non-finite values', () => {
            expect(() => new MapRect(NaN, 0, 100, 100)).toThrow();
            expect(() => new MapRect(0, Infinity, 100, 100)).toThrow();
        });
    });

    describe('constructor – (Coordinate, Coordinate) signature', () => {
        test('creates rect from coordinate objects', () => {
            const min = { x: 10, y: 20 };
            const max = { x: 30, y: 40 };
            const r = new MapRect(min, max);
            expect(r.minX).toBe(10);
            expect(r.maxY).toBe(40);
        });

        test('throws when min > max with coordinate objects', () => {
            expect(() => new MapRect({ x: 50, y: 0 }, { x: 10, y: 100 })).toThrow();
        });

        test('throws when second arg is not a coordinate', () => {
            expect(() => new MapRect({ x: 0, y: 0 }, 42)).toThrow();
        });

        test('throws on invalid constructor args', () => {
            expect(() => new MapRect('bad', 'args')).toThrow();
        });
    });

    describe('static fromArrays', () => {
        test('creates rect from array pairs', () => {
            const r = MapRect.fromArrays([1, 2], [10, 20]);
            expect(r.minX).toBe(1);
            expect(r.minY).toBe(2);
            expect(r.maxX).toBe(10);
            expect(r.maxY).toBe(20);
        });

        test('throws for non-array args', () => {
            expect(() => MapRect.fromArrays(null, [10, 20])).toThrow();
            expect(() => MapRect.fromArrays([1, 2], 'bad')).toThrow();
        });

        test('throws for arrays with fewer than 2 elements', () => {
            expect(() => MapRect.fromArrays([1], [10, 20])).toThrow();
        });
    });

    describe('static fromObject', () => {
        test('creates rect from plain object', () => {
            const r = MapRect.fromObject({ minX: 5, minY: 6, maxX: 15, maxY: 16 });
            expect(r.minX).toBe(5);
            expect(r.maxX).toBe(15);
        });

        test('throws for missing properties', () => {
            expect(() => MapRect.fromObject({ minX: 5 })).toThrow();
            expect(() => MapRect.fromObject(null)).toThrow();
        });
    });

    describe('dimension getters', () => {
        let r;
        beforeEach(() => { r = new MapRect(10, 20, 50, 80); });

        test('getMin returns {x, y}', () => {
            expect(r.getMin()).toEqual({ x: 10, y: 20 });
        });

        test('getMax returns {x, y}', () => {
            expect(r.getMax()).toEqual({ x: 50, y: 80 });
        });

        test('getWidth', () => {
            expect(r.getWidth()).toBe(40);
        });

        test('getHeight', () => {
            expect(r.getHeight()).toBe(60);
        });

        test('getSize', () => {
            expect(r.getSize()).toEqual({ width: 40, height: 60 });
        });

        test('getCenter', () => {
            expect(r.getCenter()).toEqual({ x: 30, y: 50 });
        });

        test('getAspectRatio', () => {
            expect(r.getAspectRatio()).toBeCloseTo(40 / 60);
        });

        test('getAspectRatio throws for zero-height rect', () => {
            const flat = new MapRect(0, 5, 100, 5);
            expect(() => flat.getAspectRatio()).toThrow();
        });
    });

    describe('contains', () => {
        const r = new MapRect(0, 0, 100, 100);

        test('returns true for point inside', () => {
            expect(r.contains(50, 50)).toBe(true);
        });

        test('returns true for corner (inclusive)', () => {
            expect(r.contains(0, 0)).toBe(true);
            expect(r.contains(100, 100)).toBe(true);
        });

        test('returns false for point outside', () => {
            expect(r.contains(-1, 50)).toBe(false);
            expect(r.contains(50, 101)).toBe(false);
        });
    });

    describe('containsCoord', () => {
        const r = new MapRect(0, 0, 100, 100);

        test('returns true for coord inside', () => {
            expect(r.containsCoord({ x: 50, y: 50 })).toBe(true);
        });

        test('throws for invalid coord', () => {
            expect(() => r.containsCoord(null)).toThrow();
            expect(() => r.containsCoord({ x: 5 })).toThrow();
        });
    });

    describe('overlaps', () => {
        const r = new MapRect(0, 0, 100, 100);

        test('returns true for overlapping rects', () => {
            expect(r.overlaps(new MapRect(50, 50, 150, 150))).toBe(true);
        });

        test('returns false for non-overlapping rects', () => {
            expect(r.overlaps(new MapRect(200, 200, 300, 300))).toBe(false);
        });

        test('throws for non-MapRect arg', () => {
            expect(() => r.overlaps({ minX: 0, minY: 0, maxX: 50, maxY: 50 })).toThrow();
        });
    });

    describe('equals', () => {
        test('returns true for equal rects', () => {
            const a = new MapRect(1, 2, 3, 4);
            const b = new MapRect(1, 2, 3, 4);
            expect(a.equals(b)).toBe(true);
        });

        test('returns false for different rects', () => {
            const a = new MapRect(1, 2, 3, 4);
            const b = new MapRect(1, 2, 3, 5);
            expect(a.equals(b)).toBe(false);
        });

        test('returns false for non-MapRect', () => {
            const a = new MapRect(1, 2, 3, 4);
            expect(a.equals(null)).toBe(false);
        });
    });

    describe('expand', () => {
        test('expands by padding', () => {
            const r = new MapRect(10, 10, 90, 90);
            const expanded = r.expand(10);
            expect(expanded.minX).toBe(0);
            expect(expanded.minY).toBe(0);
            expect(expanded.maxX).toBe(100);
            expect(expanded.maxY).toBe(100);
        });
    });

    describe('scale', () => {
        test('scales by factor around center', () => {
            const r = new MapRect(0, 0, 100, 100);
            const scaled = r.scale(2);
            expect(scaled.minX).toBe(-50);
            expect(scaled.maxX).toBe(150);
        });
    });

    describe('adjustToAspectRatio', () => {
        test('expands height when rect is wider', () => {
            const r = new MapRect(0, 0, 200, 100); // aspect 2
            const adjusted = r.adjustToAspectRatio(1); // target square
            expect(adjusted.getWidth()).toBeCloseTo(adjusted.getHeight());
        });

        test('expands width when rect is narrower', () => {
            const r = new MapRect(0, 0, 100, 200); // aspect 0.5
            const adjusted = r.adjustToAspectRatio(1); // target square
            expect(adjusted.getWidth()).toBeCloseTo(adjusted.getHeight());
        });
    });

    describe('toObject / toString', () => {
        test('toObject returns plain object', () => {
            const r = new MapRect(1, 2, 3, 4);
            expect(r.toObject()).toEqual({ minX: 1, minY: 2, maxX: 3, maxY: 4 });
        });

        test('toString includes coordinates', () => {
            const r = new MapRect(1, 2, 3, 4);
            expect(r.toString()).toContain('1');
            expect(r.toString()).toContain('4');
        });
    });
});
