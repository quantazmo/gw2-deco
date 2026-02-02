/**
 * StackPanelCommand
 * Stack a panel adjacent to another existing panel, creating a new SplitNode.
 */
export class StackPanelCommand {
    draggedPanelId: string;
    targetPanelId: string;
    edge: string;

    constructor(draggedPanelId: string, targetPanelId: string, edge: string) {
        this.draggedPanelId = draggedPanelId;
        this.targetPanelId = targetPanelId;
        this.edge = edge;
    }
}
