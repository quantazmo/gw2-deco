// @ts-nocheck
/**
 * Tests for src/ui/stores/SelectionStore.js
 * Tests multi-select, toggle, range, clear, deselectByLayer, event publishing
 */
import { SelectionStore } from '../../../src/ui/stores/SelectionStore.js';

describe('SelectionStore', () => {

    let store;
    let mockEventBus;
    let publishedEvents;

    beforeEach(() => {
        publishedEvents = [];
        mockEventBus = {
            publish(eventType, data) {
                publishedEvents.push({ eventType, data });
            }
        };
        store = new SelectionStore(mockEventBus);
    });

    describe('constructor', () => {
        test('should initialize with empty selection', () => {
            expect(store.getSelectedIds()).toEqual([]);
            expect(store.getSelectionCount()).toBe(0);
            expect(store.getActiveLayerId()).toBeNull();
        });

        test('should work without eventBus', () => {
            const s = new SelectionStore();
            s.selectDecoration('d1');
            expect(s.getSelectedIds()).toEqual(['d1']);
        });
    });

    describe('selectDecoration', () => {
        test('should select a single decoration', () => {
            store.selectDecoration('d1');

            expect(store.getSelectedIds()).toEqual(['d1']);
            expect(store.isSelected('d1')).toBe(true);
            expect(store.getSelectionCount()).toBe(1);
        });

        test('should replace previous selection', () => {
            store.selectDecoration('d1');
            store.selectDecoration('d2');

            expect(store.getSelectedIds()).toEqual(['d2']);
            expect(store.isSelected('d1')).toBe(false);
            expect(store.isSelected('d2')).toBe(true);
        });

        test('should ignore empty string', () => {
            store.selectDecoration('');
            expect(store.getSelectionCount()).toBe(0);
        });

        test('should ignore non-string', () => {
            store.selectDecoration(null);
            expect(store.getSelectionCount()).toBe(0);
        });

        test('should publish SELECTION_CHANGED event', () => {
            store.selectDecoration('d1');

            const selEvents = publishedEvents.filter(e => e.eventType === 'SELECTION_CHANGED');
            expect(selEvents).toHaveLength(1);
            expect(selEvents[0].data.selectedIds).toEqual(['d1']);
        });
    });

    describe('toggleDecoration', () => {
        test('should add decoration to empty selection', () => {
            store.toggleDecoration('d1');
            expect(store.isSelected('d1')).toBe(true);
        });

        test('should add decoration to existing selection', () => {
            store.selectDecoration('d1');
            store.toggleDecoration('d2');

            expect(store.isSelected('d1')).toBe(true);
            expect(store.isSelected('d2')).toBe(true);
            expect(store.getSelectionCount()).toBe(2);
        });

        test('should remove decoration if already selected', () => {
            store.selectDecoration('d1');
            store.toggleDecoration('d1');

            expect(store.isSelected('d1')).toBe(false);
            expect(store.getSelectionCount()).toBe(0);
        });

        test('should ignore empty string', () => {
            store.toggleDecoration('');
            expect(store.getSelectionCount()).toBe(0);
        });

        test('should publish SELECTION_CHANGED event', () => {
            store.toggleDecoration('d1');

            const selEvents = publishedEvents.filter(e => e.eventType === 'SELECTION_CHANGED');
            expect(selEvents).toHaveLength(1);
        });
    });

    describe('selectRange', () => {
        const orderedIds = ['d1', 'd2', 'd3', 'd4', 'd5'];

        test('should select range between two IDs (forward)', () => {
            store.selectRange('d2', 'd4', orderedIds);

            expect(store.getSelectedIds()).toEqual(expect.arrayContaining(['d2', 'd3', 'd4']));
            expect(store.getSelectionCount()).toBe(3);
        });

        test('should select range between two IDs (backward)', () => {
            store.selectRange('d4', 'd2', orderedIds);

            expect(store.getSelectedIds()).toEqual(expect.arrayContaining(['d2', 'd3', 'd4']));
            expect(store.getSelectionCount()).toBe(3);
        });

        test('should select single item when from and to are the same', () => {
            store.selectRange('d3', 'd3', orderedIds);

            expect(store.getSelectedIds()).toEqual(['d3']);
        });

        test('should handle missing fromId', () => {
            store.selectRange('notfound', 'd3', orderedIds);
            expect(store.getSelectionCount()).toBe(0);
        });

        test('should handle missing toId', () => {
            store.selectRange('d1', 'notfound', orderedIds);
            expect(store.getSelectionCount()).toBe(0);
        });

        test('should handle non-array orderedIds', () => {
            store.selectRange('d1', 'd3', null);
            expect(store.getSelectionCount()).toBe(0);
        });

        test('should replace previous selection', () => {
            store.selectDecoration('d5');
            store.selectRange('d1', 'd2', orderedIds);

            expect(store.isSelected('d5')).toBe(false);
            expect(store.getSelectionCount()).toBe(2);
        });
    });

    describe('selectAll', () => {
        test('should select all provided IDs', () => {
            store.selectAll(['d1', 'd2', 'd3']);

            expect(store.getSelectionCount()).toBe(3);
            expect(store.isSelected('d1')).toBe(true);
            expect(store.isSelected('d2')).toBe(true);
            expect(store.isSelected('d3')).toBe(true);
        });

        test('should replace previous selection', () => {
            store.selectDecoration('d5');
            store.selectAll(['d1', 'd2']);

            expect(store.isSelected('d5')).toBe(false);
            expect(store.getSelectionCount()).toBe(2);
        });

        test('should handle non-array gracefully', () => {
            store.selectAll(null);
            expect(store.getSelectionCount()).toBe(0);
        });
    });

    describe('clearSelection', () => {
        test('should clear all selected decorations', () => {
            store.selectAll(['d1', 'd2', 'd3']);
            store.clearSelection();

            expect(store.getSelectionCount()).toBe(0);
            expect(store.getSelectedIds()).toEqual([]);
        });

        test('should publish SELECTION_CHANGED with empty array', () => {
            store.selectDecoration('d1');
            publishedEvents = [];
            store.clearSelection();

            const selEvents = publishedEvents.filter(e => e.eventType === 'SELECTION_CHANGED');
            expect(selEvents).toHaveLength(1);
            expect(selEvents[0].data.selectedIds).toEqual([]);
        });

        test('should not notify when already empty', () => {
            const notifications = [];
            store.subscribe(state => notifications.push(state));
            store.clearSelection();

            expect(notifications).toHaveLength(0);
        });
    });

    describe('getSelectedIds', () => {
        test('should return empty array when nothing selected', () => {
            expect(store.getSelectedIds()).toEqual([]);
        });

        test('should return all selected IDs', () => {
            store.selectAll(['d1', 'd2']);
            expect(store.getSelectedIds()).toEqual(expect.arrayContaining(['d1', 'd2']));
        });
    });

    describe('isSelected', () => {
        test('should return true for selected decoration', () => {
            store.selectDecoration('d1');
            expect(store.isSelected('d1')).toBe(true);
        });

        test('should return false for non-selected decoration', () => {
            store.selectDecoration('d1');
            expect(store.isSelected('d2')).toBe(false);
        });
    });

    describe('getSelectionCount', () => {
        test('should return 0 when empty', () => {
            expect(store.getSelectionCount()).toBe(0);
        });

        test('should return correct count', () => {
            store.selectAll(['d1', 'd2', 'd3']);
            expect(store.getSelectionCount()).toBe(3);
        });
    });

    describe('deselectByLayer', () => {
        test('should deselect decorations matching the predicate', () => {
            store.selectAll(['l1-d1', 'l1-d2', 'l2-d1']);
            store.deselectByLayer('layer-1', id => id.startsWith('l1'));

            expect(store.isSelected('l1-d1')).toBe(false);
            expect(store.isSelected('l1-d2')).toBe(false);
            expect(store.isSelected('l2-d1')).toBe(true);
            expect(store.getSelectionCount()).toBe(1);
        });

        test('should not notify when no changes occur', () => {
            store.selectAll(['d1', 'd2']);
            const notifications = [];
            store.subscribe(state => notifications.push(state));

            store.deselectByLayer('layer-x', () => false);

            expect(notifications).toHaveLength(0);
        });

        test('should handle non-function predicate gracefully', () => {
            store.selectDecoration('d1');
            store.deselectByLayer('layer-1', null);
            expect(store.getSelectionCount()).toBe(1);
        });

        test('should publish SELECTION_CHANGED when items are deselected', () => {
            store.selectAll(['d1', 'd2']);
            publishedEvents = [];
            store.deselectByLayer('layer-1', id => id === 'd1');

            const selEvents = publishedEvents.filter(e => e.eventType === 'SELECTION_CHANGED');
            expect(selEvents).toHaveLength(1);
        });
    });

    describe('getSelectedDecorationId (backward compat)', () => {
        test('should return single selected ID', () => {
            store.selectDecoration('d1');
            expect(store.getSelectedDecorationId()).toBe('d1');
        });

        test('should return null when multiple selected', () => {
            store.selectAll(['d1', 'd2']);
            expect(store.getSelectedDecorationId()).toBeNull();
        });

        test('should return null when nothing selected', () => {
            expect(store.getSelectedDecorationId()).toBeNull();
        });
    });

    describe('setActiveLayer / getActiveLayerId', () => {
        test('should set and get active layer', () => {
            store.setActiveLayer('layer-1');
            expect(store.getActiveLayerId()).toBe('layer-1');
        });

        test('should not notify when setting same layer', () => {
            store.setActiveLayer('layer-1');
            const notifications = [];
            store.subscribe(state => notifications.push(state));

            store.setActiveLayer('layer-1');
            expect(notifications).toHaveLength(0);
        });

        test('should publish LAYER_SELECTED event', () => {
            store.setActiveLayer('layer-1');

            const layerEvents = publishedEvents.filter(e => e.eventType === 'LAYER_SELECTED');
            expect(layerEvents).toHaveLength(1);
            expect(layerEvents[0].data.layerId).toBe('layer-1');
        });
    });

    describe('getState', () => {
        test('should return frozen state object', () => {
            store.selectDecoration('d1');
            store.setActiveLayer('layer-1');
            const state = store.getState();

            expect(state.activeLayerId).toBe('layer-1');
            expect(state.selectedIds).toEqual(['d1']);
            expect(state.selectionCount).toBe(1);
            expect(state.selectedDecorationId).toBe('d1');
            expect(Object.isFrozen(state)).toBe(true);
        });
    });

    describe('subscribe / on', () => {
        test('subscribe should return unsubscribe function', () => {
            const notifications = [];
            const unsub = store.subscribe(state => notifications.push(state));

            store.selectDecoration('d1');
            expect(notifications).toHaveLength(1);

            unsub();
            store.selectDecoration('d2');
            expect(notifications).toHaveLength(1);
        });

        test('subscribe should throw on non-function', () => {
            expect(() => store.subscribe('not-a-function')).toThrow();
        });

        test('on("change") should work like subscribe', () => {
            const notifications = [];
            const unsub = store.on('change', state => notifications.push(state));

            store.selectDecoration('d1');
            expect(notifications).toHaveLength(1);

            unsub();
            store.selectDecoration('d2');
            expect(notifications).toHaveLength(1);
        });

        test('on(unknown) should return no-op unsubscribe', () => {
            const unsub = store.on('unknown', () => { });
            expect(typeof unsub).toBe('function');
            unsub(); // should not throw
        });
    });

    describe('event publishing via EventBus', () => {
        test('selectDecoration should publish SELECTION_CHANGED', () => {
            store.selectDecoration('d1');
            expect(publishedEvents.some(e => e.eventType === 'SELECTION_CHANGED')).toBe(true);
        });

        test('toggleDecoration should publish SELECTION_CHANGED', () => {
            store.toggleDecoration('d1');
            expect(publishedEvents.some(e => e.eventType === 'SELECTION_CHANGED')).toBe(true);
        });

        test('selectRange should publish SELECTION_CHANGED', () => {
            store.selectRange('d1', 'd3', ['d1', 'd2', 'd3']);
            expect(publishedEvents.some(e => e.eventType === 'SELECTION_CHANGED')).toBe(true);
        });

        test('selectAll should publish SELECTION_CHANGED', () => {
            store.selectAll(['d1', 'd2']);
            expect(publishedEvents.some(e => e.eventType === 'SELECTION_CHANGED')).toBe(true);
        });

        test('clearSelection should publish SELECTION_CHANGED', () => {
            store.selectDecoration('d1');
            publishedEvents = [];
            store.clearSelection();
            expect(publishedEvents.some(e => e.eventType === 'SELECTION_CHANGED')).toBe(true);
        });

        test('setActiveLayer should publish LAYER_SELECTED', () => {
            store.setActiveLayer('layer-1');
            expect(publishedEvents.some(e => e.eventType === 'LAYER_SELECTED')).toBe(true);
        });
    });
});
