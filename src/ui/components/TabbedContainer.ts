/**
 * TabbedContainer
 * Renders a tabbed panel group (TabGroupNode).
 *
 * Responsibilities:
 *   - Renders a tab bar with one button per panel
 *   - Click handler updates activeIndex via layout:tab-activated event on EventBus
 *   - Displays only the active panel's content
 *   - Tab buttons activate their corresponding panel
 */

import { TabGroupNode } from '../../domain/DockLayoutConfiguration.ts';
import { EventBus } from '../EventBus.ts';

const PANEL_LABELS: Record<string, string> = {
    map: 'Map',
    layers: 'Layers',
    decorationList: 'Decoration List'
};

export class TabbedContainer {
    private _node: TabGroupNode;
    private _panelContentMap: Record<string, HTMLElement>;
    private _eventBus: Pick<EventBus, 'publish'> | null;
    private _element: HTMLElement;

    /**
     * @param {object}          tabGroupNode      The TabGroupNode to render
     * @param {Object}          panelContentMap   Map of panelId → HTMLElement content sources
     * @param {object|null}     eventBus          EventBus with publish() method (optional)
     */
    constructor(tabGroupNode: TabGroupNode, panelContentMap: Record<string, HTMLElement>, eventBus: Pick<EventBus, 'publish'> | null = null) {
        this._node = tabGroupNode;
        this._panelContentMap = panelContentMap || {};
        this._eventBus = eventBus;
        this._element = this._createElement();
    }

    /**
     * Return the root DOM element.
     * @returns {HTMLElement}
     */
    getElement(): HTMLElement {
        return this._element;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private
    // ─────────────────────────────────────────────────────────────────────────

    _createElement(): HTMLElement {
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
            tab.addEventListener('click', () => {
                this._onTabClick(panelId);
            });

            tabBar.appendChild(tab);
        });

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
     * Publish a layout:tab-activated event so LayoutStore (or a handler) can update
     * the activeIndex of the TabGroupNode. DockManager re-renders on layout change.
     *
     * @param {string} panelId
     * @private
     */
    _onTabClick(panelId: string): void {
        if (this._eventBus) {
            this._eventBus.publish('layout:tab-activated', {
                panels: this._node.panels,
                activatedPanelId: panelId,
                activeIndex: this._node.panels.indexOf(panelId),
            });
        }
    }
}
