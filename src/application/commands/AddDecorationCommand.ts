/**
 * Command to add a decoration to a layer
 */
export class AddDecorationCommand {
    layerId: string;
    decorationId: string;
    name: string;
    position: unknown;
    rotation: number;
    scale: number;

    constructor(layerId: string, decorationId: string, name: string, position: unknown, rotation = 0, scale = 1) {
        this.layerId = layerId;
        this.decorationId = decorationId;
        this.name = name;
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
    }
}

export default AddDecorationCommand;
