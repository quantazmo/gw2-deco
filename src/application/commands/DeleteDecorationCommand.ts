/**
 * Command to delete a decoration from a layer
 */
export class DeleteDecorationCommand {
    layerId: string;
    decorationId: string;

    constructor(layerId: string, decorationId: string) {
        this.layerId = layerId;
        this.decorationId = decorationId;
    }
}

export default DeleteDecorationCommand;
