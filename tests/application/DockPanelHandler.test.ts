// @ts-nocheck
/**
 * Unit tests for DockPanelHandler
 * Tests: remove panel from tree, insert SplitNode at appropriate edge,
 * verify map retains ≥50% space, cancel (invalid edge) rejects gracefully.
 */
import { DockPanelHandler } from '../../src/application/handlers/DockPanelHandler.js';
import { DockPanelCommand } from '../../src/application/commands/DockPanelCommand.js';
import { DockPanelLayoutStore } from '../../src/ui/stores/DockPanelLayoutStore.js';
import { DockLayoutConfiguration } from '../../src/domain/DockLayoutConfiguration.js';
import { PANEL_IDS, LAYOUT } from '../../src/config/constants.js';

describe('DockPanelHandler', () => {
    let layoutStore;
    let handler;

    beforeEach(() => {
        layoutStore = new DockPanelLayoutStore();
        handler = new DockPanelHandler(layoutStore);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Left edge
    // ─────────────────────────────────────────────────────────────────────────

    test('dock to left edge creates vertical SplitNode with panel as first child', () => {
        const command = new DockPanelCommand(PANEL_IDS.LAYERS, 'left');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        expect(tree.type).toBe('split');
        expect(tree.direction).toBe('vertical');
        expect(tree.first.type).toBe('panel');
        expect(tree.first.panelId).toBe(PANEL_IDS.LAYERS);
    });

    test('dock to left edge sets ratio to DEFAULT_DOCK_RATIO (panel gets 25%)', () => {
        const command = new DockPanelCommand(PANEL_IDS.LAYERS, 'left');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        expect(tree.ratio).toBe(LAYOUT.DEFAULT_DOCK_RATIO);
    });

    test('dock to left edge — second child contains the rest of the tree (no panel duplicate)', () => {
        const command = new DockPanelCommand(PANEL_IDS.LAYERS, 'left');
        handler.handle(command);

        const layout = layoutStore.getState();
        const result = layout.validate();
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Right edge
    // ─────────────────────────────────────────────────────────────────────────

    test('dock to right edge creates vertical SplitNode with panel as second child', () => {
        const command = new DockPanelCommand(PANEL_IDS.LAYERS, 'right');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        expect(tree.type).toBe('split');
        expect(tree.direction).toBe('vertical');
        expect(tree.second.type).toBe('panel');
        expect(tree.second.panelId).toBe(PANEL_IDS.LAYERS);
    });

    test('dock to right edge sets ratio to 1 - DEFAULT_DOCK_RATIO (rest gets 75%)', () => {
        const command = new DockPanelCommand(PANEL_IDS.LAYERS, 'right');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        expect(tree.ratio).toBe(1 - LAYOUT.DEFAULT_DOCK_RATIO);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Top edge
    // ─────────────────────────────────────────────────────────────────────────

    test('dock to top edge creates horizontal SplitNode with panel as first child', () => {
        const command = new DockPanelCommand(PANEL_IDS.DECORATION_LIST, 'top');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        expect(tree.type).toBe('split');
        expect(tree.direction).toBe('horizontal');
        expect(tree.first.type).toBe('panel');
        expect(tree.first.panelId).toBe(PANEL_IDS.DECORATION_LIST);
    });

    test('dock to top edge sets ratio to DEFAULT_DOCK_RATIO', () => {
        const command = new DockPanelCommand(PANEL_IDS.DECORATION_LIST, 'top');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        expect(tree.ratio).toBe(LAYOUT.DEFAULT_DOCK_RATIO);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Bottom edge
    // ─────────────────────────────────────────────────────────────────────────

    test('dock to bottom edge creates horizontal SplitNode with panel as second child', () => {
        const command = new DockPanelCommand(PANEL_IDS.DECORATION_LIST, 'bottom');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        expect(tree.type).toBe('split');
        expect(tree.direction).toBe('horizontal');
        expect(tree.second.type).toBe('panel');
        expect(tree.second.panelId).toBe(PANEL_IDS.DECORATION_LIST);
    });

    test('dock to bottom edge sets ratio to 1 - DEFAULT_DOCK_RATIO', () => {
        const command = new DockPanelCommand(PANEL_IDS.DECORATION_LIST, 'bottom');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        expect(tree.ratio).toBe(1 - LAYOUT.DEFAULT_DOCK_RATIO);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Map available space verification
    // ─────────────────────────────────────────────────────────────────────────

    test('map gets ≥50% of total space when a non-map panel is docked to left', () => {
        const command = new DockPanelCommand(PANEL_IDS.LAYERS, 'left');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        // Panel is first (ratio = DEFAULT_DOCK_RATIO = 0.25)
        // Rest (containing map) is second (1 - 0.25 = 0.75 = ≥ MAP_MIN_RATIO)
        const restRatio = 1 - tree.ratio;
        expect(restRatio).toBeGreaterThanOrEqual(LAYOUT.MAP_MIN_RATIO);
    });

    test('map gets ≥50% of total space when a non-map panel is docked to right', () => {
        const command = new DockPanelCommand(PANEL_IDS.LAYERS, 'right');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        // Rest (containing map) is first (ratio = 0.75)
        expect(tree.ratio).toBeGreaterThanOrEqual(LAYOUT.MAP_MIN_RATIO);
    });

    test('map gets ≥50% of total space when a non-map panel is docked to top', () => {
        const command = new DockPanelCommand(PANEL_IDS.LAYERS, 'top');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        const restRatio = 1 - tree.ratio;
        expect(restRatio).toBeGreaterThanOrEqual(LAYOUT.MAP_MIN_RATIO);
    });

    test('map gets ≥50% of total space when a non-map panel is docked to bottom', () => {
        const command = new DockPanelCommand(PANEL_IDS.LAYERS, 'bottom');
        handler.handle(command);

        const tree = layoutStore.getState().tree;
        expect(tree.ratio).toBeGreaterThanOrEqual(LAYOUT.MAP_MIN_RATIO);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Layout validity after each operation
    // ─────────────────────────────────────────────────────────────────────────

    test('resulting layout is always valid after docking any content panel', () => {
        const contentPanels = [PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST, PANEL_IDS.MAP];
        const edges = ['left', 'right', 'top', 'bottom'];

        for (const panelId of contentPanels) {
            for (const edge of edges) {
                // Reset to default layout
                layoutStore = new DockPanelLayoutStore();
                handler = new DockPanelHandler(layoutStore);

                handler.handle(new DockPanelCommand(panelId, edge));

                const result = layoutStore.getState().validate();
                expect(result.valid).toBe(true);
            }
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // LayoutStore is updated
    // ─────────────────────────────────────────────────────────────────────────

    test('handle() updates LayoutStore state', () => {
        const originalTree = JSON.stringify(layoutStore.getState().tree);

        handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, 'right'));

        const newTree = JSON.stringify(layoutStore.getState().tree);
        expect(newTree).not.toBe(originalTree);
    });

    test('handle() notifies LayoutStore subscribers', () => {
        const listener = vi.fn();
        layoutStore.subscribe(listener);

        handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, 'right'));

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith(expect.any(DockLayoutConfiguration));
    });

    test('handle() returns the new LayoutConfiguration', () => {
        const result = handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, 'right'));

        expect(result).toBeInstanceOf(DockLayoutConfiguration);
        expect(result.validate().valid).toBe(true);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Cancel / invalid input
    // ─────────────────────────────────────────────────────────────────────────

    test('invalid targetEdge throws and does not modify the store', () => {
        const originalTree = JSON.stringify(layoutStore.getState().tree);

        expect(() => {
            handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, 'center'));
        }).toThrow('invalid targetEdge');

        // Store should be unchanged
        expect(JSON.stringify(layoutStore.getState().tree)).toBe(originalTree);
    });

    test('null targetEdge throws', () => {
        expect(() => {
            handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, null));
        }).toThrow();
    });

    test('undefined targetEdge throws', () => {
        expect(() => {
            handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, undefined));
        }).toThrow();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Sequential docking operations
    // ─────────────────────────────────────────────────────────────────────────

    test('docking two panels in sequence produces a valid layout', () => {
        handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, 'left'));
        handler.handle(new DockPanelCommand(PANEL_IDS.DECORATION_LIST, 'bottom'));

        const result = layoutStore.getState().validate();
        expect(result.valid).toBe(true);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // execute() delegates to handle() (line 36)
    // ─────────────────────────────────────────────────────────────────────────

    test('execute() delegates to handle() and returns a LayoutConfiguration', () => {
        const result = handler.execute(new DockPanelCommand(PANEL_IDS.LAYERS, 'left'));
        expect(result).toBeInstanceOf(DockLayoutConfiguration);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Validation failure throws (line 80)
    // ─────────────────────────────────────────────────────────────────────────

    test('throws when resulting layout fails validation (line 80)', () => {
        const spy = vi.spyOn(DockLayoutConfiguration.prototype, 'validate')
            .mockReturnValue({ valid: false, errors: ['mock error'] });
        try {
            expect(() => handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, 'left')))
                .toThrow('invalid layout after dock');
        } finally {
            spy.mockRestore();
        }
    });

    test('docking the same panel twice moves it to the new position', () => {
        handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, 'left'));
        handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, 'right'));

        const tree = layoutStore.getState().tree;
        // After second dock, layers panel should be the second child
        expect(tree.second.panelId).toBe(PANEL_IDS.LAYERS);

        const result = layoutStore.getState().validate();
        expect(result.valid).toBe(true);
    });
});
