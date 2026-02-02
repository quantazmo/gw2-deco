// @ts-nocheck
/**
 * DropZoneOverlay
 * Renders semi-transparent edge highlight strips on the viewport during panel drag
 * operations to indicate valid drop zones. Also renders a full-panel translucent
 * overlay on the target panel when a tab-merge (center) drop zone is detected.
 *
 * Two-tier visual system:
 *   1. On drag start: all valid drop zones shown with subtle passive indicators.
 *   2. On hover: the specific zone under the cursor intensifies to confirm the target.
 *
 * Uses pointer-events: none so it never interferes with mouse event tracking.
 * Responds to layout:drag-start, layout:drag-move, and layout:drag-end events.
 */

import { PANEL_IDS } from '../../config/constants.js';

export class DropZoneOverlay {
    constructor() {
        /** @type {HTMLElement | null} */
        this._overlay = null;
        /** @type {Record<string, HTMLElement>} */
        this._zoneElements = {};
        /** @type {HTMLElement | null} */
        this._centerHighlight = null;
        /** @type {string | null} */
        this._activeCenterPanelId = null;
        /** @type {HTMLElement | null} */
        this._edgeHighlight = null;
        /** @type {string | null} */
        this._activeEdgePanelId = null;
        /** @type {string | null} */
        this._activeEdge = null;
        /** @type {HTMLElement | null} Preview outline showing the resulting layout position. */
        this._previewOutline = null;
        /** @type {string | null} */
        this._activePreviewKey = null;
        /** @type {HTMLElement[]} Panel-level passive affordance overlays. */
        this._panelAffordances = [];
    }

    /**
     * Subscribe to EventBus drag events and mount the overlay into the DOM.
     * @param {object} eventBus  EventBus with subscribe() and publish() methods
     */
    attach(eventBus) {
        this._createElement();

        eventBus.subscribe('layout:drag-start', ({ panelId }) => this._show(panelId));
        eventBus.subscribe('layout:drag-move', ({ dropZone }) => this._highlight(dropZone));
        eventBus.subscribe('layout:drag-end', () => this._hide());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private: DOM management
    // ─────────────────────────────────────────────────────────────────────────

    _createElement() {
        const overlay = document.createElement('div');
        overlay.className = 'drop-zone-overlay';

        for (const edge of ['left', 'right']) {
            const zone = document.createElement('div');
            zone.className = `drop-zone drop-zone-${edge}`;
            zone.dataset.edge = edge;
            overlay.appendChild(zone);
            this._zoneElements[edge] = zone;
        }

        this._overlay = overlay;

        // Panel-center highlight: a fixed-position translucent overlay that tracks
        // the bounding rect of the target panel during a tab-merge drag.
        const centerHighlight = document.createElement('div');
        centerHighlight.className = 'drop-zone-center-highlight';
        centerHighlight.dataset.zoneType = 'tab-merge';
        centerHighlight.hidden = true;
        document.body.appendChild(centerHighlight);
        this._centerHighlight = centerHighlight;

        // Panel-edge highlight: covers half of the target panel to show where the split will appear.
        const edgeHighlight = document.createElement('div');
        edgeHighlight.className = 'drop-zone-edge-highlight';
        edgeHighlight.dataset.zoneType = 'stack';
        edgeHighlight.hidden = true;
        document.body.appendChild(edgeHighlight);
        this._edgeHighlight = edgeHighlight;

        // Preview outline: a dashed outline showing the resulting panel placement.
        const previewOutline = document.createElement('div');
        previewOutline.className = 'drop-zone-preview-outline';
        previewOutline.hidden = true;
        document.body.appendChild(previewOutline);
        this._previewOutline = previewOutline;

        // Initially hidden — shown only during a drag
        this._overlay.hidden = true;
        document.body.appendChild(this._overlay);
    }

    /**
     * Show all passive drop zone indicators when a drag begins.
     * @param {string} [draggedPanelId]  The panel being dragged (excluded from affordances)
     */
    _show(draggedPanelId) {
        if (this._overlay) {
            this._overlay.hidden = false;
            // Add passive class to reveal edge zones at low opacity
            this._overlay.classList.add('dragging');
        }
        this._showPanelAffordances(draggedPanelId);
    }

    _hide() {
        if (this._overlay) {
            this._overlay.hidden = true;
            this._overlay.classList.remove('dragging');
            // Clear any active highlights
            for (const zone of Object.values(this._zoneElements)) {
                zone.classList.remove('active');
            }
        }
        this._hideCenterHighlight();
        this._hideEdgeHighlight();
        this._hidePreviewOutline();
        this._hidePanelAffordances();
    }

    /**
     * Highlight the appropriate edge zone based on current drop zone detection.
     * For tab-merge drop zones, shows the panel-center highlight instead.
     *
     * @param {{ type: string, edge?: string, targetPanelId?: string } | null} dropZone
     */
    _highlight(dropZone) {
        // Clear previous edge highlights
        for (const zone of Object.values(this._zoneElements)) {
            zone.classList.remove('active');
        }

        if (dropZone && dropZone.type === 'edge' && this._zoneElements[dropZone.edge]) {
            this._zoneElements[dropZone.edge].classList.add('active');
            this._hideCenterHighlight();
            this._hideEdgeHighlight();
            this._showEdgePreviewOutline(dropZone.edge);
        } else if (dropZone && dropZone.type === 'tab-merge') {
            this._showCenterHighlight(dropZone.targetPanelId);
            this._hideEdgeHighlight();
            this._showTabMergePreviewOutline(dropZone.targetPanelId);
        } else if (dropZone && dropZone.type === 'stack') {
            this._showEdgeHighlight(dropZone.targetPanelId, dropZone.edge);
            this._hideCenterHighlight();
            this._showStackPreviewOutline(dropZone.targetPanelId, dropZone.edge);
        } else {
            this._hideCenterHighlight();
            this._hideEdgeHighlight();
            this._hidePreviewOutline();
        }
    }

    /**
     * Position and show the full-panel center highlight over the target panel.
     * @param {string} targetPanelId
     * @private
     */
    _showCenterHighlight(targetPanelId) {
        if (!this._centerHighlight) return;

        // Only re-query the DOM if the target has changed
        if (this._activeCenterPanelId === targetPanelId) {
            this._centerHighlight.hidden = false;
            return;
        }

        const targetEl = document.querySelector(`.dock-region[data-panel-id="${targetPanelId}"]`);
        if (!targetEl) {
            this._hideCenterHighlight();
            return;
        }

        const rect = targetEl.getBoundingClientRect();
        this._centerHighlight.style.left = `${rect.left}px`;
        this._centerHighlight.style.top = `${rect.top}px`;
        this._centerHighlight.style.width = `${rect.width}px`;
        this._centerHighlight.style.height = `${rect.height}px`;
        this._centerHighlight.hidden = false;
        this._activeCenterPanelId = targetPanelId;
    }

    /**
     * @private
     */
    _hideCenterHighlight() {
        if (this._centerHighlight) {
            this._centerHighlight.hidden = true;
        }
        this._activeCenterPanelId = null;
    }

    /**
     * Show a half-panel translucent overlay on the drop edge of the target panel.
     * @param {string} targetPanelId
     * @param {'top'|'bottom'|'left'|'right'} edge
     * @private
     */
    _showEdgeHighlight(targetPanelId, edge) {
        if (!this._edgeHighlight) return;

        // Only re-query the DOM if target or edge has changed
        if (this._activeEdgePanelId === targetPanelId && this._activeEdge === edge) {
            this._edgeHighlight.hidden = false;
            return;
        }

        const targetEl = document.querySelector(`.dock-region[data-panel-id="${targetPanelId}"]`);
        if (!targetEl) {
            this._hideEdgeHighlight();
            return;
        }

        const rect = targetEl.getBoundingClientRect();
        let left, top, width, height;

        switch (edge) {
            case 'top':
                left = rect.left; top = rect.top;
                width = rect.width; height = rect.height / 2;
                break;
            case 'bottom':
                left = rect.left; top = rect.top + rect.height / 2;
                width = rect.width; height = rect.height / 2;
                break;
            case 'left':
                left = rect.left; top = rect.top;
                width = rect.width / 2; height = rect.height;
                break;
            case 'right':
                left = rect.left + rect.width / 2; top = rect.top;
                width = rect.width / 2; height = rect.height;
                break;
            default:
                this._hideEdgeHighlight();
                return;
        }

        this._edgeHighlight.style.left = `${left}px`;
        this._edgeHighlight.style.top = `${top}px`;
        this._edgeHighlight.style.width = `${width}px`;
        this._edgeHighlight.style.height = `${height}px`;
        this._edgeHighlight.hidden = false;
        this._activeEdgePanelId = targetPanelId;
        this._activeEdge = edge;
    }

    /**
     * @private
     */
    _hideEdgeHighlight() {
        if (this._edgeHighlight) {
            this._edgeHighlight.hidden = true;
        }
        this._activeEdgePanelId = null;
        this._activeEdge = null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Preview outline (T069): shows resulting panel placement as a dashed border
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Show a preview outline at a viewport edge, indicating where the panel will dock.
     * @param {'left'|'right'|'top'|'bottom'} edge
     * @private
     */
    _showEdgePreviewOutline(edge) {
        if (!this._previewOutline) return;
        const key = `edge:${edge}`;
        if (this._activePreviewKey === key) {
            this._previewOutline.hidden = false;
            return;
        }

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        // Estimate ~25% of viewport for the docked panel
        const dockSize = 0.25;

        let left, top, width, height;
        switch (edge) {
            case 'left':
                left = 0; top = 0;
                width = vw * dockSize; height = vh;
                break;
            case 'right':
                left = vw * (1 - dockSize); top = 0;
                width = vw * dockSize; height = vh;
                break;
            case 'top':
                left = 0; top = 0;
                width = vw; height = vh * dockSize;
                break;
            case 'bottom':
                left = 0; top = vh * (1 - dockSize);
                width = vw; height = vh * dockSize;
                break;
            default:
                this._hidePreviewOutline();
                return;
        }

        this._previewOutline.dataset.zoneType = 'edge';
        this._previewOutline.style.left = `${left}px`;
        this._previewOutline.style.top = `${top}px`;
        this._previewOutline.style.width = `${width}px`;
        this._previewOutline.style.height = `${height}px`;
        this._previewOutline.hidden = false;
        this._activePreviewKey = key;
    }

    /**
     * Show a preview outline over the target panel for a tab-merge drop.
     * @param {string} targetPanelId
     * @private
     */
    _showTabMergePreviewOutline(targetPanelId) {
        if (!this._previewOutline) return;
        const key = `tab-merge:${targetPanelId}`;
        if (this._activePreviewKey === key) {
            this._previewOutline.hidden = false;
            return;
        }

        const targetEl = document.querySelector(`.dock-region[data-panel-id="${targetPanelId}"]`)
            || document.querySelector(`.tabbed-container[data-panel-ids*="${targetPanelId}"]`);
        if (!targetEl) {
            this._hidePreviewOutline();
            return;
        }

        const rect = targetEl.getBoundingClientRect();
        this._previewOutline.dataset.zoneType = 'tab-merge';
        this._previewOutline.style.left = `${rect.left}px`;
        this._previewOutline.style.top = `${rect.top}px`;
        this._previewOutline.style.width = `${rect.width}px`;
        this._previewOutline.style.height = `${rect.height}px`;
        this._previewOutline.hidden = false;
        this._activePreviewKey = key;
    }

    /**
     * Show a preview outline for one half of the target panel in a stack drop.
     * @param {string} targetPanelId
     * @param {'top'|'bottom'|'left'|'right'} edge
     * @private
     */
    _showStackPreviewOutline(targetPanelId, edge) {
        if (!this._previewOutline) return;
        const key = `stack:${targetPanelId}:${edge}`;
        if (this._activePreviewKey === key) {
            this._previewOutline.hidden = false;
            return;
        }

        const targetEl = document.querySelector(`.dock-region[data-panel-id="${targetPanelId}"]`);
        if (!targetEl) {
            this._hidePreviewOutline();
            return;
        }

        const rect = targetEl.getBoundingClientRect();
        let left, top, width, height;
        switch (edge) {
            case 'top':
                left = rect.left; top = rect.top;
                width = rect.width; height = rect.height / 2;
                break;
            case 'bottom':
                left = rect.left; top = rect.top + rect.height / 2;
                width = rect.width; height = rect.height / 2;
                break;
            case 'left':
                left = rect.left; top = rect.top;
                width = rect.width / 2; height = rect.height;
                break;
            case 'right':
                left = rect.left + rect.width / 2; top = rect.top;
                width = rect.width / 2; height = rect.height;
                break;
            default:
                this._hidePreviewOutline();
                return;
        }

        this._previewOutline.dataset.zoneType = 'stack';
        this._previewOutline.style.left = `${left}px`;
        this._previewOutline.style.top = `${top}px`;
        this._previewOutline.style.width = `${width}px`;
        this._previewOutline.style.height = `${height}px`;
        this._previewOutline.hidden = false;
        this._activePreviewKey = key;
    }

    /**
     * @private
     */
    _hidePreviewOutline() {
        if (this._previewOutline) {
            this._previewOutline.hidden = true;
        }
        this._activePreviewKey = null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Panel-level passive affordances (T072b): subtle overlay on eligible panels
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Show a subtle affordance overlay on every eligible panel (non-map, non-dragged)
     * to indicate they accept drops.
     * @param {string} [draggedPanelId]
     * @private
     */
    _showPanelAffordances(draggedPanelId) {
        this._hidePanelAffordances();

        const panels = document.querySelectorAll('.dock-region[data-panel-id]');
        for (const panelEl of panels) {
            const pid = panelEl.dataset.panelId;
            if (pid === draggedPanelId || pid === PANEL_IDS.MAP) continue;

            const rect = panelEl.getBoundingClientRect();
            const affordance = document.createElement('div');
            affordance.className = 'panel-drop-affordance';
            affordance.style.left = `${rect.left}px`;
            affordance.style.top = `${rect.top}px`;
            affordance.style.width = `${rect.width}px`;
            affordance.style.height = `${rect.height}px`;
            document.body.appendChild(affordance);
            this._panelAffordances.push(affordance);
        }
    }

    /**
     * Remove all panel-level affordance overlays.
     * @private
     */
    _hidePanelAffordances() {
        for (const el of this._panelAffordances) {
            el.remove();
        }
        this._panelAffordances = [];
    }
}
