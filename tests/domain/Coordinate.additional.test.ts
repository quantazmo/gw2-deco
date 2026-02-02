// @ts-nocheck
/**
 * Additional tests for src/domain/Coordinate.js
 * Covers: fromArray, fromObject, toArray, toObject, translate, scale
 */
import { Coordinate } from '../../src/domain/Coordinate.js';

describe('Coordinate — additional coverage', () => {

    describe('fromArray', () => {
        test('creates from valid [x, y] array', () => {
            const c = Coordinate.fromArray([3, 7]);
            expect(c.x).toBe(3);
            expect(c.y).toBe(7);
        });

        test('creates from array with negative values', () => {
            const c = Coordinate.fromArray([-5, -10]);
            expect(c.x).toBe(-5);
            expect(c.y).toBe(-10);
        });

        test('throws on non-array', () => {
            expect(() => Coordinate.fromArray(null)).toThrow();
            expect(() => Coordinate.fromArray({ x: 1, y: 2 })).toThrow();
        });

        test('throws on array with less than 2 elements', () => {
            expect(() => Coordinate.fromArray([1])).toThrow();
            expect(() => Coordinate.fromArray([])).toThrow();
        });
    });

    describe('fromObject', () => {
        test('creates from valid {x, y} object', () => {
            const c = Coordinate.fromObject({ x: 4, y: 8 });
            expect(c.x).toBe(4);
            expect(c.y).toBe(8);
        });

        test('throws on null', () => {
            expect(() => Coordinate.fromObject(null)).toThrow();
        });

        test('throws on object missing x', () => {
            expect(() => Coordinate.fromObject({ y: 5 })).toThrow();
        });

        test('throws on object missing y', () => {
            expect(() => Coordinate.fromObject({ x: 5 })).toThrow();
        });

        test('throws on non-object', () => {
            expect(() => Coordinate.fromObject('not-an-object')).toThrow();
        });
    });

    describe('toArray', () => {
        test('returns [x, y] array', () => {
            const c = new Coordinate(3, 7);
            expect(c.toArray()).toEqual([3, 7]);
        });

        test('is the inverse of fromArray', () => {
            const arr = [12, 34];
            expect(Coordinate.fromArray(arr).toArray()).toEqual(arr);
        });
    });

    describe('toObject', () => {
        test('returns {x, y} plain object', () => {
            const c = new Coordinate(5, 9);
            const obj = c.toObject();
            expect(obj).toEqual({ x: 5, y: 9 });
        });

        test('is the inverse of fromObject', () => {
            const obj = { x: 6, y: 11 };
            expect(Coordinate.fromObject(obj).toObject()).toEqual(obj);
        });
    });

    describe('translate', () => {
        test('returns new Coordinate offset by dx and dy', () => {
            const c = new Coordinate(10, 20);
            const t = c.translate(5, -3);
            expect(t.x).toBe(15);
            expect(t.y).toBe(17);
        });

        test('original coordinate is unchanged', () => {
            const c = new Coordinate(10, 20);
            c.translate(5, 5);
            expect(c.x).toBe(10);
            expect(c.y).toBe(20);
        });

        test('translate by zero returns equal coordinate', () => {
            const c = new Coordinate(10, 20);
            const t = c.translate(0, 0);
            expect(t.x).toBe(10);
            expect(t.y).toBe(20);
        });

        test('returns a Coordinate instance', () => {
            const c = new Coordinate(1, 2);
            expect(c.translate(1, 1)).toBeInstanceOf(Coordinate);
        });
    });

    describe('scale', () => {
        test('returns new Coordinate scaled by factor', () => {
            const c = new Coordinate(4, 6);
            const s = c.scale(2);
            expect(s.x).toBe(8);
            expect(s.y).toBe(12);
        });

        test('scale by 1 returns equal coordinate', () => {
            const c = new Coordinate(4, 6);
            const s = c.scale(1);
            expect(s.x).toBe(4);
            expect(s.y).toBe(6);
        });

        test('scale by 0.5 halves the values', () => {
            const c = new Coordinate(8, 10);
            const s = c.scale(0.5);
            expect(s.x).toBe(4);
            expect(s.y).toBe(5);
        });

        test('original coordinate is unchanged', () => {
            const c = new Coordinate(4, 6);
            c.scale(3);
            expect(c.x).toBe(4);
            expect(c.y).toBe(6);
        });

        test('returns a Coordinate instance', () => {
            const c = new Coordinate(2, 3);
            expect(c.scale(2)).toBeInstanceOf(Coordinate);
        });
    });
});
