// @ts-nocheck
/**
 * Tests for src/application/handlers/SetActiveLayerHandler.js
 * Tests the application layer command handling for setting active layer
 */
import { SetActiveLayerHandler } from '../../src/application/handlers/SetActiveLayerHandler.js';
import { SetActiveLayerCommand } from '../../src/application/commands/SetActiveLayerCommand.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { Layer } from '../../src/domain/Layer.js';
import { GW2Map } from '../../src/domain/GW2Map.js';

describe('SetActiveLayerHandler', () => {

    test('constructor should create handler instance', () => {
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        const handler = new SetActiveLayerHandler(layout);
        expect(handler).toBeTruthy();
    });

    test('execute should emit LayerSelectedEvent', () => {
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 });
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        layout.setMap(map);

        const layer = new Layer('layer-1', 'Test Layer');
        layout.addLayer(layer);

        const handler = new SetActiveLayerHandler(layout);
        const command = { layerId: 'layer-1' };

        const result = handler.execute(command);

        expect(result).toBeTruthy();
        expect(result.layerId).toBe('layer-1');

        // Check that event was added to layout
        const events = layout.getPendingEvents();
        expect(events.length).toBeGreaterThan(0);
        expect(events[events.length - 1].eventType).toBe('LayerSelected');
    });

    test('execute should allow setting null as active layer', () => {
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 });
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        layout.setMap(map);

        const handler = new SetActiveLayerHandler(layout);
        const command = { layerId: null };

        const result = handler.execute(command);

        expect(result).toBeTruthy();
        expect(result.layerId).toBe(null);
    });

    test('execute should throw if layer does not exist', () => {
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 });
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        layout.setMap(map);

        const handler = new SetActiveLayerHandler(layout);
        const command = { layerId: 'nonexistent-layer' };

        expect(() => {
            handler.execute(command);
        }).toThrow('Layer with id nonexistent-layer not found');
    });

    test('execute should work with SetActiveLayerCommand instance', () => {
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 });
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        layout.setMap(map);

        const layer = new Layer('layer-1', 'Test Layer');
        layout.addLayer(layer);

        const handler = new SetActiveLayerHandler(layout);
        const command = new SetActiveLayerCommand('layer-1');

        const result = handler.execute(command);

        expect(result).toBeTruthy();
        expect(result.layerId).toBe('layer-1');
    });
});
