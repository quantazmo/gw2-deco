// @ts-nocheck
/**
 * PanelDragManager
 * Controller for panel drag-and-drop interactions.
 *
 * Responsibilities:
 *  - Listens for mousedown on DockRegion title bars and TabbedContainer tab buttons (data-drag-handle)
 *  - Tracks cursor position via document-level mousemove
 *  - Detects viewport edge drop zones using EDGE_THRESHOLD_PX
 *  - Detects panel-center drop zones (center 60% of panel bounding rect) for tab-merge
 *  - Dispatches DockPanelCommand on edge drop or MergePanelToTabCommand on panel-center drop
 *  - Cancels (no dispatch) when cursor is released outside a valid zone
 *  - Publishes layout:drag-start, layout:drag-move, layout:drag-end via EventBus
 */

import { LAYOUT, PANEL_IDS } from '../../config/constants.js';
import { DockPanelCommand } from '../../application/commands/DockPanelCommand.js';
import { MergePanelToTabCommand } from '../../application/commands/MergePanelToTabCommand.js';
import { StackPanelCommand } from '../../application/commands/StackPanelCommand.js';
import { ReorderPanelCommand } from '../../application/commands/ReorderPanelCommand.js';

/** The center zone covers the inner 60% (20% margin on each side). */
const CENTER_ZONE_MARGIN = 0.20;

/** The panel-edge stack zone covers the outer 20px on each side of a panel. */
const PANEL_EDGE_THRESHOLD_PX = 20;

/** Minimum mouse distance (px) before a mousedown is treated as a real drag. */
const DRAG_DISTANCE_THRESHOLD = 5;

export class PanelDragManager {
    /**
     * @param {object}      appService   AppService with an execute() method
     * @param {object}      eventBus     EventBus with publish() method
     * @param {object|null} layoutStore  LayoutStore for sibling-relationship look-ups
     */
    constructor(appService, eventBus, layoutStore = null) {
        this._appService = appService;
        this._eventBus = eventBus;
        this._layoutStore = layoutStore;

        // Bound handlers for add/removeEventListener symmetry
        this._onDocumentMouseMove = this._onDocumentMouseMove.bind(this);
        this._onDocumentMouseUp = this._onDocumentMouseUp.bind(this);

        /** @type {{ panelId: string, startX: number, startY: number } | null} */
        this._dragging = null;

        /** @type {{ panelId: string, startX: number, startY: number, sourceRect: DOMRect } | null} */
        this._pending = null;

        /** @type {HTMLElement | null} Ghost element that follows the cursor during drag. */
        this._ghost = null;
    }

    /**
     * Attach to a root element: listen for mousedown on all drag-handle title bars within it.
     * @param {HTMLElement} rootElement
     */
    attach(rootElement) {
        this._rootElement = rootElement;
        rootElement.addEventListener('mousedown', (e) => {
            const handle = e.target.closest('[data-drag-handle]');
            if (!handle) return;

            const panelId = handle.dataset.panelId;
            if (!panelId) return;

            // Track whether this drag originates from a tab bar (for reorder vs extraction)
            const sourceTabBar = handle.closest('.tab-bar');

            e.preventDefault();
            this._pending = {
                panelId,
                startX: e.clientX,
                startY: e.clientY,
                sourceRect: handle.getBoundingClientRect(),
                sourceTabBar,
            };

            document.addEventListener('mousemove', this._onDocumentMouseMove);
            document.addEventListener('mouseup', this._onDocumentMouseUp);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private: drag lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    _startDrag(panelId, sourceRect) {
        this._dragging = { panelId };
        this._pending = null;

        this._ghost = this._createGhost(panelId, sourceRect);

        this._eventBus.publish('layout:drag-start', {
            panelId,
            sourceType: 'panel',
            sourceRect: {
                x: sourceRect.left,
                y: sourceRect.top,
                width: sourceRect.width,
                height: sourceRect.height,
            },
        });
    }

    _onDocumentMouseMove(e) {
        // Promote pending mousedown to a real drag once distance threshold is exceeded
        if (this._pending && !this._dragging) {
            const dx = e.clientX - this._pending.startX;
            const dy = e.clientY - this._pending.startY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < DRAG_DISTANCE_THRESHOLD) return;

            // For tab-bar–sourced drags, only promote to a real drag when the
            // cursor is outside the tab bar. Within-bar movement is handled by
            // TabbedContainer's in-bar reorder logic.
            if (this._pending.sourceTabBar) {
                const barRect = this._pending.sourceTabBar.getBoundingClientRect();
                const inBar = e.clientX >= barRect.left && e.clientX <= barRect.right &&
                    e.clientY >= barRect.top && e.clientY <= barRect.bottom;
                if (inBar) return;
            }

            this._startDrag(this._pending.panelId, this._pending.sourceRect);
        }

        if (!this._dragging) return;

        // Move ghost to follow cursor
        if (this._ghost) {
            this._ghost.style.transform = `translate(${e.clientX + 12}px, ${e.clientY + 12}px)`;
        }

        const dropZone = this._detectDropZone(e.clientX, e.clientY);

        this._eventBus.publish('layout:drag-move', {
            panelId: this._dragging.panelId,
            cursorX: e.clientX,
            cursorY: e.clientY,
            dropZone,
        });
    }

    _onDocumentMouseUp(e) {
        // If the mouse was released before exceeding the drag threshold, it's a click — cancel.
        if (this._pending && !this._dragging) {
            this._pending = null;
            document.removeEventListener('mousemove', this._onDocumentMouseMove);
            document.removeEventListener('mouseup', this._onDocumentMouseUp);
            return;
        }

        if (!this._dragging) return;

        const dropZone = this._detectDropZone(e.clientX, e.clientY);
        const panelId = this._dragging.panelId;

        this._endDrag();

        const cancelled = !dropZone;

        if (!cancelled) {
            if (dropZone.type === 'edge') {
                this._appService.execute(new DockPanelCommand(panelId, dropZone.edge));
            } else if (dropZone.type === 'tab-merge') {
                this._appService.execute(new MergePanelToTabCommand(panelId, dropZone.targetPanelId));
            } else if (dropZone.type === 'stack') {
                // If panelId and targetPanelId are siblings in the same SplitNode,
                // reorder them instead of creating a new nested split.
                const sibling = this._findSiblingRelationship(panelId, dropZone.targetPanelId);
                if (sibling) {
                    // Only reorder if the drop edge implies a different position.
                    // e.g. dragging the second child to the "bottom" of the first
                    // in a horizontal split is already correct — skip the no-op.
                    const wantsFirst = dropZone.edge === 'top' || dropZone.edge === 'left';
                    const isCurrentlyFirst = sibling.fromIndex === 0;
                    if (wantsFirst !== isCurrentlyFirst) {
                        this._appService.execute(
                            new ReorderPanelCommand('stack', sibling.nodePath, sibling.fromIndex, sibling.toIndex)
                        );
                    }
                } else {
                    this._appService.execute(
                        new StackPanelCommand(panelId, dropZone.targetPanelId, dropZone.edge)
                    );
                }
            }
        }

        this._eventBus.publish('layout:drag-end', {
            panelId,
            dropZone,
            cancelled,
        });
    }

    _endDrag() {
        document.removeEventListener('mousemove', this._onDocumentMouseMove);
        document.removeEventListener('mouseup', this._onDocumentMouseUp);
        this._dragging = null;
        this._pending = null;
        if (this._ghost) {
            this._ghost.remove();
            this._ghost = null;
        }
    }

    /**
     * Create a semi-transparent ghost panel that follows the cursor during drag.
     * @param {string}  panelId
     * @param {DOMRect} sourceRect  Bounding rect of the drag-handle (title bar)
     * @returns {HTMLElement}
     * @private
     */
    _createGhost(panelId, sourceRect) {
        // Resolve the panel label from the title bar text if available
        const titleEl = this._rootElement
            ? this._rootElement.querySelector(`[data-panel-id="${panelId}"] .dock-region-title-text`)
            : null;
        const label = titleEl ? titleEl.textContent : panelId;

        const ghost = document.createElement('div');
        ghost.className = 'panel-drag-ghost';
        ghost.textContent = label;
        ghost.style.width = `${Math.min(sourceRect.width, 180)}px`;
        // Start positioned off-screen; first mousemove will place it correctly
        ghost.style.transform = 'translate(-9999px, -9999px)';
        document.body.appendChild(ghost);
        return ghost;
    }

    /**
     * Detect the best available drop zone for the current cursor position.
     * Priority: viewport edge > panel edge (stack) > panel center (tab-merge)
     *
     * @param {number} clientX
     * @param {number} clientY
     * @returns {{ type: string, ... } | null}
     */
    _detectDropZone(clientX, clientY) {
        const edgeZone = this._detectEdgeDropZone(clientX, clientY);
        if (edgeZone) return edgeZone;

        const stackZone = this._detectPanelEdgeDropZone(clientX, clientY);
        if (stackZone) return stackZone;

        return this._detectPanelCenterDropZone(clientX, clientY);
    }

    /**
     * Detect whether the cursor is within a viewport edge drop zone.
     * Returns a drop zone descriptor or null if not near any edge.
     *
     * @param {number} clientX
     * @param {number} clientY
     * @returns {{ type: 'edge', edge: string } | null}
     */
    _detectEdgeDropZone(clientX, clientY) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const threshold = LAYOUT.EDGE_THRESHOLD_PX;

        if (clientX < threshold) {
            return { type: 'edge', edge: 'left' };
        }
        if (clientX > vw - threshold) {
            return { type: 'edge', edge: 'right' };
        }

        return null;
    }

    /**
     * Detect whether the cursor is over the center 60% of any panel wrapper
     * that does NOT contain the currently dragged panel.
     *
     * @param {number} clientX
     * @param {number} clientY
     * @returns {{ type: 'tab-merge', targetPanelId: string } | null}
     */
    _detectPanelCenterDropZone(clientX, clientY) {
        if (!this._rootElement || !this._dragging) return null;

        // Look for .dock-region elements (individual panels)
        const panelWrappers = this._rootElement.querySelectorAll('.dock-region[data-panel-id]');

        for (const panelEl of panelWrappers) {
            const targetPanelId = panelEl.dataset.panelId;

            // Skip the panel being dragged and the map (main viewport, not a tab-merge target)
            if (targetPanelId === this._dragging.panelId) continue;
            if (targetPanelId === PANEL_IDS.MAP) continue;

            const rect = panelEl.getBoundingClientRect();
            const marginX = rect.width * CENTER_ZONE_MARGIN;
            const marginY = rect.height * CENTER_ZONE_MARGIN;

            const inCenterX = clientX >= rect.left + marginX && clientX <= rect.right - marginX;
            const inCenterY = clientY >= rect.top + marginY && clientY <= rect.bottom - marginY;

            if (inCenterX && inCenterY) {
                return { type: 'tab-merge', targetPanelId };
            }
        }

        // Also check tabbed containers (TabGroupNode renderings) whose members
        // no longer have standalone .dock-region elements.
        const tabbedContainers = this._rootElement.querySelectorAll('.tabbed-container[data-panel-ids]');
        for (const container of tabbedContainers) {
            const panelIds = container.dataset.panelIds.split(',');
            if (panelIds.includes(this._dragging.panelId)) continue;

            const rect = container.getBoundingClientRect();
            const marginX = rect.width * CENTER_ZONE_MARGIN;
            const marginY = rect.height * CENTER_ZONE_MARGIN;

            const inCenterX = clientX >= rect.left + marginX && clientX <= rect.right - marginX;
            const inCenterY = clientY >= rect.top + marginY && clientY <= rect.bottom - marginY;

            if (inCenterX && inCenterY) {
                return { type: 'tab-merge', targetPanelId: panelIds[0] };
            }
        }

        return null;
    }

    /**
     * Detect whether the cursor is over the outer 20px edge strip of any panel wrapper
     * that does NOT contain the currently dragged panel (excluding the map panel).
     * Panel-edge takes precedence over panel-center to allow stacking via the border.
     *
     * @param {number} clientX
     * @param {number} clientY
     * @returns {{ type: 'stack', targetPanelId: string, edge: string } | null}
     */
    _detectPanelEdgeDropZone(clientX, clientY) {
        if (!this._rootElement || !this._dragging) return null;

        const panelWrappers = this._rootElement.querySelectorAll('.dock-region[data-panel-id]');
        const threshold = PANEL_EDGE_THRESHOLD_PX;

        for (const panelEl of panelWrappers) {
            const targetPanelId = panelEl.dataset.panelId;

            if (targetPanelId === this._dragging.panelId) continue;
            if (targetPanelId === PANEL_IDS.MAP) continue;

            const rect = panelEl.getBoundingClientRect();

            // Must be within the panel bounds at all
            if (clientX < rect.left || clientX > rect.right ||
                clientY < rect.top || clientY > rect.bottom) continue;

            // Determine which edge strip the cursor falls in (prefer closer edge)
            const distLeft = clientX - rect.left;
            const distRight = rect.right - clientX;
            const distTop = clientY - rect.top;
            const distBottom = rect.bottom - clientY;

            const minDist = Math.min(distLeft, distRight, distTop, distBottom);
            if (minDist > threshold) continue;

            let edge;
            if (minDist === distTop) edge = 'top';
            else if (minDist === distBottom) edge = 'bottom';
            else if (minDist === distLeft) edge = 'left';
            else edge = 'right';

            return { type: 'stack', targetPanelId, edge };
        }

        return null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Sibling detection (for stack-reorder vs. new-stack discrimination)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Determine whether panelId1 and panelId2 are *direct* children of the same
     * SplitNode in the current layout tree. A panel "directly" occupies a split
     * slot when the slot node is a PanelNode or TabGroupNode containing that panel
     * (i.e. not buried deeper inside another SplitNode).
     *
     * Returns a descriptor used to build a ReorderPanelCommand, or null when the
     * panels are not siblings.
     *
     * @param {string} panelId1
     * @param {string} panelId2
     * @returns {{ nodePath: string[], fromIndex: number, toIndex: number } | null}
     */
    _findSiblingRelationship(panelId1, panelId2) {
        if (!this._layoutStore) return null;
        const tree = this._layoutStore.getState().tree;
        return this._findSiblingInTree(tree, panelId1, panelId2, []);
    }

    /**
     * @param {object}   node
     * @param {string}   panelId1
     * @param {string}   panelId2
     * @param {string[]} path
     * @returns {{ nodePath: string[], fromIndex: number, toIndex: number } | null}
     * @private
     */
    _findSiblingInTree(node, panelId1, panelId2, path) {
        if (!node || node.type !== 'split') return null;

        // Only consider PanelNode children as direct siblings for reordering.
        // TabGroupNode members need extraction (StackPanelCommand), not a simple swap.
        const isDirectPanel = (child, pid) => {
            return child.type === 'panel' && child.panelId === pid;
        };

        const p1InFirst = isDirectPanel(node.first, panelId1);
        const p2InSecond = isDirectPanel(node.second, panelId2);
        const p1InSecond = isDirectPanel(node.second, panelId1);
        const p2InFirst = isDirectPanel(node.first, panelId2);

        if (p1InFirst && p2InSecond) {
            // panelId1 is the first child, panelId2 is the second
            return { nodePath: path, fromIndex: 0, toIndex: 1 };
        }
        if (p1InSecond && p2InFirst) {
            // panelId1 is the second child, panelId2 is the first
            return { nodePath: path, fromIndex: 1, toIndex: 0 };
        }

        // Recurse into children
        return (
            this._findSiblingInTree(node.first, panelId1, panelId2, [...path, 'first']) ||
            this._findSiblingInTree(node.second, panelId1, panelId2, [...path, 'second'])
        );
    }
}
