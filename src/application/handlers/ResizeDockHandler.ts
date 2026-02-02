// @ts-nocheck
/**
 * ResizeDockHandler
 * Handles ResizeDockCommand: finds a SplitNode by path, updates its ratio with
 * clamping to enforce SPLIT_RATIO_MIN/MAX and, when the map panel is a child,
 * the MAP_MIN_RATIO constraint (map must occupy ≥ 50% of this split).
 *
 * Constraint logic:
 *   - map in first  → ratio ≥ MAP_MIN_RATIO  (map-side gets at least 50%)
 *   - map in second → ratio ≤ 1 - MAP_MIN_RATIO  (second side gets at least 50%)
 *   - no map        → only SPLIT_RATIO_MIN / SPLIT_RATIO_MAX apply
 */

import {
    DockLayoutConfiguration,
    createSplitNode,
    findNode,
} from '../../domain/DockLayoutConfiguration.js';
import { LAYOUT, PANEL_IDS } from '../../config/constants.js';

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Navigate the tree using a path array and return the node at that position.
 * Returns null if any segment in the path doesn't lead to a valid node.
 *
 * @param {object} tree
 * @param {string[]} path  e.g. ['second', 'first']
 * @returns {object|null}
 */
function findNodeAtPath(tree, path) {
    let node = tree;
    for (const segment of path) {
        if (!node || node.type !== 'split') return null;
        node = node[segment];
    }
    return node || null;
}

/**
 * Rebuild the tree with an updated node at the given path (immutable).
 * Applies `updater(targetNode)` to produce the replacement.
 *
 * @param {object} tree
 * @param {string[]} path
 * @param {Function} updater
 * @returns {object} New tree with the updated node
 */
function updateNodeAtPath(tree, path, updater) {
    if (path.length === 0) return updater(tree);

    const [head, ...rest] = path;
    if (!tree || tree.type !== 'split') return tree;

    if (head === 'first') {
        return createSplitNode(
            tree.direction,
            tree.ratio,
            updateNodeAtPath(tree.first, rest, updater),
            tree.second
        );
    }
    // head === 'second'
    return createSplitNode(
        tree.direction,
        tree.ratio,
        tree.first,
        updateNodeAtPath(tree.second, rest, updater)
    );
}

/**
 * Returns true if the given subtree contains the map panel.
 * @param {object} subtree
 * @returns {boolean}
 */
function containsMap(subtree) {
    return findNode(subtree, n => n.type === 'panel' && n.panelId === PANEL_IDS.MAP) !== null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export class ResizeDockHandler {
    layoutStore: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {import('../../ui/stores/LayoutStore.js').LayoutStore} layoutStore
     */
    constructor(layoutStore: unknown) {
        this.layoutStore = layoutStore;
    }

    /**
     * @param {import('../commands/ResizeDockCommand.js').ResizeDockCommand} command
     * @returns {DockLayoutConfiguration}
     */
    execute(command: any) { // TODO: typed command interface pending domain migration
        return this.handle(command);
    }

    handle(command: any) { // TODO: typed command interface pending domain migration
        const { splitNodePath, newRatio } = command;
        const currentLayout = this.layoutStore.getState();

        const targetNode = findNodeAtPath(currentLayout.tree, splitNodePath);
        if (!targetNode || targetNode.type !== 'split') {
            throw new Error(
                `ResizeDockHandler: no SplitNode found at path [${splitNodePath.join(', ')}]`
            );
        }

        // Start with generic ratio clamping
        let clampedRatio = Math.min(
            LAYOUT.SPLIT_RATIO_MAX,
            Math.max(LAYOUT.SPLIT_RATIO_MIN, newRatio)
        );

        // Apply map panel minimum constraint if applicable
        const mapInFirst = containsMap(targetNode.first);
        const mapInSecond = !mapInFirst && containsMap(targetNode.second);

        if (mapInFirst) {
            // Map is in first child → first child must get ≥ MAP_MIN_RATIO
            clampedRatio = Math.max(LAYOUT.MAP_MIN_RATIO, clampedRatio);
        } else if (mapInSecond) {
            // Map is in second child → second child must get ≥ MAP_MIN_RATIO
            // second gets (1 - ratio), so ratio ≤ 1 - MAP_MIN_RATIO
            clampedRatio = Math.min(1 - LAYOUT.MAP_MIN_RATIO, clampedRatio);
        }

        const updatedTree = updateNodeAtPath(
            currentLayout.tree,
            splitNodePath,
            node => createSplitNode(node.direction, clampedRatio, node.first, node.second)
        );

        const newLayout = new DockLayoutConfiguration(updatedTree, currentLayout.version);
        const validation = newLayout.validate();
        if (!validation.valid) {
            throw new Error(
                `ResizeDockHandler: resulting layout is invalid: ${validation.errors.join('; ')}`
            );
        }

        this.layoutStore.setState(newLayout);
        return newLayout;
    }
}
