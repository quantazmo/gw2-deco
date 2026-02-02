// @ts-nocheck
/**
 * DecorationInfoDialog Component
 * Modal dialog that displays all information about a single decoration.
 * Opened when the user double-clicks a decoration in the DecorationListPanel.
 * Promise-based API: show() resolves when the dialog is closed.
 */

let _instanceCount = 0;

export class DecorationInfoDialog {
    constructor() {
        _instanceCount++;
        this._id = `decoration-info-dialog-${_instanceCount}`;
        this._resolve = null;
        this._dialogEl = this._createDialogElement();
        document.body.appendChild(this._dialogEl);
    }

    /**
     * Show the decoration info dialog.
     * @param {Object} options
     * @param {Object} options.decoration - The decoration object to display
     * @param {string} [options.layerName] - Optional name of the layer containing this decoration
     * @returns {Promise<void>} Resolves when the dialog is closed
     */
    show({ decoration, layerName }) {
        this._populate(decoration, layerName);

        if (typeof this._dialogEl.showModal === 'function') {
            this._dialogEl.showModal();
        } else {
            this._dialogEl.setAttribute('open', '');
        }

        this._okBtn.focus();

        return new Promise((resolve) => {
            this._resolve = resolve;
        });
    }

    /** @private */
    _populate(decoration, layerName) {
        this._titleEl.textContent = decoration.name || decoration.id;

        // Clear previous rows
        while (this._bodyEl.firstChild) {
            this._bodyEl.removeChild(this._bodyEl.firstChild);
        }

        const rows = [];

        if (layerName !== undefined && layerName !== null) {
            rows.push({ label: 'Layer', value: layerName });
        }

        rows.push({ label: 'Type ID', value: decoration.id });
        rows.push({ label: 'Instance UID', value: decoration.uid });

        const pos = decoration.position || {};
        rows.push({ label: 'Position X', value: pos.x !== undefined ? String(pos.x) : '—' });
        rows.push({ label: 'Position Y', value: pos.y !== undefined ? String(pos.y) : '—' });
        rows.push({ label: 'Position Z', value: pos.z !== undefined ? String(pos.z) : '—' });

        rows.push({ label: 'Rotation Y', value: String(decoration.rotation ?? '—') });
        rows.push({ label: 'Rotation X', value: String(decoration.rotX ?? '—') });
        rows.push({ label: 'Rotation Z', value: String(decoration.rotZ ?? '—') });
        rows.push({ label: 'Scale', value: String(decoration.scale ?? '—') });

        for (const row of rows) {
            const rowEl = document.createElement('div');
            rowEl.className = 'decoration-info-dialog__row';

            const labelEl = document.createElement('span');
            labelEl.className = 'decoration-info-dialog__label';
            labelEl.textContent = row.label;

            const valueEl = document.createElement('span');
            valueEl.className = 'decoration-info-dialog__value';
            valueEl.textContent = row.value;

            rowEl.appendChild(labelEl);
            rowEl.appendChild(valueEl);
            this._bodyEl.appendChild(rowEl);
        }
    }

    /** @private */
    _createDialogElement() {
        const dialog = document.createElement('dialog');
        dialog.classList.add('decoration-info-dialog');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', `${this._id}-title`);

        // Title
        this._titleEl = document.createElement('h2');
        this._titleEl.className = 'decoration-info-dialog__title';
        this._titleEl.id = `${this._id}-title`;

        // Body: info rows
        this._bodyEl = document.createElement('div');
        this._bodyEl.className = 'decoration-info-dialog__body';

        // Actions footer
        const actions = document.createElement('div');
        actions.className = 'decoration-info-dialog__actions';

        this._okBtn = document.createElement('button');
        this._okBtn.type = 'button';
        this._okBtn.className = 'decoration-info-dialog__ok';
        this._okBtn.textContent = 'OK';
        this._okBtn.addEventListener('click', () => this._close());

        actions.appendChild(this._okBtn);

        dialog.appendChild(this._titleEl);
        dialog.appendChild(this._bodyEl);
        dialog.appendChild(actions);

        // Close on backdrop click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) this._close();
        });

        // Close on Escape
        dialog.addEventListener('cancel', (e) => {
            e.preventDefault();
            this._close();
        });

        return dialog;
    }

    /** @private */
    _close() {
        if (typeof this._dialogEl.close === 'function') {
            this._dialogEl.close();
        } else {
            this._dialogEl.removeAttribute('open');
        }
        if (this._resolve) {
            this._resolve();
            this._resolve = null;
        }
    }
}
