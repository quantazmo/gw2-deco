/**
 * LoadFromUrlDialog Component
 * Modal dialog for loading a layout from a URL.
 * Provides a dropdown of built-in sample files (populated at build time via
 * __SAMPLE_FILES__) and a free-text URL input.
 * Selecting a sample pre-fills the URL input.
 * Promise-based API: show() resolves with the entered URL string, or null on cancel.
 */

declare const __SAMPLE_FILES__: { path: string; mapName: string | null }[];

let _instanceCount = 0;

export class LoadFromUrlDialog {
    private _id: string;
    private _resolve: ((result: string | null) => void) | null;
    private _dialogEl: HTMLDialogElement;
    private _urlInput!: HTMLInputElement;
    private _cancelBtn!: HTMLButtonElement;
    private _loadBtn!: HTMLButtonElement;
    private _sampleFilterInput: HTMLInputElement | null = null;
    private _sampleFilterClearBtn: HTMLButtonElement | null = null;
    private _sampleList: HTMLUListElement | null = null;
    private _sampleItems: Array<{ name: string; url: string }> = [];
    private _renderSampleList: (filter: string) => void = () => { };

    constructor() {
        _instanceCount++;
        this._id = `load-from-url-dialog-${_instanceCount}`;
        this._resolve = null;
        this._dialogEl = this._createDialogElement();
        document.body.appendChild(this._dialogEl);
    }

    /**
     * Show the dialog.
     * @returns {Promise<string | null>} Resolves with the URL to load, or null if cancelled.
     */
    show(): Promise<string | null> {
        this._urlInput.value = '';
        // Clear sample filter and deselect any selected item
        if (this._sampleFilterInput) {
            this._sampleFilterInput.value = '';
            if (this._sampleFilterClearBtn) this._sampleFilterClearBtn.style.display = 'none';
            this._renderSampleList('');
        }
        this._updateLoadState();

        if (typeof this._dialogEl.showModal === 'function') {
            this._dialogEl.showModal();
        } else {
            this._dialogEl.setAttribute('open', '');
        }

        this._urlInput.focus();

        return new Promise((resolve) => {
            this._resolve = resolve;
        });
    }

    /**
     * Remove the dialog element from the DOM.
     */
    destroy(): void {
        if (this._dialogEl && this._dialogEl.parentNode) {
            this._dialogEl.parentNode.removeChild(this._dialogEl);
        }
    }

    // ── private ──────────────────────────────────────────────────────────────

    _createDialogElement(): HTMLDialogElement {
        const dialog = document.createElement('dialog');
        dialog.classList.add('load-url-dialog');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');

        const titleId = `${this._id}-title`;
        const descId = `${this._id}-desc`;
        dialog.setAttribute('aria-labelledby', titleId);
        dialog.setAttribute('aria-describedby', descId);

        // Title
        const titleEl = document.createElement('h2');
        titleEl.classList.add('load-url-dialog__title');
        titleEl.id = titleId;
        titleEl.textContent = 'Load Layout from URL';

        // Description
        const descEl = document.createElement('p');
        descEl.classList.add('load-url-dialog__desc');
        descEl.id = descId;
        descEl.textContent = 'Enter a URL or choose a sample layout to load.';

        // Body
        const body = document.createElement('div');
        body.classList.add('load-url-dialog__body');

        // Sample filter input + list (only shown when samples are available)
        const sampleFiles: { path: string; mapName: string | null }[] = typeof __SAMPLE_FILES__ !== 'undefined' ? __SAMPLE_FILES__ : [];

        if (sampleFiles.length > 0) {
            const sampleGroup = document.createElement('div');
            sampleGroup.classList.add('load-url-dialog__field-group');

            const sampleLabel = document.createElement('label');
            sampleLabel.classList.add('load-url-dialog__label');
            sampleLabel.setAttribute('for', `${this._id}-sample-filter`);
            sampleLabel.textContent = 'Sample layouts';

            // Filter input wrapper (mirrors decoration search bar)
            const filterWrapper = document.createElement('div');
            filterWrapper.classList.add('load-url-dialog__sample-filter-wrapper');

            const sampleFilterInput = document.createElement('input');
            this._sampleFilterInput = sampleFilterInput;
            sampleFilterInput.type = 'text';
            sampleFilterInput.classList.add('load-url-dialog__sample-filter');
            sampleFilterInput.id = `${this._id}-sample-filter`;
            sampleFilterInput.placeholder = 'Filter samples…';
            sampleFilterInput.setAttribute('aria-label', 'Filter sample layouts');

            const sampleFilterClearBtn = document.createElement('button');
            this._sampleFilterClearBtn = sampleFilterClearBtn;
            sampleFilterClearBtn.type = 'button';
            sampleFilterClearBtn.classList.add('load-url-dialog__sample-clear');
            sampleFilterClearBtn.title = 'Clear filter';
            sampleFilterClearBtn.setAttribute('aria-label', 'Clear filter');
            sampleFilterClearBtn.textContent = '×';
            sampleFilterClearBtn.style.display = 'none';

            filterWrapper.appendChild(sampleFilterInput);
            filterWrapper.appendChild(sampleFilterClearBtn);

            // Build item data
            const base = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '');
            this._sampleItems = sampleFiles.map(({ path: filePath, mapName }) => {
                const fileName = (filePath.split('/').pop() ?? filePath).replace(/\.xml$/i, '');
                const name = mapName ? `${fileName} — ${mapName}` : fileName;
                return { name, url: base + filePath };
            });

            // Scrollable sample list
            const sampleList = document.createElement('ul');
            this._sampleList = sampleList;
            sampleList.classList.add('load-url-dialog__sample-list');
            sampleList.setAttribute('role', 'listbox');
            sampleList.setAttribute('aria-label', 'Sample layouts');

            this._renderSampleList = (filter: string) => {
                sampleList.innerHTML = '';
                const lowerFilter = filter.toLowerCase();
                const filtered = filter
                    ? this._sampleItems.filter(item => item.name.toLowerCase().includes(lowerFilter))
                    : this._sampleItems;
                for (const item of filtered) {
                    const li = document.createElement('li');
                    li.classList.add('load-url-dialog__sample-item');
                    li.setAttribute('role', 'option');
                    li.textContent = item.name;
                    li.addEventListener('click', () => {
                        const prev = sampleList.querySelector('.load-url-dialog__sample-item--selected');
                        if (prev) prev.classList.remove('load-url-dialog__sample-item--selected');
                        li.classList.add('load-url-dialog__sample-item--selected');
                        this._urlInput.value = item.url;
                        this._updateLoadState();
                    });
                    sampleList.appendChild(li);
                }
            };
            this._renderSampleList('');

            let _filterDebounce: ReturnType<typeof setTimeout> | null = null;
            sampleFilterInput.addEventListener('input', () => {
                const val = sampleFilterInput.value;
                sampleFilterClearBtn.style.display = val ? '' : 'none';
                if (_filterDebounce !== null) clearTimeout(_filterDebounce);
                _filterDebounce = setTimeout(() => {
                    _filterDebounce = null;
                    this._renderSampleList(val);
                }, 200);
            });

            sampleFilterClearBtn.addEventListener('click', () => {
                sampleFilterInput.value = '';
                sampleFilterClearBtn.style.display = 'none';
                if (_filterDebounce !== null) {
                    clearTimeout(_filterDebounce);
                    _filterDebounce = null;
                }
                this._renderSampleList('');
                sampleFilterInput.focus();
            });

            sampleGroup.appendChild(sampleLabel);
            sampleGroup.appendChild(filterWrapper);
            sampleGroup.appendChild(sampleList);
            body.appendChild(sampleGroup);
        } else {
            this._sampleFilterInput = null;
            this._sampleFilterClearBtn = null;
            this._sampleList = null;
            this._sampleItems = [];
            this._renderSampleList = () => { };
        }

        // URL input
        const urlGroup = document.createElement('div');
        urlGroup.classList.add('load-url-dialog__field-group');

        const urlLabel = document.createElement('label');
        urlLabel.classList.add('load-url-dialog__label');
        urlLabel.setAttribute('for', `${this._id}-url`);
        urlLabel.textContent = 'URL';

        this._urlInput = document.createElement('input');
        this._urlInput.type = 'text';
        this._urlInput.classList.add('load-url-dialog__input');
        this._urlInput.id = `${this._id}-url`;
        this._urlInput.placeholder = 'https://example.com/layout.xml';
        this._urlInput.setAttribute('autocomplete', 'url');
        this._urlInput.setAttribute('spellcheck', 'false');

        this._urlInput.addEventListener('input', () => {
            // Deselect sample item if user manually edits the URL
            if (this._sampleList) {
                const sel = this._sampleList.querySelector<HTMLElement>('.load-url-dialog__sample-item--selected');
                if (sel && this._urlInput.value !== sel.dataset?.url) {
                    sel.classList.remove('load-url-dialog__sample-item--selected');
                }
            }
            this._updateLoadState();
        });

        this._urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !this._loadBtn.disabled) {
                this._submit();
            }
        });

        urlGroup.appendChild(urlLabel);
        urlGroup.appendChild(this._urlInput);
        body.appendChild(urlGroup);

        // Actions
        const actions = document.createElement('div');
        actions.classList.add('load-url-dialog__actions');

        this._cancelBtn = document.createElement('button');
        this._cancelBtn.type = 'button';
        this._cancelBtn.classList.add('load-url-dialog__cancel');
        this._cancelBtn.textContent = 'Cancel';
        this._cancelBtn.addEventListener('click', () => this._close(null));

        this._loadBtn = document.createElement('button');
        this._loadBtn.type = 'button';
        this._loadBtn.classList.add('load-url-dialog__load');
        this._loadBtn.textContent = 'Load';
        this._loadBtn.disabled = true;
        this._loadBtn.addEventListener('click', () => this._submit());

        actions.appendChild(this._loadBtn);
        actions.appendChild(this._cancelBtn);

        dialog.appendChild(titleEl);
        dialog.appendChild(descEl);
        dialog.appendChild(body);
        dialog.appendChild(actions);

        dialog.addEventListener('cancel', (e) => {
            e.preventDefault();
            this._close(null);
        });

        return dialog;
    }

    _updateLoadState(): void {
        const url = this._urlInput?.value?.trim() ?? '';
        this._loadBtn.disabled = url.length === 0;
    }

    _submit(): void {
        const url = this._urlInput.value.trim();
        if (url) {
            this._close(url);
        }
    }

    _close(result: string | null): void {
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

export default LoadFromUrlDialog;
