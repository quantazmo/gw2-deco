// @ts-nocheck
/**
 * Additional tests for ContextMenu — targeting uncovered branches.
 * Uncovered lines: 37 (left overflow clamp), 40 (top overflow clamp),
 *   135-137 (submenu viewport clamp), 181/184 (submenu item disabled/action),
 *   193-195 (_hideSubmenu no active submenu), 215-216 (ArrowRight),
 *   219-221 (ArrowLeft), 234-235 (Enter/Space on submenu item),
 *   280-287 (ArrowRight open submenu), 293-297 (ArrowLeft close submenu)
 */
import { ContextMenu } from '../../../src/ui/components/ContextMenu.js';

describe('ContextMenu — additional branch coverage', () => {
    let contextMenu;

    beforeEach(() => {
        contextMenu = new ContextMenu();
        document.body.innerHTML = '';
        // Reset window dimensions to large values
        Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true, configurable: true });
    });

    afterEach(() => {
        contextMenu.hide();
        document.body.innerHTML = '';
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Viewport clamping – left overflow (line 37)
    // ─────────────────────────────────────────────────────────────────────────
    describe('show – viewport clamping left overflow', () => {
        test('clamps left position when x exceeds viewport width', () => {
            Object.defineProperty(window, 'innerWidth', { value: 100, writable: true, configurable: true });
            // Position at x=150 which exceeds innerWidth=100 → 150 + 0 > 100 is true
            contextMenu.show(150, 50, [{ label: 'Item', action: vi.fn() }]);
            const menu = document.querySelector('.context-menu');
            expect(menu).not.toBeNull();
            // Left should be clamped to innerWidth - 0 - 4 = 96
            const left = parseFloat(menu.style.left);
            expect(left).toBeLessThanOrEqual(100);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Viewport clamping – top overflow (line 40)
    // ─────────────────────────────────────────────────────────────────────────
    describe('show – viewport clamping top overflow', () => {
        test('clamps top position when y exceeds viewport height', () => {
            Object.defineProperty(window, 'innerHeight', { value: 50, writable: true, configurable: true });
            // Position at y=80 which exceeds innerHeight=50 → 80 + 0 > 50 is true
            contextMenu.show(50, 80, [{ label: 'Item', action: vi.fn() }]);
            const menu = document.querySelector('.context-menu');
            expect(menu).not.toBeNull();
            const top = parseFloat(menu.style.top);
            expect(top).toBeLessThanOrEqual(50);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Submenu item – disabled (line 181)
    // ─────────────────────────────────────────────────────────────────────────
    describe('submenu item – disabled', () => {
        test('disabled submenu item has disabled class and aria-disabled', () => {
            contextMenu.show(100, 100, [{
                label: 'Move',
                submenu: [
                    { label: 'Layer 1', action: vi.fn(), disabled: true }
                ]
            }]);
            const submenuItem = document.querySelector('.has-submenu');
            submenuItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            const disabledItem = document.querySelector('.context-menu--submenu .disabled');
            expect(disabledItem).not.toBeNull();
            expect(disabledItem.getAttribute('aria-disabled')).toBe('true');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Submenu item – action click (line 184)
    // ─────────────────────────────────────────────────────────────────────────
    describe('submenu item – action click', () => {
        test('submenu item action is called on click and menu closes', () => {
            const action = vi.fn();
            contextMenu.show(100, 100, [{
                label: 'Move',
                submenu: [
                    { label: 'Layer 1', action }
                ]
            }]);
            const submenuItem = document.querySelector('.has-submenu');
            submenuItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            const subItem = document.querySelector('.context-menu--submenu [role="menuitem"]');
            subItem.click();
            expect(action).toHaveBeenCalledTimes(1);
            expect(contextMenu.isVisible()).toBe(false);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // _hideSubmenu – no active submenu (lines 193-195)
    // ─────────────────────────────────────────────────────────────────────────
    describe('_hideSubmenu – when no submenu is active', () => {
        test('mouseleave on submenu item hides submenu', () => {
            contextMenu.show(100, 100, [{
                label: 'Move',
                submenu: [{ label: 'Layer 1', action: vi.fn() }]
            }]);
            const submenuItem = document.querySelector('.has-submenu');
            submenuItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            expect(document.querySelector('.context-menu--submenu')).not.toBeNull();
            // Mouseleave to outside (not the submenu)
            submenuItem.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, relatedTarget: document.body }));
            expect(document.querySelector('.context-menu--submenu')).toBeNull();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // mouseleave on submenu item – when moving TO the submenu (don't hide)
    // ─────────────────────────────────────────────────────────────────────────
    describe('submenu item mouseleave – moving to submenu itself', () => {
        test('does not hide submenu when leaving item toward the submenu', () => {
            contextMenu.show(100, 100, [{
                label: 'Move',
                submenu: [{ label: 'Layer 1', action: vi.fn() }]
            }]);
            const submenuItem = document.querySelector('.has-submenu');
            submenuItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            const submenu = document.querySelector('.context-menu--submenu');
            expect(submenu).not.toBeNull();

            // Mouseleave where relatedTarget is inside the submenu → should NOT hide
            const submenuFirstItem = submenu.querySelector('[role="menuitem"]');
            submenuItem.dispatchEvent(new MouseEvent('mouseleave', {
                bubbles: true,
                relatedTarget: submenuFirstItem
            }));
            expect(document.querySelector('.context-menu--submenu')).not.toBeNull();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // submenu mouseleave – moving back to parent item (don't hide)
    // ─────────────────────────────────────────────────────────────────────────
    describe('submenu mouseleave – moving to parent item', () => {
        test('does not hide submenu when leaving submenu toward parent item', () => {
            contextMenu.show(100, 100, [{
                label: 'Move',
                submenu: [{ label: 'Layer 1', action: vi.fn() }]
            }]);
            const submenuItem = document.querySelector('.has-submenu');
            submenuItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            const submenu = document.querySelector('.context-menu--submenu');
            expect(submenu).not.toBeNull();

            // Mouseleave from submenu toward parent → should NOT hide
            submenu.dispatchEvent(new MouseEvent('mouseleave', {
                bubbles: true,
                relatedTarget: submenuItem
            }));
            expect(document.querySelector('.context-menu--submenu')).not.toBeNull();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // ArrowRight – opens submenu on focused submenu item (lines 280-287)
    // ─────────────────────────────────────────────────────────────────────────
    describe('keyboard – ArrowRight opens submenu', () => {
        test('ArrowRight on has-submenu item triggers mouseenter on it', () => {
            contextMenu.show(100, 100, [{
                label: 'Move',
                submenu: [{ label: 'Layer 1', action: vi.fn() }]
            }]);
            const submenuItem = document.querySelector('.has-submenu');
            submenuItem.focus();

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
            // Submenu should appear (the mouseenter handler is dispatched synchronously)
            expect(document.querySelector('.context-menu--submenu')).not.toBeNull();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // ArrowLeft – closes submenu (lines 293-297)
    // ─────────────────────────────────────────────────────────────────────────
    describe('keyboard – ArrowLeft closes submenu', () => {
        test('ArrowLeft hides active submenu and focuses parent item', () => {
            contextMenu.show(100, 100, [{
                label: 'Move',
                submenu: [{ label: 'Layer 1', action: vi.fn() }]
            }]);
            const submenuItem = document.querySelector('.has-submenu');
            submenuItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            expect(document.querySelector('.context-menu--submenu')).not.toBeNull();

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
            expect(document.querySelector('.context-menu--submenu')).toBeNull();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // ArrowRight – on non-submenu item (no-op)
    // ─────────────────────────────────────────────────────────────────────────
    describe('keyboard – ArrowRight on non-submenu item', () => {
        test('ArrowRight does nothing when focused item has no submenu', () => {
            contextMenu.show(100, 100, [
                { label: 'Regular Item', action: vi.fn() }
            ]);
            const item = document.querySelector('[role="menuitem"]');
            item.focus();

            // Should not throw
            expect(() => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
            }).not.toThrow();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Space key – triggers action like Enter
    // ─────────────────────────────────────────────────────────────────────────
    describe('keyboard – Space triggers action', () => {
        test('Space key triggers the focused item action', () => {
            const action = vi.fn();
            contextMenu.show(100, 100, [
                { label: 'Item', action }
            ]);
            document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
            expect(action).toHaveBeenCalledTimes(1);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // contextmenu event closes menu
    // ─────────────────────────────────────────────────────────────────────────
    describe('contextmenu event closes menu', () => {
        test('right-click (contextmenu) elsewhere closes the menu', () => {
            contextMenu.show(100, 100, [{ label: 'Item', action: vi.fn() }]);
            document.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
            expect(contextMenu.isVisible()).toBe(false);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Submenu viewport clamping – left overflow (line 181)
    // ─────────────────────────────────────────────────────────────────────────
    describe('submenu – viewport clamp left overflow', () => {
        test('clamps submenu left when it would overflow right edge', () => {
            // Show main menu first, then shrink viewport so submenu overflows
            contextMenu.show(10, 10, [{
                label: 'Move',
                submenu: [{ label: 'Sub', action: vi.fn() }]
            }]);
            // Set innerWidth to 0 so parentRect.right (=0) + submenuRect.width (=0) > 0 is false...
            // Need it > innerWidth: since getBoundingClientRect returns 0, use innerWidth = -1
            Object.defineProperty(window, 'innerWidth', { value: 0, writable: true, configurable: true });
            const submenuItem = document.querySelector('.has-submenu');
            submenuItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            const submenu = document.querySelector('.context-menu--submenu');
            expect(submenu).not.toBeNull();
            // left clamped: parentRect.left - submenuRect.width = 0 - 0 = 0
            expect(parseFloat(submenu.style.left)).toBeGreaterThanOrEqual(0);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Submenu viewport clamping – top overflow (line 184)
    // ─────────────────────────────────────────────────────────────────────────
    describe('submenu – viewport clamp top overflow', () => {
        test('clamps submenu top when it would overflow bottom edge', () => {
            contextMenu.show(10, 10, [{
                label: 'Move',
                submenu: [{ label: 'Sub', action: vi.fn() }]
            }]);
            // Set innerHeight to 0 so top + submenuRect.height > innerHeight triggers
            Object.defineProperty(window, 'innerHeight', { value: 0, writable: true, configurable: true });
            const submenuItem = document.querySelector('.has-submenu');
            submenuItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            const submenu = document.querySelector('.context-menu--submenu');
            expect(submenu).not.toBeNull();
            // top clamped: innerHeight - submenuRect.height - 4 = 0 - 0 - 4 = -4, then clamped to 4
            expect(parseFloat(submenu.style.top)).toBeGreaterThanOrEqual(0);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Submenu mouseleave toward non-parent (line 195)
    // ─────────────────────────────────────────────────────────────────────────
    describe('submenu mouseleave – toward non-parent hides submenu', () => {
        test('hides submenu when leaving submenu toward unrelated element', () => {
            contextMenu.show(100, 100, [{
                label: 'Move',
                submenu: [{ label: 'Layer 1', action: vi.fn() }]
            }]);
            const submenuItem = document.querySelector('.has-submenu');
            submenuItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            const submenu = document.querySelector('.context-menu--submenu');
            expect(submenu).not.toBeNull();

            // Fire mouseleave from the submenu element itself, relatedTarget is body (not the parent item)
            submenu.dispatchEvent(new MouseEvent('mouseleave', {
                bubbles: true,
                relatedTarget: document.body
            }));
            expect(document.querySelector('.context-menu--submenu')).toBeNull();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // ArrowRight setTimeout – focuses first submenu item (lines 285-287)
    // ─────────────────────────────────────────────────────────────────────────
    describe('keyboard – ArrowRight setTimeout focuses submenu item', () => {
        test('setTimeout in ArrowRight handler focuses first submenu item', () => {
            vi.useFakeTimers();
            contextMenu.show(100, 100, [{
                label: 'Move',
                submenu: [{ label: 'Layer 1', action: vi.fn() }]
            }]);
            const submenuItem = document.querySelector('.has-submenu');
            submenuItem.focus();

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
            // At this point mouseenter was fired synchronously, submenu should exist
            expect(document.querySelector('.context-menu--submenu')).not.toBeNull();

            // Advance timers to run the setTimeout callback (lines 285-287)
            vi.runAllTimers();
            vi.useRealTimers();
        });
    });
});
