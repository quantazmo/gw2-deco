/**
 * Command to delete selected decorations from their layers.
 * Produces an undo record.
 */
export class DeleteDecorationsCommand {
    decorationIds: string[];

    constructor(decorationIds: string[]) {
        this.decorationIds = decorationIds;
    }
}

export default DeleteDecorationsCommand;
