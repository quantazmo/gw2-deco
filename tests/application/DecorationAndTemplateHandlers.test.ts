// @ts-nocheck
/**
 * Tests for AddDecorationHandler, DeleteDecorationHandler, GetMapHandler, GetLayoutHandler
 */
import { AddDecorationHandler } from '../../src/application/handlers/AddDecorationHandler.js';
import { DeleteDecorationHandler } from '../../src/application/handlers/DeleteDecorationHandler.js';
import { GetMapHandler } from '../../src/application/handlers/GetMapHandler.js';
import { GetLayoutHandler } from '../../src/application/handlers/GetLayoutHandler.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { Layer } from '../../src/domain/Layer.js';
import { GW2Map } from '../../src/domain/GW2Map.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';
import { Decoration } from '../../src/domain/Decoration.js';

function makeLayout(id = 'tmpl-1') {
    const layout = new HomesteadLayout(id, 'Test Layout');
    const map = new GW2Map(1, 'Homestead', 1, 0);
    layout.setMap(map);
    return layout;
}

function makeLayoutWithLayer(layerId = 'layer-1') {
    const layout = makeLayout();
    const layer = new Layer(layerId, 'Test Layer');
    layout.addLayer(layer);
    return layout;
}

// ─── AddDecorationHandler ────────────────────────────────────────────────────
describe('AddDecorationHandler', () => {
    test('constructs with layout', () => {
        const t = makeLayout();
        const h = new AddDecorationHandler(t);
        expect(h.layout).toBe(t);
    });

    test('execute adds decoration to layer and returns Decoration', () => {
        const layout = makeLayoutWithLayer('layer-1');
        const handler = new AddDecorationHandler(layout);
        const pos = new WorldCoordinate(100, 200, 0, 0);

        const cmd = { layerId: 'layer-1', decorationId: 'deco-1', name: 'Bench', position: pos, rotation: 0, scale: 1 };
        const result = handler.execute(cmd);

        expect(result).toBeInstanceOf(Decoration);
        expect(result.id).toBe('deco-1');
        expect(result.name).toBe('Bench');

        const layer = layout.getLayer('layer-1');
        expect(layer.decorations.size).toBe(1);
    });

    test('execute emits a domain event', () => {
        const layout = makeLayoutWithLayer('layer-1');
        const handler = new AddDecorationHandler(layout);
        const pos = new WorldCoordinate(0, 0, 0, 0);

        handler.execute({ layerId: 'layer-1', decorationId: 'deco-2', name: 'Tree', position: pos, rotation: 0, scale: 1 });

        const events = layout.getPendingEvents();
        expect(events).toBeTruthy();
        expect(events.length).toBeGreaterThan(0);
    });

    test('execute uses rotation and scale from command', () => {
        const layout = makeLayoutWithLayer('layer-1');
        const handler = new AddDecorationHandler(layout);
        const pos = new WorldCoordinate(0, 0, 0, 0);

        const result = handler.execute({ layerId: 'layer-1', decorationId: 'd', name: 'X', position: pos, rotation: 90, scale: 2 });
        expect(result.rotation).toBe(90);
        expect(result.scale).toBe(2);
    });
});

// ─── DeleteDecorationHandler ─────────────────────────────────────────────────
describe('DeleteDecorationHandler', () => {
    test('constructs with layout', () => {
        const t = makeLayout();
        const h = new DeleteDecorationHandler(t);
        expect(h.layout).toBe(t);
    });

    test('execute removes decoration from layer', () => {
        const layout = makeLayoutWithLayer('layer-1');
        const pos = new WorldCoordinate(0, 0, 0, 0);
        const deco = new Decoration('deco-1', 'Bench', pos, 0, 1);
        layout.getLayer('layer-1').addDecoration(deco);

        const handler = new DeleteDecorationHandler(layout);
        handler.execute({ layerId: 'layer-1', decorationId: 'deco-1' });

        const layer = layout.getLayer('layer-1');
        expect(layer.decorations.size).toBe(0);
    });

    test('execute emits a domain event', () => {
        const layout = makeLayoutWithLayer('layer-1');
        const pos = new WorldCoordinate(0, 0, 0, 0);
        const deco = new Decoration('deco-1', 'Bench', pos, 0, 1);
        layout.getLayer('layer-1').addDecoration(deco);

        const handler = new DeleteDecorationHandler(layout);
        handler.execute({ layerId: 'layer-1', decorationId: 'deco-1' });

        const events = layout.getPendingEvents();
        expect(events.length).toBeGreaterThan(0);
    });
});

// ─── GetMapHandler ────────────────────────────────────────────────────────────
describe('GetMapHandler', () => {
    test('execute returns map DTO when map is set', () => {
        const layout = makeLayout();
        const handler = new GetMapHandler(layout);
        const result = handler.execute({});
        expect(result).toBeTruthy();
        expect(result.id).toBe(1);
        expect(result.name).toBe('Homestead');
    });

    test('execute returns null when no map', () => {
        const layout = new HomesteadLayout('tmpl-1', 'Test');
        const handler = new GetMapHandler(layout);
        const result = handler.execute({});
        expect(result).toBeNull();
    });
});

// ─── GetLayoutHandler ───────────────────────────────────────────────────────
describe('GetLayoutHandler', () => {
    test('execute returns layout DTO', () => {
        const layout = makeLayout();
        const handler = new GetLayoutHandler(layout);
        const result = handler.execute({});
        expect(result).toBeTruthy();
        expect(result.id).toBe('tmpl-1');
    });

    test('execute result includes layers array', () => {
        const layout = makeLayoutWithLayer('layer-1');
        const handler = new GetLayoutHandler(layout);
        const result = handler.execute({});
        expect(Array.isArray(result.layers)).toBe(true);
    });
});
