/**
 * Command to change the color of a layer
 */
export class SetLayerColorCommand {
    layerId: string;
    color: string;

    constructor(layerId: string, color: string) {
        this.layerId = layerId;
        this.color = color;
    }
}

export default SetLayerColorCommand;
