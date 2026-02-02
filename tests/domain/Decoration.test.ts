// @ts-nocheck
/**
 * Tests for src/domain/Decoration.js
 * Covers core construction, rotX/rotZ fields, validation, and toDTO output.
 */
import { Decoration } from '../../src/domain/Decoration.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';

function makeCoord(x = 100, y = 200, z = 0) {
    return new WorldCoordinate(x, y, z, 0);
}

describe('Decoration', () => {
    describe('construction', () => {
        test('creates decoration with required fields', () => {
            const dec = new Decoration('327', 'Flower Pot', makeCoord());
            expect(dec.id).toBe('327');
            expect(dec.name).toBe('Flower Pot');
            expect(dec.rotation).toBe(0);
            expect(dec.scale).toBe(1);
        });

        test('accepts numeric id and coerces to string', () => {
            const dec = new Decoration(42, 'Bench', makeCoord());
            expect(dec.id).toBe('42');
        });
    });

    describe('rotX and rotZ fields', () => {
        test('rotX defaults to 0 on new Decoration', () => {
            const dec = new Decoration('1', 'Tree', makeCoord());
            expect(dec.rotX).toBe(0);
        });

        test('rotZ defaults to 0 on new Decoration', () => {
            const dec = new Decoration('1', 'Tree', makeCoord());
            expect(dec.rotZ).toBe(0);
        });

        test('rotX and rotZ can be set after construction', () => {
            const dec = new Decoration('1', 'Tree', makeCoord());
            dec.rotX = 1.23;
            dec.rotZ = 4.56;
            expect(dec.rotX).toBe(1.23);
            expect(dec.rotZ).toBe(4.56);
        });

        test('rotX and rotZ are independent from rotation (ry)', () => {
            const dec = new Decoration('1', 'Tree', makeCoord(), 0.5);
            dec.rotX = 0.1;
            dec.rotZ = 0.2;
            expect(dec.rotation).toBe(0.5);
            expect(dec.rotX).toBe(0.1);
            expect(dec.rotZ).toBe(0.2);
        });
    });

    describe('toDTO', () => {
        test('includes rotX and rotZ in DTO output', () => {
            const dec = new Decoration('327', 'Chair', makeCoord(10, 20, 30), 0.1, 1.5);
            dec.rotX = 0.5;
            dec.rotZ = 0.9;
            const dto = dec.toDTO();
            expect(dto.rotX).toBe(0.5);
            expect(dto.rotZ).toBe(0.9);
        });

        test('DTO rotX and rotZ are 0 when not explicitly set', () => {
            const dec = new Decoration('1', 'Lamp', makeCoord());
            const dto = dec.toDTO();
            expect(dto.rotX).toBe(0);
            expect(dto.rotZ).toBe(0);
        });
    });
});
