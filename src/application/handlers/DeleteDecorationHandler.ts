/**
 * Handler for DeleteDecorationCommand
 */
import { LayerId } from '../../domain/LayerId.js';
import { DecorationDeletedEvent } from '../../domain/events/DecorationDeletedEvent.js';
import { HomesteadLayout } from '../../domain/HomesteadLayout.ts';

export class DeleteDecorationHandler {
    layout: HomesteadLayout;

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     */
    constructor(layout: HomesteadLayout) {
        this.layout = layout;
    }

    /**
     * Executes the delete decoration command
     * @param {DeleteDecorationCommand} command - The command to execute
     */
    execute(command: { layerId: string; decorationId: string }): void {
        const layerId = new LayerId(command.layerId);

        // Use aggregate method to remove decoration
        this.layout.removeDecorationFromLayer(layerId.id, command.decorationId);

        // Emit domain event
        const event = new DecorationDeletedEvent(
            this.layout.id,
            command.layerId,
            command.decorationId
        );
        this.layout.addEvent(event);
    }
}

export default DeleteDecorationHandler;
