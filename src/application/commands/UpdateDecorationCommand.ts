/**
 * Command to update a decoration's position
 */
import { WorldCoordinate, WorldCoordinateLike } from '../../domain/WorldCoordinate.ts';

export class UpdateDecorationCommand {
    layerId: string;
    decorationId: string;
    position: WorldCoordinate | WorldCoordinateLike;

    constructor(layerId: string, decorationId: string, position: WorldCoordinate | WorldCoordinateLike) {
        this.layerId = layerId;
        this.decorationId = decorationId;
        this.position = position;
    }
}

export default UpdateDecorationCommand;
