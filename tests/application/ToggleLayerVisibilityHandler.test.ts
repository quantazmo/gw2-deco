// @ts-nocheck
/**
 * Tests for ToggleLayerVisibilityHandler
 */
import { ToggleLayerVisibilityHandler } from '../../src/application/handlers/ToggleLayerVisibilityHandler.js';
import { ToggleLayerVisibilityCommand } from '../../src/application/commands/ToggleLayerVisibilityCommand.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { Layer } from '../../src/domain/Layer.js';
import { Decoration } from '../../src/domain/Decoration.js';
import { SelectionStore } from '../../src/ui/stores/SelectionStore.js';

describe('ToggleLayerVisibilityHandler', () => {
    let layout;
    let handler;
    let layer;

    beforeEach(() => {
        // Create layout and add a layer
        layout = new HomesteadLayout('test-layout', 'Test Layout');
        layer = new Layer('test-layer', 'Test Layer');
        layout.addLayer(layer);
        layer.isVisible = true;

        handler = new ToggleLayerVisibilityHandler(layout);
    });

    test('should toggle layer visibility from true to false', () => {
        const command = new ToggleLayerVisibilityCommand(layer.id);

        const result = handler.execute(command);

        expect(result.isVisible).toBe(false);
        expect(layer.isVisible).toBe(false);
    });

    test('should toggle layer visibility from false to true', () => {
        layer.isVisible = false;
        const command = new ToggleLayerVisibilityCommand(layer.id);

        const result = handler.execute(command);

        expect(result.isVisible).toBe(true);
        expect(layer.isVisible).toBe(true);
    });

    test('should emit LayerVisibilityToggledEvent', () => {
        const command = new ToggleLayerVisibilityCommand(layer.id);

        handler.execute(command);

        const events = layout.getPendingEvents();
        expect(events).toHaveLength(1);
        expect(events[0].constructor.name).toBe('LayerVisibilityToggledEvent');
        expect(events[0].layerId).toBe(layer.id);
        expect(events[0].isVisible).toBe(false);
    });

    test('should throw error when layer does not exist', () => {
        const command = new ToggleLayerVisibilityCommand('nonexistent-layer');

        expect(() => handler.execute(command)).toThrow('Layer with id nonexistent-layer not found');
    });

    test('should return layer id in result', () => {
        const command = new ToggleLayerVisibilityCommand(layer.id);

        const result = handler.execute(command);

        expect(result.layerId).toBe(layer.id);
    });

    describe('auto-deselect on hide (US3)', () => {
        let selectionStore;
        let eventBus;
        let decoration1;
        let decoration2;

        beforeEach(() => {
            eventBus = { publish: vi.fn() };
            selectionStore = new SelectionStore(eventBus);

            // Add decorations to the layer
            decoration1 = new Decoration('dec-1', 'Decoration 1', { x: 10, y: 20 });
            decoration2 = new Decoration('dec-2', 'Decoration 2', { x: 30, y: 40 });
            layer.addDecoration(decoration1);
            layer.addDecoration(decoration2);

            handler = new ToggleLayerVisibilityHandler(layout, selectionStore);
        });

        test('should deselect decorations in hidden layer via SelectionStore.deselectByLayer', () => {
            // Select decorations from this layer
            selectionStore.selectAll(['dec-1', 'dec-2']);
            expect(selectionStore.getSelectionCount()).toBe(2);

            const command = new ToggleLayerVisibilityCommand(layer.id);
            handler.execute(command);

            // After hiding, decorations from this layer should be deselected
            expect(selectionStore.isSelected('dec-1')).toBe(false);
            expect(selectionStore.isSelected('dec-2')).toBe(false);
            expect(selectionStore.getSelectionCount()).toBe(0);
        });

        test('should not deselect decorations from other layers when hiding a layer', () => {
            // Add a second layer with its own decoration
            const layer2 = new Layer('layer-2', 'Layer 2');
            const decoration3 = new Decoration('dec-3', 'Decoration 3', { x: 50, y: 60 });
            layer2.addDecoration(decoration3);
            layout.addLayer(layer2);

            // Select decorations from both layers
            selectionStore.selectAll(['dec-1', 'dec-2', 'dec-3']);
            expect(selectionStore.getSelectionCount()).toBe(3);

            // Hide layer 1
            const command = new ToggleLayerVisibilityCommand(layer.id);
            handler.execute(command);

            // Only layer 1 decorations deselected, layer 2 decoration preserved
            expect(selectionStore.isSelected('dec-1')).toBe(false);
            expect(selectionStore.isSelected('dec-2')).toBe(false);
            expect(selectionStore.isSelected('dec-3')).toBe(true);
            expect(selectionStore.getSelectionCount()).toBe(1);
        });

        test('should not deselect decorations when showing a layer (toggle on)', () => {
            layer.isVisible = false;
            selectionStore.selectAll(['dec-1']);

            const command = new ToggleLayerVisibilityCommand(layer.id);
            handler.execute(command);

            // Making visible should not affect selection
            expect(selectionStore.isSelected('dec-1')).toBe(true);
            expect(selectionStore.getSelectionCount()).toBe(1);
        });

        test('should work without selectionStore (backward compatibility)', () => {
            const handlerNoStore = new ToggleLayerVisibilityHandler(layout);
            const command = new ToggleLayerVisibilityCommand(layer.id);

            // Should not throw
            expect(() => handlerNoStore.execute(command)).not.toThrow();
        });
    });
});
