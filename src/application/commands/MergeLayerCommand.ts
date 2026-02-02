/**
 * Command to merge a source layer into a target layer.
 * Moves all decorations from source to target, then deletes the source layer.
 */
export class MergeLayerCommand {
    sourceLayerId: string;
    targetLayerId: string;

    constructor(sourceLayerId: string, targetLayerId: string) {
        this.sourceLayerId = sourceLayerId;
        this.targetLayerId = targetLayerId;
    }
}

export default MergeLayerCommand;
