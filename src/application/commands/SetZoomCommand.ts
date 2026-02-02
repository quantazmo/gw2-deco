/**
 * Command to set the zoom level
 */
export class SetZoomCommand {
    zoomLevel: number;

    constructor(zoomLevel: number) {
        this.zoomLevel = zoomLevel;
    }
}

export default SetZoomCommand;
