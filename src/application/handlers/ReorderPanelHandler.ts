// @ts-nocheck
/**
 * ReorderPanelHandler
 * Handles ReorderPanelCommand:
 *   - type='tab':   splices the panels array of a TabGroupNode to reorder tabs;
 *                   activeIndex follows the previously active panel to its new position.
 *   - type='stack': swaps first/second children of a SplitNode and flips the ratio
 *                   so each child retains the space the other previously occupied.
 *
 * No-op (returns current layout without a store commit) when fromIndex === toIndex.
 */

import {
    DockLayoutConfiguration,
    createTabGroupNode,
    createSplitNode,
} from '../../domain/DockLayoutConfiguration.js';

// ─────────────────────────────────────────────────────────────────────────────
// Path navigation helpers (operate on the immutable tree)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the node at the given path from the tree root.
 * Path segments are 'first' or 'second' (SplitNode properties).
 *
 * @param {object}   tree
 * @param {string[]} path
 * @returns {object}
 */
function getNodeAtPath(tree, path) {
    let node = tree;
    for (const key of path) {
        if (!node) {
            throw new Error(
                `ReorderPanelHandler: null node reached at path segment "${key}"`
            );
        }
        node = node[key];
    }
    return node;
}

/**
 * Return a new tree with the node at `path` replaced by `replacement` (immutable).
 *
 * @param {object}   tree
 * @param {string[]} path
 * @param {object}   replacement
 * @returns {object}
 */
function replaceAtPath(tree, path, replacement) {
    if (path.length === 0) return replacement;

    const [head, ...rest] = path;

    if (!tree || tree.type !== 'split') {
        throw new Error(
            `replaceAtPath: expected a split node at path segment "${head}", ` +
            `found "${tree?.type}"`
        );
    }

    if (head === 'first') {
        return createSplitNode(
            tree.direction,
            tree.ratio,
            replaceAtPath(tree.first, rest, replacement),
            tree.second
        );
    }
    if (head === 'second') {
        return createSplitNode(
            tree.direction,
            tree.ratio,
            tree.first,
            replaceAtPath(tree.second, rest, replacement)
        );
    }

    throw new Error(`replaceAtPath: unexpected path segment "${head}"`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export class ReorderPanelHandler {
    layoutStore: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {import('../../ui/stores/LayoutStore.js').LayoutStore} layoutStore
     */
    constructor(layoutStore: unknown) {
        this.layoutStore = layoutStore;
    }

    /** @param {import('../commands/ReorderPanelCommand.js').ReorderPanelCommand} command */
    execute(command: any) { // TODO: typed command interface pending domain migration
        return this.handle(command);
    }

    handle(command: any) { // TODO: typed command interface pending domain migration
        const { reorderType: type, nodePath, fromIndex, toIndex } = command;

        // Early exit — no change needed
        if (fromIndex === toIndex) {
            return this.layoutStore.getState();
        }

        const currentLayout = this.layoutStore.getState();
        const currentTree = currentLayout.tree;
        let newTree;

        if (type === 'tab') {
            const tabNode = getNodeAtPath(currentTree, nodePath);

            if (!tabNode || tabNode.type !== 'tabgroup') {
                throw new Error(
                    `ReorderPanelHandler: expected tabgroup at path ` +
                    `[${nodePath.join(', ')}], found "${tabNode?.type}"`
                );
            }

            // Remember which panel is currently active so we can follow it
            const activePanelId = tabNode.panels[tabNode.activeIndex];

            // Splice: remove from fromIndex and re-insert at toIndex
            const newPanels = [...tabNode.panels];
            const [removed] = newPanels.splice(fromIndex, 1);
            newPanels.splice(toIndex, 0, removed);

            const newActiveIndex = newPanels.indexOf(activePanelId);
            const newTabNode = createTabGroupNode(newPanels, newActiveIndex);

            newTree = replaceAtPath(currentTree, nodePath, newTabNode);

        } else if (type === 'stack') {
            const splitNode = getNodeAtPath(currentTree, nodePath);

            if (!splitNode || splitNode.type !== 'split') {
                throw new Error(
                    `ReorderPanelHandler: expected split at path ` +
                    `[${nodePath.join(', ')}], found "${splitNode?.type}"`
                );
            }

            // For a binary split, reordering means swapping first ↔ second.
            // The ratio is also flipped so each child keeps the same proportional size.
            const newSplitNode = createSplitNode(
                splitNode.direction,
                1 - splitNode.ratio,
                splitNode.second,   // becomes new first
                splitNode.first     // becomes new second
            );

            newTree = replaceAtPath(currentTree, nodePath, newSplitNode);

        } else {
            throw new Error(
                `ReorderPanelHandler: unknown type "${type}". Must be 'tab' or 'stack'.`
            );
        }

        const newLayout = new DockLayoutConfiguration(newTree, currentLayout.version);
        const validation = newLayout.validate();
        if (!validation.valid) {
            throw new Error(
                `ReorderPanelHandler: invalid layout after reorder: ` +
                validation.errors.join('; ')
            );
        }

        this.layoutStore.setState(newLayout);
        return newLayout;
    }
}
