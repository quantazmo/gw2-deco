// @ts-nocheck
/**
 * Integration tests for selection workflow
 * Covers: map click select, list Ctrl+Click, list Shift+Click range across layers,
 * deselect on empty click, hidden layer not selectable
 */
import { SelectionStore } from '../../src/ui/stores/SelectionStore.js';
import { EventBus } from '../../src/ui/EventBus.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { Layer } from '../../src/domain/Layer.js';
import { Decoration } from '../../src/domain/Decoration.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';

function createTestLayout() {
    const layout = new HomesteadLayout('t1', 'Test');
    const layer1 = new Layer('l1', 'Layer 1', true);
    layer1.addDecoration(new Decoration('d1', 'Oak Tree', new WorldCoordinate(100, 200, 0, 0)));
    layer1.addDecoration(new Decoration('d2', 'Stone Bench', new WorldCoordinate(300, 400, 0, 0)));

    const layer2 = new Layer('l2', 'Layer 2', true);
    layer2.addDecoration(new Decoration('d3', 'Lamp Post', new WorldCoordinate(500, 600, 0, 0)));
    layer2.addDecoration(new Decoration('d4', 'Rock', new WorldCoordinate(700, 800, 0, 0)));

    layout.addLayer(layer1);
    layout.addLayer(layer2);
    return layout;
}

describe('Selection Workflow Integration Tests', () => {
    let selectionStore;
    let eventBus;
    let layout;

    beforeEach(() => {
        eventBus = new EventBus();
        eventBus.debugEnabled = false;
        selectionStore = new SelectionStore(eventBus);
        layout = createTestLayout();
    });

    describe('map click select', () => {
        test('clicking a decoration selects it', () => {
            selectionStore.selectDecoration('d1');
            expect(selectionStore.isSelected('d1')).toBe(true);
            expect(selectionStore.getSelectionCount()).toBe(1);
        });

        test('clicking a different decoration replaces selection', () => {
            selectionStore.selectDecoration('d1');
            selectionStore.selectDecoration('d2');
            expect(selectionStore.isSelected('d1')).toBe(false);
            expect(selectionStore.isSelected('d2')).toBe(true);
            expect(selectionStore.getSelectionCount()).toBe(1);
        });
    });

    describe('list Ctrl+Click', () => {
        test('Ctrl+Click adds decoration to existing selection', () => {
            selectionStore.selectDecoration('d1');
            selectionStore.toggleDecoration('d2');
            expect(selectionStore.isSelected('d1')).toBe(true);
            expect(selectionStore.isSelected('d2')).toBe(true);
            expect(selectionStore.getSelectionCount()).toBe(2);
        });

        test('Ctrl+Click removes decoration from selection if already selected', () => {
            selectionStore.selectDecoration('d1');
            selectionStore.toggleDecoration('d2');
            selectionStore.toggleDecoration('d1');
            expect(selectionStore.isSelected('d1')).toBe(false);
            expect(selectionStore.isSelected('d2')).toBe(true);
            expect(selectionStore.getSelectionCount()).toBe(1);
        });
    });

    describe('list Shift+Click range across layers', () => {
        test('Shift+Click selects range of decorations in display order', () => {
            const orderedIds = ['d1', 'd2', 'd3', 'd4'];

            selectionStore.selectDecoration('d1');
            selectionStore.selectRange('d1', 'd3', orderedIds);

            expect(selectionStore.isSelected('d1')).toBe(true);
            expect(selectionStore.isSelected('d2')).toBe(true);
            expect(selectionStore.isSelected('d3')).toBe(true);
            expect(selectionStore.isSelected('d4')).toBe(false);
            expect(selectionStore.getSelectionCount()).toBe(3);
        });

        test('Shift+Click range works across layers', () => {
            const orderedIds = ['d1', 'd2', 'd3', 'd4'];

            selectionStore.selectDecoration('d2');
            selectionStore.selectRange('d2', 'd4', orderedIds);

            expect(selectionStore.isSelected('d1')).toBe(false);
            expect(selectionStore.isSelected('d2')).toBe(true);
            expect(selectionStore.isSelected('d3')).toBe(true);
            expect(selectionStore.isSelected('d4')).toBe(true);
            expect(selectionStore.getSelectionCount()).toBe(3);
        });
    });

    describe('deselect on empty click', () => {
        test('clearSelection deselects all', () => {
            selectionStore.selectDecoration('d1');
            selectionStore.toggleDecoration('d2');
            expect(selectionStore.getSelectionCount()).toBe(2);

            selectionStore.clearSelection();
            expect(selectionStore.getSelectionCount()).toBe(0);
            expect(selectionStore.isSelected('d1')).toBe(false);
            expect(selectionStore.isSelected('d2')).toBe(false);
        });
    });

    describe('hidden layer not selectable', () => {
        test('getAllVisibleDecorationIds excludes hidden layers', () => {
            layout.getLayer('l2').isVisible = false;
            const visibleIds = layout.getAllVisibleDecorationIds();

            expect(visibleIds).toContain('d1');
            expect(visibleIds).toContain('d2');
            expect(visibleIds).not.toContain('d3');
            expect(visibleIds).not.toContain('d4');
        });

        test('deselectByLayer removes hidden layer decorations from selection', () => {
            selectionStore.selectDecoration('d1');
            selectionStore.toggleDecoration('d3');
            expect(selectionStore.getSelectionCount()).toBe(2);

            // Simulate hiding layer 2 and deselecting its decorations
            const layer2 = layout.getLayer('l2');
            selectionStore.deselectByLayer('l2', (id) => layer2.getDecoration(id) !== null);

            expect(selectionStore.isSelected('d1')).toBe(true);
            expect(selectionStore.isSelected('d3')).toBe(false);
            expect(selectionStore.getSelectionCount()).toBe(1);
        });
    });

    describe('event publishing', () => {
        test('selection changes publish SELECTION_CHANGED event', () => {
            const events = [];
            eventBus.subscribe('SELECTION_CHANGED', (data) => events.push(data));

            selectionStore.selectDecoration('d1');
            expect(events.length).toBe(1);
            expect(events[0].selectedIds).toEqual(['d1']);

            selectionStore.toggleDecoration('d2');
            expect(events.length).toBe(2);
            expect(events[1].selectedIds).toContain('d1');
            expect(events[1].selectedIds).toContain('d2');
        });

        test('clearSelection publishes empty SELECTION_CHANGED event', () => {
            const events = [];
            selectionStore.selectDecoration('d1');
            eventBus.subscribe('SELECTION_CHANGED', (data) => events.push(data));

            selectionStore.clearSelection();
            expect(events.length).toBe(1);
            expect(events[0].selectedIds).toEqual([]);
        });
    });
});
