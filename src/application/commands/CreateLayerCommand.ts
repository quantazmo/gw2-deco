/**
 * Command to create a new layer in the layout
 */
export class CreateLayerCommand {
    layout: unknown;
    layerName: string;
    isVisible: boolean;

    constructor(layout: unknown, layerName: string, isVisible = true) {
        this.layout = layout;
        this.layerName = layerName;
        this.isVisible = isVisible;
    }
}

export default CreateLayerCommand;
