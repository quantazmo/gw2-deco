// @ts-nocheck
/**
 * Integration tests for PanelDragDrop workflow
 * Tests the full command/handler flow for edge docking without DOM interaction.
 * Simulates the drag-drop workflow: command dispatch → handler → store update.
 */
import { DockPanelHandler } from '../../src/application/handlers/DockPanelHandler.js';
import { DockPanelCommand } from '../../src/application/commands/DockPanelCommand.js';
import { DockPanelLayoutStore } from '../../src/ui/stores/DockPanelLayoutStore.js';
import { DockLayoutConfiguration } from '../../src/domain/DockLayoutConfiguration.js';
import { PANEL_IDS, LAYOUT } from '../../src/config/constants.js';

describe('PanelDragDrop Integration', () => {
    let layoutStore;
    let handler;

    beforeEach(() => {
        layoutStore = new DockPanelLayoutStore();
        handler = new DockPanelHandler(layoutStore);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Viewport edge docking — tree state verification
    // ─────────────────────────────────────────────────────────────────────────

    describe('dock to left edge', () => {
        test('panels panel appears at left of layout tree', () => {
            handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, 'left'));

            const tree = layoutStore.getState().tree;
            expect(tree.direction).toBe('vertical');
            expect(tree.first.panelId).toBe(PANEL_IDS.LAYERS);
        });

        test('layout tree is valid after docking to left', () => {
            handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, 'left'));
            expect(layoutStore.getState().validate().valid).toBe(true);
        });
    });

    describe('dock to right edge', () => {
        test('panel appears at right of layout tree', () => {
            handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, 'right'));

            const tree = layoutStore.getState().tree;
            expect(tree.direction).toBe('vertical');
            expect(tree.second.panelId).toBe(PANEL_IDS.LAYERS);
        });

        test('map panel is still in the first subtree', () => {
            handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, 'right'));

            const tree = layoutStore.getState().tree;
            // The map should be somewhere in tree.first (the larger 75% portion)
            const firstJson = JSON.stringify(tree.first);
            expect(firstJson).toContain('"map"');
        });

        test('layout tree is valid after docking to right', () => {
            handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, 'right'));
            expect(layoutStore.getState().validate().valid).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Cancel behaviour — command not dispatched
    // ─────────────────────────────────────────────────────────────────────────

    describe('cancel drag (command not dispatched)', () => {
        test('when no command is dispatched, store retains original tree', () => {
            const originalTree = JSON.stringify(layoutStore.getState().tree);

            // Simulate cancelled drag: DockPanelCommand is never dispatched
            // (PanelDragManager handles this by not calling handle() on mouseup outside a valid zone)

            expect(JSON.stringify(layoutStore.getState().tree)).toBe(originalTree);
        });

        test('when invalid edge is given, store is unchanged', () => {
            const originalTree = JSON.stringify(layoutStore.getState().tree);

            expect(() => {
                handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, 'outside'));
            }).toThrow();

            expect(JSON.stringify(layoutStore.getState().tree)).toBe(originalTree);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Multi-panel & sequential docking
    // ─────────────────────────────────────────────────────────────────────────

    describe('multi-panel docking workflows', () => {
        test('dock all three content panels in sequence produces valid layout', () => {
            handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, 'left'));
            handler.handle(new DockPanelCommand(PANEL_IDS.DECORATION_LIST, 'right'));
            handler.handle(new DockPanelCommand(PANEL_IDS.MAP, 'left'));

            const result = layoutStore.getState().validate();
            expect(result.valid).toBe(true);
        });

        test('dock all panels to right edge in sequence produces valid layout', () => {
            handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, 'right'));
            handler.handle(new DockPanelCommand(PANEL_IDS.DECORATION_LIST, 'right'));
            handler.handle(new DockPanelCommand(PANEL_IDS.MAP, 'right'));

            const result = layoutStore.getState().validate();
            expect(result.valid).toBe(true);
        });

        test('panel can be re-docked to different edge after initial dock', () => {
            // Initial: dock layers to left
            handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, 'left'));
            expect(layoutStore.getState().tree.first.panelId).toBe(PANEL_IDS.LAYERS);

            // Re-dock layers to right
            handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, 'right'));
            const tree = layoutStore.getState().tree;
            expect(tree.direction).toBe('vertical');
            expect(tree.second.panelId).toBe(PANEL_IDS.LAYERS);

            expect(layoutStore.getState().validate().valid).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Store subscription and events
    // ─────────────────────────────────────────────────────────────────────────

    describe('store change propagation', () => {
        test('LayoutStore subscribers are called after each dock command', () => {
            const listener = vi.fn();
            layoutStore.subscribe(listener);

            handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, 'left'));
            handler.handle(new DockPanelCommand(PANEL_IDS.DECORATION_LIST, 'right'));

            expect(listener).toHaveBeenCalledTimes(2);
        });

        test('each listener call passes a valid LayoutConfiguration', () => {
            const received = [];
            layoutStore.subscribe(layout => received.push(layout));

            handler.handle(new DockPanelCommand(PANEL_IDS.LAYERS, 'left'));

            expect(received).toHaveLength(1);
            expect(received[0]).toBeInstanceOf(DockLayoutConfiguration);
            expect(received[0].validate().valid).toBe(true);
        });
    });
});
