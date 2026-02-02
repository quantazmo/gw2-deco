// @ts-nocheck
/**
 * Additional tests for src/application/handlers/GetLayersHandler.js
 * Covers: execute() method (not covered by existing tests which only use handle())
 */
import { GetLayersHandler } from '../../src/application/handlers/GetLayersHandler.js';
import { GetLayersQuery } from '../../src/application/queries/GetLayersQuery.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { GW2Map } from '../../src/domain/GW2Map.js';
import { Layer } from '../../src/domain/Layer.js';
import { Decoration } from '../../src/domain/Decoration.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';

function makeLayout() {
    const layout = new HomesteadLayout('t1', 'Layout');
    layout.setMap(new GW2Map(1, 'Test Map', 1, 0));
    return layout;
}

function makeLayerWithDec(id, name = 'Layer') {
    const layer = new Layer(id, name);
    layer.addDecoration(new Decoration('d1', 'Torch', new WorldCoordinate(0, 0, 0, 0)));
    return layer;
}

describe('GetLayersHandler — execute() method', () => {

    test('execute returns empty array when layout has no layers', () => {
        const layout = makeLayout();
        const handler = new GetLayersHandler(layout);
        const result = handler.execute({});
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
    });

    test('execute returns array of layer DTOs', () => {
        const layout = makeLayout();
        layout.addLayer(makeLayerWithDec('l1', 'Layer 1'));
        layout.addLayer(makeLayerWithDec('l2', 'Layer 2'));
        const handler = new GetLayersHandler(layout);
        const result = handler.execute({});
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Layer 1');
        expect(result[1].name).toBe('Layer 2');
    });

    test('execute returns DTOs with id and name', () => {
        const layout = makeLayout();
        layout.addLayer(makeLayerWithDec('l1', 'My Layer'));
        const handler = new GetLayersHandler(layout);
        const result = handler.execute({});
        expect(result[0].id).toBe('l1');
        expect(result[0].name).toBe('My Layer');
    });

    test('execute returns DTOs with decorations array', () => {
        const layout = makeLayout();
        layout.addLayer(makeLayerWithDec('l1'));
        const handler = new GetLayersHandler(layout);
        const result = handler.execute({});
        expect(Array.isArray(result[0].decorations)).toBe(true);
        expect(result[0].decorations).toHaveLength(1);
    });

    test('handle throws when query has no layout', () => {
        const handler = new GetLayersHandler();
        expect(() => handler.handle({})).toThrow();
        expect(() => handler.handle(null)).toThrow();
    });
});
