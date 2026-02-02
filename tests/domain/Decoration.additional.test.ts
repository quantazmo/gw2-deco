// @ts-nocheck
/**
 * Additional tests for src/domain/Decoration.js
 * Covers: clone, equals, toString, fromDTO, validateState, plain-object position
 */
import { Decoration } from '../../src/domain/Decoration.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';

function coord(x = 10, y = 20, z = 0) {
    return new WorldCoordinate(x, y, z, 0);
}

describe('Decoration — additional coverage', () => {

    describe('plain-object position', () => {
        test('accepts plain object with x and y as position', () => {
            const dec = new Decoration('1', 'Bench', { x: 5, y: 10 });
            expect(dec.id).toBe('1');
            expect(dec.position.x).toBe(5);
            expect(dec.position.y).toBe(10);
        });

        test('plain object position sets z to 0 when missing', () => {
            const dec = new Decoration('1', 'Bench', { x: 5, y: 10 });
            expect(dec.position.z).toBe(0);
        });
    });

    describe('validateState', () => {
        test('returns isValid:true for a valid decoration', () => {
            const dec = new Decoration('1', 'Tree', coord());
            const result = dec.validateState();
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('returns isValid:false after manually corrupting id', () => {
            const dec = new Decoration('1', 'Tree', coord());
            dec.id = '';
            const result = dec.validateState();
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    describe('validate — error cases', () => {
        test('throws on non-finite rotation', () => {
            expect(() => new Decoration('1', 'A', coord(), Infinity)).toThrow();
            expect(() => new Decoration('1', 'A', coord(), NaN)).toThrow();
        });

        test('throws on non-positive scale', () => {
            expect(() => new Decoration('1', 'A', coord(), 0, 0)).toThrow();
            expect(() => new Decoration('1', 'A', coord(), 0, -1)).toThrow();
        });

        test('throws when position is missing x or y', () => {
            expect(() => new Decoration('1', 'A', { x: 1 })).toThrow();
            expect(() => new Decoration('1', 'A', null)).toThrow();
        });
    });

    describe('clone', () => {
        test('returns a new Decoration with same values', () => {
            const original = new Decoration('42', 'Chair', coord(5, 6), 45, 2);
            const clone = original.clone();
            expect(clone.id).toBe('42');
            expect(clone.name).toBe('Chair');
            expect(clone.rotation).toBe(45);
            expect(clone.scale).toBe(2);
        });

        test('clone is independent — changing original does not affect clone', () => {
            const original = new Decoration('42', 'Chair', coord(5, 6), 0, 1);
            const clone = original.clone();
            original.rotation = 90;
            expect(clone.rotation).toBe(0);
        });

        test('clone does not share position reference', () => {
            const original = new Decoration('1', 'Test', coord(10, 20));
            const clone = original.clone();
            expect(clone.position).not.toBe(original.position);
        });
    });

    describe('equals', () => {
        test('equal decorations return true', () => {
            const a = new Decoration('1', 'Tree', coord(10, 20), 0, 1);
            const b = new Decoration('1', 'Tree', coord(10, 20), 0, 1);
            expect(a.equals(b)).toBe(true);
        });

        test('different id returns false', () => {
            const a = new Decoration('1', 'Tree', coord(10, 20), 0, 1);
            const b = new Decoration('2', 'Tree', coord(10, 20), 0, 1);
            expect(a.equals(b)).toBe(false);
        });

        test('different name returns false', () => {
            const a = new Decoration('1', 'Tree', coord(10, 20), 0, 1);
            const b = new Decoration('1', 'Shrub', coord(10, 20), 0, 1);
            expect(a.equals(b)).toBe(false);
        });

        test('different rotation returns false', () => {
            const a = new Decoration('1', 'Tree', coord(10, 20), 0, 1);
            const b = new Decoration('1', 'Tree', coord(10, 20), 90, 1);
            expect(a.equals(b)).toBe(false);
        });

        test('different scale returns false', () => {
            const a = new Decoration('1', 'Tree', coord(10, 20), 0, 1);
            const b = new Decoration('1', 'Tree', coord(10, 20), 0, 2);
            expect(a.equals(b)).toBe(false);
        });

        test('non-Decoration returns false', () => {
            const a = new Decoration('1', 'Tree', coord());
            expect(a.equals(null)).toBe(false);
            expect(a.equals({ id: '1' })).toBe(false);
        });
    });

    describe('toString', () => {
        test('includes id and name', () => {
            const dec = new Decoration('77', 'Fountain', coord());
            const str = dec.toString();
            expect(str).toContain('77');
            expect(str).toContain('Fountain');
        });
    });

    describe('fromDTO', () => {
        test('creates decoration from DTO', () => {
            const dto = {
                id: '5',
                name: 'Lantern',
                position: { x: 100, y: 200, z: 0, rotation: 0 },
                rotation: 30,
                scale: 1.5
            };
            const dec = Decoration.fromDTO(dto);
            expect(dec.id).toBe('5');
            expect(dec.name).toBe('Lantern');
            expect(dec.rotation).toBe(30);
            expect(dec.scale).toBe(1.5);
        });

        test('round-trips through toDTO', () => {
            const original = new Decoration('9', 'Pot', coord(3, 4), 15, 0.5);
            const dto = original.toDTO();
            const restored = Decoration.fromDTO(dto);
            expect(restored.id).toBe(original.id);
            expect(restored.name).toBe(original.name);
            expect(restored.rotation).toBe(original.rotation);
            expect(restored.scale).toBe(original.scale);
        });
    });

    describe('validate – name type check', () => {
        test('throws when name is not a string', () => {
            expect(() => new Decoration('d1', 42, coord(0, 0), 0, 1))
                .toThrow('Decoration: name must be a string');
        });
    });
});
