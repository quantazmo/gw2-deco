// @ts-nocheck
/**
 * MergePanelToTabHandler
 * Handles MergePanelToTabCommand:
 *   - Removes the dragged panel from its current position in the layout tree
 *   - Finds the target panel (by targetPanelId)
 *   - If the target is a PanelNode: replaces it with a TabGroupNode containing both panels
 *   - If the target is inside an existing TabGroupNode: appends the dragged panel to that group
 *   - Sets activeIndex to the newly added (dragged) panel
 *   - Validates and commits the new layout to LayoutStore
 */

import {
    DockLayoutConfiguration,
    createPanelNode,
    createTabGroupNode,
    findNode,
    removeNode,
    replaceNode,
} from '../../domain/DockLayoutConfiguration.js';

export class MergePanelToTabHandler {
    layoutStore: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {import('../../ui/stores/LayoutStore.js').LayoutStore} layoutStore
     */
    constructor(layoutStore: unknown) {
        this.layoutStore = layoutStore;
    }

    /**
     * @param {import('../commands/MergePanelToTabCommand.js').MergePanelToTabCommand} command
     * @returns {DockLayoutConfiguration}
     */
    execute(command: any) { // TODO: typed command interface pending domain migration
        return this.handle(command);
    }

    handle(command: any) { // TODO: typed command interface pending domain migration
        const { draggedPanelId, targetPanelId } = command;

        if (draggedPanelId === targetPanelId) {
            throw new Error(`MergePanelToTabHandler: draggedPanelId and targetPanelId must not be the same ("${draggedPanelId}")`);
        }

        const currentLayout = this.layoutStore.getState();
        const currentTree = currentLayout.tree;

        // Verify the target panel exists in the tree
        const targetResult = findNode(currentTree, n =>
            (n.type === 'panel' && n.panelId === targetPanelId) ||
            (n.type === 'tabgroup' && n.panels.includes(targetPanelId))
        );
        if (!targetResult) {
            throw new Error(`MergePanelToTabHandler: targetPanelId "${targetPanelId}" not found in the layout tree`);
        }

        // 1. Remove the dragged panel from its current position
        const treeWithoutDragged = removeNode(currentTree, draggedPanelId);

        // 2. Find the target node in the pruned tree (target moves if dragged was its sibling)
        const updatedTargetResult = findNode(treeWithoutDragged, n =>
            (n.type === 'panel' && n.panelId === targetPanelId) ||
            (n.type === 'tabgroup' && n.panels.includes(targetPanelId))
        );
        if (!updatedTargetResult) {
            throw new Error(`MergePanelToTabHandler: target node "${targetPanelId}" disappeared after removing dragged panel`);
        }

        const targetNode = updatedTargetResult.node;

        // 3. Build the replacement node
        let replacementNode;

        if (targetNode.type === 'tabgroup') {
            // Append dragged panel to existing TabGroupNode
            const newPanels = [...targetNode.panels, draggedPanelId];
            const newActiveIndex = newPanels.length - 1; // Newly added panel becomes active
            replacementNode = createTabGroupNode(newPanels, newActiveIndex);
        } else {
            // targetNode.type === 'panel' — create a new TabGroupNode
            // Target stays as first, dragged is appended (active)
            replacementNode = createTabGroupNode(
                [targetPanelId, draggedPanelId],
                1 // Dragged panel (index 1) becomes active
            );
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
            throw new Error(`MergePanelToTabHandler: invalid layout after merge: ${validation.errors.join('; ')}`);
        }

        this.layoutStore.setState(newLayout);
        return newLayout;
    }
}
