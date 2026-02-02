/**
 * LayoutConfiguration
 * Value object representing the complete panel layout state as a binary split tree.
 * Provides: node factories, tree traversal utilities (findNode, removeNode, replaceNode),
 * validation, and a default layout factory.
 */

import { PANEL_IDS, LAYOUT } from '../config/constants.ts';

const VALID_PANEL_IDS = [PANEL_IDS.MAP, PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST];
// Panels that must appear in every valid layout
const REQUIRED_PANEL_IDS = [PANEL_IDS.MAP, PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST];

// ─────────────────────────────────────────────────────────────────────────────
// Layout node types
// ─────────────────────────────────────────────────────────────────────────────

export type PanelNode = { type: 'panel'; panelId: string };
export type TabGroupNode = { type: 'tabgroup'; panels: string[]; activeIndex: number };
export type SplitNode = { type: 'split'; direction: 'horizontal' | 'vertical'; ratio: number; first: DockLayoutNode; second: DockLayoutNode };
export type DockLayoutNode = PanelNode | TabGroupNode | SplitNode;

// ─────────────────────────────────────────────────────────────────────────────
// Node factory functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a PanelNode leaf.
 * @param {string} panelId
 * @returns {{ type: 'panel', panelId: string }}
 */
export function createPanelNode(panelId: string): PanelNode {
    return { type: 'panel', panelId };
}

/**
 * Create a TabGroupNode leaf (2+ panels sharing a tab bar).
 * @param {string[]} panels
 * @param {number} [activeIndex=0]
 * @returns {{ type: 'tabgroup', panels: string[], activeIndex: number }}
 */
export function createTabGroupNode(panels: string[], activeIndex: number = 0): TabGroupNode {
    return { type: 'tabgroup', panels: [...panels], activeIndex };
}

/**
 * Create a SplitNode branch.
 * @param {'horizontal'|'vertical'} direction
 * @param {number} ratio  Fraction of space for `first` child (0.0–1.0)
 * @param {object} first
 * @param {object} second
 * @returns {{ type: 'split', direction: string, ratio: number, first: object, second: object }}
 */
export function createSplitNode(direction: 'horizontal' | 'vertical', ratio: number, first: DockLayoutNode, second: DockLayoutNode): SplitNode {
    return { type: 'split', direction, ratio, first, second };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tree traversal utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the first node in the tree matching `predicate`.
 * @param {object} tree
 * @param {Function} predicate
 * @param {string[]} [path=[]]
 * @returns {{ node: object, path: string[] } | null}
 */
export function findNode(tree: DockLayoutNode | null, predicate: (node: DockLayoutNode) => boolean, path: string[] = []): { node: DockLayoutNode; path: string[] } | null {
    if (!tree) return null;
    if (predicate(tree)) return { node: tree, path: [...path] };

    if (tree.type === 'split') {
        const inFirst = findNode(tree.first, predicate, [...path, 'first']);
        if (inFirst) return inFirst;
        const inSecond = findNode(tree.second, predicate, [...path, 'second']);
        if (inSecond) return inSecond;
    }

    return null;
}

/**
 * Remove a panel from the tree by panelId (immutable — returns a new tree).
 *
 * Rules:
 * - PanelNode directly under a SplitNode → replace the SplitNode with the other child
 * - Panel in a TabGroupNode with 3+ panels → splice it out
 * - Panel in a TabGroupNode with 2 panels → convert TabGroupNode to a PanelNode
 *
 * @param {object} tree
 * @param {string} panelId
 * @returns {object} New tree without the panel
 */
export function removeNode(tree: DockLayoutNode, panelId: string): DockLayoutNode {
    return _removeNode(tree, panelId);
}

function _containsPanel(node: DockLayoutNode | null, panelId: string): boolean {
    if (!node) return false;
    if (node.type === 'panel') return node.panelId === panelId;
    if (node.type === 'tabgroup') return node.panels.includes(panelId);
    if (node.type === 'split') {
        return _containsPanel(node.first, panelId) || _containsPanel(node.second, panelId);
    }
    return false;
}

function _removeNode(node: DockLayoutNode, panelId: string): DockLayoutNode {
    if (!node) return node;

    if (node.type === 'panel') {
        // Leaf not matched — return as-is (the SplitNode parent handles replacement)
        return node;
    }

    if (node.type === 'tabgroup') {
        if (!node.panels.includes(panelId)) return node;
        const remaining = node.panels.filter(p => p !== panelId);
        if (remaining.length === 1) {
            return createPanelNode(remaining[0]);
        }
        const newActiveIndex = Math.min(node.activeIndex, remaining.length - 1);
        return createTabGroupNode(remaining, newActiveIndex);
    }

    if (node.type === 'split') {
        if (_containsPanel(node.first, panelId)) {
            if (node.first.type === 'panel' && node.first.panelId === panelId) {
                return node.second;
            }
            const newFirst = _removeNode(node.first, panelId);
            return createSplitNode(node.direction, node.ratio, newFirst, node.second);
        }

        if (_containsPanel(node.second, panelId)) {
            if (node.second.type === 'panel' && node.second.panelId === panelId) {
                return node.first;
            }
            const newSecond = _removeNode(node.second, panelId);
            return createSplitNode(node.direction, node.ratio, node.first, newSecond);
        }

        return node;
    }

    return node;
}

/**
 * Replace the first node matching `predicate` with `replacement` (immutable).
 * @param {object} tree
 * @param {Function} predicate
 * @param {object} replacement
 * @returns {object} New tree with the replaced node
 */
export function replaceNode(tree: DockLayoutNode | null, predicate: (node: DockLayoutNode) => boolean, replacement: DockLayoutNode): DockLayoutNode | null {
    if (!tree) return tree;
    if (predicate(tree)) return replacement;

    if (tree.type === 'split') {
        const newFirst = replaceNode(tree.first, predicate, replacement);
        const newSecond = replaceNode(tree.second, predicate, replacement);
        if (newFirst !== tree.first || newSecond !== tree.second) {
            return createSplitNode(tree.direction, tree.ratio, newFirst ?? tree.first, newSecond ?? tree.second);
        }
    }

    return tree;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal validation helpers
// ─────────────────────────────────────────────────────────────────────────────

function _collectPanelIds(node: DockLayoutNode | null, result: string[] = []): string[] {
    if (!node) return result;
    if (node.type === 'panel') { result.push(node.panelId); return result; }
    if (node.type === 'tabgroup') { result.push(...node.panels); return result; }
    if (node.type === 'split') {
        _collectPanelIds(node.first, result);
        _collectPanelIds(node.second, result);
    }
    return result;
}

function _maxDepth(node: DockLayoutNode | null, depth: number = 1): number {
    if (!node || node.type !== 'split') return depth;
    return Math.max(
        _maxDepth(node.first, depth + 1),
        _maxDepth(node.second, depth + 1)
    );
}

function _validateTree(node: DockLayoutNode | null, errors: string[], depth: number = 1): void {
    if (!node) {
        errors.push('Tree node is null or undefined');
        return;
    }

    if (depth > LAYOUT.MAX_TREE_DEPTH) {
        // Depth already reported by the outer check; stop recursing
        return;
    }

    if (node.type === 'panel') {
        if (!VALID_PANEL_IDS.includes(node.panelId)) {
            errors.push(`Invalid panelId: "${node.panelId}"`);
        }

    } else if (node.type === 'tabgroup') {
        if (!node.panels || node.panels.length < 2) {
            errors.push(`TabGroupNode must have at least 2 panels (found ${node.panels ? node.panels.length : 0})`);
        }
        if (node.panels) {
            node.panels.forEach(p => {
                if (!VALID_PANEL_IDS.includes(p)) {
                    errors.push(`TabGroupNode contains invalid panelId: "${p}"`);
                }
            });
        }
        const panelCount = node.panels ? node.panels.length : 0;
        if (typeof node.activeIndex !== 'number' || node.activeIndex < 0 || node.activeIndex >= panelCount) {
            errors.push(`TabGroupNode activeIndex ${node.activeIndex} out of bounds (panels.length=${panelCount})`);
        }

    } else if (node.type === 'split') {
        if (typeof node.ratio !== 'number' ||
            node.ratio < LAYOUT.SPLIT_RATIO_MIN ||
            node.ratio > LAYOUT.SPLIT_RATIO_MAX) {
            errors.push(
                `SplitNode ratio ${node.ratio} is outside allowed bounds ` +
                `[${LAYOUT.SPLIT_RATIO_MIN}, ${LAYOUT.SPLIT_RATIO_MAX}]`
            );
        }
        if (node.direction !== 'horizontal' && node.direction !== 'vertical') {
            errors.push(`SplitNode direction must be 'horizontal' or 'vertical', got: "${node.direction}"`);
        }
        _validateTree(node.first, errors, depth + 1);
        _validateTree(node.second, errors, depth + 1);

    } else {
        errors.push(`Unknown node type: "${(node as { type: string }).type}"`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// LayoutConfiguration value object
// ─────────────────────────────────────────────────────────────────────────────

export class DockLayoutConfiguration {
    tree: DockLayoutNode;
    version: number;

    constructor(tree: DockLayoutNode, version: number = 1) {
        this.tree = tree;
        this.version = version;
    }

    /**
     * Create the canonical default layout:
     *   Map (81.25% width) | Layers / DecorationList stacked on the right
     * @returns {DockLayoutConfiguration}
     */
    static createDefault() {
        const tree = createSplitNode('vertical', 0.8125,
            createPanelNode(PANEL_IDS.MAP),
            createSplitNode('horizontal', 0.35,
                createPanelNode(PANEL_IDS.LAYERS),
                createPanelNode(PANEL_IDS.DECORATION_LIST)
            )
        );
        return new DockLayoutConfiguration(tree, 1);
    }

    /**
     * Validate the layout configuration.
     * @returns {{ valid: boolean, errors: string[] }}
     */
    validate(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Check depth first (fail-fast on pathological trees)
        const depth = _maxDepth(this.tree);
        if (depth > LAYOUT.MAX_TREE_DEPTH) {
            errors.push(`Tree depth ${depth} exceeds maximum allowed depth of ${LAYOUT.MAX_TREE_DEPTH}`);
            return { valid: false, errors };
        }

        // Validate structural rules recursively
        _validateTree(this.tree, errors);

        // Validate panel completeness and uniqueness
        const panelIds = _collectPanelIds(this.tree);
        const duplicates = panelIds.filter((id, idx) => panelIds.indexOf(id) !== idx);
        if (duplicates.length > 0) {
            errors.push(`Duplicate panel IDs found: ${[...new Set(duplicates)].join(', ')}`);
        }
        REQUIRED_PANEL_IDS.forEach(id => {
            if (!panelIds.includes(id)) {
                errors.push(`Missing required panel: "${id}"`);
            }
        });

        return { valid: errors.length === 0, errors };
    }
}
