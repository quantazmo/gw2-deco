/**
 * ReorderPanelCommand
 * Reorder panels within a TabGroupNode or swap the children of a SplitNode.
 */
import { DockNodePath } from '../../domain/DockLayoutConfiguration.ts';

export class ReorderPanelCommand {
    reorderType: 'tab' | 'stack';
    nodePath: DockNodePath;
    fromIndex: number;
    toIndex: number;

    constructor(type: 'tab' | 'stack', nodePath: DockNodePath, fromIndex: number, toIndex: number) {
        this.reorderType = type;
        this.nodePath = nodePath;
        this.fromIndex = fromIndex;
        this.toIndex = toIndex;
    }
}
