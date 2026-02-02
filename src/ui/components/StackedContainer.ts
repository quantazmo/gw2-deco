// @ts-nocheck
/**
 * StackedContainer
 * Renders a SplitNode as two panels with a DividerResizer between them.
 *
 * The container itself is a flex container (.stacked-container) with direction
 * driven by the split node's direction:
 *   horizontal → flex-direction: column  (panels stacked top-to-bottom)
 *   vertical   → flex-direction: row     (panels side-by-side)
 *
 * The DividerResizer sits between the two children and calls onRatioChange when
 * the user drags it.
 */

import { DividerResizer } from './DividerResizer.js';

export class StackedContainer {
    /**
     * @param {object}      node           The SplitNode being rendered
     * @param {HTMLElement} firstEl        Rendered DOM element for node.first
     * @param {HTMLElement} secondEl       Rendered DOM element for node.second
     * @param {Function}    onRatioChange  Called with (newRatio: number) on divider drag
     * @param {object}      [dividerOptions={}]  Options forwarded to DividerResizer
     *   (e.g. { minRatio, maxRatio } for map-minimum enforcement)
     */
    constructor(node, firstEl, secondEl, onRatioChange, dividerOptions = {}) {
        this._node = node;
        this._firstEl = firstEl;
        this._secondEl = secondEl;
        this._onRatioChange = onRatioChange;
        this._dividerOptions = dividerOptions;
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
        const container = document.createElement('div');
        container.className = `stacked-container stacked-${this._node.direction}`;

        // Apply flex ratios to the two children
        this._firstEl.style.flex = `${this._node.ratio} 1 0%`;
        this._firstEl.style.minWidth = '0';
        this._firstEl.style.minHeight = '0';

        this._secondEl.style.flex = `${1 - this._node.ratio} 1 0%`;
        this._secondEl.style.minWidth = '0';
        this._secondEl.style.minHeight = '0';

        const divider = new DividerResizer(this._node.direction, this._onRatioChange, this._dividerOptions);

        container.appendChild(this._firstEl);
        container.appendChild(divider.getElement());
        container.appendChild(this._secondEl);

        return container;
    }
}
