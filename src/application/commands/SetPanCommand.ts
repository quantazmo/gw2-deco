/**
 * Command to set the pan offset
 */
export class SetPanCommand {
    offset: { x: number; y: number };

    constructor(offset: { x: number; y: number }) {
        this.offset = offset;
    }
}

export default SetPanCommand;
