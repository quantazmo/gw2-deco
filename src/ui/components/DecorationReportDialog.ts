// @ts-nocheck
/**
 * DecorationReportDialog Component
 * Modal dialog that reports the current map name and the decoration count
 * for all currently visible layers.
 * Uses native <dialog> element with a Promise-based API.
 * Dismissed via the OK button (or programmatically).
 */

let _instanceCount = 0;

export class DecorationReportDialog {
    constructor() {
        _instanceCount++;
        this._id = `decoration-report-dialog-${_instanceCount}`;
        this._resolve = null;
        this._dialogEl = this._createDialogElement();
        document.body.appendChild(this._dialogEl);
    }

    /**
     * Show the report dialog.
     *
     * @param {string} mapName   - Display name of the current map
     * @param {Array}  layers    - All layer instances; only visible ones are reported
     * @param {object} [inventory] - Optional AccountDecorationInventory for missing-decoration detection
     * @returns {Promise<void>}  Resolves when the user clicks OK
     */
    show(mapName, layers, inventory = null) {
        const visibleLayers = layers.filter(l => l.isVisible !== false);

        // Render map name
        this._mapNameEl.textContent = mapName || '—';

        // Render layer rows
        this._renderLayerList(visibleLayers);

        // Toggle empty-state message
        this._emptyMsgEl.hidden = visibleLayers.length > 0;

        // Render missing decorations section (only when an inventory is provided)
        this._renderMissingSection(visibleLayers, inventory);

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

    // ── private ──────────────────────────────────────────────────────────────

    /** @private */
    _createDialogElement() {
        const dialog = document.createElement('dialog');
        dialog.classList.add('decoration-report-dialog');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');

        const titleId = `${this._id}-title`;
        dialog.setAttribute('aria-labelledby', titleId);

        // Title
        this._titleEl = document.createElement('h2');
        this._titleEl.classList.add('decoration-report-dialog__title');
        this._titleEl.id = titleId;
        this._titleEl.textContent = 'Decoration Report';

        // Map info row
        const mapRow = document.createElement('p');
        mapRow.classList.add('decoration-report-dialog__map-row');

        const mapLabel = document.createElement('span');
        mapLabel.classList.add('decoration-report-dialog__map-label');
        mapLabel.textContent = 'Map: ';

        this._mapNameEl = document.createElement('span');
        this._mapNameEl.classList.add('decoration-report-dialog__map-name');

        mapRow.appendChild(mapLabel);
        mapRow.appendChild(this._mapNameEl);

        // Layer list
        this._listEl = document.createElement('div');
        this._listEl.classList.add('decoration-report-dialog__layer-list');

        // Empty-state message
        this._emptyMsgEl = document.createElement('p');
        this._emptyMsgEl.classList.add('decoration-report-dialog__empty-msg');
        this._emptyMsgEl.textContent = 'No visible layers.';
        this._emptyMsgEl.hidden = true;

        // Actions
        const actions = document.createElement('div');
        actions.classList.add('decoration-report-dialog__actions');

        this._okBtn = document.createElement('button');
        this._okBtn.type = 'button';
        this._okBtn.classList.add('decoration-report-dialog__ok');
        this._okBtn.textContent = 'OK';
        this._okBtn.addEventListener('click', () => this._close());

        actions.appendChild(this._okBtn);

        dialog.appendChild(this._titleEl);
        dialog.appendChild(mapRow);
        dialog.appendChild(this._listEl);
        dialog.appendChild(this._emptyMsgEl);
        dialog.appendChild(actions);

        return dialog;
    }

    /**
     * Render one row per visible layer.
     * @param {Array} visibleLayers
     * @private
     */
    _renderLayerList(visibleLayers) {
        this._listEl.innerHTML = '';

        for (const layer of visibleLayers) {
            const row = document.createElement('div');
            row.classList.add('decoration-report-dialog__layer-row');

            const nameSpan = document.createElement('span');
            nameSpan.classList.add('decoration-report-dialog__layer-name');
            nameSpan.textContent = layer.name;

            const countSpan = document.createElement('span');
            countSpan.classList.add('decoration-report-dialog__layer-count');
            const count = layer.getAllDecorations ? layer.getAllDecorations().length : 0;
            countSpan.textContent = `${count} decoration${count === 1 ? '' : 's'}`;

            row.appendChild(nameSpan);
            row.appendChild(countSpan);
            this._listEl.appendChild(row);
        }
    }

    /**
     * Render the missing decorations section when an inventory is provided.
     * Only considers decorations from visible layers.
     * @param {Array} visibleLayers
     * @param {object|null} inventory - AccountDecorationInventory or null
     * @private
     */
    _renderMissingSection(visibleLayers, inventory) {
        // Remove any existing missing section from a previous render
        const existing = this._dialogEl.querySelector('.decoration-report-dialog__missing-section');
        if (existing) existing.remove();

        if (!inventory) return;

        // Count instances per decoration id across all visible layers
        const grouped = new Map(); // numericId -> { name, count }
        for (const layer of visibleLayers) {
            const decorations = layer.getAllDecorations ? layer.getAllDecorations() : [];
            for (const dec of decorations) {
                const numericId = Number(dec.id);
                if (inventory.getCount(numericId) === 0) {
                    if (!grouped.has(numericId)) {
                        grouped.set(numericId, { name: dec.name, count: 0 });
                    }
                    grouped.get(numericId).count++;
                }
            }
        }

        if (grouped.size === 0) return;

        // Sort by name
        const missing = Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));

        const section = document.createElement('div');
        section.classList.add('decoration-report-dialog__missing-section');

        const heading = document.createElement('h3');
        heading.classList.add('decoration-report-dialog__missing-heading');
        heading.textContent = `Missing Decorations (${missing.length})`;
        section.appendChild(heading);

        const list = document.createElement('div');
        list.classList.add('decoration-report-dialog__missing-list');

        for (const { name, count } of missing) {
            const item = document.createElement('div');
            item.classList.add('decoration-report-dialog__missing-item');

            const nameSpan = document.createElement('span');
            nameSpan.classList.add('decoration-report-dialog__missing-name');
            nameSpan.textContent = name;

            const countSpan = document.createElement('span');
            countSpan.classList.add('decoration-report-dialog__missing-count');
            countSpan.textContent = `×${count}`;

            item.appendChild(nameSpan);
            item.appendChild(countSpan);
            list.appendChild(item);
        }

        section.appendChild(list);

        // Insert before the actions footer
        this._okBtn.parentElement.insertAdjacentElement('beforebegin', section);
    }

    /**
     * Close the dialog and resolve the pending Promise.
     * @private
     */
    _close() {
        if (typeof this._dialogEl.close === 'function') {
            this._dialogEl.close();
        } else {
            this._dialogEl.removeAttribute('open');
        }
        if (this._resolve) {
            this._resolve(undefined);
            this._resolve = null;
        }
    }
}
