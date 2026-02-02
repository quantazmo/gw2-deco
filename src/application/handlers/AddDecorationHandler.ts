/**
 * Handler for AddDecorationCommand
 */
import { LayerId } from '../../domain/LayerId.js';
import { Decoration } from '../../domain/Decoration.js';
import { DecorationAddedEvent } from '../../domain/events/DecorationAddedEvent.js';

export class AddDecorationHandler {
    layout: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     */
    constructor(layout: unknown) {
        this.layout = layout;
    }

    /**
     * Executes the add decoration command
     * @param {AddDecorationCommand} command - The command to execute
     * @returns {Decoration} The created decoration
     */
    execute(command: any) { // TODO: typed command interface pending domain migration
        const layerId = new LayerId(command.layerId);

        const decoration = new Decoration(
            command.decorationId,
            command.name,
            command.position,
            command.rotation,
            command.scale
        );

        // Use aggregate method to add decoration
        this.layout.addDecorationToLayer(layerId.id, decoration);

        // Emit domain event
        const event = new DecorationAddedEvent(
            this.layout.id,
            command.layerId,
            decoration
        );
        this.layout.addEvent(event);

        return decoration;
    }
}

export default AddDecorationHandler;
