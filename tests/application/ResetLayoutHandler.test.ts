// @ts-nocheck
/**
 * Unit tests for ResetLayoutHandler
 * Tests:
 *   - Replaces layout tree with the default layout
 *   - Publishes layout:changed event (LayoutStore notify)
 *   - Clears localStorage entry via LayoutRepository
 */
import { ResetLayoutHandler } from '../../src/application/handlers/ResetLayoutHandler.js';
import { ResetLayoutCommand } from '../../src/application/commands/ResetLayoutCommand.js';
import { DockPanelLayoutStore } from '../../src/ui/stores/DockPanelLayoutStore.js';
import { DockLayoutConfiguration, createPanelNode, createSplitNode } from '../../src/domain/DockLayoutConfiguration.js';
import { PANEL_IDS } from '../../src/config/constants.js';

describe('ResetLayoutHandler', () => {
    let layoutStore;
    let repositoryMock;
    let handler;

    beforeEach(() => {
        layoutStore = new DockPanelLayoutStore();
        repositoryMock = {
            clear: vi.fn(),
            save: vi.fn(),
            load: vi.fn(() => DockLayoutConfiguration.createDefault()),
        };
        handler = new ResetLayoutHandler(layoutStore, repositoryMock);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Default layout replacement
    // ─────────────────────────────────────────────────────────────────────────

    describe('handle', () => {
        it('should replace the current layout with the default layout', () => {
            // Arrange: custom layout (two panels only — a mid-flight state)
            const custom = new DockLayoutConfiguration(
                createSplitNode('vertical', 0.5,
                    createPanelNode(PANEL_IDS.MAP),
                    createSplitNode('horizontal', 0.5,
                        createPanelNode(PANEL_IDS.LAYERS),
                        createPanelNode(PANEL_IDS.DECORATION_LIST)
                    )
                )
            );
            layoutStore.setState(custom);
            expect(layoutStore.getState().tree.first.panelId).toBe(PANEL_IDS.MAP);

            // Act
            handler.handle(new ResetLayoutCommand());

            // Assert: state is now the canonical default
            const state = layoutStore.getState();
            const defaultLayout = DockLayoutConfiguration.createDefault();

            expect(JSON.stringify(state.tree)).toBe(JSON.stringify(defaultLayout.tree));
            expect(state.version).toBe(defaultLayout.version);
        });

        it('should notify LayoutStore subscribers on reset', () => {
            const listener = vi.fn();
            layoutStore.subscribe(listener);

            handler.handle(new ResetLayoutCommand());

            expect(listener).toHaveBeenCalledTimes(1);
            const received = listener.mock.calls[0][0];
            expect(received).toBeInstanceOf(DockLayoutConfiguration);
        });

        it('should call repository.clear() to remove the persisted layout', () => {
            handler.handle(new ResetLayoutCommand());

            expect(repositoryMock.clear).toHaveBeenCalledTimes(1);
        });

        it('should work even when no repository is provided', () => {
            const noRepoHandler = new ResetLayoutHandler(layoutStore);

            expect(() => noRepoHandler.handle(new ResetLayoutCommand())).not.toThrow();
            const state = layoutStore.getState();
            const defaultLayout = DockLayoutConfiguration.createDefault();
            expect(JSON.stringify(state.tree)).toBe(JSON.stringify(defaultLayout.tree));
        });

        it('should produce a valid layout after reset', () => {
            handler.handle(new ResetLayoutCommand());

            const { valid } = layoutStore.getState().validate();
            expect(valid).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // execute() delegates to handle() (line 26)
    // ─────────────────────────────────────────────────────────────────────────

    test('execute() delegates to handle() and resets layout store', () => {
        handler.execute(new ResetLayoutCommand());
        const layout = layoutStore.getState();
        expect(layout).toBeInstanceOf(DockLayoutConfiguration);
        expect(layout.validate().valid).toBe(true);
    });
});
