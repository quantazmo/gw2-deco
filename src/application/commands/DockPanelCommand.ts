/**
 * DockPanelCommand
 * Move a panel to a viewport edge, creating a new root SplitNode.
 */
export type DockEdge = 'left' | 'right' | 'top' | 'bottom';

export class DockPanelCommand {
    panelId: string;
    targetEdge: DockEdge;

    constructor(panelId: string, targetEdge: DockEdge) {
        this.panelId = panelId;
        this.targetEdge = targetEdge;
    }
}
