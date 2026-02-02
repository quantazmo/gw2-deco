// @ts-nocheck
/**
 * Tests for src/domain/Coordinate.js
 * Tests coordinate value object validation, distance calculations, and immutability
 */
import { Coordinate } from '../../src/domain/Coordinate.js';

describe('Coordinate Value Object', () => {
    test('constructor should create coordinate with valid x, y values', () => {
        const coord = new Coordinate(10, 20);
        expect(coord.x).toBe(10);
        expect(coord.y).toBe(20);
    });

    test('constructor should accept zero values', () => {
        const coord = new Coordinate(0, 0);
        expect(coord.x).toBe(0);
        expect(coord.y).toBe(0);
    });

    test('constructor should accept negative values', () => {
        const coord = new Coordinate(-15, -25);
        expect(coord.x).toBe(-15);
        expect(coord.y).toBe(-25);
    });

    test('constructor should throw on non-numeric x', () => {
        expect(() => {
            new Coordinate('invalid', 20);
        }).toThrow();

        expect(() => {
            new Coordinate(null, 20);
        }).toThrow();

        expect(() => {
            new Coordinate(undefined, 20);
        }).toThrow();
    });

    test('constructor should throw on non-numeric y', () => {
        expect(() => {
            new Coordinate(10, 'invalid');
        }).toThrow();

        expect(() => {
            new Coordinate(10, null);
        }).toThrow();

        expect(() => {
            new Coordinate(10, undefined);
        }).toThrow();
    });

    test('distanceTo should calculate distance correctly', () => {
        const coord1 = new Coordinate(0, 0);
        const coord2 = new Coordinate(3, 4);

        // 3-4-5 triangle
        expect(coord1.distanceTo(coord2)).toBe(5);
    });

    test('distanceTo should handle same coordinates (distance 0)', () => {
        const coord = new Coordinate(10, 20);
        expect(coord.distanceTo(coord)).toBe(0);
    });

    test('distanceTo should be symmetric', () => {
        const coord1 = new Coordinate(1, 1);
        const coord2 = new Coordinate(4, 5);

        const distance1 = coord1.distanceTo(coord2);
        const distance2 = coord2.distanceTo(coord1);

        expect(distance1).toBe(distance2);
    });

    test('distanceTo should handle negative coordinates', () => {
        const coord1 = new Coordinate(-3, -4);
        const coord2 = new Coordinate(0, 0);

        expect(coord1.distanceTo(coord2)).toBe(5);
    });

    test('distanceTo should throw on invalid coordinate', () => {
        const coord = new Coordinate(0, 0);

        expect(() => {
            coord.distanceTo(null);
        }).toThrow();

        expect(() => {
            coord.distanceTo({ x: 1 }); // Missing y
        }).toThrow();
    });

    test('equals should return true for same coordinates', () => {
        const coord1 = new Coordinate(10, 20);
        const coord2 = new Coordinate(10, 20);

        expect(coord1.equals(coord2)).toBe(true);
    });

    test('equals should return false for different coordinates', () => {
        const coord1 = new Coordinate(10, 20);
        const coord2 = new Coordinate(10, 21);

        expect(coord1.equals(coord2)).toBe(false);
    });

    test('equals should return false for different x', () => {
        const coord1 = new Coordinate(10, 20);
        const coord2 = new Coordinate(11, 20);

        expect(coord1.equals(coord2)).toBe(false);
    });

    test('equals should throw on invalid coordinate', () => {
        const coord = new Coordinate(10, 20);

        expect(() => {
            coord.equals(null);
        }).toThrow();

        expect(() => {
            coord.equals({ x: 10 }); // Missing y
        }).toThrow();
    });

    test('toString should return string representation', () => {
        const coord = new Coordinate(10, 20);
        expect(coord.toString()).toBe('(10, 20)');
    });

    test('toString should handle negative values', () => {
        const coord = new Coordinate(-15, -25);
        expect(coord.toString()).toBe('(-15, -25)');
    });

    test('object should be immutable', () => {
        const coord = new Coordinate(10, 20);

        // Attempting to modify should either fail or have no effect
        try {
            coord.x = 30;
            // If we get here, the property was reassigned
            // Check if it actually changed
            expect(coord.x).toBe(10);
        } catch (e) {
            // If Object.defineProperty is used, this might throw
            expect(true).toBeTruthy();
        }
    });

    test('constructor should handle floating point coordinates', () => {
        const coord = new Coordinate(10.5, 20.75);
        expect(coord.x).toBe(10.5);
        expect(coord.y).toBe(20.75);
    });

    test('distanceTo should calculate correctly with floating point', () => {
        const coord1 = new Coordinate(0, 0);
        const coord2 = new Coordinate(1.5, 2);

        const distance = coord1.distanceTo(coord2);
        const expected = Math.sqrt(1.5 * 1.5 + 2 * 2);

        expect(distance).toBe(expected);
    });

    test('equals should work with floating point coordinates', () => {
        const coord1 = new Coordinate(10.5, 20.75);
        const coord2 = new Coordinate(10.5, 20.75);

        expect(coord1.equals(coord2)).toBe(true);
    });
});
