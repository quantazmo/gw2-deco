// @ts-nocheck
/**
 * TabbedContainer
 * Renders a tabbed panel group (TabGroupNode).
 *
 * Responsibilities:
 *   - Renders a tab bar with one button per panel
 *   - Click handler updates activeIndex via layout:tab-activated event on EventBus
 *   - Displays only the active panel's content
 *   - Supports tab extraction via drag-start on tab buttons (publishes layout:drag-start)
 *   - Tab buttons have [data-drag-handle] so PanelDragManager can initiate a drag
 *   - Supports in-bar tab reordering: drag tab to new position, calls onReorder callback
 */

const PANEL_LABELS = {
    map: 'Map',
    layers: 'Layers',
    decorationList: 'Decoration List'
};

export class TabbedContainer {
    /**
     * @param {object}          tabGroupNode      The TabGroupNode to render
     * @param {Object}          panelContentMap   Map of panelId → HTMLElement content sources
     * @param {object|null}     eventBus          EventBus with publish() method (optional)
     * @param {Function|null}   onReorder         Called with (fromIndex, toIndex) when a tab
     *                                            is dragged to a new position within the tab bar
     */
    constructor(tabGroupNode, panelContentMap, eventBus = null, onReorder = null) {
        this._node = tabGroupNode;
        this._panelContentMap = panelContentMap || {};
        this._eventBus = eventBus;
        this._onReorder = onReorder;
        this._element = this._createElement();
    }

    /**
     * Return the root DOM element.
     * @returns {HTMLElement}
     */
    getElement() {
        return this._element;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private
    // ─────────────────────────────────────────────────────────────────────────

    _createElement() {
        const wrapper = document.createElement('div');
        wrapper.className = 'tabbed-container';
        // Expose the active panel id for hit-testing by DockManager
        wrapper.dataset.panelIds = this._node.panels.join(',');

        // ── Tab bar ──────────────────────────────────────────────────────────
        const tabBar = document.createElement('div');
        tabBar.className = 'tab-bar';
        tabBar.style.position = 'relative';

        this._node.panels.forEach((panelId, idx) => {
            const tab = document.createElement('button');
            tab.className = 'tab-button' + (idx === this._node.activeIndex ? ' active' : '');
            tab.textContent = PANEL_LABELS[panelId] || panelId;
            tab.dataset.panelId = panelId;
            tab.dataset.tabIndex = String(idx);
            // Allow PanelDragManager to start a drag from a tab button
            tab.dataset.dragHandle = 'true';

            tab.addEventListener('click', (e) => {
                // Do not activate if the user was dragging (mouseup without drag would fire click)
                if (!tab.dataset.wasDragging) {
                    this._onTabClick(panelId);
                }
                delete tab.dataset.wasDragging;
            });

            tabBar.appendChild(tab);
        });

        // ── Tab drag-to-reorder interaction ──────────────────────────────────
        // Only wire if an onReorder callback was provided.
        if (this._onReorder) {
            this._attachTabReorderDrag(tabBar);
        }

        // ── Active content area ───────────────────────────────────────────
        const contentArea = document.createElement('div');
        contentArea.className = 'tab-content-area';

        const activePanelId = this._node.panels[this._node.activeIndex];
        const contentEl = this._panelContentMap[activePanelId] || null;
        if (contentEl) {
            contentEl.style.display = '';
            contentArea.appendChild(contentEl);
        }

        wrapper.appendChild(tabBar);
        wrapper.appendChild(contentArea);

        return wrapper;
    }

    /**
     * Wire mousedown-based tab reordering onto a tab bar element.
     * Dragging a tab button to a new position within the bar calls `this._onReorder`.
     *
     * @param {HTMLElement} tabBar
     * @private
     */
    _attachTabReorderDrag(tabBar) {
        let dragFromIndex = null;
        let hasMoved = false;
        /** @type {HTMLElement|null} */
        let indicator = null;

        /** Remove the insertion-point indicator from the DOM. */
        const removeIndicator = () => {
            if (indicator && indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
            indicator = null;
        };

        /**
         * Compute the insertion index (0…n) for a given clientX position.
         * Index is the position *before* which the dragged tab would be inserted.
         * Returns tabs.length to insert after all tabs.
         *
         * @param {number} clientX
         * @returns {number}
         */
        const getInsertionIndex = (clientX) => {
            const tabs = Array.from(tabBar.querySelectorAll('.tab-button'));
            for (let i = 0; i < tabs.length; i++) {
                const rect = tabs[i].getBoundingClientRect();
                if (clientX < rect.left + rect.width / 2) return i;
            }
            return tabs.length;
        };

        /**
         * Show a thin vertical bar between tabs at the computed insertion point.
         * @param {number} clientX
         */
        const showIndicator = (clientX) => {
            removeIndicator();
            const insertIndex = getInsertionIndex(clientX);
            const tabs = Array.from(tabBar.querySelectorAll('.tab-button'));

            indicator = document.createElement('div');
            indicator.className = 'tab-insertion-indicator';

            if (insertIndex < tabs.length) {
                tabBar.insertBefore(indicator, tabs[insertIndex]);
            } else {
                tabBar.appendChild(indicator);
            }
        };

        const onMouseMove = (e) => {
            if (dragFromIndex === null) return;
            hasMoved = true;
            const barRect = tabBar.getBoundingClientRect();
            const withinBar = e.clientX >= barRect.left && e.clientX <= barRect.right &&
                e.clientY >= barRect.top && e.clientY <= barRect.bottom;
            if (withinBar) {
                showIndicator(e.clientX);
            } else {
                removeIndicator();
            }
        };

        const onMouseUp = (e) => {
            if (dragFromIndex === null) return;
            const fromIdx = dragFromIndex;
            dragFromIndex = null;
            removeIndicator();
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            // Mark the source tab as dragged so its click handler is suppressed
            // — but only if the mouse actually moved (otherwise it's just a click)
            const tabs = tabBar.querySelectorAll('.tab-button');
            if (hasMoved && tabs[fromIdx]) tabs[fromIdx].dataset.wasDragging = 'true';

            const barRect = tabBar.getBoundingClientRect();
            const droppedInBar = e.clientX >= barRect.left && e.clientX <= barRect.right &&
                e.clientY >= barRect.top && e.clientY <= barRect.bottom;
            if (!droppedInBar) return;

            const insertionIndex = getInsertionIndex(e.clientX);

            // No-op: released at same relative position
            if (insertionIndex === fromIdx || insertionIndex === fromIdx + 1) return;

            // Convert insertion index to toIndex (accounts for the removed element)
            const toIdx = insertionIndex > fromIdx ? insertionIndex - 1 : insertionIndex;

            this._onReorder(fromIdx, toIdx);
        };

        // Use event delegation on the tab bar to start reorder tracking
        tabBar.addEventListener('mousedown', (e) => {
            const tab = e.target.closest('.tab-button');
            if (!tab) return;
            dragFromIndex = parseInt(tab.dataset.tabIndex, 10);
            hasMoved = false;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    /**
     * Publish a layout:tab-activated event so LayoutStore (or a handler) can update
     * the activeIndex of the TabGroupNode. DockManager re-renders on layout change.
     *
     * @param {string} panelId
     * @private
     */
    _onTabClick(panelId) {
        if (this._eventBus) {
            this._eventBus.publish('layout:tab-activated', {
                panels: this._node.panels,
                activatedPanelId: panelId,
                activeIndex: this._node.panels.indexOf(panelId),
            });
        }
    }
}
