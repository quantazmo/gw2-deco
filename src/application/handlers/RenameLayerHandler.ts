/**
 * Handler for RenameLayerCommand
 */
import { LayerId } from '../../domain/LayerId.js';
import { LayerRenamedEvent } from '../../domain/events/LayerRenamedEvent.js';

export class RenameLayerHandler {
    layout: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     */
    constructor(layout: unknown) {
        this.layout = layout;
    }

    /**
     * Executes the rename layer command
     * @param {RenameLayerCommand} command - The command to execute
     */
    execute(command: any) { // TODO: typed command interface pending domain migration
        const layerId = new LayerId(command.layerId);

        // Get old name before renaming
        const layer = this.layout.getLayer(layerId.id);
        if (!layer) {
            throw new Error(`Layer with id ${command.layerId} not found`);
        }
        const oldName = layer.name;

        // Use aggregate method to rename
        this.layout.renameLayer(layerId.id, command.newName);

        // Emit domain event
        const event = new LayerRenamedEvent(
            this.layout.id,
            command.layerId,
            oldName,
            command.newName
        );
        this.layout.addEvent(event);
    }
}

export default RenameLayerHandler;
