// @ts-nocheck
/**
 * Tests for src/domain/Layer.js
 * Tests Layer aggregate entity with decoration management and business rules
 */
import { Layer } from '../../src/domain/Layer.js';
import { Decoration } from '../../src/domain/Decoration.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';

describe('Layer Aggregate Entity', () => {

    test('constructor should create layer with valid id and name', () => {
        const layer = new Layer('layer-1', 'My Layer');
        expect(layer.id).toBe('layer-1');
        expect(layer.name).toBe('My Layer');
        expect(layer.isVisible).toBe(true);
        expect(layer.getAllDecorations().length).toBe(0);
    });

    test('constructor should throw on empty name', () => {
        expect(() => {
            new Layer('layer-1', '');
        }).toThrow();

        expect(() => {
            new Layer('layer-1', '   ');
        }).toThrow();
    });

    test('constructor should throw on null or undefined name', () => {
        expect(() => {
            new Layer('layer-1', null);
        }).toThrow();

        expect(() => {
            new Layer('layer-1', undefined);
        }).toThrow();
    });

    test('constructor should throw on invalid layerId', () => {
        expect(() => {
            new Layer(null, 'My Layer');
        }).toThrow();

        expect(() => {
            new Layer(undefined, 'My Layer');
        }).toThrow();
    });

    test('addDecoration should add decoration to layer', () => {
        const layer = new Layer('layer-1', 'My Layer');
        const coord = new WorldCoordinate(100, 200, 0, 0);
        const decoration = new Decoration('deco-1', 'Torch', coord);

        layer.addDecoration(decoration);

        expect(layer.getAllDecorations().length).toBe(1);
        expect(layer.getAllDecorations()[0]).toBe(decoration);
    });

    test('addDecoration should throw on duplicate id', () => {
        const layer = new Layer('layer-1', 'My Layer');
        const coord = new WorldCoordinate(100, 200, 0, 0);
        const decoration1 = new Decoration('deco-1', 'Torch', coord);
        const decoration2 = new Decoration('deco-1', 'Flower', coord);

        layer.addDecoration(decoration1);

        expect(() => {
            layer.addDecoration(decoration2);
        }).toThrow();
    });

    test('addDecoration should add multiple decorations with different ids', () => {
        const layer = new Layer('layer-1', 'My Layer');
        const coord1 = new WorldCoordinate(100, 200, 0, 0);
        const coord2 = new WorldCoordinate(150, 250, 0, 0);
        const decoration1 = new Decoration('deco-1', 'Torch', coord1);
        const decoration2 = new Decoration('deco-2', 'Flower', coord2);

        layer.addDecoration(decoration1);
        layer.addDecoration(decoration2);

        expect(layer.getAllDecorations().length).toBe(2);
    });

    test('addDecoration should throw on null decoration', () => {
        const layer = new Layer('layer-1', 'My Layer');

        expect(() => {
            layer.addDecoration(null);
        }).toThrow();

        expect(() => {
            layer.addDecoration(undefined);
        }).toThrow();
    });

    test('removeDecoration should remove decoration by id', () => {
        const layer = new Layer('layer-1', 'My Layer');
        const coord = new WorldCoordinate(100, 200, 0, 0);
        const decoration = new Decoration('deco-1', 'Torch', coord);

        layer.addDecoration(decoration);
        expect(layer.getAllDecorations().length).toBe(1);

        layer.removeDecoration('deco-1');

        expect(layer.getAllDecorations().length).toBe(0);
    });

    test('removeDecoration should throw when removing non-existent decoration', () => {
        const layer = new Layer('layer-1', 'My Layer');

        // Should throw when decoration doesn't exist
        expect(() => {
            layer.removeDecoration('non-existent');
        }).toThrow();
    });

    test('removeDecoration should only remove matching id', () => {
        const layer = new Layer('layer-1', 'My Layer');
        const coord1 = new WorldCoordinate(100, 200, 0, 0);
        const coord2 = new WorldCoordinate(150, 250, 0, 0);
        const decoration1 = new Decoration('deco-1', 'Torch', coord1);
        const decoration2 = new Decoration('deco-2', 'Flower', coord2);

        layer.addDecoration(decoration1);
        layer.addDecoration(decoration2);

        layer.removeDecoration('deco-1');

        expect(layer.getAllDecorations().length).toBe(1);
        expect(layer.getAllDecorations()[0].id).toBe('deco-2');
    });

    test('isEmpty should return true when no decorations', () => {
        const layer = new Layer('layer-1', 'My Layer');

        expect(layer.isEmpty()).toBe(true);
    });

    test('isEmpty should return false when decorations present', () => {
        const layer = new Layer('layer-1', 'My Layer');
        const coord = new WorldCoordinate(100, 200, 0, 0);
        const decoration = new Decoration('deco-1', 'Torch', coord);

        layer.addDecoration(decoration);

        expect(layer.isEmpty()).toBe(false);
    });

    test('toggleVisibility should toggle isVisible', () => {
        const layer = new Layer('layer-1', 'My Layer');

        expect(layer.isVisible).toBe(true);

        layer.toggleVisibility();
        expect(layer.isVisible).toBe(false);

        layer.toggleVisibility();
        expect(layer.isVisible).toBe(true);
    });

    test('rename should change layer name', () => {
        const layer = new Layer('layer-1', 'Original Name');

        layer.name = 'New Name';

        expect(layer.name).toBe('New Name');
    });

    test('constructor validates name cannot become empty during rename', () => {
        const layer = new Layer('layer-1', 'Original Name');

        // Layer doesn't have a rename method that validates,
        // but constructor validates name
        expect(() => {
            new Layer('layer-1', '');
        }).toThrow();

        expect(() => {
            new Layer('layer-1', '   ');
        }).toThrow();
    });

    test('constructor validates name cannot be null or undefined', () => {
        expect(() => {
            new Layer('layer-1', null);
        }).toThrow();

        expect(() => {
            new Layer('layer-1', undefined);
        }).toThrow();
    });

    test('getDecorationCount should return correct count', () => {
        const layer = new Layer('layer-1', 'My Layer');
        const coord1 = new WorldCoordinate(100, 200, 0, 0);
        const coord2 = new WorldCoordinate(150, 250, 0, 0);
        const decoration1 = new Decoration('deco-1', 'Torch', coord1);
        const decoration2 = new Decoration('deco-2', 'Flower', coord2);

        expect(layer.getDecorationCount()).toBe(0);

        layer.addDecoration(decoration1);
        expect(layer.getDecorationCount()).toBe(1);

        layer.addDecoration(decoration2);
        expect(layer.getDecorationCount()).toBe(2);

        layer.removeDecoration('deco-1');
        expect(layer.getDecorationCount()).toBe(1);
    });

    test('validateState should succeed with valid layer state', () => {
        const layer = new Layer('layer-1', 'My Layer');
        const coord = new WorldCoordinate(100, 200, 0, 0);
        const decoration = new Decoration('deco-1', 'Torch', coord);
        layer.addDecoration(decoration);

        const result = layer.validateState();

        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
    });

    test('validateState should check for valid name', () => {
        const layer = new Layer('layer-1', 'My Layer');

        layer.name = ''; // Manually corrupt for testing

        const result = layer.validateState();

        expect(result.isValid).toBe(false);
        expect(result.errors.length > 0).toBeTruthy();
    });

    test('toDTO should convert layer to data transfer object', () => {
        const layer = new Layer('layer-1', 'My Layer');
        const coord = new WorldCoordinate(100, 200, 0, 0);
        const decoration = new Decoration('deco-1', 'Torch', coord);

        layer.addDecoration(decoration);

        const dto = layer.toDTO();

        expect(dto.id).toBe('layer-1');
        expect(dto.name).toBe('My Layer');
        expect(dto.isVisible).toBe(true);
        expect(dto.decorations.length).toBe(1);
    });

    describe('getDecorationIndex', () => {
        test('should return correct index for existing decorations', () => {
            const layer = new Layer('layer-1', 'My Layer');
            const coord = new WorldCoordinate(100, 200, 0, 0);
            layer.addDecoration(new Decoration('deco-1', 'Torch', coord));
            layer.addDecoration(new Decoration('deco-2', 'Flower', coord));
            layer.addDecoration(new Decoration('deco-3', 'Tree', coord));

            expect(layer.getDecorationIndex('deco-1')).toBe(0);
            expect(layer.getDecorationIndex('deco-2')).toBe(1);
            expect(layer.getDecorationIndex('deco-3')).toBe(2);
        });

        test('should return -1 for non-existent decoration', () => {
            const layer = new Layer('layer-1', 'My Layer');
            expect(layer.getDecorationIndex('non-existent')).toBe(-1);
        });
    });

    describe('insertDecorationAt', () => {
        test('should insert at the beginning', () => {
            const layer = new Layer('layer-1', 'My Layer');
            const coord = new WorldCoordinate(100, 200, 0, 0);
            layer.addDecoration(new Decoration('deco-1', 'Torch', coord));
            layer.addDecoration(new Decoration('deco-2', 'Flower', coord));

            layer.insertDecorationAt(new Decoration('deco-0', 'Tree', coord), 0);

            const ids = layer.getAllDecorations().map(d => d.id);
            expect(ids).toEqual(['deco-0', 'deco-1', 'deco-2']);
        });

        test('should insert in the middle', () => {
            const layer = new Layer('layer-1', 'My Layer');
            const coord = new WorldCoordinate(100, 200, 0, 0);
            layer.addDecoration(new Decoration('deco-1', 'Torch', coord));
            layer.addDecoration(new Decoration('deco-3', 'Flower', coord));

            layer.insertDecorationAt(new Decoration('deco-2', 'Tree', coord), 1);

            const ids = layer.getAllDecorations().map(d => d.id);
            expect(ids).toEqual(['deco-1', 'deco-2', 'deco-3']);
        });

        test('should insert at the end when index equals size', () => {
            const layer = new Layer('layer-1', 'My Layer');
            const coord = new WorldCoordinate(100, 200, 0, 0);
            layer.addDecoration(new Decoration('deco-1', 'Torch', coord));

            layer.insertDecorationAt(new Decoration('deco-2', 'Flower', coord), 1);

            const ids = layer.getAllDecorations().map(d => d.id);
            expect(ids).toEqual(['deco-1', 'deco-2']);
        });

        test('should clamp to end when index exceeds size', () => {
            const layer = new Layer('layer-1', 'My Layer');
            const coord = new WorldCoordinate(100, 200, 0, 0);
            layer.addDecoration(new Decoration('deco-1', 'Torch', coord));

            layer.insertDecorationAt(new Decoration('deco-2', 'Flower', coord), 999);

            const ids = layer.getAllDecorations().map(d => d.id);
            expect(ids).toEqual(['deco-1', 'deco-2']);
        });

        test('should clamp negative index to 0', () => {
            const layer = new Layer('layer-1', 'My Layer');
            const coord = new WorldCoordinate(100, 200, 0, 0);
            layer.addDecoration(new Decoration('deco-1', 'Torch', coord));

            layer.insertDecorationAt(new Decoration('deco-0', 'Flower', coord), -5);

            const ids = layer.getAllDecorations().map(d => d.id);
            expect(ids).toEqual(['deco-0', 'deco-1']);
        });

        test('should throw on duplicate id', () => {
            const layer = new Layer('layer-1', 'My Layer');
            const coord = new WorldCoordinate(100, 200, 0, 0);
            layer.addDecoration(new Decoration('deco-1', 'Torch', coord));

            expect(() => {
                layer.insertDecorationAt(new Decoration('deco-1', 'Flower', coord), 0);
            }).toThrow('already exists');
        });

        test('should throw on null decoration', () => {
            const layer = new Layer('layer-1', 'My Layer');

            expect(() => {
                layer.insertDecorationAt(null, 0);
            }).toThrow();
        });

        test('should insert into empty layer', () => {
            const layer = new Layer('layer-1', 'My Layer');
            const coord = new WorldCoordinate(100, 200, 0, 0);

            layer.insertDecorationAt(new Decoration('deco-1', 'Torch', coord), 0);

            expect(layer.getDecorationCount()).toBe(1);
            expect(layer.getDecoration('deco-1')).toBeTruthy();
        });
    });

});
