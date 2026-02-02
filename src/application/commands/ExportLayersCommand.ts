/**
 * Command to export selected layers to a downloadable XML file.
 */
export class ExportLayersCommand {
    type: string;
    payload: { selectedLayerIds: string[] };

    constructor(selectedLayerIds: string[]) {
        this.type = 'ExportLayersCommand';
        this.payload = { selectedLayerIds };
    }
}

export default ExportLayersCommand;
