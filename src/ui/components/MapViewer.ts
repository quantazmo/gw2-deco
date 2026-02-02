// @ts-nocheck
/**
 * MapViewer Component
 * Encapsulates SVG map element and rendering
 * Subscribes to ZoomStore changes
 * Renders: tiles, boundary, all layers' circles
 */

import * as renderHelpers from '../renderHelpers.js';
import * as domHelpers from '../domHelpers.js';
import { SelectionRectangle } from './SelectionRectangle.js';

class MapViewer {
    constructor(svgElement, zoomStore, appStore, selectionStore) {
        this.svgElement = svgElement;
        this.zoomStore = zoomStore;
        this.appStore = appStore;
        this.selectionStore = selectionStore || null;
        this.appService = null;

        this.tileGroup = null;
        this.boundaryGroup = null;
        this.layersGroup = null;
        this.decorationsGroup = null;

        // Cache rendered data to avoid recreating on zoom
        this.currentMap = null;
        this.currentLayers = [];

        // Track the last rendered map id to skip unnecessary tile re-renders
        this._lastRenderedMapId = null;

        // Cache decoration circles for fast updates during zoom
        this.decorationCircles = new Map(); // Map<decorationId, SVGCircleElement>

        /** @type {ContextMenu|null} Shared context menu instance */
        this._contextMenu = null;

        /** @type {import('../stores/ToolModeStore.js').ToolModeStore|null} */
        this._toolModeStore = null;

        /** @type {SelectionRectangle|null} */
        this._selectionRect = null;

        /** @type {SVGGElement|null} The top-level container group (has the margin translate transform) */
        this._containerGroup = null;

        this.initialize();
        this.subscribeToChanges();
    }

    /**
     * Initialize SVG structure
     */
    initialize() {
        // Create viewBox and ensure SVG is set up properly
        this.svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        // Find the existing transformed group (created by legacy code) or select first group
        // This ensures MapViewer uses the same coordinate space as legacy rendering
        let containerGroup = this.svgElement.querySelector('g');

        // If no group exists, create a main container group
        if (!containerGroup) {
            containerGroup = renderHelpers.createGroup({ className: 'map-container' });
            this.svgElement.appendChild(containerGroup);
        }

        // Store reference so coordinate correction can be applied during rectangle selection
        this._containerGroup = containerGroup;

        // Create groups for organized rendering inside the container group
        this.tileGroup = renderHelpers.createGroup({ className: 'tiles' });
        this.boundaryGroup = renderHelpers.createGroup({ className: 'boundary' });
        this.layersGroup = renderHelpers.createGroup({ className: 'layers' });
        this.decorationsGroup = renderHelpers.createGroup({ className: 'decorations' });

        // Append to the container group instead of directly to SVG
        containerGroup.appendChild(this.tileGroup);
        containerGroup.appendChild(this.boundaryGroup);
        containerGroup.appendChild(this.layersGroup);
        containerGroup.appendChild(this.decorationsGroup);

        // Bind click handlers for decoration selection
        this._bindSelectionHandlers();
        // Bind pointer handlers for rectangle selection (select mode)
        this._bindRectangleSelectHandlers();
    }

    /**
     * Subscribe to store changes
     */
    subscribeToChanges() {
        // Listen to zoom/pan changes
        if (this.zoomStore && this.zoomStore.onChange) {
            this.zoomStore.onChange((data) => {
                this.updateTransform(data);
            });
        }

        // Listen to app state changes
        if (this.appStore && this.appStore.subscribe) {
            this.appStore.subscribe((state) => {
                this.render(state);
            });
        }

        // Listen to selection changes to update highlights
        if (this.selectionStore && this.selectionStore.subscribe) {
            this.selectionStore.subscribe(() => {
                this._updateSelectionHighlights();
            });
        }
    }

    /**
     * Update SVG transform for zoom and pan
     * @param {Object} transform - Transform with sx, sy, tx, ty
     */
    updateTransform(transform) {
        // Update positions of existing elements instead of recreating them
        // The xZoom/yZoom functions are updated globally before this is called
        if (this.currentMap) {
            this.updateTilePositions(this.currentMap);
            this.updateBoundaryPosition(this.currentMap);
            this.updateDecorationPositions(this.currentLayers);
        }
    }

    /**
     * Render the entire map based on app state
     * @param {Object} state - App state
     */
    render(state) {
        if (!state.map) {
            this.clear();
            return;
        }

        // Cache state for zoom updates
        this.currentMap = state.map;
        this.currentLayers = state.layers || [];

        // Only re-render tiles and boundary when the map itself changes.
        // Layer operations (add, visibility toggle) must not recreate tile
        // <image> elements because doing so causes the browser to reload the
        // tile images, producing a visible flicker.
        if (state.map.id !== this._lastRenderedMapId) {
            this.renderMap(state.map);
            this.renderBoundary(state.map);
            this._lastRenderedMapId = state.map.id;
        }

        this.renderLayers(state.layers);
    }

    /**
     * Render map tiles
     * @param {GW2Map} map - The map to render
     */
    renderMap(map) {
        domHelpers.empty(this.tileGroup);

        if (!map.tiles || !Array.isArray(map.tiles)) {
            return;
        }

        // Use global xZoom/yZoom functions for coordinate transformation
        if (typeof xZoom !== 'function' || typeof yZoom !== 'function') {
            console.error('xZoom/yZoom functions not available');
            return;
        }

        map.tiles.forEach(tile => {
            // Create SVG image element for tile
            const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');

            // Convert world coordinates to screen coordinates
            const x1 = xZoom(tile.mapCoords.x);
            const x2 = xZoom(tile.mapCoords.x + tile.tileSize);
            const y1 = yZoom(tile.mapCoords.y + tile.tileSize);
            const y2 = yZoom(tile.mapCoords.y);
            image.setAttribute('href', tile.url);
            image.setAttribute('x', Math.floor(x1));
            image.setAttribute('y', Math.floor(y1));
            image.setAttribute('width', Math.ceil(x2 - x1));
            image.setAttribute('height', Math.ceil(y2 - y1));
            image.setAttribute('class', 'tile');
            image.setAttribute('preserveAspectRatio', 'none');

            this.tileGroup.appendChild(image);
        });
    }

    /**
     * Render map boundary
     * @param {GW2Map} map - The map to render
     */
    renderBoundary(map) {
        domHelpers.empty(this.boundaryGroup);

        // Handle both map.boundary (array) and map.boundary.points (nested)
        const boundaryPoints = map.boundary?.points || map.boundary;

        if (!boundaryPoints || !Array.isArray(boundaryPoints) || boundaryPoints.length === 0) {
            return;
        }

        // Use global xZoom/yZoom functions for coordinate transformation
        if (typeof window.xZoom !== 'function' || typeof window.yZoom !== 'function') {
            console.error('xZoom/yZoom functions not available');
            return;
        }

        // Convert world coordinates to screen coordinates as [x, y] tuples
        const transformedPoints = boundaryPoints.map(point => [
            window.xZoom(point.x),
            window.yZoom(point.y)
        ]);

        const polygon = renderHelpers.createPolygon(
            transformedPoints,
            {
                fill: 'transparent',
                opacity: 0.25,
                stroke: 'white',
                strokeWidth: 2,
                className: 'boundary'
            }
        );

        this.boundaryGroup.appendChild(polygon);
    }

    /**
     * Render all layers and their decorations
     * @param {Layer[]} layers - Array of layers to render
     */
    renderLayers(layers) {
        domHelpers.empty(this.layersGroup);
        domHelpers.empty(this.decorationsGroup);

        // Clear decoration circle cache
        this.decorationCircles.clear();

        if (!Array.isArray(layers)) {
            return;
        }

        layers.forEach((layer, index) => {
            // Skip rendering hidden layers completely
            if (!layer.isVisible) {
                return;
            }

            const layerGroup = renderHelpers.createGroup({
                className: `layer layer-${layer.id}`,
                id: `layer-${layer.id}`
            });

            layerGroup.setAttribute('data-layer-id', layer.id);

            // Get decorations - handle both Map (domain object) and Array (DTO/plain object)
            let decorations = [];
            if (layer.getAllDecorations && typeof layer.getAllDecorations === 'function') {
                // Layer domain object with getAllDecorations method
                decorations = layer.getAllDecorations();
            } else if (layer.decorations && Array.isArray(layer.decorations)) {
                // Plain object with decorations array
                decorations = layer.decorations;
            } else if (layer.decorations instanceof Map) {
                // Layer with Map of decorations
                decorations = Array.from(layer.decorations.values());
            }

            decorations.forEach(decoration => {
                if (decoration && decoration.position) {
                    const circle = this.createDecorationElement(decoration, layer.color);
                    if (circle) {
                        // Cache the circle for fast zoom updates
                        this.decorationCircles.set(decoration.uid, circle);
                        layerGroup.appendChild(circle);
                    }
                }
            });

            this.decorationsGroup.appendChild(layerGroup);
        });
    }

    /**
     * Create a decoration circle element
     * @param {Decoration} decoration - The decoration to render
     * @param {string} [layerColor] - The layer color to use for the fill
     * @returns {SVGCircleElement}
     */
    createDecorationElement(decoration, layerColor) {
        // Ensure decoration has valid position
        if (!decoration || !decoration.position || typeof decoration.position.x !== 'number' || typeof decoration.position.y !== 'number') {
            console.warn('Invalid decoration position:', decoration);
            return null;
        }

        // Use global xZoom/yZoom functions for coordinate transformation
        if (typeof window.xZoom !== 'function' || typeof window.yZoom !== 'function') {
            console.error('xZoom/yZoom functions not available');
            return null;
        }

        // Convert world coordinates to screen coordinates
        const screenX = window.xZoom(decoration.position.x);
        const screenY = window.yZoom(decoration.position.y);

        const circle = renderHelpers.createCircle(
            screenX,
            screenY,
            5,
            {
                fill: layerColor || decoration.color || '#00d4ff',
                stroke: '#000000',
                strokeWidth: 1,
                className: `decoration decoration-point decoration-${decoration.uid}`,
                opacity: 0.7
            }
        );

        circle.setAttribute('data-decoration-id', decoration.uid);
        circle.setAttribute('title', decoration.name || 'Decoration');

        // Apply selection highlight if already selected
        if (this.selectionStore && this.selectionStore.isSelected(decoration.uid)) {
            circle.classList.add('selected-decoration');
        }

        return circle;
    }

    /**
     * Update tile positions without recreating them (for zoom/pan)
     * @param {GW2Map} map - The map with tile data
     */
    updateTilePositions(map) {
        if (!map.tiles || !Array.isArray(map.tiles)) {
            return;
        }

        if (typeof window.xZoom !== 'function' || typeof window.yZoom !== 'function') {
            return;
        }

        const tileImages = this.tileGroup.querySelectorAll('image');

        map.tiles.forEach((tile, index) => {
            if (tileImages[index]) {
                const x1 = window.xZoom(tile.mapCoords.x);
                const x2 = window.xZoom(tile.mapCoords.x + tile.tileSize);
                const y1 = window.yZoom(tile.mapCoords.y + tile.tileSize);
                const y2 = window.yZoom(tile.mapCoords.y);

                tileImages[index].setAttribute('x', Math.floor(x1));
                tileImages[index].setAttribute('y', Math.floor(y1));
                tileImages[index].setAttribute('width', Math.ceil(x2 - x1));
                tileImages[index].setAttribute('height', Math.ceil(y2 - y1));
            }
        });
    }

    /**
     * Update boundary position without recreating it (for zoom/pan)
     * @param {GW2Map} map - The map with boundary data
     */
    updateBoundaryPosition(map) {
        const boundaryPoints = map.boundary?.points || map.boundary;

        if (!boundaryPoints || !Array.isArray(boundaryPoints) || boundaryPoints.length === 0) {
            return;
        }

        if (typeof window.xZoom !== 'function' || typeof window.yZoom !== 'function') {
            return;
        }

        const polygon = this.boundaryGroup.querySelector('polygon');
        if (polygon) {
            const pointsString = boundaryPoints.map(point =>
                `${window.xZoom(point.x)},${window.yZoom(point.y)}`
            ).join(' ');

            polygon.setAttribute('points', pointsString);
        }
    }

    /**
     * Update decoration positions without recreating them (for zoom/pan)
     * @param {Layer[]} layers - Array of layers with decorations
     */
    updateDecorationPositions(layers) {
        if (!Array.isArray(layers)) {
            return;
        }

        if (typeof window.xZoom !== 'function' || typeof window.yZoom !== 'function') {
            return;
        }

        layers.forEach(layer => {
            if (!layer.isVisible) {
                return;
            }

            let decorations = [];
            if (layer.getAllDecorations && typeof layer.getAllDecorations === 'function') {
                decorations = layer.getAllDecorations();
            } else if (layer.decorations && Array.isArray(layer.decorations)) {
                decorations = layer.decorations;
            } else if (layer.decorations instanceof Map) {
                decorations = Array.from(layer.decorations.values());
            }

            decorations.forEach(decoration => {
                if (decoration && decoration.position) {
                    // Use cached circle reference instead of querySelector
                    const circle = this.decorationCircles.get(decoration.uid);
                    if (circle) {
                        const screenX = window.xZoom(decoration.position.x);
                        const screenY = window.yZoom(decoration.position.y);
                        circle.setAttribute('cx', screenX);
                        circle.setAttribute('cy', screenY);
                    }
                }
            });
        });
    }

    /**
     * Clear all rendered content
     */
    clear() {
        domHelpers.empty(this.tileGroup);
        domHelpers.empty(this.boundaryGroup);
        domHelpers.empty(this.layersGroup);
        domHelpers.empty(this.decorationsGroup);

        // Clear caches
        this.currentMap = null;
        this.currentLayers = [];
        this._lastRenderedMapId = null;
        this.decorationCircles.clear();
    }

    /**
     * Set viewport dimensions
     * @param {number} width - Viewport width
     * @param {number} height - Viewport height
     */
    setViewport(width, height) {
        this.svgElement.setAttribute('width', width);
        this.svgElement.setAttribute('height', height);
        this.svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }

    /**
     * Get screen coordinates from SVG click event
     * @param {MouseEvent} event - The mouse event
     * @returns {Object} {x, y} screen coordinates
     */
    getClickCoordinates(event) {
        const svg = this.svgElement;
        const rect = svg.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        return { x, y };
    }

    /**
     * Bind click handlers on the SVG for decoration selection.
     * Click on decoration → select; Ctrl+Click → toggle; click empty → clear.
     * Hidden-layer decorations are not selectable.
     * In 'select' mode, single clicks on decorations still select; empty-area
     * selection is handled by _bindRectangleSelectHandlers.
     * @private
     */
    _bindSelectionHandlers() {
        // Track whether a drag (pan) occurred between mousedown and click so that
        // releasing the mouse after panning does not clear the selection.
        let panDragOccurred = false;
        let mouseIsDown = false;

        this.svgElement.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            panDragOccurred = false;
            mouseIsDown = true;
        });

        document.addEventListener('mousemove', (e) => {
            if (mouseIsDown && e.buttons === 1) {
                panDragOccurred = true;
            }
        });

        document.addEventListener('mouseup', () => {
            mouseIsDown = false;
        });

        this.svgElement.addEventListener('click', (e) => {
            if (!this.selectionStore) return;

            // In 'select' mode, empty-area clicks are handled by the rectangle
            // pointer handler (the click fires after a zero-distance drag, so we
            // skip the clearSelection here to avoid wiping the just-finished rect).
            const mode = this._toolModeStore ? this._toolModeStore.getMode() : 'pan';

            // Walk from event target up to find a decoration circle
            const circle = e.target.closest ? e.target.closest('[data-decoration-id]') : null;

            if (circle) {
                const decorationId = circle.getAttribute('data-decoration-id');
                // Check that the decoration belongs to a visible layer
                const layerGroup = circle.closest('[data-layer-id]');
                if (layerGroup) {
                    const layerId = layerGroup.getAttribute('data-layer-id');
                    const layer = this.currentLayers.find(l => l.id === layerId);
                    if (layer && !layer.isVisible) {
                        return; // Hidden layer — not selectable
                    }
                }

                if (e.ctrlKey || e.metaKey) {
                    this.selectionStore.toggleDecoration(decorationId);
                } else {
                    this.selectionStore.selectDecoration(decorationId);
                }
            } else if (mode === 'pan') {
                // In pan mode only: clicking empty area clears selection,
                // but only if the mouse was not dragged (panned) beforehand.
                if (!panDragOccurred) {
                    this.selectionStore.clearSelection();
                }
                panDragOccurred = false;
            }
        });
    }

    /**
     * Bind capture-phase mousedown + pointermove/pointerup handlers for
     * rectangle selection in 'select' mode.
     *
     * In 'pan' mode:  nothing extra happens; ZoomHandler takes over.
     * In 'select' mode when clicking on empty SVG area:
     *   - mousedown (capture) blocks ZoomHandler's pan via stopImmediatePropagation
     *   - pointermove draws the selection rectangle
     *   - pointerup finalises, determines enclosed decorations and selects them
     * @private
     */
    _bindRectangleSelectHandlers() {
        let rectInProgress = false;
        let hasMoved = false;

        // Capture-phase mousedown: intercepted before ZoomHandler's bubble listener.
        this.svgElement.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (!this._toolModeStore || !this._selectionRect) return;
            if (this._toolModeStore.getMode() !== 'select') return;

            const circle = e.target.closest ? e.target.closest('[data-decoration-id]') : null;
            if (circle) return; // Decoration click — let normal click handler process it

            // Block ZoomHandler from starting a pan
            e.stopImmediatePropagation();

            hasMoved = false;
            rectInProgress = true;

            const svgCoords = this._getSVGCoords(e);
            this._selectionRect.start(svgCoords.x, svgCoords.y);

            const onMove = (me) => {
                if (!rectInProgress) return;
                hasMoved = true;
                const coords = this._getSVGCoords(me);
                this._selectionRect.update(coords.x, coords.y);
            };

            const onUp = (me) => {
                if (!rectInProgress) return;
                rectInProgress = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);

                const bounds = this._selectionRect.finish();

                if (!this.selectionStore) return;

                if (hasMoved && bounds && (bounds.width > 2 || bounds.height > 2)) {
                    // Select decorations within the rectangle.
                    // bounds are in SVG root coordinates (_getSVGCoords uses svgElement.getScreenCTM).
                    // Decoration cx/cy attributes are in the container group's local coordinate
                    // space (offset by the group's translate transform, e.g. translate(10,10)).
                    // Subtract the group offset so both are in the same coordinate system.
                    const groupOffset = this._getContainerGroupOffset();
                    const groupBounds = {
                        x: bounds.x - groupOffset.x,
                        y: bounds.y - groupOffset.y,
                        width: bounds.width,
                        height: bounds.height
                    };
                    const ids = this._selectionRect.getDecorationsInBounds(
                        groupBounds, this.decorationCircles
                    );
                    // Filter to only visible-layer decorations
                    const visibleIds = ids.filter(id => {
                        const circle = this.decorationCircles.get(id);
                        if (!circle) return false;
                        const layerGroup = circle.closest('[data-layer-id]');
                        if (!layerGroup) return false;
                        const layerId = layerGroup.getAttribute('data-layer-id');
                        const layer = this.currentLayers.find(l => l.id === layerId);
                        return layer && layer.isVisible;
                    });

                    if (me.shiftKey) {
                        // Shift (with or without Ctrl): remove from selection
                        this.selectionStore.removeFromSelection(visibleIds);
                    } else if (me.ctrlKey || me.metaKey) {
                        // Ctrl only: additive — add to current selection
                        this.selectionStore.addToSelection(visibleIds);
                    } else {
                        // No modifier: replace selection
                        this.selectionStore.selectAll(visibleIds);
                    }
                } else if (!hasMoved) {
                    // Zero-distance click on empty area → clear selection
                    this.selectionStore.clearSelection();
                }
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        }, true); // capture phase
    }

    /**
     * Convert a MouseEvent's clientX/Y to SVG coordinate space.
     * @param {MouseEvent} e
     * @returns {{ x: number, y: number }}
     * @private
     */
    /**
     * Return the {x, y} translation from the container group's transform attribute.
     * Decoration cx/cy values are in this group's local coordinate space, so the
     * result is used to shift selection bounds into that same space before hit-testing.
     * @returns {{ x: number, y: number }}
     * @private
     */
    _getContainerGroupOffset() {
        if (!this._containerGroup) return { x: 0, y: 0 };
        const transform = this._containerGroup.getAttribute('transform') || '';
        const match = /translate\(\s*([+-]?\d*\.?\d+)\s*,\s*([+-]?\d*\.?\d+)\s*\)/.exec(transform);
        if (!match) return { x: 0, y: 0 };
        return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
    }

    _getSVGCoords(e) {
        let point;
        try {
            // createSVGPoint is standard but may be unavailable in some JSDOM versions
            point = this.svgElement.createSVGPoint();
            point.x = e.clientX;
            point.y = e.clientY;
            const ctm = this.svgElement.getScreenCTM();
            if (ctm) {
                return point.matrixTransform(ctm.inverse());
            }
        } catch (_) { /* fallback below */ }

        // Fallback: subtract bounding rect
        const rect = this.svgElement.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    /**
     * Update visual selection highlights on decoration circles.
     * @private
     */
    _updateSelectionHighlights() {
        for (const [id, circle] of this.decorationCircles) {
            if (this.selectionStore && this.selectionStore.isSelected(id)) {
                circle.classList.add('selected-decoration');
                // Move to end of parent so it renders on top of non-selected decorations
                if (circle.parentNode) {
                    circle.parentNode.appendChild(circle);
                }
            } else {
                circle.classList.remove('selected-decoration');
            }
        }
    }

    /**
     * Set the selection store (for late binding)
     * @param {SelectionStore} selectionStore
     */
    setSelectionStore(selectionStore) {
        this.selectionStore = selectionStore;
    }

    /**
     * Set the ToolModeStore (for late binding).
     * Creates a SelectionRectangle on the SVG for rectangle selection.
     * @param {import('../stores/ToolModeStore.js').ToolModeStore} toolModeStore
     */
    setToolModeStore(toolModeStore) {
        this._toolModeStore = toolModeStore;
        this._selectionRect = new SelectionRectangle(this.svgElement);

        // Update SVG cursor when mode changes
        toolModeStore.subscribe((mode) => {
            this.svgElement.style.cursor = mode === 'select' ? 'crosshair' : 'grab';
            this._updateSelectionIndicator();
        });

        this._initSelectionModeIndicator();
    }

    /**
     * Create and manage the floating +/- indicator near the cursor in select mode.
     * @private
     */
    _initSelectionModeIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'selection-mode-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        document.body.appendChild(indicator);
        this._selectionIndicator = indicator;
        this._indicatorMouseX = 0;
        this._indicatorMouseY = 0;
        this._indicatorCtrl = false;
        this._indicatorShift = false;

        const update = () => this._updateSelectionIndicator();

        this.svgElement.addEventListener('mousemove', (e) => {
            this._indicatorMouseX = e.clientX;
            this._indicatorMouseY = e.clientY;
            this._indicatorCtrl = e.ctrlKey || e.metaKey;
            this._indicatorShift = e.shiftKey;
            update();
        });

        this.svgElement.addEventListener('mouseleave', () => {
            if (this._selectionIndicator) {
                this._selectionIndicator.style.display = 'none';
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Control' || e.key === 'Meta') this._indicatorCtrl = true;
            if (e.key === 'Shift') this._indicatorShift = true;
            update();
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'Control' || e.key === 'Meta') this._indicatorCtrl = false;
            if (e.key === 'Shift') this._indicatorShift = false;
            update();
        });
    }

    /**
     * Update the selection mode indicator position and label.
     * @private
     */
    _updateSelectionIndicator() {
        const el = this._selectionIndicator;
        if (!el) return;

        const inSelectMode = this._toolModeStore && this._toolModeStore.getMode() === 'select';
        if (!inSelectMode) {
            el.style.display = 'none';
            return;
        }

        if (this._indicatorShift) {
            el.textContent = '−';
            el.className = 'selection-mode-indicator selection-mode-indicator--remove';
        } else if (this._indicatorCtrl) {
            el.textContent = '+';
            el.className = 'selection-mode-indicator selection-mode-indicator--add';
        } else {
            el.style.display = 'none';
            return;
        }

        el.style.display = 'block';
        el.style.left = (this._indicatorMouseX + 18) + 'px';
        el.style.top = (this._indicatorMouseY + 18) + 'px';
    }

    /**
     * Set the AppService reference (for late binding)
     * @param {AppService} appService
     */
    setAppService(appService) {
        this.appService = appService;
    }

    /**
     * Set the shared ContextMenu instance
     * @param {ContextMenu} contextMenu
     */
    setContextMenu(contextMenu) {
        this._contextMenu = contextMenu;
        this._bindContextMenuHandler();
        this._bindDragHandlers();
    }

    /**
     * Bind right-click context menu on selected decoration circles.
     * @private
     */
    _bindContextMenuHandler() {
        this.svgElement.addEventListener('contextmenu', (e) => {
            if (!this._contextMenu || !this.selectionStore || !this.appService) return;

            const circle = e.target.closest ? e.target.closest('[data-decoration-id]') : null;
            if (!circle) return;

            const decorationId = circle.getAttribute('data-decoration-id');

            // Check visible layer
            const layerGroup = circle.closest('[data-layer-id]');
            if (layerGroup) {
                const layerId = layerGroup.getAttribute('data-layer-id');
                const layer = this.currentLayers.find(l => l.id === layerId);
                if (layer && !layer.isVisible) return;
            }

            // If right-clicked decoration is not selected, select it first
            if (!this.selectionStore.isSelected(decorationId)) {
                this.selectionStore.selectDecoration(decorationId);
            }

            e.preventDefault();

            const selectedIds = this.selectionStore.getSelectedIds();
            const count = selectedIds.length;
            const state = this.appStore.getState();
            const layers = state.layers || [];

            const moveSubmenu = layers.map(l => ({
                label: l.name || `Layer ${l.id}`,
                action: () => {
                    this.appService.execute({
                        type: 'MoveDecorationsCommand',
                        payload: { decorationIds: selectedIds, targetLayerId: l.id }
                    });
                }
            }));

            const items = [];
            if (moveSubmenu.length > 0) {
                items.push({ label: 'Move to Layer', submenu: moveSubmenu });
            }
            items.push({
                label: `Delete ${count} Decoration${count > 1 ? 's' : ''}`,
                action: () => {
                    this.appService.execute({
                        type: 'DeleteDecorationsCommand',
                        payload: { decorationIds: selectedIds }
                    });
                }
            });

            this._contextMenu.show(e.clientX, e.clientY, items);
        });
    }

    /**
     * Bind dragstart on SVG decoration circles for DnD to Layer Panel.
     * SVG elements don't have native draggable support, so we use
     * mousedown + mousemove to initiate a manual drag via a hidden helper element.
     * @private
     */
    _bindDragHandlers() {
        // Use a helper HTML element overlaid on SVG to enable native drag
        let dragHelper = null;

        this.svgElement.addEventListener('mousedown', (e) => {
            if (!this.selectionStore) return;
            if (e.button !== 0) return; // left click only

            const circle = e.target.closest ? e.target.closest('[data-decoration-id]') : null;
            if (!circle) return;

            const decorationId = circle.getAttribute('data-decoration-id');
            if (!this.selectionStore.isSelected(decorationId)) return;

            // Create a hidden draggable helper element for native HTML DnD
            dragHelper = document.createElement('div');
            dragHelper.setAttribute('draggable', 'true');
            dragHelper.style.position = 'fixed';
            dragHelper.style.left = `${e.clientX - 5}px`;
            dragHelper.style.top = `${e.clientY - 5}px`;
            dragHelper.style.width = '10px';
            dragHelper.style.height = '10px';
            dragHelper.style.opacity = '0';
            dragHelper.style.zIndex = '9999';
            document.body.appendChild(dragHelper);

            dragHelper.addEventListener('dragstart', (de) => {
                const selectedIds = this.selectionStore.getSelectedIds();
                de.dataTransfer.setData('application/x-decoration-ids', JSON.stringify(selectedIds));
                de.dataTransfer.effectAllowed = 'move';

                const count = selectedIds.length;
                if (count > 0) {
                    const dragImage = document.createElement('div');
                    dragImage.className = 'decoration-drag-image';
                    dragImage.textContent = `${count} decoration${count > 1 ? 's' : ''}`;
                    dragImage.style.position = 'absolute';
                    dragImage.style.top = '-9999px';
                    document.body.appendChild(dragImage);
                    de.dataTransfer.setDragImage(dragImage, 0, 0);
                    setTimeout(() => document.body.removeChild(dragImage), 0);
                }
            });

            dragHelper.addEventListener('dragend', () => {
                if (dragHelper && dragHelper.parentNode) {
                    dragHelper.parentNode.removeChild(dragHelper);
                }
                dragHelper = null;
            });

            // Programmatically trigger dragstart on the helper
            // Use a small delay so the helper is in the DOM
            setTimeout(() => {
                if (dragHelper) {
                    const dragEvent = new DragEvent('dragstart', {
                        bubbles: true,
                        cancelable: true,
                        dataTransfer: new DataTransfer()
                    });
                    dragHelper.dispatchEvent(dragEvent);
                }
            }, 0);
        });
    }
}

export { MapViewer };
