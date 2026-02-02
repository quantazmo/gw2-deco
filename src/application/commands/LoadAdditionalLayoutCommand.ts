/**
 * Command to load an XML layout as an additional layer.
 * If the layout is for a different map than currently loaded,
 * returns a confirmation request instead of loading.
 */
export class LoadAdditionalLayoutCommand {
    xmlContent: string;
    fileName: string;

    constructor(xmlContent: string, fileName: string) {
        this.xmlContent = xmlContent;
        this.fileName = fileName;
    }
}

export default LoadAdditionalLayoutCommand;
