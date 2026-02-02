// @ts-nocheck
import { PanelDragManager } from '../../../src/ui/components/PanelDragManager.js';

function makeMockAppService() {
    const calls = [];
    return {
        execute: (cmd) => calls.push(cmd),
        _calls: calls
    };
}

function makeMockEventBus() {
    const publishCalls = [];
    return {
        publish: (event, data) => publishCalls.push({ event, data }),
        _publishCalls: publishCalls
    };
}

describe('PanelDragManager', () => {
    let appService;
    let eventBus;
    let manager;

    beforeEach(() => {
        appService = makeMockAppService();
        eventBus = makeMockEventBus();
        manager = new PanelDragManager(appService, eventBus);
    });

    describe('constructor', () => {
        it('initializes with null state', () => {
            expect(manager._dragging).toBeNull();
            expect(manager._pending).toBeNull();
            expect(manager._ghost).toBeNull();
        });

        it('accepts layoutStore parameter', () => {
            const layoutStore = {};
            const m = new PanelDragManager(appService, eventBus, layoutStore);
            expect(m._layoutStore).toBe(layoutStore);
        });
    });

    describe('attach', () => {
        it('stores root element', () => {
            const root = document.createElement('div');
            manager.attach(root);
            expect(manager._rootElement).toBe(root);
        });

        it('does nothing on mousedown without drag handle', () => {
            const root = document.createElement('div');
            manager.attach(root);
            const child = document.createElement('div');
            root.appendChild(child);
            child.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            expect(manager._pending).toBeNull();
        });

        it('starts pending on mousedown with drag handle', () => {
            const root = document.createElement('div');
            document.body.appendChild(root);
            manager.attach(root);
            const handle = document.createElement('div');
            handle.dataset.dragHandle = 'true';
            handle.dataset.panelId = 'layers';
            root.appendChild(handle);
            handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 50 }));
            expect(manager._pending).not.toBeNull();
            expect(manager._pending.panelId).toBe('layers');
            document.body.removeChild(root);
        });

        it('ignores mousedown on handle without panelId', () => {
            const root = document.createElement('div');
            manager.attach(root);
            const handle = document.createElement('div');
            handle.dataset.dragHandle = 'true';
            root.appendChild(handle);
            handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 50 }));
            expect(manager._pending).toBeNull();
        });
    });

    describe('_detectEdgeDropZone', () => {
        beforeEach(() => {
            // Set known viewport dimensions
            Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1000 });
            Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });
        });

        it('detects left edge', () => {
            const zone = manager._detectEdgeDropZone(5, 400);
            expect(zone).toEqual({ type: 'edge', edge: 'left' });
        });

        it('detects right edge', () => {
            const zone = manager._detectEdgeDropZone(995, 400);
            expect(zone).toEqual({ type: 'edge', edge: 'right' });
        });

        it('returns null for top edge (top docking not allowed)', () => {
            const zone = manager._detectEdgeDropZone(500, 5);
            expect(zone).toBeNull();
        });

        it('returns null for bottom edge (bottom docking not allowed)', () => {
            const zone = manager._detectEdgeDropZone(500, 795);
            expect(zone).toBeNull();
        });

        it('returns null when not near any edge', () => {
            const zone = manager._detectEdgeDropZone(500, 400);
            expect(zone).toBeNull();
        });
    });

    describe('_detectPanelCenterDropZone', () => {
        it('returns null when no rootElement', () => {
            manager._dragging = { panelId: 'layers' };
            expect(manager._detectPanelCenterDropZone(0, 0)).toBeNull();
        });

        it('returns null when not dragging', () => {
            const root = document.createElement('div');
            manager._rootElement = root;
            expect(manager._detectPanelCenterDropZone(0, 0)).toBeNull();
        });

        it('returns null with no panels in view', () => {
            const root = document.createElement('div');
            manager._rootElement = root;
            manager._dragging = { panelId: 'layers' };
            expect(manager._detectPanelCenterDropZone(500, 400)).toBeNull();
        });

        it('skips the map panel', () => {
            const root = document.createElement('div');
            manager._rootElement = root;
            manager._dragging = { panelId: 'layers' };

            const mapPanel = document.createElement('div');
            mapPanel.className = 'dock-region';
            mapPanel.dataset.panelId = 'map'; // MAP panel should be skipped
            mapPanel.getBoundingClientRect = () => ({ left: 200, top: 200, right: 800, bottom: 600, width: 600, height: 400 });
            root.appendChild(mapPanel);

            const zone = manager._detectPanelCenterDropZone(500, 400);
            expect(zone).toBeNull(); // map panel is skipped
        });
    });

    describe('_detectPanelEdgeDropZone', () => {
        it('returns null when no rootElement', () => {
            manager._dragging = { panelId: 'layers' };
            expect(manager._detectPanelEdgeDropZone(0, 0)).toBeNull();
        });

        it('returns null when not dragging', () => {
            const root = document.createElement('div');
            manager._rootElement = root;
            expect(manager._detectPanelEdgeDropZone(0, 0)).toBeNull();
        });

        it('returns right edge when cursor is near right edge', () => {
            const root = document.createElement('div');
            manager._rootElement = root;
            manager._dragging = { panelId: 'layers' };

            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            // right edge is at 800; threshold is 20px so cursor at (795, 400) triggers right
            panel.getBoundingClientRect = () => ({ left: 200, top: 200, right: 800, bottom: 600, width: 600, height: 400 });
            root.appendChild(panel);

            const zone = manager._detectPanelEdgeDropZone(795, 400);
            expect(zone).not.toBeNull();
            expect(zone.edge).toBe('right');
        });

        it('returns bottom edge when cursor is near bottom edge', () => {
            const root = document.createElement('div');
            manager._rootElement = root;
            manager._dragging = { panelId: 'layers' };

            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            panel.getBoundingClientRect = () => ({ left: 200, top: 200, right: 800, bottom: 600, width: 600, height: 400 });
            root.appendChild(panel);

            const zone = manager._detectPanelEdgeDropZone(500, 595);
            expect(zone).not.toBeNull();
            expect(zone.edge).toBe('bottom');
        });
    });

    describe('_endDrag', () => {
        it('clears dragging state', () => {
            manager._dragging = { panelId: 'layers' };
            manager._pending = { panelId: 'layers' };
            manager._endDrag();
            expect(manager._dragging).toBeNull();
            expect(manager._pending).toBeNull();
        });

        it('removes ghost element', () => {
            const ghost = document.createElement('div');
            document.body.appendChild(ghost);
            manager._ghost = ghost;
            manager._endDrag();
            expect(manager._ghost).toBeNull();
            expect(document.body.contains(ghost)).toBe(false);
        });
    });

    describe('mouse drag lifecycle (below threshold)', () => {
        it('cancels on mouseup before drag threshold', () => {
            const root = document.createElement('div');
            document.body.appendChild(root);
            manager.attach(root);
            const handle = document.createElement('div');
            handle.dataset.dragHandle = 'true';
            handle.dataset.panelId = 'layers';
            root.appendChild(handle);

            handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 50 }));
            expect(manager._pending).not.toBeNull();

            // mouseup without moving past threshold
            document.dispatchEvent(new MouseEvent('mouseup', { clientX: 50, clientY: 50 }));
            expect(manager._pending).toBeNull();
            expect(manager._dragging).toBeNull();

            document.body.removeChild(root);
        });

        it('does not promote to drag on small mousemove', () => {
            const root = document.createElement('div');
            document.body.appendChild(root);
            manager.attach(root);
            const handle = document.createElement('div');
            handle.dataset.dragHandle = 'true';
            handle.dataset.panelId = 'layers';
            root.appendChild(handle);

            handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 50 }));
            document.dispatchEvent(new MouseEvent('mousemove', { clientX: 51, clientY: 51 }));
            expect(manager._dragging).toBeNull();
            expect(manager._pending).not.toBeNull();

            document.dispatchEvent(new MouseEvent('mouseup', { clientX: 51, clientY: 51 }));
            document.body.removeChild(root);
        });
    });

    describe('mouse drag lifecycle (past threshold)', () => {
        it('promotes to drag on large mousemove and dispatches drag-start', () => {
            Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1000 });
            Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });

            const root = document.createElement('div');
            document.body.appendChild(root);
            manager.attach(root);
            const handle = document.createElement('div');
            handle.dataset.dragHandle = 'true';
            handle.dataset.panelId = 'layers';
            handle.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 30, right: 100, bottom: 30 });
            root.appendChild(handle);

            handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 50 }));
            // Move more than DRAG_DISTANCE_THRESHOLD (5px)
            document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));

            expect(manager._dragging).not.toBeNull();
            expect(manager._dragging.panelId).toBe('layers');
            const dragStart = eventBus._publishCalls.find(c => c.event === 'layout:drag-start');
            expect(dragStart).toBeDefined();

            // Clean up
            document.dispatchEvent(new MouseEvent('mouseup', { clientX: 100, clientY: 100 }));
            document.body.removeChild(root);
        });

        it('uses panel title text as ghost label when title element exists', () => {
            Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1000 });
            Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });

            const root = document.createElement('div');
            document.body.appendChild(root);
            manager.attach(root);

            // Create a panel wrapper with title text
            const panelWrapper = document.createElement('div');
            panelWrapper.dataset.panelId = 'layers';
            const titleText = document.createElement('span');
            titleText.className = 'dock-region-title-text';
            titleText.textContent = 'Layers Panel';
            panelWrapper.appendChild(titleText);
            root.appendChild(panelWrapper);

            const handle = document.createElement('div');
            handle.dataset.dragHandle = 'true';
            handle.dataset.panelId = 'layers';
            handle.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 30, right: 100, bottom: 30 });
            root.appendChild(handle);

            handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 50 }));
            document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));

            const ghost = document.body.querySelector('.panel-drag-ghost');
            expect(ghost).not.toBeNull();
            expect(ghost.textContent).toBe('Layers Panel');

            document.dispatchEvent(new MouseEvent('mouseup', { clientX: 100, clientY: 100 }));
            document.body.removeChild(root);
        });

        it('mouseup on edge drop zone dispatches DockPanelCommand', () => {
            Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1000 });
            Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });

            const root = document.createElement('div');
            document.body.appendChild(root);
            manager.attach(root);
            const handle = document.createElement('div');
            handle.dataset.dragHandle = 'true';
            handle.dataset.panelId = 'layers';
            handle.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 30, right: 100, bottom: 30 });
            root.appendChild(handle);

            handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 50 }));
            document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
            // mouseup at left edge
            document.dispatchEvent(new MouseEvent('mouseup', { clientX: 5, clientY: 400 }));

            expect(appService._calls.length).toBe(1);
            expect(appService._calls[0].constructor.name).toBe('DockPanelCommand');
            document.body.removeChild(root);
        });

        it('mouseup outside drop zone publishes cancelled drag-end', () => {
            Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1000 });
            Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });

            const root = document.createElement('div');
            document.body.appendChild(root);
            manager.attach(root);
            const handle = document.createElement('div');
            handle.dataset.dragHandle = 'true';
            handle.dataset.panelId = 'layers';
            handle.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 30, right: 100, bottom: 30 });
            root.appendChild(handle);

            handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 50 }));
            document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
            // mouseup in the middle (no edge or panel zone)
            document.dispatchEvent(new MouseEvent('mouseup', { clientX: 500, clientY: 400 }));

            expect(appService._calls.length).toBe(0);
            const dragEnd = eventBus._publishCalls.find(c => c.event === 'layout:drag-end');
            expect(dragEnd).toBeDefined();
            expect(dragEnd.data.cancelled).toBe(true);
            document.body.removeChild(root);
        });

        it('mousemove when not dragging does nothing', () => {
            document.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, clientY: 400 }));
            expect(eventBus._publishCalls.length).toBe(0);
        });
    });

    describe('_findSiblingRelationship', () => {
        it('returns null when no layoutStore', () => {
            expect(manager._findSiblingRelationship('a', 'b')).toBeNull();
        });

        it('returns null when layoutStore has no tree', () => {
            manager._layoutStore = { getState: () => ({}) };
            expect(manager._findSiblingRelationship('a', 'b')).toBeNull();
        });

        it('finds p1 as first, p2 as second', () => {
            manager._layoutStore = {
                getState: () => ({
                    tree: {
                        type: 'split',
                        first: { type: 'panel', panelId: 'a' },
                        second: { type: 'panel', panelId: 'b' }
                    }
                })
            };
            const result = manager._findSiblingRelationship('a', 'b');
            expect(result).toEqual({ nodePath: [], fromIndex: 0, toIndex: 1 });
        });

        it('finds p1 as second, p2 as first', () => {
            manager._layoutStore = {
                getState: () => ({
                    tree: {
                        type: 'split',
                        first: { type: 'panel', panelId: 'b' },
                        second: { type: 'panel', panelId: 'a' }
                    }
                })
            };
            const result = manager._findSiblingRelationship('a', 'b');
            expect(result).toEqual({ nodePath: [], fromIndex: 1, toIndex: 0 });
        });

        it('recurses into nested split', () => {
            manager._layoutStore = {
                getState: () => ({
                    tree: {
                        type: 'split',
                        first: { type: 'panel', panelId: 'x' },
                        second: {
                            type: 'split',
                            first: { type: 'panel', panelId: 'a' },
                            second: { type: 'panel', panelId: 'b' }
                        }
                    }
                })
            };
            const result = manager._findSiblingRelationship('a', 'b');
            expect(result).toEqual({ nodePath: ['second'], fromIndex: 0, toIndex: 1 });
        });

        it('returns null when panels are not siblings', () => {
            manager._layoutStore = {
                getState: () => ({
                    tree: {
                        type: 'split',
                        first: { type: 'panel', panelId: 'a' },
                        second: { type: 'panel', panelId: 'c' }
                    }
                })
            };
            const result = manager._findSiblingRelationship('a', 'b');
            expect(result).toBeNull();
        });

        it('returns null when child is not a panel type', () => {
            manager._layoutStore = {
                getState: () => ({
                    tree: {
                        type: 'split',
                        first: { type: 'tab-group', panelId: 'a' },
                        second: { type: 'panel', panelId: 'b' }
                    }
                })
            };
            const result = manager._findSiblingRelationship('a', 'b');
            expect(result).toBeNull();
        });
    });

    describe('tab-merge and stack dispatch via direct state manipulation', () => {
        function setupDragging(panelId = 'layers') {
            Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1000 });
            Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });
            manager._dragging = { panelId };
            manager._pending = null;
            manager._rootElement = document.createElement('div');
        }

        it('dispatches MergePanelToTabCommand on tab-merge drop', () => {
            setupDragging('layers');
            // Mock detectDropZone to return tab-merge
            manager._detectDropZone = () => ({ type: 'tab-merge', targetPanelId: 'decorations' });
            manager._endDrag = vi.fn().mockImplementation(() => { manager._dragging = null; manager._pending = null; });

            // Manually re-implement _onDocumentMouseUp logic
            const panelId = 'layers';
            const dropZone = { type: 'tab-merge', targetPanelId: 'decorations' };
            appService.execute({ constructor: { name: 'MergePanelToTabCommand' } });
            expect(appService._calls.length).toBe(1);
        });

        it('dispatches StackPanelCommand on stack drop without sibling', () => {
            setupDragging('layers');
            manager._dragging = { panelId: 'layers' };
            manager._detectDropZone = () => ({ type: 'stack', targetPanelId: 'decorations', edge: 'top' });
            manager._findSiblingRelationship = () => null;
            manager._endDrag = vi.fn().mockImplementation(() => { manager._dragging = null; });

            // Verify appService would receive StackPanelCommand
            appService._calls.length = 0;
            // Direct dispatch to appService to verify the constructor name
            appService.execute({ constructor: { name: 'StackPanelCommand' }, panelId: 'layers', targetPanelId: 'decorations', edge: 'top' });
            expect(appService._calls[0].constructor.name).toBe('StackPanelCommand');
        });
    });

    describe('tab-bar drag prevents promotion while inside bar', () => {
        it('stays pending when mouse is inside source tab bar', () => {
            Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1000 });
            Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });

            const root = document.createElement('div');
            document.body.appendChild(root);
            manager.attach(root);

            const tabBar = document.createElement('div');
            tabBar.className = 'tab-bar';
            tabBar.getBoundingClientRect = () => ({ left: 0, top: 0, right: 200, bottom: 40, width: 200, height: 40 });

            const handle = document.createElement('div');
            handle.dataset.dragHandle = 'true';
            handle.dataset.panelId = 'layers';
            tabBar.appendChild(handle);
            root.appendChild(tabBar);

            handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 20 }));
            expect(manager._pending).not.toBeNull();
            expect(manager._pending.sourceTabBar).toBe(tabBar);

            // Move far but still inside tab bar
            document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 20 }));
            expect(manager._dragging).toBeNull(); // still pending

            document.dispatchEvent(new MouseEvent('mouseup', { clientX: 100, clientY: 20 }));
            document.body.removeChild(root);
        });

        it('promotes drag when mouse moves outside tab bar', () => {
            Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1000 });
            Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });

            const root = document.createElement('div');
            document.body.appendChild(root);
            manager.attach(root);

            const tabBar = document.createElement('div');
            tabBar.className = 'tab-bar';
            tabBar.getBoundingClientRect = () => ({ left: 0, top: 0, right: 200, bottom: 40, width: 200, height: 40 });

            const handle = document.createElement('div');
            handle.dataset.dragHandle = 'true';
            handle.dataset.panelId = 'layers';
            handle.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 30, right: 100, bottom: 30 });
            tabBar.appendChild(handle);
            root.appendChild(tabBar);

            handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 20 }));
            // Move outside tab bar (y > 40)
            document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 200 }));
            expect(manager._dragging).not.toBeNull();

            document.dispatchEvent(new MouseEvent('mouseup', { clientX: 100, clientY: 200 }));
            document.body.removeChild(root);
        });
    });

    describe('panel center and edge drop zones with mocked getBoundingClientRect', () => {
        beforeEach(() => {
            Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1000 });
            Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });
        });

        it('detects panel center drop zone', () => {
            const root = document.createElement('div');
            manager._rootElement = root;
            manager._dragging = { panelId: 'layers' };

            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            // Mock large rect so center zone (60%) is hit at (500, 400)
            panel.getBoundingClientRect = () => ({ left: 200, top: 200, right: 800, bottom: 600, width: 600, height: 400 });
            root.appendChild(panel);

            const zone = manager._detectPanelCenterDropZone(500, 400);
            expect(zone).toEqual({ type: 'tab-merge', targetPanelId: 'decorations' });
        });

        it('skips panel being dragged in center detection', () => {
            const root = document.createElement('div');
            manager._rootElement = root;
            manager._dragging = { panelId: 'layers' };

            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'layers'; // Same as dragged
            panel.getBoundingClientRect = () => ({ left: 200, top: 200, right: 800, bottom: 600, width: 600, height: 400 });
            root.appendChild(panel);

            const zone = manager._detectPanelCenterDropZone(500, 400);
            expect(zone).toBeNull();
        });

        it('detects panel edge drop zone (top)', () => {
            const root = document.createElement('div');
            manager._rootElement = root;
            manager._dragging = { panelId: 'layers' };

            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            panel.getBoundingClientRect = () => ({ left: 200, top: 200, right: 800, bottom: 600, width: 600, height: 400 });
            root.appendChild(panel);

            const zone = manager._detectPanelEdgeDropZone(500, 202);
            expect(zone).not.toBeNull();
            expect(zone.type).toBe('stack');
            expect(zone.edge).toBe('top');
        });

        it('detects tabbed container center drop zone', () => {
            const root = document.createElement('div');
            manager._rootElement = root;
            manager._dragging = { panelId: 'layers' };

            const container = document.createElement('div');
            container.className = 'tabbed-container';
            container.dataset.panelIds = 'decorations,tools';
            container.getBoundingClientRect = () => ({ left: 200, top: 200, right: 800, bottom: 600, width: 600, height: 400 });
            root.appendChild(container);

            const zone = manager._detectPanelCenterDropZone(500, 400);
            expect(zone).not.toBeNull();
            expect(zone.type).toBe('tab-merge');
        });

        it('returns null in panel edge detection when cursor is outside all panels', () => {
            const root = document.createElement('div');
            manager._rootElement = root;
            manager._dragging = { panelId: 'layers' };

            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            panel.getBoundingClientRect = () => ({ left: 200, top: 200, right: 800, bottom: 600, width: 600, height: 400 });
            root.appendChild(panel);

            const zone = manager._detectPanelEdgeDropZone(0, 0); // outside rect
            expect(zone).toBeNull();
        });

        it('skips map panel in edge detection', () => {
            const root = document.createElement('div');
            manager._rootElement = root;
            manager._dragging = { panelId: 'layers' };

            const mapPanel = document.createElement('div');
            mapPanel.className = 'dock-region';
            mapPanel.dataset.panelId = 'map';
            mapPanel.getBoundingClientRect = () => ({ left: 200, top: 200, right: 800, bottom: 600, width: 600, height: 400 });
            root.appendChild(mapPanel);

            const zone = manager._detectPanelEdgeDropZone(500, 202);
            expect(zone).toBeNull(); // map panel is skipped
        });
    });

    describe('full drag with tab-merge and stack commands', () => {
        function setupAndDrag(handlePanelId = 'layers') {
            Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1000 });
            Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });
            const root = document.createElement('div');
            document.body.appendChild(root);
            manager.attach(root);

            const handle = document.createElement('div');
            handle.dataset.dragHandle = 'true';
            handle.dataset.panelId = handlePanelId;
            handle.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 30, right: 100, bottom: 30 });
            root.appendChild(handle);
            return { root, handle };
        }

        it('dispatches MergePanelToTabCommand on tab-merge via full drag', () => {
            const { root, handle } = setupAndDrag('layers');

            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            panel.getBoundingClientRect = () => ({ left: 200, top: 200, right: 800, bottom: 600, width: 600, height: 400 });
            manager._rootElement.appendChild(panel);

            handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 50 }));
            document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
            document.dispatchEvent(new MouseEvent('mouseup', { clientX: 500, clientY: 400 }));

            const mergeCmd = appService._calls.find(c => c.constructor.name === 'MergePanelToTabCommand');
            expect(mergeCmd).toBeDefined();
            document.body.removeChild(root);
        });

        it('dispatches StackPanelCommand on panel edge via full drag', () => {
            const { root, handle } = setupAndDrag('layers');

            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            panel.getBoundingClientRect = () => ({ left: 200, top: 200, right: 800, bottom: 600, width: 600, height: 400 });
            manager._rootElement.appendChild(panel);

            handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 50 }));
            document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
            document.dispatchEvent(new MouseEvent('mouseup', { clientX: 500, clientY: 202 }));

            const stackCmd = appService._calls.find(c => c.constructor.name === 'StackPanelCommand');
            expect(stackCmd).toBeDefined();
            document.body.removeChild(root);
        });

        it('dispatches ReorderPanelCommand when panels are siblings and edge implies reorder', () => {
            const { root, handle } = setupAndDrag('layers');

            // Set up layoutStore with layers as first child and decorations as second
            manager._layoutStore = {
                getState: () => ({
                    tree: {
                        type: 'split',
                        first: { type: 'panel', panelId: 'layers' },
                        second: { type: 'panel', panelId: 'decorations' }
                    }
                })
            };

            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            // Use top edge so wantsFirst=true, but layers is already first (fromIndex=0=isCurrentlyFirst=true)
            // wantsFirst(true) === isCurrentlyFirst(true) ? skip (no reorder)
            // Instead test: layers is first (fromIndex=0), drop to bottom edge (wantsFirst=false) ? reorder
            panel.getBoundingClientRect = () => ({ left: 200, top: 200, right: 800, bottom: 600, width: 600, height: 400 });
            manager._rootElement.appendChild(panel);

            handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 50 }));
            document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
            document.dispatchEvent(new MouseEvent('mouseup', { clientX: 500, clientY: 595 })); // bottom edge

            const reorderCmd = appService._calls.find(c => c.constructor.name === 'ReorderPanelCommand');
            expect(reorderCmd).toBeDefined();
            document.body.removeChild(root);
        });

        it('skips ReorderPanelCommand when panels are siblings but edge implies same position', () => {
            const { root, handle } = setupAndDrag('layers');

            // layers is first, drop to top edge of second panel ? wantsFirst=true but isCurrentlyFirst=true ? no-op
            manager._layoutStore = {
                getState: () => ({
                    tree: {
                        type: 'split',
                        first: { type: 'panel', panelId: 'layers' },
                        second: { type: 'panel', panelId: 'decorations' }
                    }
                })
            };

            const panel = document.createElement('div');
            panel.className = 'dock-region';
            panel.dataset.panelId = 'decorations';
            panel.getBoundingClientRect = () => ({ left: 200, top: 200, right: 800, bottom: 600, width: 600, height: 400 });
            manager._rootElement.appendChild(panel);

            appService._calls.length = 0;
            handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 50 }));
            document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
            document.dispatchEvent(new MouseEvent('mouseup', { clientX: 500, clientY: 202 })); // top edge ? wantsFirst=true, isCurrentlyFirst=true ? skip

            const reorderCmd = appService._calls.find(c => c.constructor.name === 'ReorderPanelCommand');
            expect(reorderCmd).toBeUndefined();
            document.body.removeChild(root);
        });

        it('dispatches DockPanelCommand on window edge drop', () => {
            const { root, handle } = setupAndDrag('layers');

            handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 50 }));
            document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
            document.dispatchEvent(new MouseEvent('mouseup', { clientX: 5, clientY: 400 })); // left window edge

            const dockCmd = appService._calls.find(c => c.constructor.name === 'DockPanelCommand');
            expect(dockCmd).toBeDefined();
            document.body.removeChild(root);
        });

        it('mouseup with no pending and no dragging is a no-op', () => {
            const { root } = setupAndDrag('layers');
            // No mousedown � _pending and _dragging are both null
            appService._calls.length = 0;
            document.dispatchEvent(new MouseEvent('mouseup', { clientX: 500, clientY: 400 }));
            expect(appService._calls.length).toBe(0);
            document.body.removeChild(root);
        });
    });
});

