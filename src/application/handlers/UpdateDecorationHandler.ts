/**
 * Handler for UpdateDecorationCommand
 */
import { LayerId } from '../../domain/LayerId.js';
import { DecorationUpdatedEvent } from '../../domain/events/DecorationUpdatedEvent.js';

export class UpdateDecorationHandler {
    layout: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     */
    constructor(layout: unknown) {
        this.layout = layout;
    }

    /**
     * Executes the update decoration command
     * @param {UpdateDecorationCommand|Object} command - The command to execute
     * @returns {Object} Result object with the decoration
     */
    execute(command: any) { // TODO: typed command interface pending domain migration
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
