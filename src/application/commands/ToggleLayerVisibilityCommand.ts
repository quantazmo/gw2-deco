/**
 * Command to toggle a layer's visibility
 */
export class ToggleLayerVisibilityCommand {
    layerId: string;

    constructor(layerId: string) {
        this.layerId = layerId;
    }
}

export default ToggleLayerVisibilityCommand;
