// @ts-nocheck
import { ToolPanel } from '../../../src/ui/components/ToolPanel.js';

describe('ToolPanel', () => {
    let container;

    beforeEach(() => {
        container = document.createElement('div');
    });

    describe('constructor / initialize', () => {
        it('sets container and initializes empty panels', () => {
            const tp = new ToolPanel(container);
            expect(tp.container).toBe(container);
            expect(tp.panels).toEqual({});
            expect(tp.collapsedPanels).toEqual({});
        });

        it('adds tool-panel class to empty container', () => {
            const tp = new ToolPanel(container);
            expect(container.classList.contains('tool-panel')).toBe(true);
        });

        it('does NOT add class to container with existing children', () => {
            container.appendChild(document.createElement('div'));
            const tp = new ToolPanel(container);
            expect(container.classList.contains('tool-panel')).toBe(false);
        });
    });

    describe('getElement', () => {
        it('returns the container element', () => {
            const tp = new ToolPanel(container);
            expect(tp.getElement()).toBe(container);
        });
    });

    describe('addPanel', () => {
        it('creates panel with header and content', () => {
            const tp = new ToolPanel(container);
            const content = document.createElement('p');
            content.textContent = 'test content';

            tp.addPanel('test', 'Test Panel', content);

            const panelEl = container.querySelector('[data-panel-id="test"]');
            expect(panelEl).not.toBeNull();
            const header = panelEl.querySelector('.panel-header');
            expect(header).not.toBeNull();
        });

        it('creates panel in expanded state by default', () => {
            const tp = new ToolPanel(container);
            tp.addPanel('p1', 'Panel 1', null);

            expect(tp.collapsedPanels['p1']).toBe(false);
            const panelEl = container.querySelector('[data-panel-id="p1"]');
            expect(panelEl.classList.contains('collapsed')).toBe(false);
        });

        it('creates panel in collapsed state when collapsed=true', () => {
            const tp = new ToolPanel(container);
            tp.addPanel('p2', 'Panel 2', null, true);

            expect(tp.collapsedPanels['p2']).toBe(true);
            const panelEl = container.querySelector('[data-panel-id="p2"]');
            expect(panelEl.classList.contains('collapsed')).toBe(true);
        });

        it('stores panel in panels map', () => {
            const tp = new ToolPanel(container);
            tp.addPanel('pnl', 'My Panel', null);
            expect(tp.panels['pnl']).toBeDefined();
            expect(tp.panels['pnl'].title).toBe('My Panel');
        });

        it('appends content to content container when content provided', () => {
            const tp = new ToolPanel(container);
            const content = document.createElement('span');
            content.textContent = 'inner';
            tp.addPanel('pnl', 'Panel', content);

            const panelContent = container.querySelector('.panel-content');
            expect(panelContent.querySelector('span')).not.toBeNull();
        });

        it('toggle button collapses/expands panel on click', () => {
            const tp = new ToolPanel(container);
            tp.addPanel('pnl', 'Panel', null);

            const toggleBtn = container.querySelector('.panel-toggle');
            toggleBtn.click(); // collapse
            expect(tp.collapsedPanels['pnl']).toBe(true);
            toggleBtn.click(); // expand
            expect(tp.collapsedPanels['pnl']).toBe(false);
        });
    });

    describe('togglePanel', () => {
        it('does nothing for unknown panelId', () => {
            const tp = new ToolPanel(container);
            expect(() => tp.togglePanel('nonexistent')).not.toThrow();
        });

        it('collapses an expanded panel (new structure)', () => {
            const tp = new ToolPanel(container);
            tp.addPanel('p1', 'Panel 1', null);

            tp.togglePanel('p1');
            expect(tp.collapsedPanels['p1']).toBe(true);
        });

        it('expands a collapsed panel (new structure)', () => {
            const tp = new ToolPanel(container);
            tp.addPanel('p1', 'Panel 1', null, true);

            tp.togglePanel('p1');
            expect(tp.collapsedPanels['p1']).toBe(false);
        });
    });

    describe('expandPanel', () => {
        it('expands a collapsed panel', () => {
            const tp = new ToolPanel(container);
            tp.addPanel('p1', 'Panel', null, true);
            expect(tp.collapsedPanels['p1']).toBe(true);

            tp.expandPanel('p1');
            expect(tp.collapsedPanels['p1']).toBe(false);
        });

        it('does nothing to an already expanded panel', () => {
            const tp = new ToolPanel(container);
            tp.addPanel('p1', 'Panel', null, false);

            tp.expandPanel('p1');
            expect(tp.collapsedPanels['p1']).toBe(false);
        });
    });

    describe('collapsePanel', () => {
        it('collapses an expanded panel', () => {
            const tp = new ToolPanel(container);
            tp.addPanel('p1', 'Panel', null, false);

            tp.collapsePanel('p1');
            expect(tp.collapsedPanels['p1']).toBe(true);
        });

        it('does nothing to an already collapsed panel', () => {
            const tp = new ToolPanel(container);
            tp.addPanel('p1', 'Panel', null, true);

            tp.collapsePanel('p1');
            expect(tp.collapsedPanels['p1']).toBe(true);
        });
    });

    describe('getPanel', () => {
        it('returns panel content element', () => {
            const tp = new ToolPanel(container);
            tp.addPanel('p1', 'Panel', null);
            const content = tp.getPanel('p1');
            expect(content).not.toBeNull();
        });

        it('returns null for unknown panelId', () => {
            const tp = new ToolPanel(container);
            expect(tp.getPanel('unknown')).toBeNull();
        });
    });

    describe('addPanelContent', () => {
        it('appends content to existing panel', () => {
            const tp = new ToolPanel(container);
            tp.addPanel('p1', 'Panel', null);
            const el = document.createElement('div');
            el.id = 'added-content';
            tp.addPanelContent('p1', el);

            const panelContent = tp.getPanel('p1');
            expect(panelContent.querySelector('#added-content')).not.toBeNull();
        });

        it('does nothing for unknown panel', () => {
            const tp = new ToolPanel(container);
            expect(() => tp.addPanelContent('unknown', document.createElement('div'))).not.toThrow();
        });
    });

    describe('clearPanel', () => {
        it('clears panel content', () => {
            const tp = new ToolPanel(container);
            const content = document.createElement('span');
            tp.addPanel('p1', 'Panel', content);

            tp.clearPanel('p1');
            expect(tp.getPanel('p1').children.length).toBe(0);
        });

        it('does nothing for unknown panel', () => {
            const tp = new ToolPanel(container);
            expect(() => tp.clearPanel('unknown')).not.toThrow();
        });
    });

    describe('removePanel', () => {
        it('removes panel from DOM and panels map', () => {
            const tp = new ToolPanel(container);
            tp.addPanel('p1', 'Panel', null);
            expect(tp.panels['p1']).toBeDefined();

            tp.removePanel('p1');
            expect(tp.panels['p1']).toBeUndefined();
            expect(tp.collapsedPanels['p1']).toBeUndefined();
            expect(container.querySelector('[data-panel-id="p1"]')).toBeNull();
        });

        it('does nothing for unknown panel', () => {
            const tp = new ToolPanel(container);
            expect(() => tp.removePanel('unknown')).not.toThrow();
        });
    });

    describe('attachExistingGroups', () => {
        it('attaches groups from existing HTML structure', () => {
            const group = document.createElement('div');
            group.className = 'tool-group';
            const header = document.createElement('div');
            header.className = 'tool-group-header';
            const titleEl = document.createElement('span');
            titleEl.className = 'group-title';
            titleEl.textContent = 'My Group';
            header.appendChild(titleEl);
            const content = document.createElement('div');
            content.className = 'tool-group-content';
            group.appendChild(header);
            group.appendChild(content);
            container.appendChild(group);

            const tp = new ToolPanel(container);
            tp.attachExistingGroups();

            expect(tp.panels['my-group']).toBeDefined();
        });

        it('skips groups without header or content', () => {
            const group = document.createElement('div');
            group.className = 'tool-group';
            // No header or content
            container.appendChild(group);

            const tp = new ToolPanel(container);
            expect(() => tp.attachExistingGroups()).not.toThrow();
        });

        it('toggles legacy panel on header click', () => {
            const group = document.createElement('div');
            group.className = 'tool-group';
            const header = document.createElement('div');
            header.className = 'tool-group-header';
            const titleEl = document.createElement('span');
            titleEl.className = 'group-title';
            titleEl.textContent = 'Toggle Group';
            header.appendChild(titleEl);
            const content = document.createElement('div');
            content.className = 'tool-group-content';
            group.appendChild(header);
            group.appendChild(content);
            container.appendChild(group);

            const tp = new ToolPanel(container);
            tp.attachExistingGroups();
            header.click();

            expect(tp.collapsedPanels['toggle-group']).toBe(true);
        });
    });

    describe('toggleLegacyPanel', () => {
        it('does nothing for unknown panelId', () => {
            const tp = new ToolPanel(container);
            expect(() => tp.toggleLegacyPanel('unknown')).not.toThrow();
        });

        it('expands collapsed legacy panel and updates arrow', () => {
            const group = document.createElement('div');
            group.className = 'tool-group';
            const header = document.createElement('div');
            header.className = 'tool-group-header collapsed';
            const titleEl = document.createElement('span');
            titleEl.className = 'group-title';
            titleEl.textContent = 'My Panel';
            const arrow = document.createElement('span');
            arrow.className = 'group-arrow';
            arrow.textContent = '▶';
            header.appendChild(arrow);
            header.appendChild(titleEl);
            const content = document.createElement('div');
            content.className = 'tool-group-content collapsed';
            group.appendChild(header);
            group.appendChild(content);
            container.appendChild(group);

            const tp = new ToolPanel(container);
            tp.attachExistingGroups();

            expect(tp.collapsedPanels['my-panel']).toBe(true);
            tp.toggleLegacyPanel('my-panel');
            expect(tp.collapsedPanels['my-panel']).toBe(false);
            expect(arrow.textContent).toBe('▼');
            expect(header.classList.contains('collapsed')).toBe(false);
        });

        it('collapses expanded legacy panel and updates arrow', () => {
            const group = document.createElement('div');
            group.className = 'tool-group';
            const header = document.createElement('div');
            header.className = 'tool-group-header';
            const titleEl = document.createElement('span');
            titleEl.className = 'group-title';
            titleEl.textContent = 'My Panel';
            const arrow = document.createElement('span');
            arrow.className = 'group-arrow';
            arrow.textContent = '▼';
            header.appendChild(arrow);
            header.appendChild(titleEl);
            const content = document.createElement('div');
            content.className = 'tool-group-content';
            group.appendChild(header);
            group.appendChild(content);
            container.appendChild(group);

            const tp = new ToolPanel(container);
            tp.attachExistingGroups();

            expect(tp.collapsedPanels['my-panel']).toBe(false);
            tp.toggleLegacyPanel('my-panel');
            expect(tp.collapsedPanels['my-panel']).toBe(true);
            expect(arrow.textContent).toBe('▶');
        });

        it('toggles legacy panel without arrow', () => {
            const group = document.createElement('div');
            group.className = 'tool-group';
            const header = document.createElement('div');
            header.className = 'tool-group-header';
            const titleEl = document.createElement('span');
            titleEl.className = 'group-title';
            titleEl.textContent = 'No Arrow Panel';
            header.appendChild(titleEl);
            const content = document.createElement('div');
            content.className = 'tool-group-content';
            group.appendChild(header);
            group.appendChild(content);
            container.appendChild(group);

            const tp = new ToolPanel(container);
            tp.attachExistingGroups();

            expect(() => tp.toggleLegacyPanel('no-arrow-panel')).not.toThrow();
        });

        it('togglePanel delegates to toggleLegacyPanel for legacy panels', () => {
            const group = document.createElement('div');
            group.className = 'tool-group';
            const header = document.createElement('div');
            header.className = 'tool-group-header';
            const titleEl = document.createElement('span');
            titleEl.className = 'group-title';
            titleEl.textContent = 'Legacy';
            const arrow = document.createElement('span');
            arrow.className = 'group-arrow';
            arrow.textContent = '▼';
            header.appendChild(arrow);
            header.appendChild(titleEl);
            const content = document.createElement('div');
            content.className = 'tool-group-content';
            group.appendChild(header);
            group.appendChild(content);
            container.appendChild(group);

            const tp = new ToolPanel(container);
            tp.attachExistingGroups();

            tp.togglePanel('legacy');
            expect(tp.collapsedPanels['legacy']).toBe(true);
        });

        it('uses index-based panelId when no title', () => {
            const group = document.createElement('div');
            group.className = 'tool-group';
            const header = document.createElement('div');
            header.className = 'tool-group-header';
            // No title element
            const content = document.createElement('div');
            content.className = 'tool-group-content';
            group.appendChild(header);
            group.appendChild(content);
            container.appendChild(group);

            const tp = new ToolPanel(container);
            tp.attachExistingGroups();
            expect(tp.panels['panel-0']).toBeDefined();
        });
    });
});
