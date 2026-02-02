// @ts-nocheck
/**
 * DockRegion
 * Renders a single panel wrapper with a title bar (drag handle) and a content area.
 * Used by DockManager to wrap each panel content element in the layout tree.
 */

const PANEL_LABELS = {
    map: 'Map',
    layers: 'Layers',
    decorationList: 'Decoration List'
};

export class DockRegion {
    /**
     * @param {string} panelId  One of the PANEL_IDS values
     * @param {HTMLElement|null} contentElement  DOM element to place inside the content area
     * @param {string} [label]  Override display label (defaults to PANEL_LABELS[panelId])
     */
    constructor(panelId, contentElement, label) {
        this.panelId = panelId;
        this.contentElement = contentElement;
        this.label = label || PANEL_LABELS[panelId] || panelId;
        this._element = this._createElement();
    }

    /**
     * Build the DockRegion DOM element.
     * @private
     */
    _createElement() {
        const wrapper = document.createElement('div');
        wrapper.className = 'dock-region';
        wrapper.dataset.panelId = this.panelId;

        // Title bar — doubles as drag handle
        const titleBar = document.createElement('div');
        titleBar.className = 'dock-region-title';
        titleBar.dataset.dragHandle = 'true';
        titleBar.dataset.panelId = this.panelId;

        const titleText = document.createElement('span');
        titleText.className = 'dock-region-title-text';
        titleText.textContent = this.label;
        titleBar.appendChild(titleText);

        // Search and sort buttons for the decoration list panel (right of title)
        if (this.panelId === 'decorationList') {
            // Sort button
            const sortBtn = document.createElement('button');
            sortBtn.className = 'dock-region-title-sort-btn';
            sortBtn.title = 'Sort decorations';
            sortBtn.setAttribute('aria-label', 'Sort decorations');
            sortBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="9" y2="18"/></svg>`;

            const sortOptions = [
                { mode: 'oldest', label: 'Oldest first' },
                { mode: 'newest', label: 'Newest first' },
                { mode: 'az', label: 'A \u2192 Z' },
                { mode: 'za', label: 'Z \u2192 A' },
            ];

            let currentSortMode = 'oldest';
            let sortDropdown = null;

            const closeSortDropdown = () => {
                if (sortDropdown) {
                    sortDropdown.remove();
                    sortDropdown = null;
                }
            };

            const outsideClickHandler = (e) => {
                if (sortDropdown && !sortDropdown.contains(e.target) && e.target !== sortBtn) {
                    closeSortDropdown();
                    document.removeEventListener('click', outsideClickHandler, true);
                }
            };

            sortBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (sortDropdown) {
                    closeSortDropdown();
                    document.removeEventListener('click', outsideClickHandler, true);
                    return;
                }

                sortDropdown = document.createElement('div');
                sortDropdown.className = 'decoration-sort-dropdown';

                sortOptions.forEach(opt => {
                    const option = document.createElement('button');
                    option.className = 'decoration-sort-dropdown__option' + (opt.mode === currentSortMode ? ' active' : '');
                    option.type = 'button';
                    option.textContent = opt.label;
                    option.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        currentSortMode = opt.mode;
                        sortBtn.classList.toggle('active', opt.mode !== 'oldest');
                        document.dispatchEvent(new CustomEvent('decoration-list:set-sort', { detail: { mode: opt.mode } }));
                        closeSortDropdown();
                        document.removeEventListener('click', outsideClickHandler, true);
                    });
                    sortDropdown.appendChild(option);
                });

                const rect = sortBtn.getBoundingClientRect();
                sortDropdown.style.position = 'fixed';
                sortDropdown.style.top = `${rect.bottom + 2}px`;
                sortDropdown.style.right = `${window.innerWidth - rect.right}px`;
                document.body.appendChild(sortDropdown);

                setTimeout(() => {
                    document.addEventListener('click', outsideClickHandler, true);
                }, 0);
            });

            titleBar.appendChild(sortBtn);

            // Search button
            const searchBtn = document.createElement('button');
            searchBtn.className = 'dock-region-title-search-btn';
            searchBtn.title = 'Toggle search';
            searchBtn.setAttribute('aria-label', 'Toggle decoration search');
            searchBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

            // Reflect active state from DOM on each render
            const isActive = this.contentElement &&
                this.contentElement.querySelector('.decoration-search-bar.visible');
            if (isActive) searchBtn.classList.add('active');

            searchBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.dispatchEvent(new CustomEvent('decoration-list:toggle-search'));
                searchBtn.classList.toggle('active');
            });

            titleBar.appendChild(searchBtn);
        }

        // Content area
        const content = document.createElement('div');
        content.className = 'dock-region-content';

        if (this.contentElement) {
            this.contentElement.style.display = '';
            content.appendChild(this.contentElement);
        }

        wrapper.appendChild(titleBar);
        wrapper.appendChild(content);

        return wrapper;
    }

    /**
     * Return the root DOM element for this DockRegion.
     * @returns {HTMLElement}
     */
    getElement() {
        return this._element;
    }
}
