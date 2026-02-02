/**
 * Command to move decorations from their current layers to a target layer.
 * Produces an undo record.
 */
export class MoveDecorationsCommand {
    decorationIds: string[];
    targetLayerId: string;

    constructor(decorationIds: string[], targetLayerId: string) {
        this.decorationIds = decorationIds;
        this.targetLayerId = targetLayerId;
    }
}

export default MoveDecorationsCommand;
