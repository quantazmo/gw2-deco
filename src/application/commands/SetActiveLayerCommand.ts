/**
 * Command to set the active layer
 */
export class SetActiveLayerCommand {
    layerId: string;

    constructor(layerId: string) {
        this.layerId = layerId;
    }
}

export default SetActiveLayerCommand;
