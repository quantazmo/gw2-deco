class ContextMenuItem {
    label: string = "";
    action?: () => void;
    disabled?: boolean;
    submenu?: ContextMenuItem[];
}

/**
 * ContextMenu Component
 * Absolute-positioned right-click context menu with role="menu",
 * role="menuitem", submenu support, arrow key navigation,
 * Escape to close, viewport position clamping, single shared instance.
 */

class ContextMenu {
    _menu: HTMLElement | null = null;
    _activeSubmenu: HTMLElement | null = null;
    _boundClose = this._handleOutsideClick.bind(this);
    _boundKeydown = this._handleKeydown.bind(this);

    /**
     * Show the context menu at the given screen coordinates.
     * @param x - Client X position
     * @param y - Client Y position
     * @param items
     */
    show(x: number, y: number, items: ContextMenuItem[]) {
        this.hide();

        this._menu = this._createMenu(items);
        document.body.appendChild(this._menu);

        // Viewport clamping
        const rect = this._menu.getBoundingClientRect();
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;

        let left = x;
        let top = y;

        if (left + rect.width > viewportW) {
            left = viewportW - rect.width - 4;
        }
        if (top + rect.height > viewportH) {
            top = viewportH - rect.height - 4;
        }
        if (left < 0) left = 4;
        if (top < 0) top = 4;

        this._menu.style.left = `${left}px`;
        this._menu.style.top = `${top}px`;

        // Focus the first item
        const firstItem = this._menu.querySelector('[role="menuitem"]');
        if (firstItem) (firstItem as HTMLElement).focus();

        // Bind close handlers
        document.addEventListener('click', this._boundClose, true);
        document.addEventListener('contextmenu', this._boundClose, true);
        document.addEventListener('keydown', this._boundKeydown, true);
    }

    /**
     * Hide the context menu
     */
    hide(): void {
        if (this._activeSubmenu && this._activeSubmenu.parentNode) {
            this._activeSubmenu.parentNode.removeChild(this._activeSubmenu);
            this._activeSubmenu = null;
        }
        if (this._menu && this._menu.parentNode) {
            this._menu.parentNode.removeChild(this._menu);
            this._menu = null;
        }
        document.removeEventListener('click', this._boundClose, true);
        document.removeEventListener('contextmenu', this._boundClose, true);
        document.removeEventListener('keydown', this._boundKeydown, true);
    }

    /**
     * Whether the context menu is visible
     */
    isVisible(): boolean {
        return this._menu !== null;
    }

    /**
     * Create the menu DOM element
     */
    private _createMenu(items: ContextMenuItem[]): HTMLElement {
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.setAttribute('role', 'menu');
        menu.style.position = 'fixed';
        menu.style.zIndex = '10000';

        for (const item of items) {
            const menuItem = this._createMenuItem(item);
            menu.appendChild(menuItem);
        }

        return menu;
    }

    /**
     * Create a single menu item element
     */
    private _createMenuItem(item: ContextMenuItem): HTMLElement {
        const el = document.createElement('div');
        el.className = 'context-menu__item';
        el.setAttribute('role', 'menuitem');
        el.setAttribute('tabindex', '-1');
        el.textContent = item.label;

        if (item.disabled) {
            el.classList.add('disabled');
            el.setAttribute('aria-disabled', 'true');
        }

        if (item.submenu && item.submenu.length > 0) {
            el.classList.add('has-submenu');
            const arrow = document.createElement('span');
            arrow.className = 'context-menu__arrow';
            arrow.textContent = '\u25B6';
            el.appendChild(arrow);

            el.addEventListener('mouseenter', () => {
                this._showSubmenu(el, item.submenu || []);
            });
            el.addEventListener('mouseleave', (e) => {
                // Don't hide if moving to the submenu itself
                const related = e.relatedTarget as HTMLElement;
                if (this._activeSubmenu && this._activeSubmenu.contains(related)) return;
                this._hideSubmenu();
            });
        } else if (item.action && !item.disabled) {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hide();
                if (item.action) item.action();
            });
        }

        return el;
    }

    /**
     * Show a submenu next to the parent item
     */
    private _showSubmenu(parentItem: HTMLElement, items: ContextMenuItem[]): void {
        this._hideSubmenu();

        const submenu = document.createElement('div');
        submenu.className = 'context-menu context-menu--submenu';
        submenu.setAttribute('role', 'menu');
        submenu.style.position = 'fixed';
        submenu.style.zIndex = '10001';

        for (const item of items) {
            const menuItem = this._createSubmenuItem(item);
            submenu.appendChild(menuItem);
        }

        document.body.appendChild(submenu);

        // Position next to the parent item
        const parentRect = parentItem.getBoundingClientRect();
        let left = parentRect.right;
        let top = parentRect.top;

        // Viewport clamping
        const submenuRect = submenu.getBoundingClientRect();
        if (left + submenuRect.width > window.innerWidth) {
            left = parentRect.left - submenuRect.width;
        }
        if (top + submenuRect.height > window.innerHeight) {
            top = window.innerHeight - submenuRect.height - 4;
        }
        if (left < 0) left = 4;
        if (top < 0) top = 4;

        submenu.style.left = `${left}px`;
        submenu.style.top = `${top}px`;

        submenu.addEventListener('mouseleave', (e) => {
            const related = e.relatedTarget as HTMLElement;
            if (parentItem.contains(related)) return;
            this._hideSubmenu();
        });

        this._activeSubmenu = submenu;
    }

    /**
     * Create a submenu item
     */
    private _createSubmenuItem(item: ContextMenuItem): HTMLElement {
        const el = document.createElement('div');
        el.className = 'context-menu__item';
        el.setAttribute('role', 'menuitem');
        el.setAttribute('tabindex', '-1');
        el.textContent = item.label;

        if (item.disabled) {
            el.classList.add('disabled');
            el.setAttribute('aria-disabled', 'true');
        } else if (item.action) {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hide();
                if (item.action) item.action();
            });
        }

        return el;
    }

    /**
     * Hide the active submenu
     */
    private _hideSubmenu(): void {
        if (this._activeSubmenu && this._activeSubmenu.parentNode) {
            this._activeSubmenu.parentNode.removeChild(this._activeSubmenu);
            this._activeSubmenu = null;
        }
    }

    /**
     * Handle clicks outside the menu to close it
     */
    private _handleOutsideClick(e: Event): void {
        const target = e.target as HTMLElement;
        if (this._menu && !this._menu.contains(target) &&
            (!this._activeSubmenu || !this._activeSubmenu.contains(target))) {
            this.hide();
        }
    }

    /**
     * Handle keyboard navigation
     */
    private _handleKeydown(e: KeyboardEvent): void {
        if (!this._menu) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            this.hide();
            return;
        }

        const focusTarget = this._activeSubmenu || this._menu;
        const items = Array.from(focusTarget.querySelectorAll('[role="menuitem"]:not(.disabled)'));
        const currentIndex = items.indexOf(document.activeElement!);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
            (items[next] as HTMLElement)?.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
            (items[prev] as HTMLElement)?.focus();
        } else if (e.key === 'ArrowRight') {
            // Open submenu if current item has one
            const focused = document.activeElement;
            if (focused && focused.classList.contains('has-submenu')) {
                focused.dispatchEvent(new MouseEvent('mouseenter'));
                // Focus first submenu item
                setTimeout(() => {
                    if (this._activeSubmenu) {
                        const first = this._activeSubmenu.querySelector('[role="menuitem"]');
                        if (first) (first as HTMLElement).focus();
                    }
                }, 0);
            }
        } else if (e.key === 'ArrowLeft') {
            // Close submenu and return focus to parent
            if (this._activeSubmenu) {
                this._hideSubmenu();
                // Focus the has-submenu item in the main menu
                const submenuItems = Array.from(this._menu.querySelectorAll('.has-submenu'));
                if (submenuItems.length > 0) (submenuItems[0] as HTMLElement).focus();
            }
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (document.activeElement) {
                (document.activeElement as HTMLElement).click();
            }
        }
    }
}

export { ContextMenu };
export default ContextMenu;
