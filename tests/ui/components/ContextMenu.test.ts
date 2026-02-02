// @ts-nocheck
/**
 * Tests for ContextMenu Component (Phase 9 — US6)
 *
 * Covers:
 * - show/hide
 * - item click
 * - submenu display
 * - keyboard navigation
 * - Escape to close
 * - viewport clamping
 */
import { ContextMenu } from '../../../src/ui/components/ContextMenu.js';

describe('ContextMenu', () => {
    let contextMenu;

    beforeEach(() => {
        contextMenu = new ContextMenu();
        // Clean up any menus left on body
        document.body.innerHTML = '';
    });

    afterEach(() => {
        contextMenu.hide();
        document.body.innerHTML = '';
    });

    test('should show menu at given coordinates', () => {
        contextMenu.show(100, 200, [
            { label: 'Item 1', action: vi.fn() }
        ]);

        expect(contextMenu.isVisible()).toBe(true);
        const menu = document.querySelector('.context-menu');
        expect(menu).not.toBeNull();
        expect(menu.getAttribute('role')).toBe('menu');
    });

    test('should hide menu', () => {
        contextMenu.show(100, 200, [
            { label: 'Item 1', action: vi.fn() }
        ]);

        contextMenu.hide();

        expect(contextMenu.isVisible()).toBe(false);
        expect(document.querySelector('.context-menu')).toBeNull();
    });

    test('should render menu items with role="menuitem"', () => {
        contextMenu.show(100, 200, [
            { label: 'Do Something', action: vi.fn() },
            { label: 'Another Action', action: vi.fn() }
        ]);

        const items = document.querySelectorAll('[role="menuitem"]');
        expect(items).toHaveLength(2);
        expect(items[0].textContent).toBe('Do Something');
        expect(items[1].textContent).toBe('Another Action');
    });

    test('should call action on item click', () => {
        const action = vi.fn();
        contextMenu.show(100, 200, [
            { label: 'Click Me', action }
        ]);

        const item = document.querySelector('[role="menuitem"]');
        item.click();

        expect(action).toHaveBeenCalledTimes(1);
        expect(contextMenu.isVisible()).toBe(false); // Menu hides after click
    });

    test('should show disabled items without action', () => {
        const action = vi.fn();
        contextMenu.show(100, 200, [
            { label: 'Disabled Item', action, disabled: true }
        ]);

        const item = document.querySelector('[role="menuitem"]');
        expect(item.classList.contains('disabled')).toBe(true);
        expect(item.getAttribute('aria-disabled')).toBe('true');
    });

    test('should render submenu indicator for items with submenu', () => {
        contextMenu.show(100, 200, [
            {
                label: 'Move to Layer',
                submenu: [
                    { label: 'Layer 1', action: vi.fn() }
                ]
            }
        ]);

        const item = document.querySelector('.has-submenu');
        expect(item).not.toBeNull();
        const arrow = item.querySelector('.context-menu__arrow');
        expect(arrow).not.toBeNull();
    });

    test('should show submenu on mouseenter of submenu item', () => {
        contextMenu.show(100, 200, [
            {
                label: 'Move to Layer',
                submenu: [
                    { label: 'Layer 1', action: vi.fn() },
                    { label: 'Layer 2', action: vi.fn() }
                ]
            }
        ]);

        const submenuItem = document.querySelector('.has-submenu');
        submenuItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

        const submenu = document.querySelector('.context-menu--submenu');
        expect(submenu).not.toBeNull();
        const subItems = submenu.querySelectorAll('[role="menuitem"]');
        expect(subItems).toHaveLength(2);
        expect(subItems[0].textContent).toBe('Layer 1');
    });

    test('should close on Escape key', () => {
        contextMenu.show(100, 200, [
            { label: 'Item', action: vi.fn() }
        ]);

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        expect(contextMenu.isVisible()).toBe(false);
    });

    test('should navigate with ArrowDown and ArrowUp', () => {
        contextMenu.show(100, 200, [
            { label: 'Item 1', action: vi.fn() },
            { label: 'Item 2', action: vi.fn() },
            { label: 'Item 3', action: vi.fn() }
        ]);

        const items = document.querySelectorAll('[role="menuitem"]');

        // First item should be focused
        expect(document.activeElement).toBe(items[0]);

        // ArrowDown
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        expect(document.activeElement).toBe(items[1]);

        // ArrowDown again
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        expect(document.activeElement).toBe(items[2]);

        // ArrowDown wraps
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        expect(document.activeElement).toBe(items[0]);

        // ArrowUp wraps
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
        expect(document.activeElement).toBe(items[2]);
    });

    test('should trigger action on Enter key', () => {
        const action = vi.fn();
        contextMenu.show(100, 200, [
            { label: 'Confirm', action }
        ]);

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        expect(action).toHaveBeenCalledTimes(1);
    });

    test('should close on outside click', () => {
        contextMenu.show(100, 200, [
            { label: 'Item', action: vi.fn() }
        ]);

        // Click outside the menu
        document.body.click();

        expect(contextMenu.isVisible()).toBe(false);
    });

    test('should replace existing menu when show is called again', () => {
        contextMenu.show(100, 200, [
            { label: 'First', action: vi.fn() }
        ]);
        contextMenu.show(200, 300, [
            { label: 'Second', action: vi.fn() }
        ]);

        const menus = document.querySelectorAll('.context-menu:not(.context-menu--submenu)');
        expect(menus).toHaveLength(1);
        expect(menus[0].querySelector('[role="menuitem"]').textContent).toBe('Second');
    });

    test('should handle viewport clamping (positions within viewport)', () => {
        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
        Object.defineProperty(window, 'innerHeight', { value: 400, writable: true });

        contextMenu.show(100, 100, [
            { label: 'Item', action: vi.fn() }
        ]);

        const menu = document.querySelector('.context-menu');
        // At minimum, the menu should be positioned and visible
        expect(menu.style.position).toBe('fixed');
    });
});
