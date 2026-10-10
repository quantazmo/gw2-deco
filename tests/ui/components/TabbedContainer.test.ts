/**
 * Tests for TabbedContainer: tab clicks and missing panel content.
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
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

        test('tab buttons do not expose panel drag handles', () => {
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
            expect(tabs[0].hasAttribute('data-drag-handle')).toBe(false);
            tabs[0].click();
            expect(published[0].event).toBe('layout:tab-activated');
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

});
