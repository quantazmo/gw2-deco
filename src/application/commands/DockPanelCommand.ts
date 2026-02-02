/**
 * DockPanelCommand
 * Move a panel to a viewport edge, creating a new root SplitNode.
 */
export class DockPanelCommand {
    panelId: string;
    targetEdge: string;

    constructor(panelId: string, targetEdge: string) {
        this.panelId = panelId;
        this.targetEdge = targetEdge;
    }
}
