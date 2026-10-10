/**
 * Handler for ToggleLayerVisibilityCommand
 */
import { LayerId } from '../../domain/LayerId.js';
import { LayerVisibilityToggledEvent } from '../../domain/events/LayerVisibilityToggledEvent.js';
import { HomesteadLayout } from '../../domain/HomesteadLayout.ts';

type LayerVisibilitySelectionStore = {
    deselectByLayer(layerId: string, decorationBelongsToLayer: (id: string) => boolean): void;
};

export class ToggleLayerVisibilityHandler {
    layout: HomesteadLayout;
    selectionStore: LayerVisibilitySelectionStore | null;

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     * @param {SelectionStore} [selectionStore] - Optional selection store for auto-deselect on hide
     */
    constructor(layout: HomesteadLayout, selectionStore: LayerVisibilitySelectionStore | null = null) {
        this.layout = layout;
        this.selectionStore = selectionStore || null;
    }

    /**
     * Executes the toggle layer visibility command
     * @param {ToggleLayerVisibilityCommand|Object} command - The command to execute
     * @returns {Object} Result object with the new visibility state
     */
    execute(command: { layerId: string }): { layerId: string; isVisible: boolean } {
        const layerId = new LayerId(command.layerId);

        // Validate that the layer exists
        const layer = this.layout.getLayer(layerId.id);
        if (!layer) {
            throw new Error(`ToggleLayerVisibilityHandler: Layer with id ${layerId.id} not found`);
        }

        // Use aggregate method to toggle visibility
        this.layout.toggleLayerVisibility(layerId.id);

        // Auto-deselect decorations in hidden layer
        if (!layer.isVisible && this.selectionStore) {
            const decorationIds = new Set(layer.getAllDecorations().map(d => d.id));
            this.selectionStore.deselectByLayer(layerId.id, (id) => decorationIds.has(id));
        }

        // Emit domain event
        const event = new LayerVisibilityToggledEvent(
            this.layout.id,
            layerId.id,
            layer.isVisible
        );
        this.layout.addEvent(event);

        return {
            layerId: layerId.id,
            isVisible: layer.isVisible
        };
    }
}

export default ToggleLayerVisibilityHandler;
