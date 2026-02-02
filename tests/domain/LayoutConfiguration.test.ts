// @ts-nocheck
/**
 * Tests for src/domain/LayoutConfiguration.js
 * Tests LayoutConfiguration value object: tree validation, factories, and traversal utilities
 */
import {
    DockLayoutConfiguration,
    createPanelNode,
    createTabGroupNode,
    createSplitNode,
    findNode,
    removeNode,
    replaceNode
} from '../../src/domain/DockLayoutConfiguration.js';
import { PANEL_IDS } from '../../src/config/constants.js';

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function collectPanelIds(node) {
    if (!node) return [];
    if (node.type === 'panel') return [node.panelId];
    if (node.type === 'tabgroup') return [...node.panels];
    if (node.type === 'split') return [...collectPanelIds(node.first), ...collectPanelIds(node.second)];
    return [];
}

function buildValidTree() {
    return createSplitNode('vertical', 0.75,
        createPanelNode(PANEL_IDS.MAP),
        createSplitNode('horizontal', 0.5,
            createPanelNode(PANEL_IDS.LAYERS),
            createPanelNode(PANEL_IDS.DECORATION_LIST)
        )
    );
}

// ─────────────────────────────────────────
// Tests
// ─────────────────────────────────────────

describe('LayoutConfiguration', () => {

    // ──────────────────────────────────────
    // Default layout factory
    // ──────────────────────────────────────
    describe('createDefault()', () => {
        test('returns a LayoutConfiguration instance with version 1', () => {
            const config = DockLayoutConfiguration.createDefault();
            expect(config).toBeInstanceOf(DockLayoutConfiguration);
            expect(config.version).toBe(1);
        });

        test('default layout contains all required panel IDs', () => {
            const config = DockLayoutConfiguration.createDefault();
            const panelIds = collectPanelIds(config.tree);
            expect(panelIds).toContain(PANEL_IDS.MAP);
            expect(panelIds).toContain(PANEL_IDS.LAYERS);
            expect(panelIds).toContain(PANEL_IDS.DECORATION_LIST);
        });

        test('default layout passes validation', () => {
            const config = DockLayoutConfiguration.createDefault();
            const result = config.validate();
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('default layout has a tree rooted at a SplitNode', () => {
            const config = DockLayoutConfiguration.createDefault();
            expect(config.tree.type).toBe('split');
        });
    });

    // ──────────────────────────────────────
    // Validation: all required PanelIds present
    // ──────────────────────────────────────
    describe('validation - all required PanelIds present', () => {
        test('rejects tree missing the map panel', () => {
            const tree = createSplitNode('vertical', 0.5,
                createPanelNode(PANEL_IDS.LAYERS),
                createPanelNode(PANEL_IDS.DECORATION_LIST)
            );
            const config = new DockLayoutConfiguration(tree, 1);
            const result = config.validate();
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('map'))).toBe(true);
        });

        test('rejects tree missing a content panel', () => {
            const tree = createSplitNode('vertical', 0.75,
                createPanelNode(PANEL_IDS.MAP),
                createPanelNode(PANEL_IDS.LAYERS)
            );
            const config = new DockLayoutConfiguration(tree, 1);
            const result = config.validate();
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('decorationList'))).toBe(true);
        });
    });

    // ──────────────────────────────────────
    // Validation: unique PanelIds
    // ──────────────────────────────────────
    describe('validation - unique PanelIds', () => {
        test('rejects duplicate panel IDs in the tree', () => {
            const tree = createSplitNode('vertical', 0.75,
                createPanelNode(PANEL_IDS.MAP),
                createSplitNode('horizontal', 0.5,
                    createPanelNode(PANEL_IDS.MAP), // duplicate
                    createSplitNode('horizontal', 0.5,
                        createPanelNode(PANEL_IDS.LAYERS),
                        createPanelNode(PANEL_IDS.DECORATION_LIST)
                    )
                )
            );
            const config = new DockLayoutConfiguration(tree, 1);
            const result = config.validate();
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.toLowerCase().includes('duplicate'))).toBe(true);
        });
    });

    // ──────────────────────────────────────
    // Validation: ratio bounds 0.1–0.9
    // ──────────────────────────────────────
    describe('validation - ratio bounds', () => {
        test('rejects SplitNode ratio below 0.1', () => {
            const tree = createSplitNode('vertical', 0.05, // invalid
                createPanelNode(PANEL_IDS.MAP),
                createSplitNode('horizontal', 0.5,
                    createPanelNode(PANEL_IDS.LAYERS),
                    createPanelNode(PANEL_IDS.DECORATION_LIST)
                )
            );
            const config = new DockLayoutConfiguration(tree, 1);
            const result = config.validate();
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.toLowerCase().includes('ratio'))).toBe(true);
        });

        test('rejects SplitNode ratio above 0.9', () => {
            const tree = createSplitNode('vertical', 0.95, // invalid
                createPanelNode(PANEL_IDS.MAP),
                createSplitNode('horizontal', 0.5,
                    createPanelNode(PANEL_IDS.LAYERS),
                    createPanelNode(PANEL_IDS.DECORATION_LIST)
                )
            );
            const config = new DockLayoutConfiguration(tree, 1);
            const result = config.validate();
            expect(result.valid).toBe(false);
        });

        test('accepts SplitNode ratio at boundary values 0.1 and 0.9', () => {
            const tree = createSplitNode('vertical', 0.9, // at max bound
                createPanelNode(PANEL_IDS.MAP),
                createSplitNode('horizontal', 0.1, // at min bound
                    createPanelNode(PANEL_IDS.LAYERS),
                    createPanelNode(PANEL_IDS.DECORATION_LIST)
                )
            );
            const config = new DockLayoutConfiguration(tree, 1);
            const result = config.validate();
            expect(result.valid).toBe(true);
        });
    });

    // ──────────────────────────────────────
    // Validation: TabGroupNode min 2 panels
    // ──────────────────────────────────────
    describe('validation - TabGroupNode min 2 panels', () => {
        test('rejects TabGroupNode with fewer than 2 panels', () => {
            const tree = createSplitNode('vertical', 0.75,
                createPanelNode(PANEL_IDS.MAP),
                createSplitNode('horizontal', 0.5,
                    createTabGroupNode([PANEL_IDS.LAYERS], 0), // only 1 panel — invalid
                    createPanelNode(PANEL_IDS.DECORATION_LIST)
                )
            );
            const config = new DockLayoutConfiguration(tree, 1);
            const result = config.validate();
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('TabGroupNode'))).toBe(true);
        });

        test('accepts TabGroupNode with exactly 2 panels', () => {
            const tree = createSplitNode('vertical', 0.75,
                createPanelNode(PANEL_IDS.MAP),
                createTabGroupNode([PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST], 0)
            );
            const config = new DockLayoutConfiguration(tree, 1);
            const result = config.validate();
            expect(result.valid).toBe(true);
        });
    });

    // ──────────────────────────────────────
    // Validation: depth limit ≤ 10
    // ──────────────────────────────────────
    describe('validation - depth limit', () => {
        test('rejects tree with depth > 10', () => {
            // Build a tree 11 splits deep (depth > MAX_TREE_DEPTH=10)
            let deepTree = createPanelNode(PANEL_IDS.MAP);
            for (let i = 0; i < 11; i++) {
                deepTree = createSplitNode('vertical', 0.5, createPanelNode(PANEL_IDS.LAYERS), deepTree);
            }
            const config = new DockLayoutConfiguration(deepTree, 1);
            const result = config.validate();
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.toLowerCase().includes('depth'))).toBe(true);
        });

        test('accepts the default layout which is well within depth 10', () => {
            const config = DockLayoutConfiguration.createDefault();
            const result = config.validate();
            expect(result.valid).toBe(true);
        });
    });

    // ──────────────────────────────────────
    // Tree traversal: findNode
    // ──────────────────────────────────────
    describe('findNode()', () => {
        test('finds a PanelNode by panelId', () => {
            const config = DockLayoutConfiguration.createDefault();
            const result = findNode(config.tree, node => node.type === 'panel' && node.panelId === PANEL_IDS.LAYERS);
            expect(result).not.toBeNull();
            expect(result.node.panelId).toBe(PANEL_IDS.LAYERS);
        });

        test('finds the root node when predicate matches root', () => {
            const tree = buildValidTree();
            const result = findNode(tree, node => node.type === 'split');
            expect(result).not.toBeNull();
            expect(result.path).toHaveLength(0);
        });

        test('returns null when no node matches predicate', () => {
            const tree = createPanelNode(PANEL_IDS.MAP);
            const result = findNode(tree, node => node.type === 'panel' && node.panelId === PANEL_IDS.LAYERS);
            expect(result).toBeNull();
        });

        test('returns path to nested node', () => {
            const tree = buildValidTree();
            // LAYERS is at tree.second.first
            const result = findNode(tree, node => node.type === 'panel' && node.panelId === PANEL_IDS.LAYERS);
            expect(result).not.toBeNull();
            expect(result.path).toContain('second');
            expect(result.path).toContain('first');
        });
    });

    // ──────────────────────────────────────
    // Tree traversal: removeNode
    // ──────────────────────────────────────
    describe('removeNode()', () => {
        test('removes a leaf PanelNode from a SplitNode, replacing SplitNode with the sibling', () => {
            const tree = createSplitNode('vertical', 0.75,
                createPanelNode(PANEL_IDS.MAP),
                createPanelNode(PANEL_IDS.LAYERS)
            );
            const newTree = removeNode(tree, PANEL_IDS.LAYERS);
            expect(newTree.type).toBe('panel');
            expect(newTree.panelId).toBe(PANEL_IDS.MAP);
        });

        test('removes a deeply nested PanelNode', () => {
            const config = DockLayoutConfiguration.createDefault();
            const newTree = removeNode(config.tree, PANEL_IDS.LAYERS);
            const found = findNode(newTree, n => n.type === 'panel' && n.panelId === PANEL_IDS.LAYERS);
            expect(found).toBeNull();
        });

        test('converts a 2-panel TabGroupNode to a PanelNode when one panel is removed', () => {
            const tree = createSplitNode('vertical', 0.75,
                createPanelNode(PANEL_IDS.MAP),
                createTabGroupNode([PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST], 0)
            );
            const newTree = removeNode(tree, PANEL_IDS.DECORATION_LIST);
            const found = findNode(newTree, n => n.type === 'panel' && n.panelId === PANEL_IDS.LAYERS);
            expect(found).not.toBeNull();
            expect(found.node.type).toBe('panel');
        });

        test('returns original tree when panelId is not found', () => {
            const tree = createPanelNode(PANEL_IDS.MAP);
            const newTree = removeNode(tree, PANEL_IDS.LAYERS);
            expect(newTree).toBe(tree);
        });
    });

    // ──────────────────────────────────────
    // Tree traversal: replaceNode
    // ──────────────────────────────────────
    describe('replaceNode()', () => {
        test('replaces a matching PanelNode with a TabGroupNode', () => {
            const tree = createSplitNode('vertical', 0.75,
                createPanelNode(PANEL_IDS.MAP),
                createPanelNode(PANEL_IDS.LAYERS)
            );
            const tabGroup = createTabGroupNode([PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST], 0);
            const newTree = replaceNode(
                tree,
                n => n.type === 'panel' && n.panelId === PANEL_IDS.LAYERS,
                tabGroup
            );
            const found = findNode(newTree, n => n.type === 'tabgroup');
            expect(found).not.toBeNull();
            expect(found.node.panels).toContain(PANEL_IDS.LAYERS);
        });

        test('replaces the root node when predicate matches root', () => {
            const tree = createPanelNode(PANEL_IDS.MAP);
            const replacement = createPanelNode(PANEL_IDS.LAYERS);
            const newTree = replaceNode(tree, n => n.type === 'panel' && n.panelId === PANEL_IDS.MAP, replacement);
            expect(newTree.panelId).toBe(PANEL_IDS.LAYERS);
        });

        test('returns original tree reference when predicate does not match', () => {
            const tree = buildValidTree();
            const newTree = replaceNode(tree, () => false, createPanelNode(PANEL_IDS.MAP));
            expect(newTree).toBe(tree);
        });
    });
});
