/**
 * Command to switch maps — clears all layers, switches to a new map,
 * and loads the layout as the first layer.
 * Only executed after user confirms via ConfirmDialog.
 */
export class SwitchMapCommand {
    xmlContent: string;
    fileName: string;

    constructor(xmlContent: string, fileName: string) {
        this.xmlContent = xmlContent;
        this.fileName = fileName;
    }
}

export default SwitchMapCommand;
