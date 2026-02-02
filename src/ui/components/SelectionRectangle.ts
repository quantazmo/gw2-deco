// @ts-nocheck
/**
 * SelectionRectangle
 * Manages an SVG <rect> element that represents a rubber-band selection rectangle.
 *
 * Usage:
 *   const sr = new SelectionRectangle(svgElement);
 *   sr.start(pointerX, pointerY);
 *   // on pointermove:
 *   sr.update(pointerX, pointerY);
 *   // on pointerup:
 *   const bounds = sr.finish();
 *   // bounds: { x, y, width, height } in SVG coordinate space, or null if not active
 *
 * Hit-test:
 *   sr.getDecorationsInBounds(bounds, decorationCircles)
 *   → returns array of decoration IDs whose centres fall within bounds
 */
export class SelectionRectangle {
    /**
     * @param {SVGSVGElement} svgElement - The SVG element to attach the rect to.
     */
    constructor(svgElement) {
        this._svg = svgElement;
        this._rect = null;
        this._startX = 0;
        this._startY = 0;
        this._active = false;
    }

    /**
     * Begin a selection rectangle at the given SVG coordinates.
     * @param {number} x
     * @param {number} y
     */
    start(x, y) {
        this._startX = x;
        this._startY = y;
        this._active = true;

        if (!this._rect) {
            this._rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            this._rect.classList.add('selection-rect');
            this._rect.setAttribute('pointer-events', 'none');
        }

        this._rect.setAttribute('x', x);
        this._rect.setAttribute('y', y);
        this._rect.setAttribute('width', 0);
        this._rect.setAttribute('height', 0);

        if (!this._rect.parentNode) {
            this._svg.appendChild(this._rect);
        }
    }

    /**
     * Update the selection rectangle as the pointer moves.
     * @param {number} x
     * @param {number} y
     */
    update(x, y) {
        if (!this._active || !this._rect) return;

        const rx = Math.min(x, this._startX);
        const ry = Math.min(y, this._startY);
        const rw = Math.abs(x - this._startX);
        const rh = Math.abs(y - this._startY);

        this._rect.setAttribute('x', rx);
        this._rect.setAttribute('y', ry);
        this._rect.setAttribute('width', rw);
        this._rect.setAttribute('height', rh);
    }

    /**
     * Finish the selection rectangle.
     * Removes the rect from the SVG and returns the final bounds.
     * @returns {{ x: number, y: number, width: number, height: number } | null}
     */
    finish() {
        if (!this._active) return null;

        const bounds = this._rect
            ? {
                x: parseFloat(this._rect.getAttribute('x')),
                y: parseFloat(this._rect.getAttribute('y')),
                width: parseFloat(this._rect.getAttribute('width')),
                height: parseFloat(this._rect.getAttribute('height'))
            }
            : null;

        this._active = false;

        if (this._rect && this._rect.parentNode) {
            this._rect.parentNode.removeChild(this._rect);
        }

        return bounds;
    }

    /**
     * Whether a rectangle selection is currently in progress.
     * @returns {boolean}
     */
    isActive() {
        return this._active;
    }

    /**
     * Find all decoration IDs whose SVG circle centres fall within the given bounds.
     *
     * @param {{ x: number, y: number, width: number, height: number }} bounds
     * @param {Map<string, SVGCircleElement>} decorationCircles
     *   Map<decorationId, SVGCircleElement> as maintained by MapViewer
     * @returns {string[]} Array of decoration IDs inside the bounds
     */
    getDecorationsInBounds(bounds, decorationCircles) {
        if (!bounds || !decorationCircles) return [];

        const { x, y, width, height } = bounds;
        const x2 = x + width;
        const y2 = y + height;

        const result = [];
        for (const [id, circle] of decorationCircles) {
            const cx = parseFloat(circle.getAttribute('cx'));
            const cy = parseFloat(circle.getAttribute('cy'));
            if (cx >= x && cx <= x2 && cy >= y && cy <= y2) {
                result.push(id);
            }
        }
        return result;
    }
}
