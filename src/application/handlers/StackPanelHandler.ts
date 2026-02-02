// @ts-nocheck
/**
 * StackPanelHandler
 * Handles StackPanelCommand: removes the dragged panel from its current position
 * in the layout tree and re-inserts it adjacent to the target panel as a new SplitNode.
 *
 * Edge → direction and positioning:
 *   top    → horizontal split, ratio=0.5, first=dragged, second=target
 *   bottom → horizontal split, ratio=0.5, first=target,  second=dragged
 *   left   → vertical split,   ratio=0.5, first=dragged, second=target
 *   right  → vertical split,   ratio=0.5, first=target,  second=dragged
 */

import {
    DockLayoutConfiguration,
    createPanelNode,
    createSplitNode,
    findNode,
    removeNode,
    replaceNode,
} from '../../domain/DockLayoutConfiguration.js';

const VALID_EDGES = ['top', 'bottom', 'left', 'right'];
const DEFAULT_SPLIT_RATIO = 0.5;

export class StackPanelHandler {
    layoutStore: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {import('../../ui/stores/LayoutStore.js').LayoutStore} layoutStore
     */
    constructor(layoutStore: unknown) {
        this.layoutStore = layoutStore;
    }

    /**
     * @param {import('../commands/StackPanelCommand.js').StackPanelCommand} command
     * @returns {DockLayoutConfiguration}
     */
    execute(command: any) { // TODO: typed command interface pending domain migration
        return this.handle(command);
    }

    handle(command: any) { // TODO: typed command interface pending domain migration
        const { draggedPanelId, targetPanelId, edge } = command;

        if (draggedPanelId === targetPanelId) {
            throw new Error(`StackPanelHandler: draggedPanelId and targetPanelId must not be the same ("${draggedPanelId}")`);
        }

        if (!VALID_EDGES.includes(edge)) {
            throw new Error(`StackPanelHandler: invalid edge "${edge}". Must be one of: ${VALID_EDGES.join(', ')}`);
        }

        const currentLayout = this.layoutStore.getState();
        const currentTree = currentLayout.tree;

        // Verify the target panel exists in the tree before any mutation
        const targetResult = findNode(currentTree, n =>
            (n.type === 'panel' && n.panelId === targetPanelId) ||
            (n.type === 'tabgroup' && n.panels.includes(targetPanelId))
        );
        if (!targetResult) {
            throw new Error(`StackPanelHandler: targetPanelId "${targetPanelId}" not found in the layout tree`);
        }

        // 1. Remove the dragged panel from its current position
        const treeWithoutDragged = removeNode(currentTree, draggedPanelId);

        // 2. Find the target node in the pruned tree (target may have shifted if dragged was its sibling)
        const updatedTargetResult = findNode(treeWithoutDragged, n =>
            (n.type === 'panel' && n.panelId === targetPanelId) ||
            (n.type === 'tabgroup' && n.panels.includes(targetPanelId))
        );
        if (!updatedTargetResult) {
            throw new Error(`StackPanelHandler: target node "${targetPanelId}" disappeared after removing dragged panel`);
        }

        const targetNode = updatedTargetResult.node;
        const draggedNode = createPanelNode(draggedPanelId);

        // 3. Derive direction and positioning from the drop edge
        const direction = (edge === 'top' || edge === 'bottom') ? 'horizontal' : 'vertical';
        let replacementNode;

        if (edge === 'top' || edge === 'left') {
            // Dragged panel appears before the target (above or to the left)
            replacementNode = createSplitNode(direction, DEFAULT_SPLIT_RATIO, draggedNode, targetNode);
        } else {
            // Dragged panel appears after the target (below or to the right)
            replacementNode = createSplitNode(direction, DEFAULT_SPLIT_RATIO, targetNode, draggedNode);
        }

        // 4. Replace the target node in the pruned tree
        const newTree = replaceNode(
            treeWithoutDragged,
            n => n === targetNode,
            replacementNode
        );

        // 5. Validate and commit
        const newLayout = new DockLayoutConfiguration(newTree, currentLayout.version);
        const validation = newLayout.validate();
        if (!validation.valid) {
            throw new Error(`StackPanelHandler: invalid layout after stack: ${validation.errors.join('; ')}`);
        }

        this.layoutStore.setState(newLayout);
        return newLayout;
    }
}
