/**
 * Command to delete a layer from the layout
 */
export class DeleteLayerCommand {
    layerId: string;

    constructor(layerId: string) {
        this.layerId = layerId;
    }
}

export default DeleteLayerCommand;
