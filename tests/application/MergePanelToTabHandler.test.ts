// @ts-nocheck
/**
 * Unit tests for MergePanelToTabHandler
 * Tests:
 *   - Create TabGroupNode from two PanelNodes
 *   - Add a panel to an existing TabGroupNode
 *   - activeIndex set to the newly added panel
 *   - TabGroupNode reverts to PanelNode when only one panel remains
 *   - Invalid inputs are rejected
 */
import { MergePanelToTabHandler } from '../../src/application/handlers/MergePanelToTabHandler.js';
import { MergePanelToTabCommand } from '../../src/application/commands/MergePanelToTabCommand.js';
import { DockPanelLayoutStore } from '../../src/ui/stores/DockPanelLayoutStore.js';
import {
    DockLayoutConfiguration,
    createPanelNode,
    createSplitNode,
    createTabGroupNode,
    removeNode,
} from '../../src/domain/DockLayoutConfiguration.js';
import { PANEL_IDS } from '../../src/config/constants.js';

describe('MergePanelToTabHandler', () => {
    let layoutStore;
    let handler;

    beforeEach(() => {
        layoutStore = new DockPanelLayoutStore();
        handler = new MergePanelToTabHandler(layoutStore);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Merging two PanelNodes into a TabGroupNode
    // ─────────────────────────────────────────────────────────────────────────

    test('merging two PanelNodes creates a TabGroupNode with both panels', () => {
        const command = new MergePanelToTabCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST);
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        // Find the tabgroup node in the tree
        const tabGroup = _findNode(tree, n => n.type === 'tabgroup');
        expect(tabGroup).not.toBeNull();
        expect(tabGroup.panels).toContain(PANEL_IDS.DECORATION_LIST);
        expect(tabGroup.panels).toContain(PANEL_IDS.LAYERS);
    });

    test('merging two PanelNodes sets activeIndex to the newly added (dragged) panel index', () => {
        const command = new MergePanelToTabCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST);
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        const tabGroup = _findNode(tree, n => n.type === 'tabgroup');
        // The dragged panel (LAYERS) should be the active tab
        // decorationList is target (existing), layers is dragged (appended → index 1)
        expect(tabGroup.activeIndex).toBe(tabGroup.panels.indexOf(PANEL_IDS.LAYERS));
    });

    test('merging creates a TabGroupNode with exactly 2 panels', () => {
        const command = new MergePanelToTabCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST);
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        const tabGroup = _findNode(tree, n => n.type === 'tabgroup');
        expect(tabGroup.panels).toHaveLength(2);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Adding a panel to an existing TabGroupNode
    // ─────────────────────────────────────────────────────────────────────────

    test('dragging panel onto existing TabGroupNode appends to the group', () => {
        // Pre-arrange: create a layout with an existing tab group
        const tree = createSplitNode('horizontal', 0.5,
            createTabGroupNode([PANEL_IDS.DECORATION_LIST, PANEL_IDS.LAYERS], 0),
            createPanelNode(PANEL_IDS.MAP)
        );
        layoutStore.setState(new DockLayoutConfiguration(tree));

        // Drag MAP onto the existing tab group (targeting DECORATION_LIST which is in the group)
        const command = new MergePanelToTabCommand(PANEL_IDS.MAP, PANEL_IDS.DECORATION_LIST);
        handler.handle(command);

        const result = layoutStore.getState().tree;
        const tabGroup = _findNode(result, n => n.type === 'tabgroup');
        expect(tabGroup).not.toBeNull();
        expect(tabGroup.panels).toHaveLength(3);
        expect(tabGroup.panels).toContain(PANEL_IDS.MAP);
        expect(tabGroup.panels).toContain(PANEL_IDS.DECORATION_LIST);
        expect(tabGroup.panels).toContain(PANEL_IDS.LAYERS);
    });

    test('adding panel to existing TabGroupNode sets activeIndex to newly added panel', () => {
        const tree = createSplitNode('horizontal', 0.5,
            createTabGroupNode([PANEL_IDS.DECORATION_LIST, PANEL_IDS.LAYERS], 0),
            createPanelNode(PANEL_IDS.MAP)
        );
        layoutStore.setState(new DockLayoutConfiguration(tree));

        const command = new MergePanelToTabCommand(PANEL_IDS.MAP, PANEL_IDS.DECORATION_LIST);
        handler.handle(command);

        const result = layoutStore.getState().tree;
        const tabGroup = _findNode(result, n => n.type === 'tabgroup');
        expect(tabGroup.activeIndex).toBe(tabGroup.panels.indexOf(PANEL_IDS.MAP));
    });

    // ─────────────────────────────────────────────────────────────────────────
    // TabGroupNode reverts to PanelNode when only one panel remains
    // This is tested via the underlying removeNode logic (used by DockPanelHandler),
    // but we verify it works via a layout scenario triggered by subsequent commands.
    // ─────────────────────────────────────────────────────────────────────────

    test('a TabGroupNode with 2 panels collapses to PanelNode when one is removed via removeNode', () => {
        // Build a layout with a 2-panel tab group
        const tree = createSplitNode('vertical', 0.75,
            createPanelNode(PANEL_IDS.MAP),
            createTabGroupNode([PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST])
        );
        const layout = new DockLayoutConfiguration(tree);
        const newTree = removeNode(layout.tree, PANEL_IDS.LAYERS);

        const result = _findNode(newTree, n => n.type === 'tabgroup');
        expect(result).toBeNull(); // Collapsed to PanelNode

        const panelNode = _findNode(newTree, n => n.type === 'panel' && n.panelId === PANEL_IDS.DECORATION_LIST);
        expect(panelNode).not.toBeNull();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Error cases
    // ─────────────────────────────────────────────────────────────────────────

    test('throws when draggedPanelId equals targetPanelId', () => {
        const command = new MergePanelToTabCommand(PANEL_IDS.LAYERS, PANEL_IDS.LAYERS);
        expect(() => handler.handle(command)).toThrow();
    });

    test('throws when targetPanelId is not found in the tree', () => {
        const command = new MergePanelToTabCommand(PANEL_IDS.LAYERS, 'nonexistent-panel');
        expect(() => handler.handle(command)).toThrow();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Layout store update
    // ─────────────────────────────────────────────────────────────────────────

    test('updates LayoutStore with valid new layout', () => {
        const listener = vi.fn();
        layoutStore.subscribe(listener);

        const command = new MergePanelToTabCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST);
        handler.handle(command);

        expect(listener).toHaveBeenCalledTimes(1);
        const newLayout = listener.mock.calls[0][0];
        expect(newLayout.validate().valid).toBe(true);
    });

    test('resulting layout passes validation', () => {
        const command = new MergePanelToTabCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST);
        handler.handle(command);

        const layout = layoutStore.getState();
        expect(layout.validate().valid).toBe(true);
    });

    test('all four panels still present in the tree after merge', () => {
        const command = new MergePanelToTabCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST);
        handler.handle(command);

        const layout = layoutStore.getState();
        const errors = layout.validate().errors;
        // No "missing required panel" errors
        const missingErrors = errors.filter(e => e.startsWith('Missing required panel'));
        expect(missingErrors).toHaveLength(0);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // execute() delegates to handle() (line 34)
    // ─────────────────────────────────────────────────────────────────────────

    test('execute() delegates to handle() and returns a LayoutConfiguration', () => {
        const result = handler.execute(new MergePanelToTabCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST));
        expect(result).toBeInstanceOf(DockLayoutConfiguration);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Validation failure throws (line 98)
    // ─────────────────────────────────────────────────────────────────────────

    test('throws when resulting layout fails validation (line 98)', () => {
        const spy = vi.spyOn(DockLayoutConfiguration.prototype, 'validate')
            .mockReturnValue({ valid: false, errors: ['mock error'] });
        try {
            expect(() => handler.handle(new MergePanelToTabCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST)))
                .toThrow('invalid layout after merge');
        } finally {
            spy.mockRestore();
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test helper
// ─────────────────────────────────────────────────────────────────────────────

function _findNode(tree, predicate) {
    if (!tree) return null;
    if (predicate(tree)) return tree;
    if (tree.type === 'split') {
        return _findNode(tree.first, predicate) || _findNode(tree.second, predicate);
    }
    if (tree.type === 'tabgroup') return null; // tab groups have no sub-nodes
    return null;
}
