/**
 * Command to set the active layer
 */
export class SetActiveLayerCommand {
    layerId: string | null;

    constructor(layerId: string | null) {
        this.layerId = layerId;
    }
}

export default SetActiveLayerCommand;
