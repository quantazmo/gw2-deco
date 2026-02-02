/**
 * ReorderPanelCommand
 * Reorder panels within a TabGroupNode or swap the children of a SplitNode.
 */
export class ReorderPanelCommand {
    reorderType: string;
    nodePath: string[];
    fromIndex: number;
    toIndex: number;

    constructor(type: string, nodePath: string[], fromIndex: number, toIndex: number) {
        this.reorderType = type;
        this.nodePath = nodePath;
        this.fromIndex = fromIndex;
        this.toIndex = toIndex;
    }
}
