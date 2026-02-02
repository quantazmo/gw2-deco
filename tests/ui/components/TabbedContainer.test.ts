// @ts-nocheck
/**
 * Tests for TabbedContainer — covers lines 71-74, 83, 111-222.
 * Specifically: tab clicks, missing panel content, and tab reorder drag.
 */
import { TabbedContainer } from '../../../src/ui/components/TabbedContainer.js';

function makeTabGroupNode(panels = ['map', 'layers'], activeIndex = 0) {
    return { type: 'tabgroup', panels, activeIndex };
}

function makePanelContentMap(panels = ['map', 'layers']) {
    const map = {};
    panels.forEach(id => {
        const el = document.createElement('div');
        el.id = `content-${id}`;
        map[id] = el;
    });
    return map;
}

describe('TabbedContainer', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Basic rendering
    // ─────────────────────────────────────────────────────────────────────────
    describe('construction', () => {
        test('creates element with tab-bar and tab-content-area', () => {
            const node = makeTabGroupNode();
            const contentMap = makePanelContentMap();
            const container = new TabbedContainer(node, contentMap);
            const el = container.getElement();

            expect(el.classList.contains('tabbed-container')).toBe(true);
            expect(el.querySelector('.tab-bar')).not.toBeNull();
            expect(el.querySelector('.tab-content-area')).not.toBeNull();
        });

        test('active panel content is displayed in content area', () => {
            const node = makeTabGroupNode(['map', 'layers'], 0);
            const contentMap = makePanelContentMap(['map', 'layers']);
            const container = new TabbedContainer(node, contentMap);
            const el = container.getElement();
            const contentArea = el.querySelector('.tab-content-area');

            expect(contentArea.children.length).toBe(1);
            expect(contentArea.children[0].id).toBe('content-map');
        });

        test('missing content for active panel (line 83) — still renders without crashing', () => {
            const node = makeTabGroupNode(['inspector'], 0);
            // No content map entry for 'inspector'
            const container = new TabbedContainer(node, {});
            const el = container.getElement();
            const contentArea = el.querySelector('.tab-content-area');
            // No content element appended
            expect(contentArea.children.length).toBe(0);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Tab click – with eventBus (lines 71-73, 215-221)
    // ─────────────────────────────────────────────────────────────────────────
    describe('tab click', () => {
        test('clicking a tab publishes layout:tab-activated on eventBus', () => {
            const published = [];
            const eventBus = {
                publish: (event, data) => published.push({ event, data })
            };

            const node = makeTabGroupNode(['map', 'layers'], 0);
            const contentMap = makePanelContentMap();
            const container = new TabbedContainer(node, contentMap, eventBus);
            const el = container.getElement();
            document.body.appendChild(el);

            const tabs = el.querySelectorAll('.tab-button');
            // Click the second tab (layers)
            tabs[1].click();

            expect(published.length).toBe(1);
            expect(published[0].event).toBe('layout:tab-activated');
            expect(published[0].data.activatedPanelId).toBe('layers');
        });

        test('clicking a tab with wasDragging flag does NOT publish event', () => {
            const published = [];
            const eventBus = {
                publish: (event, data) => published.push({ event, data })
            };

            const node = makeTabGroupNode(['map', 'layers'], 0);
            const contentMap = makePanelContentMap();
            const container = new TabbedContainer(node, contentMap, eventBus);
            const el = container.getElement();
            document.body.appendChild(el);

            const tabs = el.querySelectorAll('.tab-button');
            // Set the wasDragging flag — simulates drag completion
            tabs[0].dataset.wasDragging = 'true';
            tabs[0].click();

            expect(published.length).toBe(0);
            // wasDragging flag should be deleted after click
            expect(tabs[0].dataset.wasDragging).toBeUndefined();
        });

        test('clicking a tab without eventBus does not throw', () => {
            const node = makeTabGroupNode(['map', 'layers'], 0);
            const contentMap = makePanelContentMap();
            const container = new TabbedContainer(node, contentMap, null);
            const el = container.getElement();
            document.body.appendChild(el);

            const tabs = el.querySelectorAll('.tab-button');
            expect(() => tabs[1].click()).not.toThrow();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Tab drag reorder (lines 111-201)
    // ─────────────────────────────────────────────────────────────────────────
    describe('tab reorder drag', () => {
        function fireMouseEvent(target, type, opts = {}) {
            const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: opts.clientX ?? 0, clientY: opts.clientY ?? 0 });
            target.dispatchEvent(e);
            return e;
        }

        test('onReorder is wired when provided', () => {
            const onReorder = vi.fn();
            const node = makeTabGroupNode(['map', 'layers', 'inspector'], 0);
            const contentMap = makePanelContentMap(['map', 'layers', 'inspector']);
            const container = new TabbedContainer(node, contentMap, null, onReorder);
            const el = container.getElement();
            document.body.appendChild(el);

            const tabBar = el.querySelector('.tab-bar');
            const tabs = tabBar.querySelectorAll('.tab-button');

            // Mock getBoundingClientRect for tabs to simulate layout
            tabs[0].getBoundingClientRect = () => ({ left: 0, right: 50, width: 50, top: 0, bottom: 30, height: 30 });
            tabs[1].getBoundingClientRect = () => ({ left: 50, right: 100, width: 50, top: 0, bottom: 30, height: 30 });
            tabs[2].getBoundingClientRect = () => ({ left: 100, right: 150, width: 50, top: 0, bottom: 30, height: 30 });
            tabBar.getBoundingClientRect = () => ({ left: 0, right: 150, width: 150, top: 0, bottom: 30, height: 30 });

            // Drag from tab[0] (index 0) to near tab[2] (x=130)
            fireMouseEvent(tabs[0], 'mousedown', { clientX: 10 });
            document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 130, clientY: 15 }));
            document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 130, clientY: 15 }));

            expect(onReorder).toHaveBeenCalled();
        });

        test('drag outside bar does not call onReorder', () => {
            const onReorder = vi.fn();
            const node = makeTabGroupNode(['map', 'layers'], 0);
            const contentMap = makePanelContentMap(['map', 'layers']);
            const container = new TabbedContainer(node, contentMap, null, onReorder);
            const el = container.getElement();
            document.body.appendChild(el);

            const tabBar = el.querySelector('.tab-bar');
            const tabs = tabBar.querySelectorAll('.tab-button');
            tabBar.getBoundingClientRect = () => ({ left: 0, right: 100, width: 100, top: 0, bottom: 30, height: 30 });

            // Drag from tab[0] to far outside bar
            fireMouseEvent(tabs[0], 'mousedown', { clientX: 10 });
            document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 500, clientY: 200 }));
            document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 500, clientY: 200 }));

            expect(onReorder).not.toHaveBeenCalled();
        });

        test('drag to same position (no-op) does not call onReorder', () => {
            const onReorder = vi.fn();
            const node = makeTabGroupNode(['map', 'layers'], 0);
            const contentMap = makePanelContentMap(['map', 'layers']);
            const container = new TabbedContainer(node, contentMap, null, onReorder);
            const el = container.getElement();
            document.body.appendChild(el);

            const tabBar = el.querySelector('.tab-bar');
            const tabs = tabBar.querySelectorAll('.tab-button');
            tabs[0].getBoundingClientRect = () => ({ left: 0, right: 50, width: 50, top: 0, bottom: 30, height: 30 });
            tabs[1].getBoundingClientRect = () => ({ left: 50, right: 100, width: 50, top: 0, bottom: 30, height: 30 });
            tabBar.getBoundingClientRect = () => ({ left: 0, right: 100, width: 100, top: 0, bottom: 30, height: 30 });

            // Drag tab[0] to same position
            fireMouseEvent(tabs[0], 'mousedown', { clientX: 10 });
            document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 10, clientY: 15 }));
            document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 10, clientY: 15 }));

            expect(onReorder).not.toHaveBeenCalled();
        });

        test('mousemove outside bar while dragging removes indicator', () => {
            const onReorder = vi.fn();
            const node = makeTabGroupNode(['map', 'layers'], 0);
            const contentMap = makePanelContentMap(['map', 'layers']);
            const container = new TabbedContainer(node, contentMap, null, onReorder);
            const el = container.getElement();
            document.body.appendChild(el);

            const tabBar = el.querySelector('.tab-bar');
            const tabs = tabBar.querySelectorAll('.tab-button');
            tabBar.getBoundingClientRect = () => ({ left: 0, right: 100, width: 100, top: 0, bottom: 30, height: 30 });

            fireMouseEvent(tabs[0], 'mousedown', { clientX: 10 });
            // Move inside bar first (shows indicator)
            document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 50, clientY: 15 }));
            // Move outside bar (removes indicator)
            document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 500, clientY: 200 }));
            document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

            // Indicator should be cleaned up
            expect(tabBar.querySelector('.tab-insertion-indicator')).toBeNull();
        });

        test('mousedown on non-tab element is ignored', () => {
            const onReorder = vi.fn();
            const node = makeTabGroupNode(['map', 'layers'], 0);
            const contentMap = makePanelContentMap(['map', 'layers']);
            const container = new TabbedContainer(node, contentMap, null, onReorder);
            const el = container.getElement();
            document.body.appendChild(el);

            const tabBar = el.querySelector('.tab-bar');
            // Click directly on tab-bar (not a .tab-button)
            fireMouseEvent(tabBar, 'mousedown', { clientX: 10 });
            document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 50, clientY: 15 }));

            expect(onReorder).not.toHaveBeenCalled();
        });
    });
});
