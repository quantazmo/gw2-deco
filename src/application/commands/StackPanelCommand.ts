/**
 * StackPanelCommand
 * Stack a panel adjacent to another existing panel, creating a new SplitNode.
 */
import { DockEdge } from './DockPanelCommand.ts';

export class StackPanelCommand {
    draggedPanelId: string;
    targetPanelId: string;
    edge: DockEdge;

    constructor(draggedPanelId: string, targetPanelId: string, edge: DockEdge) {
        this.draggedPanelId = draggedPanelId;
        this.targetPanelId = targetPanelId;
        this.edge = edge;
    }
}
