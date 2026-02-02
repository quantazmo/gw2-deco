// @ts-nocheck
/**
 * Additional tests for LayoutConfiguration — targeting uncovered branches.
 *
 * Uncovered lines in previous run:
 *   95  – _containsPanel fallthrough `return false` (unknown node type)
 *   133 – _removeNode: split doesn't contain panelId → `return node`
 *   136 – _removeNode: unknown node type → `return node`
 *   186 – _validateTree: null node push error message
 *   187 – _validateTree: null node return
 *   197 – _validateTree: invalid panelId in PanelNode
 *   207 – _validateTree: invalid panelId in TabGroupNode panels
 *   213 – _validateTree: TabGroupNode activeIndex out of bounds
 *   226 – _validateTree: SplitNode invalid direction
 *   232 – _validateTree: unknown node type
 */
import {
    DockLayoutConfiguration,
    createPanelNode,
    createTabGroupNode,
    createSplitNode,
    removeNode,
} from '../../src/domain/DockLayoutConfiguration.js';
import { PANEL_IDS } from '../../src/config/constants.js';

describe('LayoutConfiguration — additional branch coverage', () => {

    // ─────────────────────────────────────────────────────────────────────────
    // _containsPanel – fallthrough return false (unknown node type)
    // ─────────────────────────────────────────────────────────────────────────
    describe('removeNode – unknown child type in split triggers _containsPanel fallthrough', () => {
        test('unknown first-child type causes _containsPanel to return false and falls through', () => {
            // When first child has an unknown type, _containsPanel returns false (line 95).
            // The second child is a panel that IS the panelId to remove.
            const tree = createSplitNode('vertical', 0.5,
                { type: 'unknown', panelId: PANEL_IDS.MAP }, // triggers _containsPanel fallthrough
                createPanelNode(PANEL_IDS.LAYERS)
            );
            const result = removeNode(tree, PANEL_IDS.LAYERS);
            // second is a matching panel → returns first (the unknown node)
            expect(result.type).toBe('unknown');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // _removeNode – split that does NOT contain panelId → return node (line 133)
    // ─────────────────────────────────────────────────────────────────────────
    describe('removeNode – panelId absent from split tree', () => {
        test('returns the split node unchanged when panelId is not anywhere in the tree', () => {
            const tree = createSplitNode('vertical', 0.5,
                createPanelNode(PANEL_IDS.MAP),
                createPanelNode(PANEL_IDS.LAYERS)
            );
            const result = removeNode(tree, PANEL_IDS.DECORATION_LIST); // not in tree
            expect(result).toBe(tree); // same reference
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // _removeNode – unknown node type → final `return node` (line 136)
    // ─────────────────────────────────────────────────────────────────────────
    describe('removeNode – unknown root node type', () => {
        test('returns node unchanged when root has an unknown type', () => {
            const node = { type: 'unknown', foo: 'bar' };
            const result = removeNode(node, PANEL_IDS.MAP);
            expect(result).toBe(node);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // _validateTree – null child of a split (lines 186-187)
    // ─────────────────────────────────────────────────────────────────────────
    describe('validate – null child in split tree', () => {
        test('reports null node error when a split child is null', () => {
            const tree = {
                type: 'split',
                direction: 'vertical',
                ratio: 0.5,
                first: null,  // triggers _validateTree null check
                second: createSplitNode('horizontal', 0.5,
                    createPanelNode(PANEL_IDS.MAP),
                    createSplitNode('horizontal', 0.5,
                        createPanelNode(PANEL_IDS.LAYERS),
                        createPanelNode(PANEL_IDS.DECORATION_LIST)
                    )
                )
            };
            const config = new DockLayoutConfiguration(tree);
            const result = config.validate();
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('null') || e.includes('undefined'))).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // _validateTree – invalid panelId in PanelNode (line 197)
    // ─────────────────────────────────────────────────────────────────────────
    describe('validate – invalid panelId in PanelNode', () => {
        test('reports error for unknown panelId in a panel node', () => {
            const tree = createSplitNode('vertical', 0.5,
                createPanelNode('invalid-panel-xyz'),   // triggers line 197
                createSplitNode('horizontal', 0.5,
                    createPanelNode(PANEL_IDS.MAP),
                    createSplitNode('horizontal', 0.5,
                        createPanelNode(PANEL_IDS.LAYERS),
                        createPanelNode(PANEL_IDS.DECORATION_LIST)
                    )
                )
            );
            const config = new DockLayoutConfiguration(tree);
            const result = config.validate();
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('invalid-panel-xyz'))).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // _validateTree – invalid panelId in TabGroupNode.panels (line 207)
    // ─────────────────────────────────────────────────────────────────────────
    describe('validate – invalid panelId in TabGroupNode', () => {
        test('reports error for unknown panelId inside a tab group', () => {
            const tree = createSplitNode('vertical', 0.75,
                createPanelNode(PANEL_IDS.MAP),
                createSplitNode('horizontal', 0.5,
                    createTabGroupNode([PANEL_IDS.LAYERS, 'bad-panel-id'], 0),  // triggers
                    createPanelNode(PANEL_IDS.DECORATION_LIST)
                )
            );
            const config = new DockLayoutConfiguration(tree);
            const result = config.validate();
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('bad-panel-id'))).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // _validateTree – TabGroupNode activeIndex out of bounds (line 213)
    // ─────────────────────────────────────────────────────────────────────────
    describe('validate – TabGroupNode activeIndex out of bounds', () => {
        test('reports error when activeIndex is too high', () => {
            const tree = createSplitNode('vertical', 0.75,
                createPanelNode(PANEL_IDS.MAP),
                createTabGroupNode([PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST], 99) // activeIndex 99 triggers
            );
            const config = new DockLayoutConfiguration(tree);
            const result = config.validate();
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('activeIndex'))).toBe(true);
        });

        test('reports error when activeIndex is negative', () => {
            const tree = createSplitNode('vertical', 0.75,
                createPanelNode(PANEL_IDS.MAP),
                createTabGroupNode([PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST], -1) // negative triggers
            );
            const config = new DockLayoutConfiguration(tree);
            const result = config.validate();
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('activeIndex'))).toBe(true);
        });

        test('reports error when activeIndex is not a number', () => {
            const tree = createSplitNode('vertical', 0.75,
                createPanelNode(PANEL_IDS.MAP),
                createSplitNode('horizontal', 0.5,
                    { type: 'tabgroup', panels: [PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST], activeIndex: 'zero' },
                    createPanelNode(PANEL_IDS.DECORATION_LIST) // duplicate intentional — testing activeIndex error, not completeness
                )
            );
            const config = new DockLayoutConfiguration(tree);
            const result = config.validate();
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('activeIndex'))).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // _validateTree – SplitNode invalid direction (line 226)
    // ─────────────────────────────────────────────────────────────────────────
    describe('validate – SplitNode invalid direction', () => {
        test('reports error when split direction is not horizontal or vertical', () => {
            const tree = {
                type: 'split',
                direction: 'diagonal',   // triggers line 226
                ratio: 0.5,
                first: createPanelNode(PANEL_IDS.MAP),
                second: createSplitNode('horizontal', 0.5,
                    createPanelNode(PANEL_IDS.LAYERS),
                    createPanelNode(PANEL_IDS.DECORATION_LIST)
                )
            };
            const config = new DockLayoutConfiguration(tree);
            const result = config.validate();
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('direction') || e.includes('diagonal'))).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // _validateTree – unknown node type (line 232)
    // ─────────────────────────────────────────────────────────────────────────
    describe('validate – unknown node type', () => {
        test('reports error for a node with an unknown type', () => {
            const tree = createSplitNode('vertical', 0.5,
                createPanelNode(PANEL_IDS.MAP),
                createSplitNode('horizontal', 0.5,
                    { type: 'weird', panels: [] },   // triggers
                    createSplitNode('horizontal', 0.5,
                        createPanelNode(PANEL_IDS.LAYERS),
                        createPanelNode(PANEL_IDS.DECORATION_LIST)
                    )
                )
            );
            const config = new DockLayoutConfiguration(tree);
            const result = config.validate();
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Unknown') || e.includes('weird'))).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // TabGroupNode panels with null (exercises null panels branch in _validateTree)
    // _validateTree handles null panels gracefully, but _collectPanelIds will throw.
    // ─────────────────────────────────────────────────────────────────────────
    describe('validate – TabGroupNode with null panels', () => {
        test('throws or reports error when tabgroup has null panels (crashes in collectPanelIds)', () => {
            const tree = createSplitNode('vertical', 0.75,
                createPanelNode(PANEL_IDS.MAP),
                createSplitNode('horizontal', 0.5,
                    { type: 'tabgroup', panels: null, activeIndex: 0 }, // null panels
                    createSplitNode('horizontal', 0.5,
                        createPanelNode(PANEL_IDS.LAYERS),
                        createPanelNode(PANEL_IDS.DECORATION_LIST)
                    )
                )
            );
            const config = new DockLayoutConfiguration(tree);
            // _validateTree handles null panels, but _collectPanelIds throws on null spread
            expect(() => config.validate()).toThrow();
        });
    });
});
