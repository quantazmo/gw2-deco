// @ts-nocheck
import { DropZoneOverlay } from '../../../src/ui/components/DropZoneOverlay.js';

function makeMockEventBus() {
    const subs = {};
    return {
        subscribe: (event, cb) => {
            subs[event] = cb;
        },
        publish: (event, data) => {
            if (subs[event]) subs[event](data);
        },
        _subs: subs
    };
}

describe('DropZoneOverlay', () => {
    let overlay;
    let eventBus;

    beforeEach(() => {
        overlay = new DropZoneOverlay();
        eventBus = makeMockEventBus();
        // Set viewport
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1000 });
        Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });
    });

    afterEach(() => {
        // Clean up DOM elements appended during tests
        document.querySelectorAll('.drop-zone-overlay, .drop-zone-center-highlight, .drop-zone-edge-highlight, .drop-zone-preview-outline, .panel-drop-affordance').forEach(el => el.remove());
    });

    describe('constructor', () => {
        it('initializes with null overlay', () => {
            expect(overlay._overlay).toBeNull();
        });

        it('_show is a no-op when overlay not yet created', () => {
            // Before attach(), _overlay is null — should not throw
            expect(() => overlay._show('layers')).not.toThrow();
        });

        it('_hide is a no-op when overlay not yet created', () => {
            expect(() => overlay._hide()).not.toThrow();
        });

        it('_showCenterHighlight is a no-op when centerHighlight is null', () => {
            expect(() => overlay._showCenterHighlight('decorations')).not.toThrow();
        });

        it('_showEdgeHighlight is a no-op when edgeHighlight is null', () => {
            expect(() => overlay._showEdgeHighlight('decorations', 'top')).not.toThrow();
        });

        it('_showEdgePreviewOutline is a no-op when previewOutline is null', () => {
            expect(() => overlay._showEdgePreviewOutline('left')).not.toThrow();
        });
    });

    describe('attach', () => {
        it('creates overlay element and appends to body', () => {
            overlay.attach(eventBus);
            expect(document.body.querySelector('.drop-zone-overlay')).not.toBeNull();
        });

        it('creates edge zone elements for left and right only', () => {
            overlay.attach(eventBus);
            for (const edge of ['left', 'right']) {
                expect(overlay._zoneElements[edge]).not.toBeNull();
                expect(overlay._zoneElements[edge].classList.contains(`drop-zone-${edge}`)).toBe(true);
            }
        });

        it('does not create top or bottom drop zone elements', () => {
            overlay.attach(eventBus);
            expect(overlay._zoneElements['top']).toBeUndefined();
            expect(overlay._zoneElements['bottom']).toBeUndefined();
        });

        it('creates center highlight hidden initially', () => {
            overlay.attach(eventBus);
            expect(overlay._centerHighlight).not.toBeNull();
            expect(overlay._centerHighlight.hidden).toBe(true);
        });

        it('creates edge highlight hidden initially', () => {
            overlay.attach(eventBus);
            expect(overlay._edgeHighlight).not.toBeNull();
            expect(overlay._edgeHighlight.hidden).toBe(true);
        });

        it('creates preview outline hidden initially', () => {
            overlay.attach(eventBus);
            expect(overlay._previewOutline).not.toBeNull();
            expect(overlay._previewOutline.hidden).toBe(true);
        });

        it('overlay is hidden initially', () => {
            overlay.attach(eventBus);
            expect(overlay._overlay.hidden).toBe(true);
        });

        it('subscribes to layout:drag-start', () => {
            overlay.attach(eventBus);
            expect(eventBus._subs['layout:drag-start']).toBeDefined();
        });

        it('subscribes to layout:drag-move', () => {
            overlay.attach(eventBus);
            expect(eventBus._subs['layout:drag-move']).toBeDefined();
        });

        it('subscribes to layout:drag-end', () => {
            overlay.attach(eventBus);
            expect(eventBus._subs['layout:drag-end']).toBeDefined();
        });
    });

    describe('_show (via layout:drag-start event)', () => {
        it('shows overlay when drag starts', () => {
            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            expect(overlay._overlay.hidden).toBe(false);
            expect(overlay._overlay.classList.contains('dragging')).toBe(true);
        });

        it('skips dragged panel and map panel in affordances', () => {
            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            panel.getBoundingClientRect = () => ({ left: 100, top: 100, right: 400, bottom: 300, width: 300, height: 200 });
            document.body.appendChild(panel);

            const mapPanel = document.createElement('div');
            mapPanel.className = 'dock-region';
            mapPanel.dataset.panelId = 'map';
            mapPanel.getBoundingClientRect = () => ({ left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800 });
            document.body.appendChild(mapPanel);

            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'decorations' });

            // Only one affordance (not the dragged 'decorations' or 'map')
            expect(overlay._panelAffordances.length).toBe(0); // decorations is dragged, map is excluded

            panel.remove();
            mapPanel.remove();
        });

        it('creates affordances for non-dragged, non-map panels', () => {
            const panel1 = document.createElement('div');
            panel1.className = 'dock-region';
            panel1.dataset.panelId = 'tools';
            panel1.getBoundingClientRect = () => ({ left: 100, top: 100, right: 300, bottom: 300, width: 200, height: 200 });
            document.body.appendChild(panel1);

            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' }); // layers not in DOM

            expect(overlay._panelAffordances.length).toBe(1);
            panel1.remove();
        });
    });

    describe('_hide (via layout:drag-end event)', () => {
        it('hides overlay on drag end', () => {
            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-end', {});
            expect(overlay._overlay.hidden).toBe(true);
            expect(overlay._overlay.classList.contains('dragging')).toBe(false);
        });

        it('hides center highlight on drag end', () => {
            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            overlay._centerHighlight.hidden = false;
            eventBus.publish('layout:drag-end', {});
            expect(overlay._centerHighlight.hidden).toBe(true);
        });

        it('removes panel affordances on drag end', () => {
            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'tools';
            panel.getBoundingClientRect = () => ({ left: 100, top: 100, right: 300, bottom: 300, width: 200, height: 200 });
            document.body.appendChild(panel);

            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            expect(overlay._panelAffordances.length).toBe(1);
            eventBus.publish('layout:drag-end', {});
            expect(overlay._panelAffordances.length).toBe(0);
            panel.remove();
        });
    });

    describe('_highlight (via layout:drag-move event)', () => {
        it('activates edge zone on edge drop zone', () => {
            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'edge', edge: 'left' } });
            expect(overlay._zoneElements['left'].classList.contains('active')).toBe(true);
        });

        it('activates right edge zone', () => {
            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'edge', edge: 'right' } });
            expect(overlay._zoneElements['right'].classList.contains('active')).toBe(true);
        });

        it('shows edge preview outline on edge drop', () => {
            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'edge', edge: 'left' } });
            expect(overlay._previewOutline.hidden).toBe(false);
            expect(overlay._previewOutline.dataset.zoneType).toBe('edge');
        });

        it('shows preview outline for right edge direction', () => {
            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'edge', edge: 'right' } });
            expect(overlay._previewOutline.hidden).toBe(false);
        });

        it('shows center highlight on tab-merge drop zone', () => {
            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            panel.getBoundingClientRect = () => ({ left: 100, top: 100, right: 400, bottom: 300, width: 300, height: 200 });
            document.body.appendChild(panel);

            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'tab-merge', targetPanelId: 'decorations' } });
            expect(overlay._centerHighlight.hidden).toBe(false);

            panel.remove();
        });

        it('reuses center highlight if same target', () => {
            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            panel.getBoundingClientRect = () => ({ left: 100, top: 100, right: 400, bottom: 300, width: 300, height: 200 });
            document.body.appendChild(panel);

            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'tab-merge', targetPanelId: 'decorations' } });
            overlay._activeCenterPanelId = 'decorations'; // simulate cached
            overlay._centerHighlight.hidden = true;
            eventBus.publish('layout:drag-move', { dropZone: { type: 'tab-merge', targetPanelId: 'decorations' } });
            expect(overlay._centerHighlight.hidden).toBe(false); // re-shown from cache

            panel.remove();
        });

        it('hides center highlight if tab-merge target not in DOM', () => {
            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'tab-merge', targetPanelId: 'nonexistent' } });
            expect(overlay._centerHighlight.hidden).toBe(true);
        });

        it('shows tab-merge preview outline', () => {
            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            panel.getBoundingClientRect = () => ({ left: 100, top: 100, right: 400, bottom: 300, width: 300, height: 200 });
            document.body.appendChild(panel);

            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'tab-merge', targetPanelId: 'decorations' } });
            expect(overlay._previewOutline.hidden).toBe(false);
            expect(overlay._previewOutline.dataset.zoneType).toBe('tab-merge');

            panel.remove();
        });

        it('shows stack highlight (top edge)', () => {
            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            panel.getBoundingClientRect = () => ({ left: 100, top: 100, right: 400, bottom: 300, width: 300, height: 200 });
            document.body.appendChild(panel);

            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'stack', targetPanelId: 'decorations', edge: 'top' } });
            expect(overlay._edgeHighlight.hidden).toBe(false);

            panel.remove();
        });

        it('shows stack highlight (bottom edge)', () => {
            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            panel.getBoundingClientRect = () => ({ left: 100, top: 100, right: 400, bottom: 300, width: 300, height: 200 });
            document.body.appendChild(panel);

            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'stack', targetPanelId: 'decorations', edge: 'bottom' } });
            expect(overlay._edgeHighlight.hidden).toBe(false);

            panel.remove();
        });

        it('shows stack highlight (left edge)', () => {
            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            panel.getBoundingClientRect = () => ({ left: 100, top: 100, right: 400, bottom: 300, width: 300, height: 200 });
            document.body.appendChild(panel);

            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'stack', targetPanelId: 'decorations', edge: 'left' } });
            expect(overlay._edgeHighlight.hidden).toBe(false);

            panel.remove();
        });

        it('shows stack highlight (right edge)', () => {
            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            panel.getBoundingClientRect = () => ({ left: 100, top: 100, right: 400, bottom: 300, width: 300, height: 200 });
            document.body.appendChild(panel);

            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'stack', targetPanelId: 'decorations', edge: 'right' } });
            expect(overlay._edgeHighlight.hidden).toBe(false);

            panel.remove();
        });

        it('reuses edge highlight if same target and edge', () => {
            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            panel.getBoundingClientRect = () => ({ left: 100, top: 100, right: 400, bottom: 300, width: 300, height: 200 });
            document.body.appendChild(panel);

            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'stack', targetPanelId: 'decorations', edge: 'top' } });
            overlay._activeEdgePanelId = 'decorations';
            overlay._activeEdge = 'top';
            overlay._edgeHighlight.hidden = true;
            eventBus.publish('layout:drag-move', { dropZone: { type: 'stack', targetPanelId: 'decorations', edge: 'top' } });
            expect(overlay._edgeHighlight.hidden).toBe(false);

            panel.remove();
        });

        it('hides edge highlight if stack target not in DOM', () => {
            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'stack', targetPanelId: 'nonexistent', edge: 'top' } });
            expect(overlay._edgeHighlight.hidden).toBe(true);
        });

        it('shows stack preview outline (top)', () => {
            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            panel.getBoundingClientRect = () => ({ left: 100, top: 100, right: 400, bottom: 300, width: 300, height: 200 });
            document.body.appendChild(panel);

            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'stack', targetPanelId: 'decorations', edge: 'top' } });
            expect(overlay._previewOutline.hidden).toBe(false);
            expect(overlay._previewOutline.dataset.zoneType).toBe('stack');

            panel.remove();
        });

        it('shows stack preview outline (bottom, left, right)', () => {
            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            panel.getBoundingClientRect = () => ({ left: 100, top: 100, right: 400, bottom: 300, width: 300, height: 200 });
            document.body.appendChild(panel);

            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            for (const edge of ['bottom', 'left', 'right']) {
                // Reset key so it re-renders
                overlay._activePreviewKey = null;
                eventBus.publish('layout:drag-move', { dropZone: { type: 'stack', targetPanelId: 'decorations', edge } });
                expect(overlay._previewOutline.hidden).toBe(false);
            }

            panel.remove();
        });

        it('hides highlights when dropZone is null', () => {
            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: null });
            expect(overlay._centerHighlight.hidden).toBe(true);
            expect(overlay._edgeHighlight.hidden).toBe(true);
            expect(overlay._previewOutline.hidden).toBe(true);
        });

        it('clears active edge zones on each drag-move', () => {
            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'edge', edge: 'left' } });
            expect(overlay._zoneElements['left'].classList.contains('active')).toBe(true);
            eventBus.publish('layout:drag-move', { dropZone: null });
            expect(overlay._zoneElements['left'].classList.contains('active')).toBe(false);
        });

        it('reuses preview outline when same key', () => {
            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'edge', edge: 'left' } });
            overlay._previewOutline.hidden = true; // simulate hidden
            eventBus.publish('layout:drag-move', { dropZone: { type: 'edge', edge: 'left' } }); // same key
            expect(overlay._previewOutline.hidden).toBe(false); // should re-show cached
        });

        it('hides stack preview outline if stack target not in DOM', () => {
            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'stack', targetPanelId: 'nonexistent', edge: 'top' } });
            expect(overlay._previewOutline.hidden).toBe(true);
        });

        it('hides tab-merge preview outline if target not in DOM', () => {
            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'tab-merge', targetPanelId: 'nonexistent' } });
            expect(overlay._previewOutline.hidden).toBe(true);
        });

        it('shows tab-merge preview outline with tabbed-container element', () => {
            const container = document.createElement('div');
            container.className = 'tabbed-container';
            container.dataset.panelIds = 'decorations,tools';
            container.getBoundingClientRect = () => ({ left: 100, top: 100, right: 400, bottom: 300, width: 300, height: 200 });
            document.body.appendChild(container);

            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'tab-merge', targetPanelId: 'decorations' } });
            expect(overlay._previewOutline.hidden).toBe(false);

            container.remove();
        });

        it('reuses tab-merge preview outline when same key', () => {
            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            panel.getBoundingClientRect = () => ({ left: 100, top: 100, right: 400, bottom: 300, width: 300, height: 200 });
            document.body.appendChild(panel);

            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'tab-merge', targetPanelId: 'decorations' } });
            overlay._previewOutline.hidden = true;
            eventBus.publish('layout:drag-move', { dropZone: { type: 'tab-merge', targetPanelId: 'decorations' } }); // same key
            expect(overlay._previewOutline.hidden).toBe(false);

            panel.remove();
        });

        it('handles unknown edge in _showEdgePreviewOutline gracefully', () => {
            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            // Call directly with unknown edge to hit the default case
            overlay._showEdgePreviewOutline('unknown_edge');
            expect(overlay._previewOutline.hidden).toBe(true);
        });

        it('handles unknown edge in _showEdgeHighlight gracefully', () => {
            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            panel.getBoundingClientRect = () => ({ left: 100, top: 100, right: 400, bottom: 300, width: 300, height: 200 });
            document.body.appendChild(panel);

            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            eventBus.publish('layout:drag-move', { dropZone: { type: 'stack', targetPanelId: 'decorations', edge: 'unknown' } });
            // should not throw

            panel.remove();
        });

        it('handles unknown edge in _showStackPreviewOutline gracefully', () => {
            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            panel.getBoundingClientRect = () => ({ left: 100, top: 100, right: 400, bottom: 300, width: 300, height: 200 });
            document.body.appendChild(panel);

            overlay.attach(eventBus);
            eventBus.publish('layout:drag-start', { panelId: 'layers' });
            // Set key to force re-evaluation
            overlay._activePreviewKey = null;
            // Call stack preview with unknown edge directly
            overlay._showStackPreviewOutline('decorations', 'unknown');
            expect(overlay._previewOutline.hidden).toBe(true);

            panel.remove();
        });
    });
});
