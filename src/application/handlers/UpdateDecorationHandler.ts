/**
 * Handler for UpdateDecorationCommand
 */
import { LayerId } from '../../domain/LayerId.js';
import { DecorationUpdatedEvent } from '../../domain/events/DecorationUpdatedEvent.js';
import { HomesteadLayout } from '../../domain/HomesteadLayout.ts';
import { WorldCoordinate, WorldCoordinateLike } from '../../domain/WorldCoordinate.ts';

export class UpdateDecorationHandler {
    layout: HomesteadLayout;

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     */
    constructor(layout: HomesteadLayout) {
        this.layout = layout;
    }

    /**
     * Executes the update decoration command
     * @param {UpdateDecorationCommand|Object} command - The command to execute
     * @returns {Object} Result object with the decoration
     */
    execute(command: { layerId: string; decorationId: string; position: WorldCoordinate | WorldCoordinateLike }): { decoration: import('../../domain/Decoration.ts').Decoration } {
        const layerId = new LayerId(command.layerId);
        const { decorationId, position } = command;

        // Use aggregate method to update decoration
        const decoration = this.layout.updateDecorationInLayer(
            layerId.id,
            decorationId,
            { position }
        );

        // Emit domain event
        const event = new DecorationUpdatedEvent(
            this.layout.id,
            layerId.id,
            decoration
        );
        this.layout.addEvent(event);

        return {
            decoration: decoration
        };
    }
}

export default UpdateDecorationHandler;
