// @ts-nocheck
/**
 * Additional tests for src/domain/Layer.js
 * Covers: clone, equals, toString, fromDTO, getDecoration
 */
import { Layer } from '../../src/domain/Layer.js';
import { Decoration } from '../../src/domain/Decoration.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';

function makeCoord(x = 10, y = 20) {
    return new WorldCoordinate(x, y, 0, 0);
}
function makeDec(id, name = 'Test') {
    return new Decoration(id, name, makeCoord());
}

describe('Layer — additional coverage', () => {

    describe('getDecoration', () => {
        test('returns decoration by id', () => {
            const layer = new Layer('l1', 'Layer');
            layer.addDecoration(makeDec('d1', 'Torch'));
            const result = layer.getDecoration('d1');
            expect(result.id).toBe('d1');
        });

        test('returns null when decoration not found', () => {
            const layer = new Layer('l1', 'Layer');
            expect(layer.getDecoration('nonexistent')).toBeNull();
        });
    });

    describe('clone', () => {
        test('returns a new Layer with same id, name, visibility', () => {
            const layer = new Layer('l1', 'My Layer', false);
            layer.addDecoration(makeDec('d1'));
            const clone = layer.clone();
            expect(clone.id).toBe('l1');
            expect(clone.name).toBe('My Layer');
            expect(clone.isVisible).toBe(false);
        });

        test('clone contains cloned decorations', () => {
            const layer = new Layer('l1', 'Layer');
            layer.addDecoration(makeDec('d1', 'Tree'));
            const clone = layer.clone();
            expect(clone.getDecorationCount()).toBe(1);
            expect(clone.getDecoration('d1').name).toBe('Tree');
        });

        test('clone is independent from original', () => {
            const layer = new Layer('l1', 'Layer');
            layer.addDecoration(makeDec('d1'));
            const clone = layer.clone();
            clone.addDecoration(makeDec('d2'));
            expect(layer.getDecorationCount()).toBe(1);
            expect(clone.getDecorationCount()).toBe(2);
        });

        test('clones empty layer', () => {
            const layer = new Layer('l1', 'Empty');
            const clone = layer.clone();
            expect(clone.getDecorationCount()).toBe(0);
        });
    });

    describe('equals', () => {
        test('equal layers return true', () => {
            const a = new Layer('l1', 'Layer');
            const b = new Layer('l1', 'Layer');
            a.addDecoration(makeDec('d1', 'Tree'));
            b.addDecoration(makeDec('d1', 'Tree'));
            expect(a.equals(b)).toBe(true);
        });

        test('different id returns false', () => {
            const a = new Layer('l1', 'Layer');
            const b = new Layer('l2', 'Layer');
            expect(a.equals(b)).toBe(false);
        });

        test('different name returns false', () => {
            const a = new Layer('l1', 'Layer A');
            const b = new Layer('l1', 'Layer B');
            expect(a.equals(b)).toBe(false);
        });

        test('different visibility returns false', () => {
            const a = new Layer('l1', 'Layer', true);
            const b = new Layer('l1', 'Layer', false);
            expect(a.equals(b)).toBe(false);
        });

        test('different decoration count returns false', () => {
            const a = new Layer('l1', 'Layer');
            const b = new Layer('l1', 'Layer');
            a.addDecoration(makeDec('d1'));
            expect(a.equals(b)).toBe(false);
        });

        test('decoration with different values returns false', () => {
            const a = new Layer('l1', 'Layer');
            const b = new Layer('l1', 'Layer');
            a.addDecoration(new Decoration('d1', 'Tree', makeCoord(10, 20)));
            b.addDecoration(new Decoration('d1', 'Shrub', makeCoord(10, 20)));
            expect(a.equals(b)).toBe(false);
        });

        test('decoration present in a but not b returns false', () => {
            const a = new Layer('l1', 'Layer');
            const b = new Layer('l1', 'Layer');
            a.addDecoration(makeDec('d1'));
            b.addDecoration(makeDec('d2'));
            // Both have size 1 but different keys
            expect(a.equals(b)).toBe(false);
        });

        test('non-Layer returns false', () => {
            const layer = new Layer('l1', 'Layer');
            expect(layer.equals(null)).toBe(false);
            expect(layer.equals({ id: 'l1' })).toBe(false);
        });
    });

    describe('toString', () => {
        test('includes id, name, and decoration count', () => {
            const layer = new Layer('l1', 'My Layer');
            layer.addDecoration(makeDec('d1'));
            const str = layer.toString();
            expect(str).toContain('l1');
            expect(str).toContain('My Layer');
            expect(str).toContain('1');
        });
    });

    describe('fromDTO', () => {
        test('creates layer from DTO', () => {
            const dto = {
                id: 'l1',
                name: 'Test Layer',
                isVisible: false,
                decorations: [
                    { id: 'd1', name: 'Torch', position: { x: 10, y: 20, z: 0, rotation: 0 }, rotation: 0, scale: 1 }
                ]
            };
            const layer = Layer.fromDTO(dto);
            expect(layer.id).toBe('l1');
            expect(layer.name).toBe('Test Layer');
            expect(layer.isVisible).toBe(false);
            expect(layer.getDecorationCount()).toBe(1);
            expect(layer.getDecoration('d1').name).toBe('Torch');
        });

        test('creates empty layer from DTO with no decorations', () => {
            const dto = { id: 'l2', name: 'Empty', isVisible: true, decorations: [] };
            const layer = Layer.fromDTO(dto);
            expect(layer.getDecorationCount()).toBe(0);
        });

        test('handles missing decorations array in DTO', () => {
            const dto = { id: 'l3', name: 'Layer', isVisible: true };
            const layer = Layer.fromDTO(dto);
            expect(layer.getDecorationCount()).toBe(0);
        });

        test('round-trips through toDTO', () => {
            const original = new Layer('l1', 'Round Trip', true);
            original.addDecoration(makeDec('d1', 'Bench'));
            const dto = original.toDTO();
            const restored = Layer.fromDTO(dto);
            expect(restored.equals(original)).toBe(true);
        });
    });

    describe('validateState — empty layer warning', () => {
        test('returns isValid:false when no decorations', () => {
            const layer = new Layer('l1', 'Empty Layer');
            const result = layer.validateState();
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('empty'))).toBe(true);
        });
    });

    describe('addDecoration — invalid decoration', () => {
        test('throws when decoration has no id property', () => {
            const layer = new Layer('l1', 'Layer');
            expect(() => layer.addDecoration({ name: 'no-id' })).toThrow();
        });
    });

    describe('color property', () => {
        test('defaults to #00d4ff when no color supplied', () => {
            const layer = new Layer('l1', 'Layer');
            expect(layer.color).toBe('#00d4ff');
        });

        test('accepts a custom color in constructor', () => {
            const layer = new Layer('l1', 'Layer', true, '#ff4444');
            expect(layer.color).toBe('#ff4444');
        });

        test('toDTO includes color', () => {
            const layer = new Layer('l1', 'Layer', true, '#ff8800');
            const dto = layer.toDTO();
            expect(dto.color).toBe('#ff8800');
        });

        test('fromDTO restores color', () => {
            const dto = { id: 'l1', name: 'Layer', isVisible: true, color: '#66ff44', decorations: [] };
            const layer = Layer.fromDTO(dto);
            expect(layer.color).toBe('#66ff44');
        });

        test('fromDTO uses default color when color is missing in DTO', () => {
            const dto = { id: 'l1', name: 'Layer', isVisible: true, decorations: [] };
            const layer = Layer.fromDTO(dto);
            expect(layer.color).toBe('#00d4ff');
        });

        test('clone preserves color', () => {
            const layer = new Layer('l1', 'Layer', true, '#aa44ff');
            const clone = layer.clone();
            expect(clone.color).toBe('#aa44ff');
        });

        test('equals returns false when colors differ', () => {
            const a = new Layer('l1', 'Layer', true, '#ff4444');
            const b = new Layer('l1', 'Layer', true, '#00d4ff');
            expect(a.equals(b)).toBe(false);
        });

        test('equals returns true when colors match', () => {
            const a = new Layer('l1', 'Layer', true, '#ff4444');
            const b = new Layer('l1', 'Layer', true, '#ff4444');
            expect(a.equals(b)).toBe(true);
        });

        test('round-trip through toDTO preserves color', () => {
            const original = new Layer('l1', 'Round Trip', true, '#ffcc00');
            const restored = Layer.fromDTO(original.toDTO());
            expect(restored.color).toBe('#ffcc00');
        });
    });
});
