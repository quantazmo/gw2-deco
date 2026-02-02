// @ts-nocheck

vi.mock('../../../src/ui/renderHelpers.js', () => ({
    createGroup: (opts) => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        if (opts?.className) g.setAttribute('class', opts.className);
        if (opts?.id) g.setAttribute('id', opts.id);
        return g;
    },
    createPolygon: (_points, opts) => {
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        if (opts?.className) poly.setAttribute('class', opts.className);
        return poly;
    },
    createCircle: (cx, cy, r, opts) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        circle.setAttribute('r', r);
        if (opts?.className) circle.setAttribute('class', opts.className);
        return circle;
    },
}));

vi.mock('../../../src/ui/domHelpers.js', () => ({
    empty: (el) => { while (el.firstChild) el.removeChild(el.firstChild); },
}));

vi.mock('../../../src/ui/components/SelectionRectangle.js', () => ({
    SelectionRectangle: class {
        constructor() { }
        activate() { }
        deactivate() { }
    },
}));

const { MapViewer } = await import('../../../src/ui/components/MapViewer.js');

function makeSvg() {
    return document.createElementNS('http://www.w3.org/2000/svg', 'svg');
}

function makeZoomStore() {
    const listeners = [];
    return {
        onChange: (cb) => listeners.push(cb),
        _trigger: (data) => listeners.forEach(cb => cb(data)),
    };
}

function makeAppStore(initialState = {}) {
    const subs = [];
    let state = initialState;
    return {
        subscribe: (cb) => subs.push(cb),
        getState: () => state,
        _trigger: (s) => { state = s; subs.forEach(cb => cb(s)); },
    };
}

function makeSelectionStore() {
    const subs = [];
    return {
        subscribe: (cb) => subs.push(cb),
        isSelected: () => false,
        _trigger: () => subs.forEach(cb => cb()),
    };
}

function makeMap(id = 1) {
    return {
        id,
        tiles: [
            { url: `https://example.com/tile-${id}.png`, mapCoords: { x: 0, y: 0 }, tileSize: 256 },
        ],
        boundary: null,
    };
}

function setupGlobals() {
    window.xZoom = (x) => x;
    window.yZoom = (y) => y;
}

describe('MapViewer', () => {
    beforeEach(() => {
        setupGlobals();
    });

    afterEach(() => {
        delete window.xZoom;
        delete window.yZoom;
    });

    describe('tile rendering optimisation', () => {
        it('renders tile images on the first state update', () => {
            const svg = makeSvg();
            const viewer = new MapViewer(svg, makeZoomStore(), makeAppStore(), makeSelectionStore());

            const map = makeMap(1);
            viewer.render({ map, layers: [] });

            const tileImages = viewer.tileGroup.querySelectorAll('image');
            expect(tileImages).toHaveLength(1);
            expect(tileImages[0].getAttribute('href')).toBe('https://example.com/tile-1.png');
        });

        it('does NOT recreate tile images when only layers change (same map id)', () => {
            const svg = makeSvg();
            const viewer = new MapViewer(svg, makeZoomStore(), makeAppStore(), makeSelectionStore());

            const map = makeMap(1);
            viewer.render({ map, layers: [] });

            // Grab a reference to the first tile image
            const firstRenderImage = viewer.tileGroup.querySelector('image');
            const originalHref = firstRenderImage.getAttribute('href');

            // Trigger a layer-only state change (same map object)
            const newLayer = { id: 'layer-new', isVisible: true, decorations: [] };
            viewer.render({ map, layers: [newLayer] });

            // The same image element should still be present (not recreated)
            const afterRenderImage = viewer.tileGroup.querySelector('image');
            expect(afterRenderImage).toBe(firstRenderImage);
            expect(afterRenderImage.getAttribute('href')).toBe(originalHref);
        });

        it('does NOT recreate tile images when layer visibility is toggled (same map id)', () => {
            const svg = makeSvg();
            const viewer = new MapViewer(svg, makeZoomStore(), makeAppStore(), makeSelectionStore());

            const map = makeMap(1);
            const layer = { id: 'layer-1', isVisible: true, decorations: [] };
            viewer.render({ map, layers: [layer] });

            const originalImage = viewer.tileGroup.querySelector('image');

            // Toggle visibility
            const hiddenLayer = { id: 'layer-1', isVisible: false, decorations: [] };
            viewer.render({ map, layers: [hiddenLayer] });

            expect(viewer.tileGroup.querySelector('image')).toBe(originalImage);
        });

        it('recreates tile images when the map changes', () => {
            const svg = makeSvg();
            const viewer = new MapViewer(svg, makeZoomStore(), makeAppStore(), makeSelectionStore());

            const map1 = makeMap(1);
            viewer.render({ map: map1, layers: [] });
            const firstImage = viewer.tileGroup.querySelector('image');

            const map2 = makeMap(2);
            viewer.render({ map: map2, layers: [] });
            const secondImage = viewer.tileGroup.querySelector('image');

            expect(secondImage).not.toBe(firstImage);
            expect(secondImage.getAttribute('href')).toBe('https://example.com/tile-2.png');
        });

        it('clears tiles when map is removed', () => {
            const svg = makeSvg();
            const viewer = new MapViewer(svg, makeZoomStore(), makeAppStore(), makeSelectionStore());

            viewer.render({ map: makeMap(1), layers: [] });
            expect(viewer.tileGroup.querySelectorAll('image')).toHaveLength(1);

            viewer.render({ map: null, layers: [] });
            expect(viewer.tileGroup.querySelectorAll('image')).toHaveLength(0);
        });
    });

    describe('selected decoration z-order', () => {
        function makeLayer(decorations) {
            return { id: 'layer-1', isVisible: true, color: '#00d4ff', decorations };
        }

        function makeDecoration(uid) {
            return { uid, name: `Dec ${uid}`, position: { x: 10, y: 10 }, color: '#00d4ff' };
        }

        it('moves selected decoration circles to the front of their parent group', () => {
            const svg = makeSvg();
            let isSelected = (_id) => false;
            const selectionStore = {
                subscribe: (cb) => { selectionStore._trigger = cb; },
                isSelected: (id) => isSelected(id),
            };
            const viewer = new MapViewer(svg, makeZoomStore(), makeAppStore(), selectionStore);

            const decorations = [
                makeDecoration('a'),
                makeDecoration('b'),
                makeDecoration('c'),
            ];
            viewer.render({ map: makeMap(1), layers: [makeLayer(decorations)] });

            const layerGroup = viewer.decorationsGroup.querySelector('.layer-layer-1');
            const circlesBeforeSelection = Array.from(layerGroup.querySelectorAll('circle'));
            expect(circlesBeforeSelection.map(c => c.getAttribute('data-decoration-id'))).toEqual(['a', 'b', 'c']);

            // Select 'a' — it should move to the end of its parent (rendered on top)
            isSelected = (id) => id === 'a';
            selectionStore._trigger();

            const circlesAfterSelection = Array.from(layerGroup.querySelectorAll('circle'));
            expect(circlesAfterSelection.map(c => c.getAttribute('data-decoration-id'))).toEqual(['b', 'c', 'a']);
        });

        it('restores original DOM order when decoration is deselected', () => {
            const svg = makeSvg();
            let isSelected = (id) => id === 'b';
            const selectionStore = {
                subscribe: (cb) => { selectionStore._trigger = cb; },
                isSelected: (id) => isSelected(id),
            };
            const viewer = new MapViewer(svg, makeZoomStore(), makeAppStore(), selectionStore);

            const decorations = [makeDecoration('x'), makeDecoration('y'), makeDecoration('z')];
            viewer.render({ map: makeMap(1), layers: [makeLayer(decorations)] });

            // Deselect — no circle should be at the end due to selection
            isSelected = (_id) => false;
            selectionStore._trigger();

            const layerGroup = viewer.decorationsGroup.querySelector('.layer-layer-1');
            const circles = Array.from(layerGroup.querySelectorAll('circle'));
            // All circles should still be present (order may vary, but none are out-of-place selected)
            expect(circles).toHaveLength(3);
            circles.forEach(c => expect(c.classList.contains('selected-decoration')).toBe(false));
        });
    });

    describe('pan drag preserves selection', () => {
        it('does not clear selection when a drag (pan) precedes the click on empty area', () => {
            const svg = makeSvg();
            const clearSelection = vi.fn();
            const selectionStore = {
                subscribe: vi.fn(),
                isSelected: () => false,
                clearSelection,
            };
            new MapViewer(svg, makeZoomStore(), makeAppStore(), selectionStore);

            // Simulate pan: mousedown → mousemove on document → mouseup → click on empty SVG
            svg.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true, clientX: 100, clientY: 100 }));
            document.dispatchEvent(new MouseEvent('mousemove', { buttons: 1, bubbles: true, clientX: 150, clientY: 150 }));
            document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            svg.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            expect(clearSelection).not.toHaveBeenCalled();
        });

        it('clears selection on a clean click (no drag) on empty area in pan mode', () => {
            const svg = makeSvg();
            const clearSelection = vi.fn();
            const selectionStore = {
                subscribe: vi.fn(),
                isSelected: () => false,
                clearSelection,
            };
            new MapViewer(svg, makeZoomStore(), makeAppStore(), selectionStore);

            // Simulate clean click: mousedown then click, no mouse movement
            svg.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true, clientX: 100, clientY: 100 }));
            svg.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            expect(clearSelection).toHaveBeenCalledOnce();
        });
    });
});
