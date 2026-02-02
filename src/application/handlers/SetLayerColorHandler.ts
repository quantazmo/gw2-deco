/**
 * Handler for SetLayerColorCommand
 */
import { LayerId } from '../../domain/LayerId.js';
import { LayerColorChangedEvent } from '../../domain/events/LayerColorChangedEvent.js';

export class SetLayerColorHandler {
    layout: any;

    constructor(layout: unknown) {
        this.layout = layout;
    }

    /**
     * Executes the set layer color command
     * @param {Object} command - { layerId, color }
     * @returns {{ layerId: string, color: string }}
     */
    execute(command: any) {
        const layerId = new LayerId(command.layerId);

        const layer = this.layout.getLayer(layerId.id);
        if (!layer) {
            throw new Error(`SetLayerColorHandler: Layer with id ${layerId.id} not found`);
        }

        layer.color = command.color;

        const event = new LayerColorChangedEvent(
            this.layout.id,
            layerId.id,
            command.color
        );
        this.layout.addEvent(event);

        return {
            layerId: layerId.id,
            color: command.color
        };
    }
}

export default SetLayerColorHandler;
