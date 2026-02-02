/**
 * Command to rename a layer
 */
class RenameLayerCommand {
    layerId: string;
    newName: string;

    constructor(layerId: string, newName: string) {
        this.layerId = layerId;
        this.newName = newName;
    }
}

export default RenameLayerCommand;
