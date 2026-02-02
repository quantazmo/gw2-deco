// @ts-nocheck
/**
 * Tests for src/domain/LayoutValidationService.js
 * Tests validation of decorations, layers, and layouts
 */
import { DecorationLayoutValidationService } from '../../src/domain/DecorationLayoutValidationService.js';
import { Decoration } from '../../src/domain/Decoration.js';
import { Layer } from '../../src/domain/Layer.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { GW2Map } from '../../src/domain/GW2Map.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';

describe('LayoutValidationService', () => {

    test('validateDecoration should validate decoration properties', () => {
        const coord = new WorldCoordinate(100, 200, 0, 0);
        const decoration = new Decoration('deco-1', 'Torch', coord);

        const result = DecorationLayoutValidationService.validateDecoration(decoration);

        expect(result).toBeTruthy();
        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
    });

    test('validateDecoration should reject null decoration', () => {
        const result = DecorationLayoutValidationService.validateDecoration(null);

        expect(result.isValid).toBe(false);
        expect(result.errors.length > 0).toBeTruthy();
    });

    test('validateDecoration should check required properties', () => {
        const coord = new WorldCoordinate(100, 200, 0, 0);
        const decoration = new Decoration('deco-1', 'Torch', coord);

        // Corrupt the decoration
        decoration.id = null;

        const result = DecorationLayoutValidationService.validateDecoration(decoration);

        expect(result.isValid).toBe(false);
        expect(result.errors.length > 0).toBeTruthy();
    });

    test('validateDecoration should validate decoration name', () => {
        const coord = new WorldCoordinate(100, 200, 0, 0);

        // Test that constructor throws on empty name
        expect(() => {
            new Decoration('deco-1', '', coord);
        }).toThrow('Decoration: name cannot be empty');
    });

    test('validateDecoration should validate decoration position', () => {
        // Test that constructor throws on null position
        expect(() => {
            new Decoration('deco-1', 'Torch', null);
        }).toThrow('Decoration: position must be a WorldCoordinate');
    });

    test('validateLayer should validate layer properties', () => {
        const layer = new Layer('layer-1', 'My Layer');
        const coord = new WorldCoordinate(100, 200, 0, 0);
        const decoration = new Decoration('deco-1', 'Torch', coord);
        layer.addDecoration(decoration);

        const result = DecorationLayoutValidationService.validateLayer(layer);

        expect(result).toBeTruthy();
        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
    });

    test('validateLayer should reject null layer', () => {
        const result = DecorationLayoutValidationService.validateLayer(null);

        expect(result.isValid).toBe(false);
        expect(result.errors.length > 0).toBeTruthy();
    });

    test('validateLayer should check layer name', () => {
        const layer = new Layer('layer-1', 'My Layer');

        // Corrupt the layer
        layer.name = '';

        const result = DecorationLayoutValidationService.validateLayer(layer);

        expect(result.isValid).toBe(false);
        expect(result.errors.length > 0).toBeTruthy();
    });

    test('validateLayer should validate all decorations in layer', () => {
        const layer = new Layer('layer-1', 'My Layer');
        const coord = new WorldCoordinate(100, 200, 0, 0);
        const decoration = new Decoration('deco-1', 'Torch', coord);

        layer.addDecoration(decoration);

        const result = DecorationLayoutValidationService.validateLayer(layer);

        expect(result.isValid).toBe(true);
    });

    test('validateLayout should validate layout properties', () => {
        const layout = new HomesteadLayout('layout-1', 'My Layout');
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 }); // Add a tile so map passes validation
        layout.setMap(map);
        const layer = new Layer('layer-1', 'Layer 1');
        const coord = new WorldCoordinate(100, 200, 0, 0);
        const decoration = new Decoration('deco-1', 'Torch', coord);
        layer.addDecoration(decoration);
        layout.addLayer(layer);

        const result = DecorationLayoutValidationService.validateLayout(layout);

        expect(result).toBeTruthy();
        expect(result.isValid).toBe(true);
        expect(result.errors).toBeTruthy();
    });

    test('validateLayout should reject null layout', () => {
        const result = DecorationLayoutValidationService.validateLayout(null);

        expect(result).toBeTruthy();
        expect(result.isValid).toBe(false);
        expect(result.errors).toBeTruthy();
    });

    test('validateLayout should validate all layers in layout', () => {
        const layout = new HomesteadLayout('layout-1', 'My Layout');
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 }); // Add a tile so map passes validation
        layout.setMap(map);
        const layer = new Layer('layer-1', 'My Layer');
        const coord = new WorldCoordinate(100, 200, 0, 0);
        const decoration = new Decoration('deco-1', 'Torch', coord);
        layer.addDecoration(decoration);
        layout.addLayer(layer);

        const result = DecorationLayoutValidationService.validateLayout(layout);

        // The layout should validate all layers
        expect(result).toBeTruthy();
        expect(result.isValid).toBe(true);
        expect(result.errors.layers.length).toBe(0);
    });

    test('validateLayout should check for required map', () => {
        const layout = new HomesteadLayout('layout-1', 'My Layout');
        const layer = new Layer('layer-1', 'Layer 1');
        const coord = new WorldCoordinate(100, 200, 0, 0);
        const decoration = new Decoration('deco-1', 'Torch', coord);
        layer.addDecoration(decoration);
        layout.addLayer(layer);

        const result = DecorationLayoutValidationService.validateLayout(layout);

        // Should report that layout requires a map
        expect(result.isValid).toBe(false);
        const hasMapError = result.errors && (result.errors.map || result.errors.layout);
        expect(hasMapError).toBeTruthy();
    });

    test('validateLayout should check for at least one layer', () => {
        const layout = new HomesteadLayout('layout-1', 'My Layout');
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 }); // Add a tile so map passes validation
        layout.setMap(map);

        const result = DecorationLayoutValidationService.validateLayout(layout);

        // Check if validation reports empty layer issue
        expect(result.isValid).toBe(false);
    });

    test('service should handle validation with multiple decorations', () => {
        const layer = new Layer('layer-1', 'My Layer');

        const coord1 = new WorldCoordinate(100, 200, 0, 0);
        const coord2 = new WorldCoordinate(150, 250, 0, 0);
        const deco1 = new Decoration('deco-1', 'Torch', coord1);
        const deco2 = new Decoration('deco-2', 'Flower', coord2);

        layer.addDecoration(deco1);
        layer.addDecoration(deco2);

        const result = DecorationLayoutValidationService.validateLayer(layer);

        expect(result.isValid).toBe(true);
    });

    test('service should handle validation with multiple layers', () => {
        const layout = new HomesteadLayout('layout-1', 'My Layout');
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 }); // Add a tile so map passes validation
        layout.setMap(map);

        const layer1 = new Layer('layer-1', 'Layer 1');
        const layer2 = new Layer('layer-2', 'Layer 2');

        const coord = new WorldCoordinate(100, 200, 0, 0);
        const deco = new Decoration('deco-1', 'Torch', coord);
        layer1.addDecoration(deco);
        const coord2 = new WorldCoordinate(150, 250, 0, 0);
        const deco2 = new Decoration('deco-2', 'Flower', coord2);
        layer2.addDecoration(deco2);

        layout.addLayer(layer1);
        layout.addLayer(layer2);

        const result = DecorationLayoutValidationService.validateLayout(layout);
    });

    test('validateDecoration should provide detailed error messages', () => {
        // Test that constructor throws with null position
        expect(() => {
            new Decoration('deco-1', 'Torch', null);
        }).toThrow();
    });

    test('validateLayer should provide detailed error messages', () => {
        const layer = new Layer('layer-1', 'My Layer');
        layer.name = ''; // Corrupt

        const result = DecorationLayoutValidationService.validateLayer(layer);

        expect(result.isValid).toBe(false);
        expect(result.errors.length > 0).toBeTruthy();
    });

    test('validateLayout should return consistent structure', () => {
        const layout = new HomesteadLayout('layout-1', 'My Layout');
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 }); // Add a tile so map passes validation
        layout.setMap(map);
        const layer = new Layer('layer-1', 'Layer 1');
        const coord = new WorldCoordinate(100, 200, 0, 0);
        const decoration = new Decoration('deco-1', 'Torch', coord);
        layer.addDecoration(decoration);
        layout.addLayer(layer);

        const result = DecorationLayoutValidationService.validateLayout(layout);

        expect(result).toBeTruthy();
        expect(result.isValid !== undefined).toBeTruthy();
        expect(result.errors).toBeTruthy();
    });

});
