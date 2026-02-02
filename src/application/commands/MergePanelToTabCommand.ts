/**
 * MergePanelToTabCommand
 * Merge two panels together into a tabbed container.
 * If the target panel is already in a TabGroupNode, the dragged panel is appended to it.
 * If the target panel is a PanelNode, a new TabGroupNode is created with both panels.
 */
export class MergePanelToTabCommand {
    draggedPanelId: string;
    targetPanelId: string;

    constructor(draggedPanelId: string, targetPanelId: string) {
        this.draggedPanelId = draggedPanelId;
        this.targetPanelId = targetPanelId;
    }
}
