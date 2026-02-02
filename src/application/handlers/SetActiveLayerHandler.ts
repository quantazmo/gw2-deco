/**
 * Handler for SetActiveLayerCommand
 */
import { LayerId } from '../../domain/LayerId.js';
import { LayerSelectedEvent } from '../../domain/events/LayerSelectedEvent.js';

export class SetActiveLayerHandler {
    layout: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     */
    constructor(layout: unknown) {
        this.layout = layout;
    }

    /**
     * Executes the set active layer command
     * @param {SetActiveLayerCommand|Object} command - The command to execute
     * @returns {Object} Result object with the layer id
     */
    execute(command: any) { // TODO: typed command interface pending domain migration
        // Allow null for deselecting all layers
        const layerIdValue = command.layerId;

        if (layerIdValue !== null) {
            const layerId = new LayerId(layerIdValue);

            // Validate that the layer exists
            const layer = this.layout.getLayer(layerId.id);
            if (!layer) {
                throw new Error(`SetActiveLayerHandler: Layer with id ${layerId.id} not found`);
            }
        }

        // Emit domain event
        const event = new LayerSelectedEvent(
            this.layout.id,
            layerIdValue
        );
        this.layout.addEvent(event);

        return {
            layerId: layerIdValue
        };
    }
}

export default SetActiveLayerHandler;
