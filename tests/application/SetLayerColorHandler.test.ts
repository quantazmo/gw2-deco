// @ts-nocheck
/**
 * Tests for SetLayerColorHandler
 */
import { SetLayerColorHandler } from '../../src/application/handlers/SetLayerColorHandler.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { Layer } from '../../src/domain/Layer.js';

describe('SetLayerColorHandler', () => {
    let layout;
    let handler;
    let layer;

    beforeEach(() => {
        layout = new HomesteadLayout('test-layout', 'Test Layout');
        layer = new Layer('layer-1', 'Layer 1');
        layout.addLayer(layer);
        handler = new SetLayerColorHandler(layout);
    });

    test('should update the layer color', () => {
        const result = handler.execute({ layerId: 'layer-1', color: '#ff4444' });

        expect(layer.color).toBe('#ff4444');
        expect(result.color).toBe('#ff4444');
        expect(result.layerId).toBe('layer-1');
    });

    test('should emit LayerColorChangedEvent', () => {
        handler.execute({ layerId: 'layer-1', color: '#ff8800' });

        const events = layout.getPendingEvents();
        expect(events).toHaveLength(1);
        expect(events[0].constructor.name).toBe('LayerColorChangedEvent');
        expect(events[0].layerId).toBe('layer-1');
        expect(events[0].color).toBe('#ff8800');
    });

    test('should throw when layer does not exist', () => {
        expect(() => {
            handler.execute({ layerId: 'nonexistent', color: '#ff4444' });
        }).toThrow('Layer with id nonexistent not found');
    });
});
