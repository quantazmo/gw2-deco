// @ts-nocheck
/**
 * Unit tests for ReorderPanelHandler
 * Tests:
 *   - Reorder tabs within TabGroupNode panels array
 *   - activeIndex follows the active panel after reorder
 *   - No-op when fromIndex equals toIndex (tabs)
 *   - Reorder stacked panels (swap first/second in a SplitNode)
 *   - No-op when fromIndex equals toIndex (stack)
 *   - Invalid inputs are rejected
 */
import { ReorderPanelHandler } from '../../src/application/handlers/ReorderPanelHandler.js';
import { ReorderPanelCommand } from '../../src/application/commands/ReorderPanelCommand.js';
import { DockPanelLayoutStore } from '../../src/ui/stores/DockPanelLayoutStore.js';
import {
    DockLayoutConfiguration,
    createPanelNode,
    createSplitNode,
    createTabGroupNode,
} from '../../src/domain/DockLayoutConfiguration.js';
import { PANEL_IDS } from '../../src/config/constants.js';

// Helper: find first node in tree matching predicate (skips split internals)
function _findNode(tree, predicate) {
    if (!tree) return null;
    if (predicate(tree)) return tree;
    if (tree.type === 'split') {
        return _findNode(tree.first, predicate) || _findNode(tree.second, predicate);
    }
    return null;
}

describe('ReorderPanelHandler', () => {
    let layoutStore;
    let handler;

    beforeEach(() => {
        layoutStore = new DockPanelLayoutStore();
        handler = new ReorderPanelHandler(layoutStore);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Tab reordering
    // ─────────────────────────────────────────────────────────────────────────

    describe('tab reordering', () => {
        beforeEach(() => {
            // TabGroup(MAP[0], LAYERS[1], DECORATION_LIST[2]) at root, activeIndex=0
            const tree = createTabGroupNode(
                [PANEL_IDS.MAP, PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST],
                0
            );
            layoutStore.setState(new DockLayoutConfiguration(tree));
        });

        test('moves tab from index 0 to index 2', () => {
            handler.handle(new ReorderPanelCommand('tab', [], 0, 2));

            const tabGroup = _findNode(layoutStore.getState().tree, n => n.type === 'tabgroup');
            expect(tabGroup.panels).toEqual([
                PANEL_IDS.LAYERS,
                PANEL_IDS.DECORATION_LIST,
                PANEL_IDS.MAP,
            ]);
        });

        test('moves tab from index 2 to index 0', () => {
            handler.handle(new ReorderPanelCommand('tab', [], 2, 0));

            const tabGroup = _findNode(layoutStore.getState().tree, n => n.type === 'tabgroup');
            expect(tabGroup.panels).toEqual([
                PANEL_IDS.DECORATION_LIST,
                PANEL_IDS.MAP,
                PANEL_IDS.LAYERS,
            ]);
        });

        test('moves middle tab to first position', () => {
            handler.handle(new ReorderPanelCommand('tab', [], 1, 0));

            const tabGroup = _findNode(layoutStore.getState().tree, n => n.type === 'tabgroup');
            expect(tabGroup.panels).toEqual([
                PANEL_IDS.LAYERS,
                PANEL_IDS.MAP,
                PANEL_IDS.DECORATION_LIST,
            ]);
        });

        test('activeIndex follows the active panel when it is moved', () => {
            // Set LAYERS (index 1) as active
            const tree = createTabGroupNode(
                [PANEL_IDS.MAP, PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST],
                1
            );
            layoutStore.setState(new DockLayoutConfiguration(tree));

            // Move LAYERS from index 1 to index 2
            handler.handle(new ReorderPanelCommand('tab', [], 1, 2));

            const tabGroup = _findNode(layoutStore.getState().tree, n => n.type === 'tabgroup');
            const newLayersIdx = tabGroup.panels.indexOf(PANEL_IDS.LAYERS);
            expect(tabGroup.activeIndex).toBe(newLayersIdx);
        });

        test('activeIndex follows the active panel when a non-active panel moves past it', () => {
            // Set DECORATION_LIST (index 2) as active, move MAP (index 0) to index 2
            const tree = createTabGroupNode(
                [PANEL_IDS.MAP, PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST],
                2
            );
            layoutStore.setState(new DockLayoutConfiguration(tree));

            handler.handle(new ReorderPanelCommand('tab', [], 0, 2));

            const tabGroup = _findNode(layoutStore.getState().tree, n => n.type === 'tabgroup');
            const newDecoIdx = tabGroup.panels.indexOf(PANEL_IDS.DECORATION_LIST);
            expect(tabGroup.activeIndex).toBe(newDecoIdx);
        });

        test('no-op when fromIndex equals toIndex — panels array unchanged', () => {
            const before = [...layoutStore.getState().tree.panels];
            handler.handle(new ReorderPanelCommand('tab', [], 1, 1));
            const tabGroup = _findNode(layoutStore.getState().tree, n => n.type === 'tabgroup');
            expect(tabGroup.panels).toEqual(before);
        });

        test('no-op does not trigger a store notification', () => {
            const listener = vi.fn();
            layoutStore.subscribe(listener);
            handler.handle(new ReorderPanelCommand('tab', [], 1, 1));
            expect(listener).toHaveBeenCalledTimes(0);
        });

        test('successful reorder triggers exactly one store notification', () => {
            const listener = vi.fn();
            layoutStore.subscribe(listener);
            handler.handle(new ReorderPanelCommand('tab', [], 0, 2));
            expect(listener).toHaveBeenCalledTimes(1);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Stack (SplitNode) reordering
    // ─────────────────────────────────────────────────────────────────────────

    describe('stack reordering', () => {
        beforeEach(() => {
            // SplitV(MAP, SplitH(LAYERS, DECORATION_LIST))
            const tree = createSplitNode('vertical', 0.6,
                createPanelNode(PANEL_IDS.MAP),
                createSplitNode('horizontal', 0.5,
                    createPanelNode(PANEL_IDS.LAYERS),
                    createPanelNode(PANEL_IDS.DECORATION_LIST)
                )
            );
            layoutStore.setState(new DockLayoutConfiguration(tree));
        });

        test('swaps first and second panel in a SplitNode (fromIndex=0, toIndex=1)', () => {
            // Path ['second'] → SplitH(LAYERS, DECORATION_LIST)
            handler.handle(new ReorderPanelCommand('stack', ['second'], 0, 1));

            const result = layoutStore.getState().tree;
            const splitNode = result.second;
            expect(splitNode.first.panelId).toBe(PANEL_IDS.DECORATION_LIST);
            expect(splitNode.second.panelId).toBe(PANEL_IDS.LAYERS);
        });

        test('swaps panels when fromIndex=1 and toIndex=0 (same swap direction)', () => {
            handler.handle(new ReorderPanelCommand('stack', ['second'], 1, 0));

            const result = layoutStore.getState().tree;
            const splitNode = result.second;
            expect(splitNode.first.panelId).toBe(PANEL_IDS.DECORATION_LIST);
            expect(splitNode.second.panelId).toBe(PANEL_IDS.LAYERS);
        });

        test('ratio is flipped to 1 - original when panels are swapped', () => {
            // Build a tree where the target SplitNode has a non-symmetric ratio
            const tree = createSplitNode('vertical', 0.6,
                createPanelNode(PANEL_IDS.MAP),
                createSplitNode('horizontal', 0.3,
                    createPanelNode(PANEL_IDS.LAYERS),
                    createPanelNode(PANEL_IDS.DECORATION_LIST)
                )
            );
            layoutStore.setState(new DockLayoutConfiguration(tree));

            // Path ['second'] → SplitH(0.3, LAYERS, DECORATION_LIST)
            handler.handle(new ReorderPanelCommand('stack', ['second'], 0, 1));

            const result = layoutStore.getState().tree;
            // ratio should flip: 1 - 0.3 = 0.7
            expect(result.second.ratio).toBeCloseTo(0.7);
            // first and second should be swapped
            expect(result.second.first.type).toBe('panel');     // formerly second child
            expect(result.second.first.panelId).toBe(PANEL_IDS.DECORATION_LIST);
            expect(result.second.second.panelId).toBe(PANEL_IDS.LAYERS); // formerly first child
        });

        test('no-op when fromIndex equals toIndex — tree unchanged', () => {
            handler.handle(new ReorderPanelCommand('stack', ['second'], 0, 0));

            const result = layoutStore.getState().tree;
            const splitNode = result.second;
            expect(splitNode.first.panelId).toBe(PANEL_IDS.LAYERS);
            expect(splitNode.second.panelId).toBe(PANEL_IDS.DECORATION_LIST);
        });

        test('no-op does not trigger a store notification', () => {
            const listener = vi.fn();
            layoutStore.subscribe(listener);
            handler.handle(new ReorderPanelCommand('stack', ['second'], 0, 0));
            expect(listener).toHaveBeenCalledTimes(0);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Error handling
    // ─────────────────────────────────────────────────────────────────────────

    test('throws for unknown type', () => {
        expect(() =>
            handler.handle(new ReorderPanelCommand('unknown', ['second'], 0, 1))
        ).toThrow(/unknown type/i);
    });

    test('throws when nodePath points to a non-tabgroup node for type=tab', () => {
        // ['first'] is the MAP PanelNode, not a tabgroup
        expect(() =>
            handler.handle(new ReorderPanelCommand('tab', ['first'], 0, 1))
        ).toThrow(/tabgroup/i);
    });

    test('throws when nodePath points to a non-split node for type=stack', () => {
        // A tree where ['second', 'first'] is a plain PanelNode
        const tree = createSplitNode('vertical', 0.6,
            createPanelNode(PANEL_IDS.MAP),
            createSplitNode('horizontal', 0.5,
                createPanelNode(PANEL_IDS.LAYERS),
                createPanelNode(PANEL_IDS.DECORATION_LIST)
            )
        );
        layoutStore.setState(new DockLayoutConfiguration(tree));

        // ['second', 'first'] points to LAYERS (PanelNode), not a SplitNode
        expect(() =>
            handler.handle(new ReorderPanelCommand('stack', ['second', 'first'], 0, 1))
        ).toThrow(/split/i);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // execute() delegates to handle() (line 97)
    // ─────────────────────────────────────────────────────────────────────────

    test('execute() delegates to handle() and returns a LayoutConfiguration', () => {
        const tree = createSplitNode('vertical', 0.7,
            createPanelNode(PANEL_IDS.MAP),
            createTabGroupNode([PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST], 0)
        );
        layoutStore.setState(new DockLayoutConfiguration(tree));
        const result = handler.execute(new ReorderPanelCommand('tab', ['second'], 0, 1));
        expect(result).toBeInstanceOf(DockLayoutConfiguration);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // getNodeAtPath null node (line 34)
    // ─────────────────────────────────────────────────────────────────────────

    test('throws when path traversal hits a null/undefined node (line 34)', () => {
        // tree.first = MAP PanelNode (has no .second), so path ['first','second','x']
        // leads to: MAP → undefined (via .second) → throws null node on key 'x'
        expect(() =>
            handler.handle(new ReorderPanelCommand('tab', ['first', 'second', 'x'], 0, 1))
        ).toThrow(/null node/i);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Validation failure throws (line 165)
    // ─────────────────────────────────────────────────────────────────────────

    test('throws when resulting layout fails validation (line 165)', () => {
        const tree = createSplitNode('vertical', 0.7,
            createPanelNode(PANEL_IDS.MAP),
            createTabGroupNode([PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST], 0)
        );
        layoutStore.setState(new DockLayoutConfiguration(tree));
        const spy = vi.spyOn(DockLayoutConfiguration.prototype, 'validate')
            .mockReturnValue({ valid: false, errors: ['mock error'] });
        try {
            expect(() => handler.handle(new ReorderPanelCommand('tab', ['second'], 0, 1)))
                .toThrow('invalid layout after reorder');
        } finally {
            spy.mockRestore();
        }
    });
});
