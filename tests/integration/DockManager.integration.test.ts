// @ts-nocheck
/**
 * Integration tests for DockManager
 * Tests the full layout render cycle: LayoutStore → DockManager → DOM output.
 * Verifies tree re-render on store change, panel content mapping, and nested split rendering.
 */
import { DockManager } from '../../src/ui/components/DockManager.js';
import { DockPanelLayoutStore } from '../../src/ui/stores/DockPanelLayoutStore.js';
import {
    DockLayoutConfiguration,
    createPanelNode,
    createSplitNode,
    createTabGroupNode
} from '../../src/domain/DockLayoutConfiguration.js';
import { PANEL_IDS } from '../../src/config/constants.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function createMockPanelContentMap() {
    const map = {};
    Object.values(PANEL_IDS).forEach(id => {
        const el = document.createElement('div');
        el.id = `content-${id}`;
        el.textContent = `Content: ${id}`;
        map[id] = el;
    });
    return map;
}

function createMockEventBus() {
    const subs = {};
    return {
        publish(event, data) {
            (subs[event] || []).forEach(fn => fn(data));
        },
        subscribe(event, fn) {
            if (!subs[event]) subs[event] = [];
            subs[event].push(fn);
            return () => { subs[event] = subs[event].filter(f => f !== fn); };
        }
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('DockManager Integration', () => {
    let rootElement;
    let layoutStore;
    let panelContentMap;
    let eventBus;
    let dockManager;

    beforeEach(() => {
        rootElement = document.createElement('div');
        rootElement.id = 'dock-manager-root';
        document.body.appendChild(rootElement);

        eventBus = createMockEventBus();
        layoutStore = new DockPanelLayoutStore(eventBus);
        panelContentMap = createMockPanelContentMap();
    });

    afterEach(() => {
        if (dockManager) {
            dockManager.unmount();
            dockManager = null;
        }
        document.body.removeChild(rootElement);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Full layout render cycle
    // ─────────────────────────────────────────────────────────────────────────

    describe('default layout rendering', () => {
        test('renders default layout with all three panels', () => {
            dockManager = new DockManager(rootElement, layoutStore, panelContentMap, null, eventBus);
            dockManager.mount();

            // The default tree is: Map | (Layers / DecList stacked)
            const panelWrappers = rootElement.querySelectorAll('.panel-wrapper');
            expect(panelWrappers.length).toBeGreaterThanOrEqual(3);

            // All three panel IDs must be present somewhere in the DOM
            [PANEL_IDS.MAP, PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST].forEach(pid => {
                const found = rootElement.querySelector(`[data-panel-id="${pid}"]`);
                expect(found).not.toBeNull();
            });
        });

        test('renders stacked containers with dividers for split nodes', () => {
            dockManager = new DockManager(rootElement, layoutStore, panelContentMap, null, eventBus);
            dockManager.mount();

            // Default tree has 3 SplitNodes → 3 stacked containers with dividers
            const dividers = rootElement.querySelectorAll('.divider-resizer');
            expect(dividers.length).toBe(2);
        });

        test('renders dock-region title bars with correct labels', () => {
            dockManager = new DockManager(rootElement, layoutStore, panelContentMap, null, eventBus);
            dockManager.mount();

            const titles = rootElement.querySelectorAll('.dock-region-title-text');
            const labels = Array.from(titles).map(t => t.textContent);

            expect(labels).toContain('Map');
            expect(labels).toContain('Layers');
            expect(labels).toContain('Decoration List');
        });

        test('maps panel content elements into dock regions', () => {
            dockManager = new DockManager(rootElement, layoutStore, panelContentMap, null, eventBus);
            dockManager.mount();

            // Each content element should be inside a dock-region-content area
            [PANEL_IDS.MAP, PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST].forEach(pid => {
                const contentEl = panelContentMap[pid];
                const parent = contentEl.closest('.dock-region-content');
                expect(parent).not.toBeNull();
            });
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Tree re-render on store change
    // ─────────────────────────────────────────────────────────────────────────

    describe('re-render on store change', () => {
        test('re-renders when LayoutStore state is updated', () => {
            dockManager = new DockManager(rootElement, layoutStore, panelContentMap, null, eventBus);
            dockManager.mount();

            // Verify initial layout has 3 dividers (3 split nodes)
            expect(rootElement.querySelectorAll('.divider-resizer').length).toBe(2);

            // Replace the tree with a simpler layout:
            //   Map | TabGroup(layers, decorationList)
            const simpleTree = createSplitNode('vertical', 0.75,
                createPanelNode(PANEL_IDS.MAP),
                createTabGroupNode([PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST])
            );
            layoutStore.setState(new DockLayoutConfiguration(simpleTree));

            // After re-render: only 1 split node → 1 divider
            expect(rootElement.querySelectorAll('.divider-resizer').length).toBe(1);

            // Tab group should be rendered
            const tabBar = rootElement.querySelector('.tab-bar');
            expect(tabBar).not.toBeNull();
            expect(tabBar.querySelectorAll('.tab-button').length).toBe(2);
        });

        test('panel content elements survive re-render (not cloned)', () => {
            dockManager = new DockManager(rootElement, layoutStore, panelContentMap, null, eventBus);
            dockManager.mount();

            const mapContentBefore = panelContentMap[PANEL_IDS.MAP];

            // Trigger a re-render with the same tree structure
            const layout = layoutStore.getState();
            layoutStore.setState(new DockLayoutConfiguration(layout.tree, layout.version));

            // The same DOM element should be reused
            const mapContentAfter = rootElement.querySelector(`#content-${PANEL_IDS.MAP}`);
            expect(mapContentAfter).toBe(mapContentBefore);
        });

        test('switching from split to tab layout changes DOM structure', () => {
            dockManager = new DockManager(rootElement, layoutStore, panelContentMap, null, eventBus);
            dockManager.mount();

            // Initially no tab group
            expect(rootElement.querySelector('.tabbed-container')).toBeNull();

            // Transition to a layout with tabs
            const tabbedTree = createSplitNode('vertical', 0.75,
                createPanelNode(PANEL_IDS.MAP),
                createTabGroupNode([PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST])
            );
            layoutStore.setState(new DockLayoutConfiguration(tabbedTree));

            expect(rootElement.querySelector('.tabbed-container')).not.toBeNull();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Panel content mapping
    // ─────────────────────────────────────────────────────────────────────────

    describe('panel content mapping', () => {
        test('renders without content elements when panelContentMap is empty', () => {
            dockManager = new DockManager(rootElement, layoutStore, {}, null, eventBus);
            dockManager.mount();

            // Should still render structure without errors
            const regions = rootElement.querySelectorAll('.dock-region');
            expect(regions.length).toBe(3);
        });

        test('only the active tab panel content is displayed in tab group', () => {
            const tabbedTree = createSplitNode('vertical', 0.75,
                createPanelNode(PANEL_IDS.MAP),
                createTabGroupNode([PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST], 0)
            );
            layoutStore.setState(new DockLayoutConfiguration(tabbedTree));

            dockManager = new DockManager(rootElement, layoutStore, panelContentMap, null, eventBus);
            dockManager.mount();

            // Active tab (Layers at index 0) content should be in the tab content area
            const tabContentArea = rootElement.querySelector('.tab-content-area');
            expect(tabContentArea).not.toBeNull();
            expect(tabContentArea.querySelector(`#content-${PANEL_IDS.LAYERS}`)).not.toBeNull();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Nested split rendering
    // ─────────────────────────────────────────────────────────────────────────

    describe('nested split rendering', () => {
        test('renders deeply nested splits correctly', () => {
            // Create a layout with 2 levels of nesting:
            //   H-split(
            //     V-split(Map, Layers),
            //     DecorationList
            //   )
            const nestedTree = createSplitNode('horizontal', 0.5,
                createSplitNode('vertical', 0.6,
                    createPanelNode(PANEL_IDS.MAP),
                    createPanelNode(PANEL_IDS.LAYERS)
                ),
                createPanelNode(PANEL_IDS.DECORATION_LIST)
            );
            layoutStore.setState(new DockLayoutConfiguration(nestedTree));

            dockManager = new DockManager(rootElement, layoutStore, panelContentMap, null, eventBus);
            dockManager.mount();

            // 2 split nodes → 2 stacked containers
            const stackedContainers = rootElement.querySelectorAll('.stacked-container');
            expect(stackedContainers.length).toBe(2);

            // 2 dividers
            const dividers = rootElement.querySelectorAll('.divider-resizer');
            expect(dividers.length).toBe(2);

            // All 3 panels present
            [PANEL_IDS.MAP, PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST].forEach(pid => {
                expect(rootElement.querySelector(`[data-panel-id="${pid}"]`)).not.toBeNull();
            });
        });

        test('renders mixed split and tab layout', () => {
            // V-split(
            //   Map,
            //   H-split(
            //     TabGroup(Layers, DecorationList),
            //     Inspector
            //   )
            // )
            const mixedTree = createSplitNode('vertical', 0.7,
                createPanelNode(PANEL_IDS.MAP),
                createSplitNode('horizontal', 0.6,
                    createTabGroupNode([PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST]),
                    createPanelNode(PANEL_IDS.INSPECTOR)
                )
            );
            layoutStore.setState(new DockLayoutConfiguration(mixedTree));

            dockManager = new DockManager(rootElement, layoutStore, panelContentMap, null, eventBus);
            dockManager.mount();

            // 1 tabbed container
            expect(rootElement.querySelector('.tabbed-container')).not.toBeNull();

            // 2 split nodes → 2 dividers
            expect(rootElement.querySelectorAll('.divider-resizer').length).toBe(2);

            // Tab bar has 2 buttons
            const tabButtons = rootElement.querySelectorAll('.tab-button');
            expect(tabButtons.length).toBe(2);
        });

        test('each split node direction is reflected in stacked container class', () => {
            const tree = createSplitNode('horizontal', 0.5,
                createSplitNode('vertical', 0.6,
                    createPanelNode(PANEL_IDS.MAP),
                    createPanelNode(PANEL_IDS.LAYERS)
                ),
                createPanelNode(PANEL_IDS.DECORATION_LIST)
            );
            layoutStore.setState(new DockLayoutConfiguration(tree));

            dockManager = new DockManager(rootElement, layoutStore, panelContentMap, null, eventBus);
            dockManager.mount();

            // Root is horizontal split
            const horizontalContainers = rootElement.querySelectorAll('.stacked-horizontal');
            expect(horizontalContainers.length).toBeGreaterThanOrEqual(1);

            // Inner child is a vertical split
            const verticalContainers = rootElement.querySelectorAll('.stacked-vertical');
            expect(verticalContainers.length).toBe(1);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Tab activation via EventBus
    // ─────────────────────────────────────────────────────────────────────────

    describe('tab activation integration', () => {
        test('layout:tab-activated event updates store activeIndex', () => {
            const tabbedTree = createSplitNode('vertical', 0.75,
                createPanelNode(PANEL_IDS.MAP),
                createTabGroupNode([PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST, PANEL_IDS.INSPECTOR], 0)
            );
            layoutStore.setState(new DockLayoutConfiguration(tabbedTree));

            dockManager = new DockManager(rootElement, layoutStore, panelContentMap, null, eventBus);
            dockManager.mount();

            // Simulate tab activation event for the second tab
            eventBus.publish('layout:tab-activated', {
                panels: [PANEL_IDS.LAYERS, PANEL_IDS.DECORATION_LIST, PANEL_IDS.INSPECTOR],
                activeIndex: 1
            });

            // Verify the store was updated
            const updatedTree = layoutStore.getState().tree;
            expect(updatedTree.second.type).toBe('tabgroup');
            expect(updatedTree.second.activeIndex).toBe(1);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Mount / unmount lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    describe('mount and unmount lifecycle', () => {
        test('mount renders layout, unmount cleans up subscription', () => {
            dockManager = new DockManager(rootElement, layoutStore, panelContentMap, null, eventBus);
            dockManager.mount();

            // Layout is rendered
            expect(rootElement.querySelector('.dock-region')).not.toBeNull();

            dockManager.unmount();

            // Subsequent store changes should NOT trigger re-render
            const htmlBefore = rootElement.innerHTML;
            layoutStore.setState(DockLayoutConfiguration.createDefault());
            expect(rootElement.innerHTML).toBe(htmlBefore);

            dockManager = null; // prevent afterEach double-unmount
        });
    });
});
