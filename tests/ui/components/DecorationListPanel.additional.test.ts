// @ts-nocheck
/**
 * Additional tests for DecorationListPanel.
 * Covers: Array/Map decorations (lines 63-66), dragstart/contextmenu events (131,136), 
 * _handleDragStart (182+), _handleContextMenu (222+)
 */
import { DecorationListPanel } from '../../../src/ui/components/DecorationListPanel.js';
import { SelectionStore } from '../../../src/ui/stores/SelectionStore.js';
import { EventBus } from '../../../src/ui/EventBus.js';

function createMockAppStore(layers = []) {
    const listeners = [];
    return {
        getState: () => ({ layers }),
        subscribe: (fn) => {
            listeners.push(fn);
            return () => { listeners.splice(listeners.indexOf(fn), 1); };
        },
        _notify(state) { listeners.forEach(fn => fn(state)); }
    };
}

function createDecoration(id, name) {
    return { id, uid: id, name, position: { x: 0, y: 0 } };
}

describe('DecorationListPanel — additional coverage', () => {
    let container;
    let selectionStore;
    let eventBus;

    beforeEach(() => {
        document.body.innerHTML = '';
        container = document.createElement('div');
        document.body.appendChild(container);
        eventBus = new EventBus();
        eventBus.debugEnabled = false;
        selectionStore = new SelectionStore(eventBus);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Array.isArray decorations path (lines 63-64)
    // ─────────────────────────────────────────────────────────────────────────
    test('renders decorations from a layer with Array.isArray decorations (no getAllDecorations)', () => {
        const layers = [{
            id: 'l1',
            name: 'Layer 1',
            isVisible: true,
            decorations: [createDecoration('d1', 'Oak'), createDecoration('d2', 'Bench')]
            // No getAllDecorations function
        }];
        const appStore = createMockAppStore(layers);
        new DecorationListPanel(container, appStore, selectionStore, eventBus);

        const items = container.querySelectorAll('.decoration-list__item');
        expect(items.length).toBe(2);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Map decorations path (lines 65-66)
    // ─────────────────────────────────────────────────────────────────────────
    test('renders decorations from a layer with Map decorations (no getAllDecorations)', () => {
        const dec1 = createDecoration('d1', 'Oak');
        const dec2 = createDecoration('d2', 'Bench');
        const layers = [{
            id: 'l1',
            name: 'Layer 1',
            isVisible: true,
            decorations: new Map([['d1', dec1], ['d2', dec2]])
            // No getAllDecorations function, not Array
        }];
        const appStore = createMockAppStore(layers);
        new DecorationListPanel(container, appStore, selectionStore, eventBus);

        const items = container.querySelectorAll('.decoration-list__item');
        expect(items.length).toBe(2);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // dragstart event (lines 131, 182+)
    // ─────────────────────────────────────────────────────────────────────────
    test('dragstart selects item if not selected and sets dataTransfer', () => {
        const layers = [{
            id: 'l1',
            name: 'Layer 1',
            isVisible: true,
            getAllDecorations: () => [createDecoration('d1', 'Oak')]
        }];
        const appStore = createMockAppStore(layers);
        new DecorationListPanel(container, appStore, selectionStore, eventBus);

        const item = container.querySelector('.decoration-list__item');
        const mockDataTransfer = {
            setData: vi.fn(),
            effectAllowed: null,
            setDragImage: vi.fn()
        };
        const dragEvent = new Event('dragstart', { bubbles: true });
        dragEvent.dataTransfer = mockDataTransfer;
        item.dispatchEvent(dragEvent);

        expect(mockDataTransfer.setData).toHaveBeenCalledWith(
            'application/x-decoration-ids',
            expect.any(String)
        );
        expect(selectionStore.isSelected('d1')).toBe(true);
    });

    test('dragstart with multiple selected items shows custom drag image', () => {
        const layers = [{
            id: 'l1',
            name: 'Layer 1',
            isVisible: true,
            getAllDecorations: () => [
                createDecoration('d1', 'Oak'),
                createDecoration('d2', 'Bench')
            ]
        }];
        const appStore = createMockAppStore(layers);
        new DecorationListPanel(container, appStore, selectionStore, eventBus);

        // Pre-select both
        selectionStore.selectDecoration('d1');
        selectionStore.toggleDecoration('d2');

        const items = container.querySelectorAll('.decoration-list__item');
        const mockDataTransfer = {
            setData: vi.fn(),
            effectAllowed: null,
            setDragImage: vi.fn()
        };
        const dragEvent = new Event('dragstart', { bubbles: true });
        dragEvent.dataTransfer = mockDataTransfer;
        items[0].dispatchEvent(dragEvent);

        expect(mockDataTransfer.setDragImage).toHaveBeenCalled();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // contextmenu event (lines 136, 222+) — without contextMenu set, no-op
    // ─────────────────────────────────────────────────────────────────────────
    test('contextmenu without _contextMenu set does nothing', () => {
        const layers = [{
            id: 'l1',
            name: 'Layer 1',
            isVisible: true,
            getAllDecorations: () => [createDecoration('d1', 'Oak')]
        }];
        const appStore = createMockAppStore(layers);
        const panel = new DecorationListPanel(container, appStore, selectionStore, eventBus);
        // _contextMenu is null by default

        const item = container.querySelector('.decoration-list__item');
        // Should not throw
        expect(() => {
            item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
        }).not.toThrow();
    });

    test('contextmenu with contextMenu and appService shows menu', () => {
        const layers = [
            {
                id: 'l1',
                name: 'Layer 1',
                isVisible: true,
                getAllDecorations: () => [createDecoration('d1', 'Oak')]
            },
            {
                id: 'l2',
                name: 'Layer 2',
                isVisible: true,
                getAllDecorations: () => [createDecoration('d3', 'Pine')]
            }
        ];
        const appStore = createMockAppStore(layers);
        const mockContextMenu = { show: vi.fn() };
        const mockAppService = { execute: vi.fn() };

        const panel = new DecorationListPanel(container, appStore, selectionStore, eventBus, mockAppService);
        panel.setContextMenu(mockContextMenu);

        const item = container.querySelector('.decoration-list__item');
        item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 200 }));

        expect(mockContextMenu.show).toHaveBeenCalledWith(100, 200, expect.any(Array));
    });

    test('contextmenu selects item if not already selected', () => {
        const layers = [{
            id: 'l1',
            name: 'Layer 1',
            isVisible: true,
            getAllDecorations: () => [createDecoration('d1', 'Oak')]
        }];
        const appStore = createMockAppStore(layers);
        const mockContextMenu = { show: vi.fn() };
        const mockAppService = { execute: vi.fn() };

        const panel = new DecorationListPanel(container, appStore, selectionStore, eventBus, mockAppService);
        panel.setContextMenu(mockContextMenu);

        expect(selectionStore.isSelected('d1')).toBe(false);
        const item = container.querySelector('.decoration-list__item');
        item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));

        expect(selectionStore.isSelected('d1')).toBe(true);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // setAppService (late binding)
    // ─────────────────────────────────────────────────────────────────────────
    test('setAppService sets the appService reference', () => {
        const appStore = createMockAppStore([]);
        const panel = new DecorationListPanel(container, appStore, selectionStore, eventBus);

        const mockService = { execute: vi.fn() };
        panel.setAppService(mockService);
        expect(panel.appService).toBe(mockService);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Context menu action callbacks
    // ─────────────────────────────────────────────────────────────────────────
    test('context menu delete action publishes confirm:deleteDecorations event', () => {
        const layers = [{
            id: 'l1',
            name: 'Layer 1',
            isVisible: true,
            getAllDecorations: () => [createDecoration('d1', 'Oak')]
        }];
        const appStore = createMockAppStore(layers);
        const mockContextMenu = {
            show: vi.fn((x, y, items) => {
                // Find and call the delete action
                const deleteItem = items.find(i => i.label && i.label.includes('Delete'));
                if (deleteItem) deleteItem.action();
            })
        };
        const mockAppService = { execute: vi.fn() };
        const publishedEvents: { event: string; data: unknown }[] = [];
        eventBus.subscribe('confirm:deleteDecorations', (data) => {
            publishedEvents.push({ event: 'confirm:deleteDecorations', data });
        });

        const panel = new DecorationListPanel(container, appStore, selectionStore, eventBus, mockAppService);
        panel.setContextMenu(mockContextMenu);

        const item = container.querySelector('.decoration-list__item');
        item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));

        expect(mockAppService.execute).not.toHaveBeenCalled();
        expect(publishedEvents.length).toBe(1);
        expect(publishedEvents[0].data).toMatchObject({ decorationIds: ['d1'] });
    });
});
