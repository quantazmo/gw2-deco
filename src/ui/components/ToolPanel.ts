// @ts-nocheck
/**
 * ToolPanel Component
 * Organize all tool controls
 * Collapse/expand groups
 */

import * as domHelpers from '../domHelpers.js';

class ToolPanel {
    constructor(containerElement) {
        this.container = containerElement;
        this.panels = {};
        this.collapsedPanels = {};

        this.initialize();
    }

    /**
     * Initialize component structure
     */
    initialize() {
        // Don't empty container if it already has content (for legacy HTML)
        if (this.container.children.length === 0) {
            domHelpers.addClass(this.container, 'tool-panel');
        }
    }

    /**
     * Attach to existing HTML structure with legacy class names
     * Finds .tool-group elements and wires them up with toggle functionality
     */
    attachExistingGroups() {
        const existingGroups = this.container.querySelectorAll('.tool-group');

        existingGroups.forEach((groupElement, index) => {
            const header = groupElement.querySelector('.tool-group-header');
            const content = groupElement.querySelector('.tool-group-content');
            const arrow = header?.querySelector('.group-arrow');
            const titleElement = header?.querySelector('.group-title');

            if (!header || !content) return;

            // Generate panelId from title or use index
            const title = titleElement?.textContent?.trim() || `panel-${index}`;
            const panelId = title.toLowerCase().replace(/\s+/g, '-');

            // Check if already collapsed
            const isCollapsed = header.classList.contains('collapsed');

            // Store panel data
            this.panels[panelId] = {
                element: groupElement,
                header: header,
                content: content,
                arrow: arrow,
                title: title
            };

            this.collapsedPanels[panelId] = isCollapsed;

            // Bind toggle event
            header.addEventListener('click', () => {
                this.toggleLegacyPanel(panelId);
            });
        });

        console.log(`[ToolPanel] Attached ${existingGroups.length} existing tool groups`);
    }

    /**
     * Toggle panel with legacy HTML structure
     * @param {string} panelId - Panel identifier
     */
    toggleLegacyPanel(panelId) {
        const panel = this.panels[panelId];
        if (!panel) return;

        const isCollapsed = this.collapsedPanels[panelId];

        if (isCollapsed) {
            // Expand
            panel.header.classList.remove('collapsed');
            panel.content.classList.remove('collapsed');
            if (panel.arrow) panel.arrow.textContent = '▼';
            this.collapsedPanels[panelId] = false;
        } else {
            // Collapse
            panel.header.classList.add('collapsed');
            panel.content.classList.add('collapsed');
            if (panel.arrow) panel.arrow.textContent = '▶';
            this.collapsedPanels[panelId] = true;
        }
    }

    /**
     * Add a collapsible tool panel
     * @param {string} panelId - Unique panel identifier
     * @param {string} title - Panel title
     * @param {HTMLElement} content - Panel content element
     * @param {boolean} collapsed - Whether to start collapsed
     */
    addPanel(panelId, title, content, collapsed = false) {
        const panel = domHelpers.createElement('div', {
            className: `tool-panel-group ${collapsed ? 'collapsed' : ''}`
        });

        panel.setAttribute('data-panel-id', panelId);

        // Create header
        const header = domHelpers.createElement('div', { className: 'panel-header' });

        // Toggle button
        const toggleBtn = domHelpers.createElement('button', {
            className: 'panel-toggle',
            textContent: collapsed ? '▶' : '▼'
        });

        const titleElement = domHelpers.createElement('h4', {
            className: 'panel-title',
            textContent: title
        });

        header.appendChild(toggleBtn);
        header.appendChild(titleElement);

        // Create content container
        const contentContainer = domHelpers.createElement('div', {
            className: `panel-content ${collapsed ? 'hidden' : ''}`
        });

        if (content) {
            domHelpers.append(contentContainer, content);
        }

        panel.appendChild(header);
        panel.appendChild(contentContainer);

        // Bind toggle
        toggleBtn.addEventListener('click', () => {
            this.togglePanel(panelId);
        });

        this.container.appendChild(panel);
        this.panels[panelId] = {
            element: panel,
            header: header,
            content: contentContainer,
            toggleBtn: toggleBtn,
            title: title
        };

        this.collapsedPanels[panelId] = collapsed;
    }

    /**
     * Toggle panel collapse state
     * Works with both new and legacy HTML structures
     * @param {string} panelId - Panel identifier
     */
    togglePanel(panelId) {
        const panel = this.panels[panelId];
        if (!panel) return;

        const isCollapsed = this.collapsedPanels[panelId];

        // Check if this is a legacy panel (has arrow) or new panel (has toggleBtn)
        if (panel.arrow) {
            // Legacy structure
            this.toggleLegacyPanel(panelId);
        } else if (panel.toggleBtn) {
            // New structure
            if (isCollapsed) {
                // Expand
                domHelpers.removeClass(panel.content, 'hidden');
                domHelpers.removeClass(panel.element, 'collapsed');
                panel.toggleBtn.textContent = '▼';
                this.collapsedPanels[panelId] = false;
            } else {
                // Collapse
                domHelpers.addClass(panel.content, 'hidden');
                domHelpers.addClass(panel.element, 'collapsed');
                panel.toggleBtn.textContent = '▶';
                this.collapsedPanels[panelId] = true;
            }
        }
    }

    /**
     * Expand a panel
     * @param {string} panelId - Panel identifier
     */
    expandPanel(panelId) {
        if (this.collapsedPanels[panelId]) {
            this.togglePanel(panelId);
        }
    }

    /**
     * Collapse a panel
     * @param {string} panelId - Panel identifier
     */
    collapsePanel(panelId) {
        if (!this.collapsedPanels[panelId]) {
            this.togglePanel(panelId);
        }
    }

    /**
     * Get panel content element
     * @param {string} panelId - Panel identifier
     * @returns {HTMLElement|null}
     */
    getPanel(panelId) {
        return this.panels[panelId]?.content || null;
    }

    /**
     * Add content to a panel
     * @param {string} panelId - Panel identifier
     * @param {HTMLElement} content - Content to add
     */
    addPanelContent(panelId, content) {
        const panel = this.panels[panelId];
        if (panel) {
            domHelpers.append(panel.content, content);
        }
    }

    /**
     * Clear panel content
     * @param {string} panelId - Panel identifier
     */
    clearPanel(panelId) {
        const panel = this.panels[panelId];
        if (panel) {
            domHelpers.empty(panel.content);
        }
    }

    /**
     * Remove a panel
     * @param {string} panelId - Panel identifier
     */
    removePanel(panelId) {
        const panel = this.panels[panelId];
        if (panel) {
            domHelpers.remove(panel.element);
            delete this.panels[panelId];
            delete this.collapsedPanels[panelId];
        }
    }

    /**
     * Get the container element
     * @returns {HTMLElement}
     */
    getElement() {
        return this.container;
    }
}

export { ToolPanel };
