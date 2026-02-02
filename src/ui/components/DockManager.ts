// @ts-nocheck
/**
 * DockManager
 * Top-level orchestrator for the panel layout system.
 * Subscribes to LayoutStore and re-renders the layout tree as nested flexbox containers:
 *   SplitNode    → flex container (.split-node) with ratio-based children
 *   PanelNode    → DockRegion wrapper (.panel-wrapper)
 *   TabGroupNode → TabbedContainer (.tabbed-container) with clickable tabs
 */

import { DockRegion } from './DockRegion.js';
import { PanelDragManager } from './PanelDragManager.js';
import { DropZoneOverlay } from './DropZoneOverlay.js';
import { TabbedContainer } from './TabbedContainer.js';
import { StackedContainer } from './StackedContainer.js';
import { RibbonToolbar } from './RibbonToolbar.js';
import { DockLayoutConfiguration, replaceNode, createTabGroupNode, createSplitNode, findNode } from '../../domain/DockLayoutConfiguration.js';
import { ReorderPanelCommand } from '../../application/commands/ReorderPanelCommand.js';
import { ResizeDockCommand } from '../../application/commands/ResizeDockCommand.js';
import { LAYOUT, PANEL_IDS } from '../../config/constants.js';

/** Minimum interval (ms) between resize re-renders to avoid layout thrashing. */
const RESIZE_DEBOUNCE_MS = 150;

const PANEL_LABELS = {
    map: 'Map',
    layers: 'Layers',
    decorationList: 'Decoration List'
};

export class DockManager {
    /**
     * @param {HTMLElement} rootElement     Container div (#dock-manager-root)
     * @param {LayoutStore} layoutStore     LayoutStore instance
     * @param {Object} panelContentMap      Map of panelId → HTMLElement content sources
     *   e.g. { map: el, layers: el, decorationList: el }
     * @param {object} [appService]         AppService for dispatching commands (optional)
     * @param {object} [eventBus]           EventBus for drag events (optional)
     * @param {object} [appStore]           AppStore for ribbon toolbar state (optional)
     * @param {object} [zoomStore]          ZoomStore for ribbon zoom actions (optional)
     * @param {object} [undoRedoManager]    UndoRedoManager for ribbon undo/redo (optional)
     * @param {object} [toolModeStore]      ToolModeStore for ribbon tool mode buttons (optional)
     */
    constructor(rootElement, layoutStore, panelContentMap, appService = null, eventBus = null, appStore = null, zoomStore = null, undoRedoManager = null, toolModeStore = null) {
        this.rootElement = rootElement;
        this.layoutStore = layoutStore;
        this.panelContentMap = panelContentMap || {};
        this._appService = appService;
        this._eventBus = eventBus;
        this._appStore = appStore;
        this._zoomStore = zoomStore;
        this._undoRedoManager = undoRedoManager;
        this._toolModeStore = toolModeStore;
        this._unsubscribe = null;
        this._panelDragManager = null;
        this._dropZoneOverlay = null;
        this._treeContainer = null;
        this._ribbon = null;
        this._resizeHandler = null;
        this._resizeTimer = null;
        this._currentMapName = null;
    }

    /**
     * Mount DockManager: subscribe to store and render initial layout.
     * Also initialises PanelDragManager, DropZoneOverlay and RibbonToolbar if the
     * appropriate dependencies were provided.
     */
    mount() {
        // Create a stable sub-container for the layout tree so that the ribbon
        // toolbar and reset button persist across re-renders.
        this._treeContainer = document.createElement('div');
        this._treeContainer.className = 'dock-layout-tree';
        this.rootElement.appendChild(this._treeContainer);

        this._unsubscribe = this.layoutStore.subscribe(() => this._render());
        this._render();

        // Add RibbonToolbar above the layout tree
        if (this._appService && this._appStore && this._zoomStore) {
            const ribbon = new RibbonToolbar(
                this._appService, this._appStore, this._zoomStore, this._eventBus, this._undoRedoManager, this._toolModeStore
            );
            this._ribbon = ribbon;
            this.rootElement.insertBefore(ribbon.getElement(), this._treeContainer);
            this.rootElement.classList.add('has-ribbon');
        }

        // Wire drag-and-drop interaction if dependencies are available
        if (this._appService && this._eventBus) {
            this._panelDragManager = new PanelDragManager(this._appService, this._eventBus, this.layoutStore);
            this._panelDragManager.attach(this.rootElement);

            this._dropZoneOverlay = new DropZoneOverlay();
            this._dropZoneOverlay.attach(this._eventBus);
        }

        // Subscribe to tab activation events and update the layout tree activeIndex
        if (this._eventBus) {
            this._eventBus.subscribe('layout:tab-activated', ({ panels, activeIndex }) => {
                this._onTabActivated(panels, activeIndex);
            });
        }

        // Subscribe to AppStore to track the loaded map name for the map panel title
        if (this._appStore) {
            this._appStore.subscribe((state) => {
                const mapName = state.map?.name || null;
                if (mapName !== this._currentMapName) {
                    this._currentMapName = mapName;
                    const titleEl = this._treeContainer && this._treeContainer.querySelector('[data-panel-id="map"] .dock-region-title-text');
                    if (titleEl) {
                        titleEl.textContent = mapName ? `Map — ${mapName}` : 'Map';
                    }
                }
            });
        }

        // Listen for browser window resize to re-enforce minimum panel sizes
        this._resizeHandler = () => this._onWindowResize();
        window.addEventListener('resize', this._resizeHandler);
    }

    /**
     * Unmount DockManager: unsubscribe from store and clean up ribbon.
     */
    unmount() {
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
        }
        if (this._ribbon) {
            this._ribbon.unmount();
            this._ribbon = null;
        }
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
        if (this._resizeTimer) {
            clearTimeout(this._resizeTimer);
            this._resizeTimer = null;
        }
    }

    /**
     * Re-render the layout tree inside _treeContainer.
     * Only the tree container is cleared; ribbon and reset button persist.
     * @private
     */
    _render() {
        const container = this._treeContainer || this.rootElement;
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        const layout = this.layoutStore.getState();
        const rendered = this._renderNode(layout.tree, []);
        container.appendChild(rendered);
    }

    /**
     * Recursively render a LayoutNode into a DOM element.
     * @param {object}   node
     * @param {string[]} path  Path from tree root to this node (array of 'first'|'second')
     * @returns {HTMLElement}
     * @private
     */
    _renderNode(node, path) {
        if (node.type === 'panel') {
            return this._renderPanelNode(node);
        }
        if (node.type === 'split') {
            return this._renderSplitNode(node, path);
        }
        if (node.type === 'tabgroup') {
            return this._renderTabGroupNode(node, path);
        }

        // Fallback for unknown node types
        const fallback = document.createElement('div');
        fallback.className = 'panel-wrapper';
        return fallback;
    }

    /** @private */
    _renderPanelNode(node) {
        const contentEl = this.panelContentMap[node.panelId] || null;
        const baseLabel = PANEL_LABELS[node.panelId] || node.panelId;
        const label = (node.panelId === 'map' && this._currentMapName)
            ? `${baseLabel} — ${this._currentMapName}`
            : baseLabel;
        const region = new DockRegion(node.panelId, contentEl, label);

        const wrapper = document.createElement('div');
        wrapper.className = 'panel-wrapper';
        wrapper.dataset.panelId = node.panelId;
        wrapper.appendChild(region.getElement());
        return wrapper;
    }

    /** @private */
    _renderSplitNode(node, path) {
        const firstEl = this._renderNode(node.first, [...path, 'first']);
        const secondEl = this._renderNode(node.second, [...path, 'second']);

        // Detect which child contains the map to compute appropriate ratio constraints.
        // This enforces the MAP_MIN_RATIO constraint both visually (DividerResizer clamping)
        // and structurally (ResizeDockCommand handler).
        const mapInFirst = findNode(node.first, n => n.type === 'panel' && n.panelId === PANEL_IDS.MAP) !== null;
        const mapInSecond = !mapInFirst &&
            findNode(node.second, n => n.type === 'panel' && n.panelId === PANEL_IDS.MAP) !== null;

        const dividerOptions = {};
        if (mapInFirst) {
            dividerOptions.minRatio = Math.max(LAYOUT.SPLIT_RATIO_MIN, LAYOUT.MAP_MIN_RATIO);
        } else if (mapInSecond) {
            dividerOptions.maxRatio = Math.min(LAYOUT.SPLIT_RATIO_MAX, 1 - LAYOUT.MAP_MIN_RATIO);
        }

        const onRatioChange = this._appService
            ? (newRatio) => this._appService.execute(new ResizeDockCommand(path, newRatio))
            : (newRatio) => this._onDividerMoved(node, newRatio);

        const stacked = new StackedContainer(node, firstEl, secondEl, onRatioChange, dividerOptions);
        return stacked.getElement();
    }

    /** @private */
    _renderTabGroupNode(node, path) {
        const onReorder = this._appService
            ? (fromIndex, toIndex) => {
                this._appService.execute(
                    new ReorderPanelCommand('tab', path, fromIndex, toIndex)
                );
            }
            : null;
        const container = new TabbedContainer(node, this.panelContentMap, this._eventBus, onReorder);

        const wrapper = document.createElement('div');
        wrapper.className = 'panel-wrapper tab-group-wrapper';
        // Expose all panelIds so PanelDragManager can resolve hit-testing
        node.panels.forEach(pid => wrapper.dataset['panelId_' + pid] = pid);
        wrapper.appendChild(container.getElement());
        return wrapper;
    }

    /**
     * Handle browser window resize.
     * Debounces rapid resize events, then re-enforces minimum panel sizes by
     * checking every panel wrapper in the rendered tree. If any panel is below
     * the minimum threshold, the layout is re-rendered so flexbox can
     * redistribute space.
     * @private
     */
    _onWindowResize() {
        if (this._resizeTimer) clearTimeout(this._resizeTimer);
        this._resizeTimer = setTimeout(() => {
            this._resizeTimer = null;
            this._enforceMinimumSizes();
        }, RESIZE_DEBOUNCE_MS);
    }

    /**
     * Walk all rendered panel wrappers and collapse any that fall below the
     * minimum dimensions. "Collapse" means hiding the content area while
     * keeping the title bar visible so the panel can be identified and
     * re-expanded when space allows.
     * @private
     */
    _enforceMinimumSizes() {
        const container = this._treeContainer || this.rootElement;
        const panels = container.querySelectorAll('.panel-wrapper');

        panels.forEach(panel => {
            const rect = panel.getBoundingClientRect();
            const tooNarrow = rect.width > 0 && rect.width < LAYOUT.MIN_PANEL_WIDTH;
            const tooShort = rect.height > 0 && rect.height < LAYOUT.MIN_PANEL_HEIGHT;

            const contentArea =
                panel.querySelector('.dock-region-content') ||
                panel.querySelector('.tab-content-area');

            if (contentArea) {
                if (tooNarrow || tooShort) {
                    panel.classList.add('panel-collapsed');
                    contentArea.style.display = 'none';
                } else {
                    panel.classList.remove('panel-collapsed');
                    contentArea.style.display = '';
                }
            }
        });
    }

    /**
     * Handle a tab-activated event: update the activeIndex on the matching TabGroupNode
     * in the layout tree and commit to LayoutStore.
     *
     * @param {string[]} panels      Ordered panel IDs on the tab group that was clicked
     * @param {number}   activeIndex New active index
     * @private
     */
    _onTabActivated(panels, activeIndex) {
        const layout = this.layoutStore.getState();
        const newTree = replaceNode(
            layout.tree,
            node => node.type === 'tabgroup' &&
                node.panels.length === panels.length &&
                node.panels.every((p, i) => p === panels[i]),
            createTabGroupNode(panels, activeIndex)
        );
        const newLayout = new DockLayoutConfiguration(newTree, layout.version);
        this.layoutStore.setState(newLayout);
    }

    /**
     * Handle a divider drag: update the ratio on the matching SplitNode in the
     * layout tree and commit to LayoutStore.
     *
     * @param {object} splitNode  The SplitNode reference captured at render time
     * @param {number} newRatio   New ratio value (already clamped by DividerResizer)
     * @private
     */
    _onDividerMoved(splitNode, newRatio) {
        const layout = this.layoutStore.getState();
        const newTree = replaceNode(
            layout.tree,
            node => node === splitNode,
            createSplitNode(splitNode.direction, newRatio, splitNode.first, splitNode.second)
        );
        const newLayout = new DockLayoutConfiguration(newTree, layout.version);
        this.layoutStore.setState(newLayout);
    }
}
