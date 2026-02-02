// @ts-nocheck
/**
 * DecorationListPanel Component
 * Flat scrollable list of decorations from visible layers,
 * grouped by layer with sticky headers showing layer name + count.
 * Subscribes to AppStore and SelectionStore.
 * Supports click/Ctrl+Click/Shift+Click selection.
 */

import * as domHelpers from '../domHelpers.js';
import { ConfirmDialog } from './ConfirmDialog.js';

class DecorationListPanel {
    constructor(containerElement, appStore, selectionStore, eventBus, appService) {
        this.container = containerElement;
        this.appStore = appStore;
        this.selectionStore = selectionStore;
        this.eventBus = eventBus;
        this.appService = appService || null;

        /** @type {string|null} Anchor decoration ID for Shift+Click range */
        this._anchorId = null;

        /** @type {string[]} Flat ordered list of visible decoration IDs */
        this._orderedIds = [];

        /** @type {ContextMenu|null} Shared context menu instance */
        this._contextMenu = null;

        /** @type {ConfirmDialog} Dialog for merge confirmation */
        this._confirmDialog = new ConfirmDialog();

        /** @type {DecorationInfoDialog|null} Shared decoration info dialog instance */
        this._decorationInfoDialog = null;

        /** @type {Set<string>} Layer IDs that are currently collapsed */
        this._collapsedLayers = new Set();

        /** @type {string} Current search filter text */
        this._searchText = '';

        /** @type {HTMLElement|null} Search bar container element */
        this._searchBar = null;

        /** @type {HTMLElement|null} Scrollable list container */
        this._listContainer = null;

        /** @type {number|null} Debounce timer ID for search input */
        this._searchDebounceTimer = null;

        /** @type {string} Current sort mode: 'oldest' | 'newest' | 'az' | 'za' */
        this._sortMode = 'oldest';

        this.initialize();
        this.subscribeToChanges();
    }

    initialize() {
        domHelpers.addClass(this.container, 'decoration-list-panel');

        // Search bar (hidden by default)
        this._searchBar = this._createSearchBar();
        this.container.appendChild(this._searchBar);

        // Scrollable list container
        this._listContainer = domHelpers.createElement('div', {
            className: 'decoration-list__scroll-container'
        });
        this.container.appendChild(this._listContainer);

        // Listen for toggle events dispatched by DockRegion's search button
        this._searchToggleHandler = () => this._toggleSearch();
        document.addEventListener('decoration-list:toggle-search', this._searchToggleHandler);

        // Listen for sort events dispatched by DockRegion's sort button
        this._sortHandler = (e) => {
            this._sortMode = e.detail.mode;
            this.render(this.appStore.getState());
        };
        document.addEventListener('decoration-list:set-sort', this._sortHandler);

        this.render(this.appStore.getState());
    }

    subscribeToChanges() {
        this.appStore.subscribe((state) => {
            this.render(state);
        });

        this.selectionStore.subscribe(() => {
            this._updateSelectionHighlights();
        });
    }

    /**
     * Render the decoration list from current state
     * @param {Object} state - AppStore state with layers array
     */
    render(state) {
        domHelpers.empty(this._listContainer);
        this._orderedIds = [];

        const layers = state.layers || [];
        const searchFragments = this._getSearchFragments();

        for (const layer of layers) {
            if (!layer.isVisible) continue;

            let decorations = [];
            if (typeof layer.getAllDecorations === 'function') {
                decorations = layer.getAllDecorations();
            } else if (Array.isArray(layer.decorations)) {
                decorations = layer.decorations;
            } else if (layer.decorations instanceof Map) {
                decorations = Array.from(layer.decorations.values());
            }

            const filteredDecorations = this._filterDecorations(decorations, searchFragments);
            const sortedDecorations = this._sortDecorations(filteredDecorations);

            if (sortedDecorations.length === 0) continue;

            // Layer group header
            const isCollapsed = this._collapsedLayers.has(layer.id);
            const header = domHelpers.createElement('div', {
                className: 'decoration-list__layer-header'
            });
            header.setAttribute('data-layer-id', layer.id);

            const chevron = domHelpers.createElement('span', {
                className: 'decoration-list__layer-chevron'
            });
            chevron.textContent = isCollapsed ? '▶' : '▼';

            const nameSpan = domHelpers.createElement('span', {
                className: 'decoration-list__layer-name',
                textContent: layer.name || `Layer ${layer.id}`
            });

            const countSpan = domHelpers.createElement('span', {
                className: 'decoration-list__layer-count',
                textContent: `${sortedDecorations.length}`
            });

            header.appendChild(chevron);
            header.appendChild(nameSpan);
            header.appendChild(countSpan);

            const layerId = layer.id;
            header.addEventListener('click', () => {
                if (this._collapsedLayers.has(layerId)) {
                    this._collapsedLayers.delete(layerId);
                } else {
                    this._collapsedLayers.add(layerId);
                }
                this.render(this.appStore.getState());
            });

            header.addEventListener('contextmenu', (e) => {
                this._handleLayerHeaderContextMenu(layer, e);
            });

            this._listContainer.appendChild(header);

            // Decoration items wrapper
            const itemsWrapper = domHelpers.createElement('div', {
                className: 'decoration-list__layer-items' + (isCollapsed ? ' collapsed' : '')
            });

            // Decoration items
            if (!isCollapsed) {
                for (const decoration of sortedDecorations) {
                    this._orderedIds.push(decoration.uid);
                    const item = this._createDecorationItem(decoration, layer.id);
                    itemsWrapper.appendChild(item);
                }
            }

            this._listContainer.appendChild(itemsWrapper);
        }

        this._updateSelectionHighlights();
    }

    /**
     * Sort a list of decorations according to the current sort mode.
     * @param {Object[]} decorations
     * @returns {Object[]}
     */
    _sortDecorations(decorations) {
        switch (this._sortMode) {
            case 'newest':
                return [...decorations].reverse();
            case 'az':
                return [...decorations].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            case 'za':
                return [...decorations].sort((a, b) => (b.name || '').localeCompare(a.name || ''));
            default: // 'oldest'
                return decorations;
        }
    }

    /**
     * Normalize a string for searching: lowercase and remove non-alpha characters.
     * @param {string} str
     * @returns {string}
     */
    _normalizeForSearch(str) {
        return str.toLowerCase().replace(/[^a-z]/g, '');
    }

    /**
     * Parse the current search text into normalized fragments.
     * @returns {string[]}
     */
    _getSearchFragments() {
        if (!this._searchText) return [];
        return this._searchText
            .split(/\s+/)
            .map(f => this._normalizeForSearch(f))
            .filter(f => f.length > 0);
    }

    /**
     * Filter a list of decorations by search fragments.
     * A decoration matches if its normalized name contains every fragment.
     * @param {Object[]} decorations
     * @param {string[]} fragments
     * @returns {Object[]}
     */
    _filterDecorations(decorations, fragments) {
        if (fragments.length === 0) return decorations;
        return decorations.filter(d => {
            const normalizedName = this._normalizeForSearch(d.name || d.id || '');
            return fragments.every(f => normalizedName.includes(f));
        });
    }

    /**
     * Create the search bar element.
     * @returns {HTMLElement}
     */
    _createSearchBar() {
        const bar = domHelpers.createElement('div', {
            className: 'decoration-search-bar'
        });
        domHelpers.addInputElement(bar, 'Filter decorations', 200, (value: string) => {
            this._searchText = value;
            this.render(this.appStore.getState());
        });

        return bar;
    }

    /**
     * Toggle the search bar visibility.
     */
    _toggleSearch() {
        if (!this._searchBar) return;
        const isVisible = this._searchBar.classList.contains('visible');
        if (isVisible) {
            this._searchBar.classList.remove('visible');
            if (this._searchDebounceTimer !== null) {
                clearTimeout(this._searchDebounceTimer);
                this._searchDebounceTimer = null;
            }
            this._searchText = '';
            const input = this._searchBar.querySelector('.decoration-search-bar__input');
            if (input) input.value = '';
            const clearBtn = this._searchBar.querySelector('.decoration-search-bar__clear');
            if (clearBtn) clearBtn.style.display = 'none';
            this.render(this.appStore.getState());
        } else {
            this._searchBar.classList.add('visible');
            const input = this._searchBar.querySelector('.decoration-search-bar__input');
            if (input) input.focus();
        }
    }

    /**
     * Create a single decoration list item element
     * @param {Object} decoration - Decoration data
     * @param {string} layerId - Parent layer ID
     * @returns {HTMLElement}
     */
    _createDecorationItem(decoration, layerId) {
        const item = domHelpers.createElement('div', {
            className: 'decoration-list__item'
        });

        item.setAttribute('data-decoration-id', decoration.uid);
        item.setAttribute('data-layer-id', layerId);
        item.setAttribute('draggable', 'true');

        const nameSpan = domHelpers.createElement('span', {
            className: 'decoration-list__item-name',
            textContent: decoration.name || decoration.id
        });

        item.appendChild(nameSpan);

        // Click handler for selection
        item.addEventListener('click', (e) => {
            this._handleItemClick(decoration.uid, e);
        });

        // Drag start — carry selected decoration IDs
        item.addEventListener('dragstart', (e) => {
            this._handleDragStart(decoration.uid, e);
        });

        // Context menu handler
        item.addEventListener('contextmenu', (e) => {
            this._handleContextMenu(decoration.uid, layerId, e);
        });

        // Double-click: open decoration info dialog
        item.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this._handleDecorationInfoOpen(decoration, layerId);
        });

        return item;
    }

    /**
     * Handle click on a decoration item
     * @param {string} decorationId - Clicked decoration ID
     * @param {MouseEvent} event - Mouse event
     */
    _handleItemClick(decorationId, event) {
        if (event.shiftKey && this._anchorId) {
            // Shift+Click: range selection
            this.selectionStore.selectRange(this._anchorId, decorationId, this._orderedIds);
        } else if (event.ctrlKey || event.metaKey) {
            // Ctrl+Click: toggle selection
            this.selectionStore.toggleDecoration(decorationId);
            // Don't update anchor on toggle
        } else {
            // Plain click: single select
            this.selectionStore.selectDecoration(decorationId);
            this._anchorId = decorationId;
        }
    }

    /**
     * Update selection highlight CSS classes on items
     */
    _updateSelectionHighlights() {
        const items = this._listContainer.querySelectorAll('.decoration-list__item');
        items.forEach(item => {
            const id = item.getAttribute('data-decoration-id');
            if (this.selectionStore.isSelected(id)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    /**
     * Get the flat ordered list of visible decoration IDs
     * @returns {string[]}
     */
    getOrderedIds() {
        return [...this._orderedIds];
    }

    getElement() {
        return this.container;
    }

    /**
     * Handle drag start on a decoration item.
     * If the dragged item is selected, drag all selected IDs.
     * If not selected, select it first then drag.
     * @param {string} decorationId - The decoration being dragged
     * @param {DragEvent} event
     */
    _handleDragStart(decorationId, event) {
        // If the dragged item is not already selected, select it
        if (!this.selectionStore.isSelected(decorationId)) {
            this.selectionStore.selectDecoration(decorationId);
        }

        const selectedIds = this.selectionStore.getSelectedIds();
        event.dataTransfer.setData('application/x-decoration-ids', JSON.stringify(selectedIds));
        event.dataTransfer.effectAllowed = 'move';

        // Custom drag image showing count
        const count = selectedIds.length;
        if (count > 1) {
            const dragImage = document.createElement('div');
            dragImage.className = 'decoration-drag-image';
            dragImage.textContent = `${count} decorations`;
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-9999px';
            document.body.appendChild(dragImage);
            event.dataTransfer.setDragImage(dragImage, 0, 0);
            // Clean up after drag
            setTimeout(() => dragImage.remove(), 0);
        }
    }

    /**
     * Handle right-click context menu on a layer group header.
     * Mirrors the context menu from LayerPanel: Select All + Merge to...
     * @param {Layer} layer - The layer
     * @param {MouseEvent} event
     */
    _handleLayerHeaderContextMenu(layer, event) {
        event.preventDefault();
        if (!this._contextMenu) return;

        this.selectionStore.setActiveLayer(layer.id);

        let decorationIds = [];
        if (typeof layer.getAllDecorations === 'function') {
            decorationIds = layer.getAllDecorations().map(d => d.uid);
        } else if (layer.decorations instanceof Map) {
            decorationIds = Array.from(layer.decorations.values()).map(d => d.uid);
        } else if (Array.isArray(layer.decorations)) {
            decorationIds = layer.decorations.map(d => d.uid);
        }

        const state = this.appStore.getState();
        const otherLayers = (state.layers || []).filter(l => l.id !== layer.id);

        const items = [
            {
                label: `Select All (${decorationIds.length})`,
                disabled: decorationIds.length === 0,
                action: () => {
                    this.selectionStore.selectAll(decorationIds);
                }
            },
            {
                label: 'Merge to...',
                disabled: otherLayers.length === 0,
                submenu: otherLayers.map(targetLayer => ({
                    label: targetLayer.name || `Layer ${targetLayer.id}`,
                    action: () => this._confirmAndMergeLayer(layer, targetLayer)
                }))
            }
        ];

        this._contextMenu.show(event.clientX, event.clientY, items);
    }

    /**
     * Show confirmation dialog and execute the merge layer command.
     * @param {Layer} sourceLayer - The layer to merge from (will be deleted)
     * @param {Layer} targetLayer - The layer to merge into
     */
    async _confirmAndMergeLayer(sourceLayer, targetLayer) {
        const decorationCount = typeof sourceLayer.getAllDecorations === 'function'
            ? sourceLayer.getAllDecorations().length
            : 0;
        const decorationText = decorationCount === 1 ? '1 decoration' : `${decorationCount} decorations`;

        const confirmed = await this._confirmDialog.show({
            title: 'Merge Layer',
            message: `Move ${decorationText} from "${sourceLayer.name}" into "${targetLayer.name}" and delete "${sourceLayer.name}"?`,
            confirmLabel: 'Merge',
            cancelLabel: 'Cancel'
        });

        if (!confirmed) return;

        try {
            await this.appService.execute({
                type: 'MergeLayerCommand',
                payload: {
                    sourceLayerId: sourceLayer.id,
                    targetLayerId: targetLayer.id
                }
            });
        } catch (error) {
            console.error('[DecorationListPanel] Error merging layer:', error);
            this.eventBus.publish('ERROR', { message: 'Failed to merge layer' });
        }
    }

    /**
     * Handle right-click context menu on a decoration item.
     * @param {string} decorationId - The decoration ID
     * @param {string} layerId - The layer ID
     * @param {MouseEvent} event
     */
    _handleContextMenu(decorationId, layerId, event) {
        event.preventDefault();
        if (!this._contextMenu || !this.appService) return;

        // If right-clicked item is not selected, select it first
        if (!this.selectionStore.isSelected(decorationId)) {
            this.selectionStore.selectDecoration(decorationId);
        }

        const selectedIds = this.selectionStore.getSelectedIds();
        const count = selectedIds.length;
        const state = this.appStore.getState();
        const layers = state.layers || [];

        // Collect all visible decorations (flat list), then apply search filter
        const allVisibleDecorations = [];
        for (const layer of layers) {
            if (!layer.isVisible) continue;
            let decs = [];
            if (typeof layer.getAllDecorations === 'function') {
                decs = layer.getAllDecorations();
            } else if (Array.isArray(layer.decorations)) {
                decs = layer.decorations;
            } else if (layer.decorations instanceof Map) {
                decs = Array.from(layer.decorations.values());
            }
            allVisibleDecorations.push(...decs);
        }

        const searchFragments = this._getSearchFragments();
        const filteredVisibleDecorations = this._filterDecorations(allVisibleDecorations, searchFragments);

        // Find the type id of the right-clicked decoration
        const clickedDec = filteredVisibleDecorations.find(d => d.uid === decorationId);
        const clickedTypeId = clickedDec ? clickedDec.id : null;

        // Build "Move to Layer" submenu
        const moveSubmenu = layers
            .filter(l => l.id !== layerId)
            .map(l => ({
                label: l.name || `Layer ${l.id}`,
                action: () => {
                    this.appService.execute({
                        type: 'MoveDecorationsCommand',
                        payload: { decorationIds: selectedIds, targetLayerId: l.id }
                    });
                }
            }));

        // Collect decoration IDs in the same layer as the right-clicked item, respecting search filter
        const clickedLayer = layers.find(l => l.id === layerId);
        let layerDecorationIds = [];
        if (clickedLayer) {
            let layerDecorations = [];
            if (typeof clickedLayer.getAllDecorations === 'function') {
                layerDecorations = clickedLayer.getAllDecorations();
            } else if (clickedLayer.decorations instanceof Map) {
                layerDecorations = Array.from(clickedLayer.decorations.values());
            } else if (Array.isArray(clickedLayer.decorations)) {
                layerDecorations = clickedLayer.decorations;
            }
            layerDecorationIds = this._filterDecorations(layerDecorations, searchFragments).map(d => d.uid);
        }

        const items = [];

        // "Select all in layer"
        items.push({
            label: `Select All in Layer (${layerDecorationIds.length})`,
            disabled: layerDecorationIds.length === 0,
            action: () => {
                this.selectionStore.selectAll(layerDecorationIds);
            }
        });

        // "Select all of same type" — only when a type id is known and there are matches
        if (clickedTypeId !== null) {
            const sameTypeUids = filteredVisibleDecorations
                .filter(d => d.id === clickedTypeId)
                .map(d => d.uid);
            if (sameTypeUids.length > 1) {
                items.push({
                    label: `Select All of Same Type (${sameTypeUids.length})`,
                    action: () => {
                        this.selectionStore.selectAll(sameTypeUids);
                    }
                });
            }
        }

        if (moveSubmenu.length > 0) {
            items.push({ label: 'Move to Layer', submenu: moveSubmenu });
        }
        items.push({
            label: `Delete ${count} Decoration${count > 1 ? 's' : ''}`,
            action: () => {
                this.eventBus.publish('confirm:deleteDecorations', { decorationIds: selectedIds });
            }
        });

        this._contextMenu.show(event.clientX, event.clientY, items);
    }

    /**
     * Set the shared ContextMenu instance
     * @param {ContextMenu} contextMenu
     */
    setContextMenu(contextMenu) {
        this._contextMenu = contextMenu;
    }

    /**
     * Set the AppService reference (for late binding)
     * @param {AppService} appService
     */
    setAppService(appService) {
        this.appService = appService;
    }

    /**
     * Set the shared DecorationInfoDialog instance
     * @param {DecorationInfoDialog} decorationInfoDialog
     */
    setDecorationInfoDialog(decorationInfoDialog) {
        this._decorationInfoDialog = decorationInfoDialog;
    }

    /**
     * Open the decoration info dialog for a decoration.
     * Resolves the layer name from the current store state.
     * @param {Object} decoration
     * @param {string} layerId
     */
    _handleDecorationInfoOpen(decoration, layerId) {
        if (!this._decorationInfoDialog) return;
        const state = this.appStore.getState();
        const layers = state.layers || [];
        const layer = layers.find(l => l.id === layerId);
        const layerName = layer ? (layer.name || `Layer ${layer.id}`) : undefined;
        this._decorationInfoDialog.show({ decoration, layerName });
    }
}

export { DecorationListPanel };
