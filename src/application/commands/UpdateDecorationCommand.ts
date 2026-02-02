/**
 * Command to update a decoration's position
 */
export class UpdateDecorationCommand {
    layerId: string;
    decorationId: string;
    position: unknown;

    constructor(layerId: string, decorationId: string, position: unknown) {
        this.layerId = layerId;
        this.decorationId = decorationId;
        this.position = position;
    }
}

export default UpdateDecorationCommand;
