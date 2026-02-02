// @ts-nocheck
/**
 * Tests for src/ui/components/SelectionRectangle.js
 * Covers: SVG rect creation, start/update/finish coordinates,
 *         hit-testing decorations within bounds
 */
import { SelectionRectangle } from '../../../src/ui/components/SelectionRectangle.js';

// Minimal SVG element stub used in JSDOM environment
function makeSVGElement() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '800');
    svg.setAttribute('height', '600');
    document.body.appendChild(svg);
    return svg;
}

// Helper: create a stub SVGCircleElement with cx/cy attributes
function makeCircle(id, cx, cy) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', '5');
    circle.setAttribute('data-decoration-id', id);
    return circle;
}

describe('SelectionRectangle', () => {
    let svg;
    let sr;

    beforeEach(() => {
        svg = makeSVGElement();
        sr = new SelectionRectangle(svg);
    });

    afterEach(() => {
        if (svg.parentNode) svg.parentNode.removeChild(svg);
    });

    describe('isActive', () => {
        test('starts as inactive', () => {
            expect(sr.isActive()).toBe(false);
        });

        test('becomes active after start()', () => {
            sr.start(10, 20);
            expect(sr.isActive()).toBe(true);
        });

        test('becomes inactive after finish()', () => {
            sr.start(10, 20);
            sr.finish();
            expect(sr.isActive()).toBe(false);
        });
    });

    describe('start', () => {
        test('appends a rect to the SVG', () => {
            sr.start(10, 20);
            const rects = svg.querySelectorAll('rect.selection-rect');
            expect(rects.length).toBe(1);
        });

        test('sets initial rect position and zero size', () => {
            sr.start(50, 80);
            const rect = svg.querySelector('rect.selection-rect');
            expect(parseFloat(rect.getAttribute('x'))).toBe(50);
            expect(parseFloat(rect.getAttribute('y'))).toBe(80);
            expect(parseFloat(rect.getAttribute('width'))).toBe(0);
            expect(parseFloat(rect.getAttribute('height'))).toBe(0);
        });
    });

    describe('update', () => {
        test('updates rect dimensions as pointer moves right-down', () => {
            sr.start(10, 20);
            sr.update(110, 120);
            const rect = svg.querySelector('rect.selection-rect');
            expect(parseFloat(rect.getAttribute('x'))).toBe(10);
            expect(parseFloat(rect.getAttribute('y'))).toBe(20);
            expect(parseFloat(rect.getAttribute('width'))).toBe(100);
            expect(parseFloat(rect.getAttribute('height'))).toBe(100);
        });

        test('handles dragging up-left (negative delta)', () => {
            sr.start(100, 100);
            sr.update(50, 60);
            const rect = svg.querySelector('rect.selection-rect');
            // x/y should be the smaller coordinate
            expect(parseFloat(rect.getAttribute('x'))).toBe(50);
            expect(parseFloat(rect.getAttribute('y'))).toBe(60);
            expect(parseFloat(rect.getAttribute('width'))).toBe(50);
            expect(parseFloat(rect.getAttribute('height'))).toBe(40);
        });

        test('does nothing when not active', () => {
            sr.update(100, 100); // no start() called yet
            const rects = svg.querySelectorAll('rect.selection-rect');
            expect(rects.length).toBe(0);
        });
    });

    describe('finish', () => {
        test('returns bounds matching the drawn rectangle', () => {
            sr.start(10, 20);
            sr.update(110, 120);
            const bounds = sr.finish();
            expect(bounds).toEqual({ x: 10, y: 20, width: 100, height: 100 });
        });

        test('removes the rect from the SVG', () => {
            sr.start(10, 20);
            sr.update(50, 60);
            sr.finish();
            const rects = svg.querySelectorAll('rect.selection-rect');
            expect(rects.length).toBe(0);
        });

        test('returns null when not active', () => {
            expect(sr.finish()).toBeNull();
        });

        test('returns zero-size bounds for a zero-distance drag', () => {
            sr.start(30, 40);
            // no update — width and height stay 0
            const bounds = sr.finish();
            expect(bounds.width).toBe(0);
            expect(bounds.height).toBe(0);
        });
    });

    describe('getDecorationsInBounds', () => {
        let circles;

        beforeEach(() => {
            circles = new Map([
                ['d1', makeCircle('d1', 50, 50)],
                ['d2', makeCircle('d2', 150, 150)],
                ['d3', makeCircle('d3', 250, 250)],
                ['d4', makeCircle('d4', 100, 100)],
            ]);
        });

        test('returns IDs of circles within bounds', () => {
            const bounds = { x: 0, y: 0, width: 200, height: 200 };
            const result = sr.getDecorationsInBounds(bounds, circles);
            expect(result).toContain('d1');
            expect(result).toContain('d2');
            expect(result).toContain('d4');
            expect(result).not.toContain('d3');
        });

        test('returns empty array when bounds are empty', () => {
            const bounds = { x: 500, y: 500, width: 10, height: 10 };
            expect(sr.getDecorationsInBounds(bounds, circles)).toEqual([]);
        });

        test('includes circles exactly on the boundary edge', () => {
            const bounds = { x: 50, y: 50, width: 100, height: 100 };
            const result = sr.getDecorationsInBounds(bounds, circles);
            expect(result).toContain('d1');  // at (50,50) = left/top edge
            expect(result).toContain('d4');  // at (100,100) = right/bottom edge
        });

        test('returns empty array when decorationCircles is null', () => {
            const bounds = { x: 0, y: 0, width: 300, height: 300 };
            expect(sr.getDecorationsInBounds(bounds, null)).toEqual([]);
        });

        test('returns empty array when bounds is null', () => {
            expect(sr.getDecorationsInBounds(null, circles)).toEqual([]);
        });

        test('returns empty array for empty circle map', () => {
            const bounds = { x: 0, y: 0, width: 500, height: 500 };
            expect(sr.getDecorationsInBounds(bounds, new Map())).toEqual([]);
        });
    });
});
