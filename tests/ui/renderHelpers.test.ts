// @ts-nocheck
import {
    createSvgElement,
    createCircle,
    createPolygon,
    createPolyline,
    createRect,
    createLine,
    createText,
    createGroup,
    createPath,
    setSvgAttributes,
    getSvgAttribute,
    transformElement,
    updateCircle,
    updatePolygon,
    worldToScreen,
    screenToWorld
} from '../../src/ui/renderHelpers.js';

describe('renderHelpers', () => {
    describe('createSvgElement', () => {
        it('creates an SVG element with correct namespace', () => {
            const el = createSvgElement('circle');
            expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
            expect(el.tagName).toBe('circle');
        });

        it('sets attributes on the element', () => {
            const el = createSvgElement('rect', { x: 10, y: 20, width: 100, height: 50 });
            expect(el.getAttribute('x')).toBe('10');
            expect(el.getAttribute('y')).toBe('20');
            expect(el.getAttribute('width')).toBe('100');
            expect(el.getAttribute('height')).toBe('50');
        });

        it('creates element with no attributes when none provided', () => {
            const el = createSvgElement('g');
            expect(el.tagName).toBe('g');
            expect(el.attributes.length).toBe(0);
        });
    });

    describe('createCircle', () => {
        it('creates circle with cx, cy, r', () => {
            const el = createCircle(10, 20, 5);
            expect(el.getAttribute('cx')).toBe('10');
            expect(el.getAttribute('cy')).toBe('20');
            expect(el.getAttribute('r')).toBe('5');
        });

        it('sets fill option', () => {
            const el = createCircle(0, 0, 5, { fill: 'red' });
            expect(el.getAttribute('fill')).toBe('red');
        });

        it('sets stroke option', () => {
            const el = createCircle(0, 0, 5, { stroke: 'blue' });
            expect(el.getAttribute('stroke')).toBe('blue');
        });

        it('sets strokeWidth option including 0', () => {
            const el = createCircle(0, 0, 5, { strokeWidth: 2 });
            expect(el.getAttribute('stroke-width')).toBe('2');
            const el0 = createCircle(0, 0, 5, { strokeWidth: 0 });
            expect(el0.getAttribute('stroke-width')).toBe('0');
        });

        it('sets className option', () => {
            const el = createCircle(0, 0, 5, { className: 'my-circle' });
            expect(el.getAttribute('class')).toBe('my-circle');
        });

        it('sets opacity option including 0', () => {
            const el = createCircle(0, 0, 5, { opacity: 0.5 });
            expect(el.getAttribute('opacity')).toBe('0.5');
            const el0 = createCircle(0, 0, 5, { opacity: 0 });
            expect(el0.getAttribute('opacity')).toBe('0');
        });

        it('does not set omitted options', () => {
            const el = createCircle(0, 0, 5);
            expect(el.getAttribute('fill')).toBeNull();
            expect(el.getAttribute('stroke')).toBeNull();
        });
    });

    describe('createPolygon', () => {
        it('creates polygon with points string', () => {
            const el = createPolygon([[0, 0], [10, 0], [5, 10]]);
            expect(el.getAttribute('points')).toBe('0,0 10,0 5,10');
        });

        it('sets all options', () => {
            const el = createPolygon([[0, 0]], {
                fill: 'green',
                stroke: 'black',
                strokeWidth: 1,
                className: 'poly',
                opacity: 0.8
            });
            expect(el.getAttribute('fill')).toBe('green');
            expect(el.getAttribute('stroke')).toBe('black');
            expect(el.getAttribute('stroke-width')).toBe('1');
            expect(el.getAttribute('class')).toBe('poly');
            expect(el.getAttribute('opacity')).toBe('0.8');
        });

        it('sets strokeWidth = 0', () => {
            const el = createPolygon([[0, 0]], { strokeWidth: 0 });
            expect(el.getAttribute('stroke-width')).toBe('0');
        });

        it('sets opacity = 0', () => {
            const el = createPolygon([[0, 0]], { opacity: 0 });
            expect(el.getAttribute('opacity')).toBe('0');
        });
    });

    describe('createPolyline', () => {
        it('creates polyline with points string and fill=none', () => {
            const el = createPolyline([[0, 0], [10, 5]]);
            expect(el.getAttribute('points')).toBe('0,0 10,5');
            expect(el.getAttribute('fill')).toBe('none');
        });

        it('sets stroke option', () => {
            const el = createPolyline([[0, 0]], { stroke: 'red' });
            expect(el.getAttribute('stroke')).toBe('red');
        });

        it('sets strokeWidth option including 0', () => {
            const el = createPolyline([[0, 0]], { strokeWidth: 3 });
            expect(el.getAttribute('stroke-width')).toBe('3');
            const el0 = createPolyline([[0, 0]], { strokeWidth: 0 });
            expect(el0.getAttribute('stroke-width')).toBe('0');
        });

        it('sets className option', () => {
            const el = createPolyline([[0, 0]], { className: 'line' });
            expect(el.getAttribute('class')).toBe('line');
        });

        it('sets opacity option including 0', () => {
            const el = createPolyline([[0, 0]], { opacity: 0.3 });
            expect(el.getAttribute('opacity')).toBe('0.3');
            const el0 = createPolyline([[0, 0]], { opacity: 0 });
            expect(el0.getAttribute('opacity')).toBe('0');
        });
    });

    describe('createRect', () => {
        it('creates rect with x, y, width, height', () => {
            const el = createRect(5, 10, 100, 50);
            expect(el.getAttribute('x')).toBe('5');
            expect(el.getAttribute('y')).toBe('10');
            expect(el.getAttribute('width')).toBe('100');
            expect(el.getAttribute('height')).toBe('50');
        });

        it('sets fill option', () => {
            const el = createRect(0, 0, 10, 10, { fill: 'blue' });
            expect(el.getAttribute('fill')).toBe('blue');
        });

        it('sets stroke option', () => {
            const el = createRect(0, 0, 10, 10, { stroke: 'black' });
            expect(el.getAttribute('stroke')).toBe('black');
        });

        it('sets strokeWidth option including 0', () => {
            const el = createRect(0, 0, 10, 10, { strokeWidth: 2 });
            expect(el.getAttribute('stroke-width')).toBe('2');
            const el0 = createRect(0, 0, 10, 10, { strokeWidth: 0 });
            expect(el0.getAttribute('stroke-width')).toBe('0');
        });

        it('sets className option', () => {
            const el = createRect(0, 0, 10, 10, { className: 'rect-class' });
            expect(el.getAttribute('class')).toBe('rect-class');
        });
    });

    describe('createLine', () => {
        it('creates line with x1, y1, x2, y2', () => {
            const el = createLine(0, 0, 100, 100);
            expect(el.getAttribute('x1')).toBe('0');
            expect(el.getAttribute('y1')).toBe('0');
            expect(el.getAttribute('x2')).toBe('100');
            expect(el.getAttribute('y2')).toBe('100');
        });

        it('sets stroke option', () => {
            const el = createLine(0, 0, 10, 10, { stroke: 'grey' });
            expect(el.getAttribute('stroke')).toBe('grey');
        });

        it('sets strokeWidth option including 0', () => {
            const el = createLine(0, 0, 10, 10, { strokeWidth: 1 });
            expect(el.getAttribute('stroke-width')).toBe('1');
            const el0 = createLine(0, 0, 10, 10, { strokeWidth: 0 });
            expect(el0.getAttribute('stroke-width')).toBe('0');
        });

        it('sets className option', () => {
            const el = createLine(0, 0, 10, 10, { className: 'my-line' });
            expect(el.getAttribute('class')).toBe('my-line');
        });
    });

    describe('createText', () => {
        it('creates text element with content and position', () => {
            const el = createText('Hello', 10, 20);
            expect(el.textContent).toBe('Hello');
            expect(el.getAttribute('x')).toBe('10');
            expect(el.getAttribute('y')).toBe('20');
        });

        it('sets fontSize option', () => {
            const el = createText('Hi', 0, 0, { fontSize: '14px' });
            expect(el.getAttribute('font-size')).toBe('14px');
        });

        it('sets fill option', () => {
            const el = createText('Hi', 0, 0, { fill: 'white' });
            expect(el.getAttribute('fill')).toBe('white');
        });

        it('sets textAnchor option', () => {
            const el = createText('Hi', 0, 0, { textAnchor: 'middle' });
            expect(el.getAttribute('text-anchor')).toBe('middle');
        });

        it('sets className option', () => {
            const el = createText('Hi', 0, 0, { className: 'label' });
            expect(el.getAttribute('class')).toBe('label');
        });
    });

    describe('createGroup', () => {
        it('creates group with no attributes by default', () => {
            const el = createGroup();
            expect(el.tagName).toBe('g');
            expect(el.getAttribute('class')).toBeNull();
            expect(el.getAttribute('id')).toBeNull();
        });

        it('sets className option', () => {
            const el = createGroup({ className: 'group-cls' });
            expect(el.getAttribute('class')).toBe('group-cls');
        });

        it('sets id option', () => {
            const el = createGroup({ id: 'my-group' });
            expect(el.getAttribute('id')).toBe('my-group');
        });
    });

    describe('createPath', () => {
        it('creates path with d attribute', () => {
            const el = createPath('M 0 0 L 10 10');
            expect(el.getAttribute('d')).toBe('M 0 0 L 10 10');
        });

        it('sets fill option', () => {
            const el = createPath('M 0 0', { fill: 'none' });
            expect(el.getAttribute('fill')).toBe('none');
        });

        it('sets stroke option', () => {
            const el = createPath('M 0 0', { stroke: 'purple' });
            expect(el.getAttribute('stroke')).toBe('purple');
        });

        it('sets strokeWidth option including 0', () => {
            const el = createPath('M 0 0', { strokeWidth: 2 });
            expect(el.getAttribute('stroke-width')).toBe('2');
            const el0 = createPath('M 0 0', { strokeWidth: 0 });
            expect(el0.getAttribute('stroke-width')).toBe('0');
        });

        it('sets className option', () => {
            const el = createPath('M 0 0', { className: 'path-cls' });
            expect(el.getAttribute('class')).toBe('path-cls');
        });
    });

    describe('setSvgAttributes', () => {
        it('sets multiple attributes on element', () => {
            const el = createSvgElement('circle');
            setSvgAttributes(el, { cx: 5, cy: 10, r: 3 });
            expect(el.getAttribute('cx')).toBe('5');
            expect(el.getAttribute('cy')).toBe('10');
            expect(el.getAttribute('r')).toBe('3');
        });
    });

    describe('getSvgAttribute', () => {
        it('returns attribute value', () => {
            const el = createSvgElement('rect', { width: '100' });
            expect(getSvgAttribute(el, 'width')).toBe('100');
        });

        it('returns null for missing attribute', () => {
            const el = createSvgElement('rect');
            expect(getSvgAttribute(el, 'missing')).toBeNull();
        });
    });

    describe('transformElement', () => {
        it('sets translate transform', () => {
            const el = createSvgElement('g');
            transformElement(el, { tx: 10, ty: 20 });
            expect(el.getAttribute('transform')).toBe('translate(10, 20)');
        });

        it('sets translate with only tx', () => {
            const el = createSvgElement('g');
            transformElement(el, { tx: 5 });
            expect(el.getAttribute('transform')).toBe('translate(5, 0)');
        });

        it('sets translate with only ty', () => {
            const el = createSvgElement('g');
            transformElement(el, { ty: 7 });
            expect(el.getAttribute('transform')).toBe('translate(0, 7)');
        });

        it('sets scale transform', () => {
            const el = createSvgElement('g');
            transformElement(el, { sx: 2, sy: 3 });
            expect(el.getAttribute('transform')).toBe('scale(2, 3)');
        });

        it('sets scale with only sx', () => {
            const el = createSvgElement('g');
            transformElement(el, { sx: 2 });
            expect(el.getAttribute('transform')).toBe('scale(2, 1)');
        });

        it('sets scale with only sy', () => {
            const el = createSvgElement('g');
            transformElement(el, { sy: 4 });
            expect(el.getAttribute('transform')).toBe('scale(1, 4)');
        });

        it('sets rotation transform', () => {
            const el = createSvgElement('g');
            transformElement(el, { rotation: 45 });
            expect(el.getAttribute('transform')).toBe('rotate(45)');
        });

        it('combines translate, scale, and rotation', () => {
            const el = createSvgElement('g');
            transformElement(el, { tx: 10, ty: 20, sx: 2, sy: 2, rotation: 90 });
            expect(el.getAttribute('transform')).toBe('translate(10, 20) scale(2, 2) rotate(90)');
        });

        it('does not set transform attribute when no transform values', () => {
            const el = createSvgElement('g');
            transformElement(el, {});
            expect(el.getAttribute('transform')).toBeNull();
        });

        it('does not set transform attribute when no argument', () => {
            const el = createSvgElement('g');
            transformElement(el);
            expect(el.getAttribute('transform')).toBeNull();
        });
    });

    describe('updateCircle', () => {
        it('updates cx, cy, r attributes', () => {
            const el = createCircle(0, 0, 1);
            updateCircle(el, 5, 10, 15);
            expect(el.getAttribute('cx')).toBe('5');
            expect(el.getAttribute('cy')).toBe('10');
            expect(el.getAttribute('r')).toBe('15');
        });
    });

    describe('updatePolygon', () => {
        it('updates points attribute', () => {
            const el = createPolygon([[0, 0]]);
            updatePolygon(el, [[1, 2], [3, 4], [5, 6]]);
            expect(el.getAttribute('points')).toBe('1,2 3,4 5,6');
        });
    });

    describe('worldToScreen', () => {
        it('converts world coordinates to screen coordinates', () => {
            const transform = { sx: 2, sy: 2, tx: 100, ty: 50 };
            const result = worldToScreen(10, 20, transform);
            expect(result.x).toBe(120); // 10 * 2 + 100
            expect(result.y).toBe(90);  // 20 * 2 + 50
        });

        it('handles identity transform', () => {
            const transform = { sx: 1, sy: 1, tx: 0, ty: 0 };
            const result = worldToScreen(5, 7, transform);
            expect(result.x).toBe(5);
            expect(result.y).toBe(7);
        });
    });

    describe('screenToWorld', () => {
        it('converts screen coordinates to world coordinates', () => {
            const transform = { sx: 2, sy: 2, tx: 100, ty: 50 };
            const result = screenToWorld(120, 90, transform);
            expect(result.x).toBe(10); // (120 - 100) / 2
            expect(result.y).toBe(20); // (90 - 50) / 2
        });

        it('handles identity transform', () => {
            const transform = { sx: 1, sy: 1, tx: 0, ty: 0 };
            const result = screenToWorld(5, 7, transform);
            expect(result.x).toBe(5);
            expect(result.y).toBe(7);
        });
    });
});
