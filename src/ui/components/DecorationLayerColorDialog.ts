// @ts-nocheck
/**
 * DecorationLayerColorDialog Component
 * Modal dialog for picking a layer color from the predefined palette.
 * Promise-based API: show() resolves to the chosen color string, or null if cancelled.
 */
import { LAYER_COLORS } from '../../config/constants.js';

let _instanceCount = 0;

export class DecorationLayerColorDialog {
    constructor() {
        _instanceCount++;
        this._id = `layer-color-dialog-${_instanceCount}`;
        this._resolve = null;
        this._currentColor = null;
        this._dialogEl = this._createDialogElement();
        document.body.appendChild(this._dialogEl);
    }

    /**
     * Show the color picker dialog.
     * @param {Object} options
     * @param {string} options.currentColor - The layer's current color
     * @returns {Promise<string|null>} Resolves to the chosen color, or null if cancelled
     */
    show({ currentColor }) {
        this._currentColor = currentColor || LAYER_COLORS[0];
        this._selectedColor = this._currentColor;

        // Refresh swatch selection state
        this._swatchEls.forEach(sw => {
            const isSelected = sw.dataset.color === this._currentColor;
            sw.classList.toggle('layer-color-dialog__swatch--selected', isSelected);
            sw.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        });

        if (typeof this._dialogEl.showModal === 'function') {
            this._dialogEl.showModal();
        } else {
            this._dialogEl.setAttribute('open', '');
        }

        // Focus the currently selected swatch, or the first one
        const selected = this._dialogEl.querySelector('.layer-color-dialog__swatch--selected')
            || this._swatchEls[0];
        if (selected) selected.focus();

        return new Promise((resolve) => {
            this._resolve = resolve;
        });
    }

    /** @private */
    _createDialogElement() {
        const dialog = document.createElement('dialog');
        dialog.classList.add('layer-color-dialog');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', `${this._id}-title`);

        // Title
        const title = document.createElement('h2');
        title.classList.add('layer-color-dialog__title');
        title.id = `${this._id}-title`;
        title.textContent = 'Choose Layer color';

        // Swatch grid
        const grid = document.createElement('div');
        grid.classList.add('layer-color-dialog__grid');
        grid.setAttribute('role', 'radiogroup');
        grid.setAttribute('aria-label', 'Layer color options');

        this._swatchEls = LAYER_COLORS.map(color => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.classList.add('layer-color-dialog__swatch');
            btn.dataset.color = color;
            btn.style.backgroundColor = color;
            btn.setAttribute('role', 'radio');
            btn.setAttribute('aria-label', color);
            btn.setAttribute('aria-checked', 'false');
            btn.setAttribute('title', color);
            btn.addEventListener('click', () => this._selectColor(color));
            grid.appendChild(btn);
            return btn;
        });

        // Actions
        const actions = document.createElement('div');
        actions.classList.add('layer-color-dialog__actions');

        this._cancelBtn = document.createElement('button');
        this._cancelBtn.type = 'button';
        this._cancelBtn.classList.add('layer-color-dialog__cancel');
        this._cancelBtn.textContent = 'Cancel';
        this._cancelBtn.addEventListener('click', () => this._close(null));

        this._saveBtn = document.createElement('button');
        this._saveBtn.type = 'button';
        this._saveBtn.classList.add('layer-color-dialog__save');
        this._saveBtn.textContent = 'Save';
        this._saveBtn.addEventListener('click', () => this._close(this._selectedColor));

        actions.appendChild(this._saveBtn);
        actions.appendChild(this._cancelBtn);

        dialog.appendChild(title);
        dialog.appendChild(grid);
        dialog.appendChild(actions);

        // Close on backdrop click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) this._close(null);
        });

        // Close on Escape
        dialog.addEventListener('cancel', (e) => {
            e.preventDefault();
            this._close(null);
        });

        return dialog;
    }

    /** @private */
    _selectColor(color) {
        this._selectedColor = color;
        this._swatchEls.forEach(sw => {
            const isSelected = sw.dataset.color === color;
            sw.classList.toggle('layer-color-dialog__swatch--selected', isSelected);
            sw.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        });
    }

    /** @private */
    _close(result) {
        if (typeof this._dialogEl.close === 'function') {
            this._dialogEl.close();
        } else {
            this._dialogEl.removeAttribute('open');
        }
        if (this._resolve) {
            this._resolve(result);
            this._resolve = null;
        }
    }
}

export default DecorationLayerColorDialog;
