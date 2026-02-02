// @ts-nocheck
/**
 * ExportDialog Component
 * Modal dialog for selecting layers to export to XML.
 * Uses native <dialog> element with Promise-based API.
 * Pre-checks layers based on their current visibility state.
 * Confirm button disabled when no layers are selected.
 * Cancel (button or Escape) resolves with null.
 */

let _instanceCount = 0;

export class ExportDialog {
    constructor() {
        _instanceCount++;
        this._id = `export-dialog-${_instanceCount}`;
        this._resolve = null;
        this._selections = new Map();
        this._layers = [];
        this._dialogEl = this._createDialogElement();
        document.body.appendChild(this._dialogEl);
    }

    /**
     * Show the export dialog with the given layers.
     * Checkboxes are pre-checked from layer.isVisible.
     *
     * @param {Array} layers - Layer instances
     * @returns {Promise<string[] | null>}
     *   Resolves with array of selected layer IDs on confirm.
     *   Resolves with null on cancel or Escape.
     */
    show(layers) {
        this._layers = layers;
        this._selections = new Map();
        for (const layer of layers) {
            this._selections.set(layer.id, layer.isVisible !== false);
        }

        this._renderLayerList();
        this._updateConfirmState();

        if (typeof this._dialogEl.showModal === 'function') {
            this._dialogEl.showModal();
        } else {
            this._dialogEl.setAttribute('open', '');
        }

        this._cancelBtn.focus();

        return new Promise((resolve) => {
            this._resolve = resolve;
        });
    }

    /**
     * @private
     */
    _createDialogElement() {
        const dialog = document.createElement('dialog');
        dialog.classList.add('export-dialog');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');

        const titleId = `${this._id}-title`;
        const descId = `${this._id}-desc`;

        dialog.setAttribute('aria-labelledby', titleId);
        dialog.setAttribute('aria-describedby', descId);

        // Title
        this._titleEl = document.createElement('h2');
        this._titleEl.classList.add('export-dialog__title');
        this._titleEl.id = titleId;
        this._titleEl.textContent = 'Export Layers';

        // Description
        this._descEl = document.createElement('p');
        this._descEl.classList.add('export-dialog__desc');
        this._descEl.id = descId;
        this._descEl.textContent = 'Select the layers to include in the exported XML file.';

        // Layer list container
        this._listEl = document.createElement('div');
        this._listEl.classList.add('export-dialog__layer-list');

        // Empty-selection message
        this._emptyMsgEl = document.createElement('p');
        this._emptyMsgEl.classList.add('export-dialog__empty-msg');
        this._emptyMsgEl.textContent = 'Select at least one layer to export.';
        this._emptyMsgEl.setAttribute('aria-live', 'polite');
        this._emptyMsgEl.hidden = true;

        // Actions container
        const actions = document.createElement('div');
        actions.classList.add('export-dialog__actions');

        // Cancel button (default focus — safe UX)
        this._cancelBtn = document.createElement('button');
        this._cancelBtn.type = 'button';
        this._cancelBtn.classList.add('export-dialog__cancel');
        this._cancelBtn.textContent = 'Cancel';
        this._cancelBtn.addEventListener('click', () => this._close(null));

        // Confirm button
        this._confirmBtn = document.createElement('button');
        this._confirmBtn.type = 'button';
        this._confirmBtn.classList.add('export-dialog__confirm');
        this._confirmBtn.textContent = 'Export';
        this._confirmBtn.addEventListener('click', () => {
            const selectedIds = [...this._selections.entries()]
                .filter(([, checked]) => checked)
                .map(([id]) => id);
            this._close(selectedIds);
        });

        actions.appendChild(this._confirmBtn);
        actions.appendChild(this._cancelBtn);

        dialog.appendChild(this._titleEl);
        dialog.appendChild(this._descEl);
        dialog.appendChild(this._listEl);
        dialog.appendChild(this._emptyMsgEl);
        dialog.appendChild(actions);

        // Native cancel event fires on Escape key
        dialog.addEventListener('cancel', (e) => {
            e.preventDefault();
            this._close(null);
        });

        return dialog;
    }

    /**
     * Render one row per layer into the layer list container.
     * @private
     */
    _renderLayerList() {
        this._listEl.innerHTML = '';

        for (const layer of this._layers) {
            const row = document.createElement('label');
            row.classList.add('export-dialog__layer-row');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.classList.add('export-dialog__checkbox');
            checkbox.checked = this._selections.get(layer.id) === true;
            checkbox.dataset.layerId = layer.id;

            checkbox.addEventListener('change', () => {
                this._selections.set(layer.id, checkbox.checked);
                this._updateConfirmState();
            });

            const nameSpan = document.createElement('span');
            nameSpan.classList.add('export-dialog__layer-name');
            nameSpan.textContent = layer.name;

            const countSpan = document.createElement('span');
            countSpan.classList.add('export-dialog__layer-count');
            const count = layer.getAllDecorations ? layer.getAllDecorations().length : 0;
            countSpan.textContent = `${count} decoration${count === 1 ? '' : 's'}`;

            row.appendChild(checkbox);
            row.appendChild(nameSpan);
            row.appendChild(countSpan);
            this._listEl.appendChild(row);
        }
    }

    /**
     * Enable or disable the confirm button based on whether any layers are selected.
     * @private
     */
    _updateConfirmState() {
        const anyChecked = [...this._selections.values()].some(Boolean);
        this._confirmBtn.disabled = !anyChecked;
        this._emptyMsgEl.hidden = anyChecked;
    }

    /**
     * Close the dialog and resolve the promise.
     * @param {string[] | null} result
     * @private
     */
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

    /**
     * Remove the dialog element from the DOM.
     */
    destroy() {
        if (this._dialogEl && this._dialogEl.parentNode) {
            this._dialogEl.parentNode.removeChild(this._dialogEl);
        }
    }
}

export default ExportDialog;
