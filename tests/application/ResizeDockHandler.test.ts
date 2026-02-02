// @ts-nocheck
/**
 * Unit tests for ResizeDockHandler
 * Tests:
 *   - Updates SplitNode ratio by navigating the path in the layout tree
 *   - Clamps newRatio to SPLIT_RATIO_MIN when below minimum
 *   - Clamps newRatio to SPLIT_RATIO_MAX when above maximum
 *   - Enforces map ≥ MAP_MIN_RATIO when map panel is in the first child
 *   - Enforces map ≥ MAP_MIN_RATIO when map panel is in the second child (max ratio = 1 - MAP_MIN_RATIO)
 *   - No map constraint applied when map is not in this split
 *   - Throws error for an invalid/non-existent path
 *   - Throws error for a path pointing to a non-SplitNode
 *   - Publishes the updated layout to LayoutStore
 *   - Returns the updated LayoutConfiguration
 */
import { ResizeDockHandler } from '../../src/application/handlers/ResizeDockHandler.js';
import { ResizeDockCommand } from '../../src/application/commands/ResizeDockCommand.js';
import { DockPanelLayoutStore } from '../../src/ui/stores/DockPanelLayoutStore.js';
import {
    DockLayoutConfiguration,
    createPanelNode,
    createSplitNode,
} from '../../src/domain/DockLayoutConfiguration.js';
import { PANEL_IDS, LAYOUT } from '../../src/config/constants.js';

// Helper: build a layout from a given tree
function makeLayout(tree) {
    return new DockLayoutConfiguration(tree, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Default layout structure (from LayoutConfiguration.createDefault):
//   root: split(vertical, 0.8125, map, inner)
//   inner (path=['second']): split(horizontal, 0.35, layers, decorationList)
// ─────────────────────────────────────────────────────────────────────────────

describe('ResizeDockHandler', () => {
    let layoutStore;
    let handler;

    beforeEach(() => {
        layoutStore = new DockPanelLayoutStore();
        handler = new ResizeDockHandler(layoutStore);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Basic ratio updates via path navigation
    // ─────────────────────────────────────────────────────────────────────────

    test('updates root SplitNode ratio (path=[]) when within valid bounds', () => {
        const command = new ResizeDockCommand([], 0.7);
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        expect(tree.ratio).toBeCloseTo(0.7);
    });

    test('updates nested SplitNode at path [\'second\'] without affecting root ratio', () => {
        const command = new ResizeDockCommand(['second'], 0.5);
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        // Root ratio unchanged
        expect(tree.ratio).toBeCloseTo(0.8125);
        // Nested node ratio updated
        expect(tree.second.ratio).toBeCloseTo(0.5);
    });

    test('updates SplitNode at path [\'second\'] on a custom tree', () => {
        // Set up a custom tree with first child as panel and second as split
        const tree = createSplitNode('vertical', 0.5,
            createPanelNode(PANEL_IDS.DECORATION_LIST),
            createSplitNode('horizontal', 0.4,
                createPanelNode(PANEL_IDS.MAP),
                createPanelNode(PANEL_IDS.LAYERS)
            )
        );
        layoutStore.setState(makeLayout(tree));
        const command = new ResizeDockCommand(['second'], 0.6);
        handler.handle(command);

        const result = layoutStore.getState().tree;
        expect(result.second.ratio).toBeCloseTo(0.6);
    });

    test('publishes updated layout to LayoutStore', () => {
        const subscriber = vi.fn();
        layoutStore.subscribe(subscriber);

        const command = new ResizeDockCommand(['second'], 0.4);
        handler.handle(command);

        expect(subscriber).toHaveBeenCalledTimes(1);
    });

    test('returns the updated LayoutConfiguration', () => {
        const command = new ResizeDockCommand(['second'], 0.4);
        const result = handler.handle(command);

        expect(result).toBeInstanceOf(DockLayoutConfiguration);
        expect(result.tree.second.ratio).toBeCloseTo(0.4);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Ratio clamping — SPLIT_RATIO_MIN / SPLIT_RATIO_MAX
    // ─────────────────────────────────────────────────────────────────────────

    test('clamps ratio to SPLIT_RATIO_MIN when newRatio is below minimum', () => {
        // Use a nested split without the map so only SPLIT_RATIO_MIN applies
        const command = new ResizeDockCommand(['second'], 0.05);
        handler.handle(command);

        const ratio = layoutStore.getState().tree.second.ratio;
        expect(ratio).toBeCloseTo(LAYOUT.SPLIT_RATIO_MIN);
    });

    test('clamps ratio to SPLIT_RATIO_MAX when newRatio is above maximum', () => {
        // Use a nested split without the map so only SPLIT_RATIO_MAX applies
        const command = new ResizeDockCommand(['second'], 0.99);
        handler.handle(command);

        const ratio = layoutStore.getState().tree.second.ratio;
        expect(ratio).toBeCloseTo(LAYOUT.SPLIT_RATIO_MAX);
    });

    test('accepts exact SPLIT_RATIO_MIN boundary (inclusive)', () => {
        const command = new ResizeDockCommand(['second'], LAYOUT.SPLIT_RATIO_MIN);
        handler.handle(command);

        const ratio = layoutStore.getState().tree.second.ratio;
        expect(ratio).toBeCloseTo(LAYOUT.SPLIT_RATIO_MIN);
    });

    test('accepts exact SPLIT_RATIO_MAX boundary (inclusive)', () => {
        const command = new ResizeDockCommand(['second'], LAYOUT.SPLIT_RATIO_MAX);
        handler.handle(command);

        const ratio = layoutStore.getState().tree.second.ratio;
        expect(ratio).toBeCloseTo(LAYOUT.SPLIT_RATIO_MAX);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Map minimum constraint — map in first child
    // ─────────────────────────────────────────────────────────────────────────
    //
    // Default layout root: map is in first child (ratio=0.8125).
    // MAP_MIN_RATIO = 0.5 — map-side must get ≥ 50% of this split.

    test('enforces MAP_MIN_RATIO when map is in first child and newRatio is below min', () => {
        // Root split: map is first child → ratio must be ≥ MAP_MIN_RATIO (0.5)
        const command = new ResizeDockCommand([], 0.3);
        handler.handle(command);

        const ratio = layoutStore.getState().tree.ratio;
        expect(ratio).toBeCloseTo(LAYOUT.MAP_MIN_RATIO);
    });

    test('does not clamp when map-in-first ratio is at exactly MAP_MIN_RATIO', () => {
        const command = new ResizeDockCommand([], LAYOUT.MAP_MIN_RATIO);
        handler.handle(command);

        const ratio = layoutStore.getState().tree.ratio;
        expect(ratio).toBeCloseTo(LAYOUT.MAP_MIN_RATIO);
    });

    test('does not clamp when map-in-first ratio is above MAP_MIN_RATIO', () => {
        const command = new ResizeDockCommand([], 0.75);
        handler.handle(command);

        const ratio = layoutStore.getState().tree.ratio;
        expect(ratio).toBeCloseTo(0.75);
    });

    test('still enforces SPLIT_RATIO_MAX even when map is in first child', () => {
        const command = new ResizeDockCommand([], 0.99);
        handler.handle(command);

        const ratio = layoutStore.getState().tree.ratio;
        expect(ratio).toBeCloseTo(LAYOUT.SPLIT_RATIO_MAX);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Map minimum constraint — map in second child
    // ─────────────────────────────────────────────────────────────────────────

    test('enforces 1-MAP_MIN_RATIO as max-ratio when map is in second child', () => {
        // Create a custom layout: panels | map at root (map in second)
        const customTree = createSplitNode('vertical', 0.5,
            createSplitNode('horizontal', 0.5,
                createPanelNode(PANEL_IDS.LAYERS),
                createPanelNode(PANEL_IDS.DECORATION_LIST)
            ),
            createPanelNode(PANEL_IDS.MAP)
        );
        layoutStore.setState(makeLayout(customTree));

        // Try to give 0.7 to the panels side (leaving only 0.3 for map side)
        const command = new ResizeDockCommand([], 0.7);
        handler.handle(command);

        const ratio = layoutStore.getState().tree.ratio;
        // Map is in second → second must get ≥ MAP_MIN_RATIO → ratio ≤ 1 - MAP_MIN_RATIO = 0.5
        expect(ratio).toBeCloseTo(1 - LAYOUT.MAP_MIN_RATIO);
    });

    test('does not clamp when map-in-second ratio keeps second side ≥ MAP_MIN_RATIO', () => {
        const customTree = createSplitNode('vertical', 0.5,
            createSplitNode('horizontal', 0.5,
                createPanelNode(PANEL_IDS.LAYERS),
                createPanelNode(PANEL_IDS.DECORATION_LIST)
            ),
            createPanelNode(PANEL_IDS.MAP)
        );
        layoutStore.setState(makeLayout(customTree));

        // 0.4 → second gets 0.6 ≥ MAP_MIN_RATIO → valid, no clamping
        const command = new ResizeDockCommand([], 0.4);
        handler.handle(command);

        const ratio = layoutStore.getState().tree.ratio;
        expect(ratio).toBeCloseTo(0.4);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // No map constraint for splits that don't contain the map
    // ─────────────────────────────────────────────────────────────────────────

    test('no map constraint when neither child contains the map panel', () => {
        // path=['second'] is the inner split: layers | decorationList
        // No map panel is in this split, so only SPLIT_RATIO_MIN/MAX apply
        const command = new ResizeDockCommand(['second'], 0.2);
        handler.handle(command);

        const ratio = layoutStore.getState().tree.second.ratio;
        // MAP_MIN_RATIO (0.5) does NOT apply — only SPLIT_RATIO_MIN (0.1) does
        expect(ratio).toBeCloseTo(0.2);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Error cases
    // ─────────────────────────────────────────────────────────────────────────

    test('throws error when path points to a non-existent node', () => {
        const command = new ResizeDockCommand(['first', 'second'], 0.5);
        // default layout: tree.first is a PanelNode (map), not a split, so 'second' doesn't exist
        expect(() => handler.handle(command)).toThrow();
    });

    test('throws error when path points to a PanelNode (not a SplitNode)', () => {
        // path=['first'] → tree.first is the map PanelNode
        const command = new ResizeDockCommand(['first'], 0.5);
        expect(() => handler.handle(command)).toThrow();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // execute() delegates to handle()
    // ─────────────────────────────────────────────────────────────────────────

    test('execute() delegates to handle() and returns the same result', () => {
        const command = new ResizeDockCommand(['second'], 0.5);
        const fromExecute = handler.execute(command);

        expect(fromExecute).toBeInstanceOf(DockLayoutConfiguration);
        expect(fromExecute.tree.second.ratio).toBeCloseTo(0.5);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // updateNodeAtPath 'first' branch (line 57)
    // ─────────────────────────────────────────────────────────────────────────

    test('updates SplitNode at path [first] when first child is a split (line 57)', () => {
        // Build layout where first child IS a SplitNode
        const tree = createSplitNode('vertical', 0.5,
            createSplitNode('horizontal', 0.5,
                createPanelNode(PANEL_IDS.LAYERS),
                createPanelNode(PANEL_IDS.DECORATION_LIST)
            ),
            createPanelNode(PANEL_IDS.MAP)
        );
        layoutStore.setState(makeLayout(tree));

        const command = new ResizeDockCommand(['first'], 0.3);
        handler.handle(command);

        const result = layoutStore.getState().tree;
        expect(result.first.ratio).toBeCloseTo(0.3);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Validation failure throws (line 141)
    // ─────────────────────────────────────────────────────────────────────────

    test('throws when resulting layout fails validation (line 141)', () => {
        const spy = vi.spyOn(DockLayoutConfiguration.prototype, 'validate')
            .mockReturnValue({ valid: false, errors: ['mock error'] });
        try {
            expect(() => handler.handle(new ResizeDockCommand([], 0.5)))
                .toThrow('resulting layout is invalid');
        } finally {
            spy.mockRestore();
        }
    });
});
