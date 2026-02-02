/**
 * Command to load a layout from XML
 */
export class LoadLayoutCommand {
    xmlContent: string;

    constructor(xmlContent: string) {
        this.xmlContent = xmlContent;
    }
}

export default LoadLayoutCommand;
