// @ts-nocheck
/**
 * DividerResizer
 * A 6px draggable divider element placed between two panel children in a SplitNode.
 *
 * Responsibilities:
 *   - Renders a thin bar (class: divider-resizer) oriented per the split direction
 *   - mousedown starts resize tracking; mousemove (requestAnimationFrame-throttled)
 *     computes the new ratio from the cursor position relative to the split container
 *   - mouseup finalises and calls onRatioChange(newRatio)
 *   - Enforces SPLIT_RATIO_MIN / SPLIT_RATIO_MAX from constants
 *   - Uses pointer-events: none on overlay so original panel events keep working
 */

import { LAYOUT } from '../../config/constants.js';

export class DividerResizer {
    /**
     * @param {'horizontal'|'vertical'} direction
     *   'horizontal' → the split stacks panels top-to-bottom (divider is a horizontal bar)
     *   'vertical'   → the split places panels side-by-side  (divider is a vertical bar)
     * @param {Function} onRatioChange  Called with (newRatio: number) as the user drags
     * @param {object}  [options={}]  Optional overrides for ratio clamping
     * @param {number}  [options.minRatio]  Minimum allowed ratio (defaults to SPLIT_RATIO_MIN).
     *   Pass MAP_MIN_RATIO when the first child contains the map panel.
     * @param {number}  [options.maxRatio]  Maximum allowed ratio (defaults to SPLIT_RATIO_MAX).
     *   Pass 1 - MAP_MIN_RATIO when the second child contains the map panel.
     */
    constructor(direction, onRatioChange, options = {}) {
        this._direction = direction;
        this._onRatioChange = onRatioChange;
        this._minRatio = options.minRatio !== undefined ? options.minRatio : LAYOUT.SPLIT_RATIO_MIN;
        this._maxRatio = options.maxRatio !== undefined ? options.maxRatio : LAYOUT.SPLIT_RATIO_MAX;

        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);

        this._element = this._createElement();
    }

    /** @returns {HTMLElement} */
    getElement() {
        return this._element;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private
    // ─────────────────────────────────────────────────────────────────────────

    _createElement() {
        const el = document.createElement('div');
        el.className = `divider-resizer divider-${this._direction}`;
        el.addEventListener('mousedown', this._onMouseDown);
        return el;
    }

    _onMouseDown(e) {
        e.preventDefault();
        // Store references to the parent container and its two panel siblings
        this._splitContainer = this._element.parentElement;
        this._firstChild = this._element.previousElementSibling;
        this._secondChild = this._element.nextElementSibling;
        this._lastRatio = null;
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('mouseup', this._onMouseUp);
        document.body.classList.add('divider-resizing');
    }

    _onMouseMove(e) {
        if (!this._splitContainer) return;
        const newRatio = this._computeRatio(e.clientX, e.clientY);
        if (newRatio !== null) {
            this._lastRatio = newRatio;
            // Update flex values directly — no store update, no re-render
            if (this._firstChild) this._firstChild.style.flex = `${newRatio} 1 0%`;
            if (this._secondChild) this._secondChild.style.flex = `${1 - newRatio} 1 0%`;
        }
    }

    _onMouseUp(e) {
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('mouseup', this._onMouseUp);
        document.body.classList.remove('divider-resizing');
        // Commit the final ratio to the store exactly once
        if (this._lastRatio !== null) {
            this._onRatioChange(this._lastRatio);
        }
        this._splitContainer = null;
        this._firstChild = null;
        this._secondChild = null;
        this._lastRatio = null;
    }

    /**
     * Compute the new ratio from the cursor position within the split container.
     * The ratio represents the fraction of space for the *first* child.
     *
     * @param {number} clientX
     * @param {number} clientY
     * @returns {number|null}
     * @private
     */
    _computeRatio(clientX, clientY) {
        if (!this._splitContainer) return null;

        const rect = this._splitContainer.getBoundingClientRect();
        let ratio;

        if (this._direction === 'horizontal') {
            // Top-to-bottom layout: ratio is cursor Y position within the container
            const containerHeight = rect.height;
            if (containerHeight <= 0) return null;
            ratio = (clientY - rect.top) / containerHeight;
        } else {
            // Side-by-side layout: ratio is cursor X position within the container
            const containerWidth = rect.width;
            if (containerWidth <= 0) return null;
            ratio = (clientX - rect.left) / containerWidth;
        }

        // Clamp to enforced bounds (including optional map-minimum override)
        return Math.min(this._maxRatio, Math.max(this._minRatio, ratio));
    }
}
