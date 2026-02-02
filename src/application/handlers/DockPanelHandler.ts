// @ts-nocheck
/**
 * DockPanelHandler
 * Handles DockPanelCommand: removes a panel from its current position in the
 * layout tree and re-inserts it at a viewport edge as a new root SplitNode.
 *
 * Edge → tree shape:
 *   left   → SplitNode(vertical,  ratio=DEFAULT_DOCK_RATIO,        first=panel,  second=restOfTree)
 *   right  → SplitNode(vertical,  ratio=1-DEFAULT_DOCK_RATIO,      first=restOfTree, second=panel)
 *   top    → SplitNode(horizontal, ratio=DEFAULT_DOCK_RATIO,       first=panel,  second=restOfTree)
 *   bottom → SplitNode(horizontal, ratio=1-DEFAULT_DOCK_RATIO,     first=restOfTree, second=panel)
 */

import {
    DockLayoutConfiguration,
    createPanelNode,
    createSplitNode,
    removeNode,
} from '../../domain/DockLayoutConfiguration.js';
import { LAYOUT } from '../../config/constants.js';

const VALID_EDGES = ['left', 'right', 'top', 'bottom'];

export class DockPanelHandler {
    layoutStore: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {import('../../ui/stores/LayoutStore.js').LayoutStore} layoutStore
     */
    constructor(layoutStore: unknown) {
        this.layoutStore = layoutStore;
    }

    /**
     * @param {import('../commands/DockPanelCommand.js').DockPanelCommand} command
     * @returns {DockLayoutConfiguration}
     */
    execute(command: any) { // TODO: typed command interface pending domain migration
        return this.handle(command);
    }

    handle(command: any) { // TODO: typed command interface pending domain migration
        const { panelId, targetEdge } = command;

        if (!VALID_EDGES.includes(targetEdge)) {
            throw new Error(`DockPanelHandler: invalid targetEdge "${targetEdge}". Must be one of: ${VALID_EDGES.join(', ')}`);
        }

        const currentLayout = this.layoutStore.getState();
        const currentTree = currentLayout.tree;

        // 1. Remove the panel from its current position
        const treeWithoutPanel = removeNode(currentTree, panelId);

        // 2. Build the new root SplitNode based on the target edge
        const panelNode = createPanelNode(panelId);
        const dockRatio = LAYOUT.DEFAULT_DOCK_RATIO; // 0.25 — panel gets 25%, rest gets 75%
        let newTree;

        switch (targetEdge) {
            case 'left':
                // Panel on left | rest on right
                newTree = createSplitNode('vertical', dockRatio, panelNode, treeWithoutPanel);
                break;
            case 'right':
                // Rest on left | panel on right
                newTree = createSplitNode('vertical', 1 - dockRatio, treeWithoutPanel, panelNode);
                break;
            case 'top':
                // Panel on top | rest on bottom
                newTree = createSplitNode('horizontal', dockRatio, panelNode, treeWithoutPanel);
                break;
            case 'bottom':
                // Rest on top | panel on bottom
                newTree = createSplitNode('horizontal', 1 - dockRatio, treeWithoutPanel, panelNode);
                break;
        }

        // 3. Validate the resulting layout
        const newLayout = new DockLayoutConfiguration(newTree, currentLayout.version);
        const validation = newLayout.validate();
        if (!validation.valid) {
            throw new Error(`DockPanelHandler: invalid layout after dock: ${validation.errors.join('; ')}`);
        }

        // 4. Commit to store
        this.layoutStore.setState(newLayout);
        return newLayout;
    }
}
