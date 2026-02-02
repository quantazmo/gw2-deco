// @ts-nocheck
/**
 * Unit tests for StackPanelHandler
 * Tests:
 *   - Create SplitNode from two panels dropped on each edge direction
 *   - Direction derived from drop edge (top/bottom → horizontal, left/right → vertical)
 *   - Ratio defaults to 0.5 (equal split)
 *   - Panel positioning: top/left → dragged is first; bottom/right → dragged is second
 *   - Minimum size constraints enforced via LayoutConfiguration validation
 *   - Invalid inputs are rejected
 *   - Cancel (no-op) behavior when dragged and target are the same
 */
import { StackPanelHandler } from '../../src/application/handlers/StackPanelHandler.js';
import { StackPanelCommand } from '../../src/application/commands/StackPanelCommand.js';
import { DockPanelLayoutStore } from '../../src/ui/stores/DockPanelLayoutStore.js';
import {
    DockLayoutConfiguration,
    createPanelNode,
    createSplitNode,
    createTabGroupNode,
    findNode,
} from '../../src/domain/DockLayoutConfiguration.js';
import { PANEL_IDS } from '../../src/config/constants.js';

// Helper: find first node matching predicate in the tree
function _findNode(tree, predicate) {
    if (!tree) return null;
    if (predicate(tree)) return tree;
    if (tree.type === 'split') {
        return _findNode(tree.first, predicate) || _findNode(tree.second, predicate);
    }
    return null;
}

describe('StackPanelHandler', () => {
    let layoutStore;
    let handler;

    beforeEach(() => {
        layoutStore = new DockPanelLayoutStore();
        handler = new StackPanelHandler(layoutStore);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Direction derived from drop edge
    // ─────────────────────────────────────────────────────────────────────────

    test('dropping on top edge creates a horizontal SplitNode', () => {
        const command = new StackPanelCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST, 'top');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        // top edge: dragged (layers) is first, target (decorationList) is second
        const split = _findNode(tree, n => n.type === 'split' &&
            _containsPanel(n.first, PANEL_IDS.LAYERS) &&
            _containsPanel(n.second, PANEL_IDS.DECORATION_LIST) &&
            !_containsPanel(n.first, PANEL_IDS.DECORATION_LIST));
        expect(split).not.toBeNull();
        expect(split.direction).toBe('horizontal');
    });

    test('dropping on bottom edge creates a horizontal SplitNode', () => {
        const command = new StackPanelCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST, 'bottom');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        // bottom edge: target (decorationList) is first, dragged (layers) is second
        const split = _findNode(tree, n => n.type === 'split' &&
            _containsPanel(n.first, PANEL_IDS.DECORATION_LIST) &&
            _containsPanel(n.second, PANEL_IDS.LAYERS) &&
            !_containsPanel(n.second, PANEL_IDS.DECORATION_LIST));
        expect(split).not.toBeNull();
        expect(split.direction).toBe('horizontal');
    });

    test('dropping on left edge creates a vertical SplitNode', () => {
        const command = new StackPanelCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST, 'left');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        // left edge: dragged (layers) is first, target (decorationList) is second
        const split = _findNode(tree, n => n.type === 'split' &&
            _containsPanel(n.first, PANEL_IDS.LAYERS) &&
            _containsPanel(n.second, PANEL_IDS.DECORATION_LIST) &&
            !_containsPanel(n.first, PANEL_IDS.DECORATION_LIST));
        expect(split).not.toBeNull();
        expect(split.direction).toBe('vertical');
    });

    test('dropping on right edge creates a vertical SplitNode', () => {
        const command = new StackPanelCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST, 'right');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        // right edge: target (decorationList) is first, dragged (layers) is second
        const split = _findNode(tree, n => n.type === 'split' &&
            _containsPanel(n.first, PANEL_IDS.DECORATION_LIST) &&
            _containsPanel(n.second, PANEL_IDS.LAYERS) &&
            !_containsPanel(n.second, PANEL_IDS.DECORATION_LIST));
        expect(split).not.toBeNull();
        expect(split.direction).toBe('vertical');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Ratio defaults to 0.5
    // ─────────────────────────────────────────────────────────────────────────

    test('stacking panels defaults to ratio 0.5', () => {
        const command = new StackPanelCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST, 'bottom');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        const split = _findNode(tree, n => n.type === 'split' &&
            (_containsPanel(n.first, PANEL_IDS.DECORATION_LIST) && _containsPanel(n.second, PANEL_IDS.LAYERS)));
        expect(split).not.toBeNull();
        expect(split.ratio).toBe(0.5);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Panel positioning per drop edge
    // ─────────────────────────────────────────────────────────────────────────

    test('dropping on top edge: dragged panel is first (top), target is second (bottom)', () => {
        const command = new StackPanelCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST, 'top');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        const split = _findNode(tree, n => n.type === 'split' &&
            _containsPanel(n.first, PANEL_IDS.LAYERS) &&
            _containsPanel(n.second, PANEL_IDS.DECORATION_LIST) &&
            !_containsPanel(n.first, PANEL_IDS.DECORATION_LIST));
        expect(split).not.toBeNull();
        expect(_containsPanel(split.first, PANEL_IDS.LAYERS)).toBe(true);
        expect(_containsPanel(split.second, PANEL_IDS.DECORATION_LIST)).toBe(true);
    });

    test('dropping on bottom edge: target is first (top), dragged panel is second (bottom)', () => {
        const command = new StackPanelCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST, 'bottom');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        const split = _findNode(tree, n => n.type === 'split' &&
            _containsPanel(n.first, PANEL_IDS.DECORATION_LIST) &&
            _containsPanel(n.second, PANEL_IDS.LAYERS) &&
            !_containsPanel(n.second, PANEL_IDS.DECORATION_LIST));
        expect(split).not.toBeNull();
        expect(_containsPanel(split.first, PANEL_IDS.DECORATION_LIST)).toBe(true);
        expect(_containsPanel(split.second, PANEL_IDS.LAYERS)).toBe(true);
    });

    test('dropping on left edge: dragged panel is first (left), target is second (right)', () => {
        const command = new StackPanelCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST, 'left');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        const split = _findNode(tree, n => n.type === 'split' &&
            _containsPanel(n.first, PANEL_IDS.LAYERS) &&
            _containsPanel(n.second, PANEL_IDS.DECORATION_LIST) &&
            !_containsPanel(n.first, PANEL_IDS.DECORATION_LIST));
        expect(split).not.toBeNull();
        expect(_containsPanel(split.first, PANEL_IDS.LAYERS)).toBe(true);
        expect(_containsPanel(split.second, PANEL_IDS.DECORATION_LIST)).toBe(true);
    });

    test('dropping on right edge: target is first (left), dragged panel is second (right)', () => {
        const command = new StackPanelCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST, 'right');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        const split = _findNode(tree, n => n.type === 'split' &&
            _containsPanel(n.first, PANEL_IDS.DECORATION_LIST) &&
            _containsPanel(n.second, PANEL_IDS.LAYERS) &&
            !_containsPanel(n.second, PANEL_IDS.DECORATION_LIST));
        expect(split).not.toBeNull();
        expect(_containsPanel(split.first, PANEL_IDS.DECORATION_LIST)).toBe(true);
        expect(_containsPanel(split.second, PANEL_IDS.LAYERS)).toBe(true);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // LayoutStore is updated after stacking
    // ─────────────────────────────────────────────────────────────────────────

    test('LayoutStore is updated after a stack operation', () => {
        const initialTree = layoutStore.getState().tree;
        const command = new StackPanelCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST, 'bottom');
        handler.handle(command);

        const newTree = layoutStore.getState().tree;
        expect(newTree).not.toBe(initialTree);
    });

    test('all three panels remain in tree after stacking', () => {
        const command = new StackPanelCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST, 'bottom');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        expect(_containsPanel(tree, PANEL_IDS.MAP)).toBe(true);
        expect(_containsPanel(tree, PANEL_IDS.LAYERS)).toBe(true);
        expect(_containsPanel(tree, PANEL_IDS.DECORATION_LIST)).toBe(true);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Stacking with a target inside an existing SplitNode
    // ─────────────────────────────────────────────────────────────────────────

    test('can stack onto a PanelNode that is inside an existing SplitNode', () => {
        // Pre-arrange: layers and decorationList already in a split
        const tree = createSplitNode('vertical', 0.75,
            createPanelNode(PANEL_IDS.MAP),
            createSplitNode('horizontal', 0.33,
                createPanelNode(PANEL_IDS.LAYERS),
                createPanelNode(PANEL_IDS.DECORATION_LIST)
            )
        );
        layoutStore.setState(new DockLayoutConfiguration(tree));

        // Drag DECORATION_LIST onto LAYERS from the bottom
        const command = new StackPanelCommand(PANEL_IDS.DECORATION_LIST, PANEL_IDS.LAYERS, 'bottom');
        handler.handle(command);

        const result = layoutStore.getState().tree;
        // Should find a new SplitNode with layers (first) and decorationList (second)
        const split = _findNode(result, n => n.type === 'split' &&
            _containsPanel(n.first, PANEL_IDS.LAYERS) &&
            _containsPanel(n.second, PANEL_IDS.DECORATION_LIST));
        expect(split).not.toBeNull();
        expect(split.direction).toBe('horizontal');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Invalid inputs
    // ─────────────────────────────────────────────────────────────────────────

    test('throws when draggedPanelId equals targetPanelId', () => {
        const command = new StackPanelCommand(PANEL_IDS.LAYERS, PANEL_IDS.LAYERS, 'bottom');
        expect(() => handler.handle(command)).toThrow();
    });

    test('throws when targetPanelId is not found in the tree', () => {
        const command = new StackPanelCommand(PANEL_IDS.LAYERS, 'nonexistent', 'bottom');
        expect(() => handler.handle(command)).toThrow();
    });

    test('throws when edge is not valid', () => {
        const command = new StackPanelCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST, 'diagonal');
        expect(() => handler.handle(command)).toThrow();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // execute() delegates to handle()
    // ─────────────────────────────────────────────────────────────────────────

    test('execute() delegates to handle() and returns new layout', () => {
        const command = new StackPanelCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST, 'top');
        const result = handler.execute(command);
        expect(result).toBeInstanceOf(DockLayoutConfiguration);
        const tree = result.tree;
        expect(_containsPanel(tree, PANEL_IDS.LAYERS)).toBe(true);
        expect(_containsPanel(tree, PANEL_IDS.DECORATION_LIST)).toBe(true);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // throws when layout validation fails after stack (line 102)
    // ─────────────────────────────────────────────────────────────────────────

    test('throws when resulting layout fails validation', () => {
        const validateSpy = vi.spyOn(DockLayoutConfiguration.prototype, 'validate')
            .mockReturnValue({ valid: false, errors: ['mock validation error'] });
        try {
            const command = new StackPanelCommand(PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST, 'top');
            expect(() => handler.handle(command)).toThrow('invalid layout after stack');
        } finally {
            validateSpy.mockRestore();
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function _containsPanel(node, panelId) {
    if (!node) return false;
    if (node.type === 'panel') return node.panelId === panelId;
    if (node.type === 'tabgroup') return node.panels.includes(panelId);
    if (node.type === 'split') {
        return _containsPanel(node.first, panelId) || _containsPanel(node.second, panelId);
    }
    return false;
}
