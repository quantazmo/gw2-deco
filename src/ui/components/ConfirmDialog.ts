// @ts-nocheck
/**
 * ConfirmDialog Component
 * Modal confirmation dialog using native <dialog> element.
 * Promise-based API: show() returns a Promise that resolves to true (confirm) or false (cancel).
 * Cancel button focused by default for safe UX.
 * ARIA attributes for accessibility.
 */

let _instanceCount = 0;

export class ConfirmDialog {
    constructor(type) {
        _instanceCount++;
        this._id = `confirm-dialog-${_instanceCount}`;
        this._resolve = null;
        this._dialogEl = this._createDialogElement();
        if (type) {
            this._dialogEl.dataset.dialogType = type;
        }
        document.body.appendChild(this._dialogEl);
    }

    /**
     * Show the confirmation dialog.
     * @param {Object} options
     * @param {string} options.title - Dialog title text
     * @param {string} options.message - Dialog message/body text
     * @param {string} [options.confirmLabel='Confirm'] - Confirm button text
     * @param {string} [options.cancelLabel='Cancel'] - Cancel button text
     * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled
     */
    show({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel' }) {
        // Update content
        this._titleEl.textContent = title;
        this._messageEl.textContent = message;
        this._confirmBtn.textContent = confirmLabel;
        this._cancelBtn.textContent = cancelLabel;

        // Show as modal
        if (typeof this._dialogEl.showModal === 'function') {
            this._dialogEl.showModal();
        } else {
            // Fallback for environments without showModal (e.g. jsdom)
            this._dialogEl.setAttribute('open', '');
        }

        // Focus cancel button by default (safe choice)
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
        dialog.classList.add('confirm-dialog');
        dialog.setAttribute('role', 'alertdialog');
        dialog.setAttribute('aria-modal', 'true');

        const titleId = `${this._id}-title`;
        const messageId = `${this._id}-message`;

        dialog.setAttribute('aria-labelledby', titleId);
        dialog.setAttribute('aria-describedby', messageId);

        // Title
        this._titleEl = document.createElement('h2');
        this._titleEl.classList.add('confirm-dialog__title');
        this._titleEl.id = titleId;

        // Message
        this._messageEl = document.createElement('p');
        this._messageEl.classList.add('confirm-dialog__message');
        this._messageEl.id = messageId;

        // Actions container
        const actions = document.createElement('div');
        actions.classList.add('confirm-dialog__actions');

        // Cancel button (comes first in DOM for tab order, but visually can be second)
        this._cancelBtn = document.createElement('button');
        this._cancelBtn.type = 'button';
        this._cancelBtn.classList.add('confirm-dialog__cancel');
        this._cancelBtn.addEventListener('click', () => this._close(false));

        // Confirm button
        this._confirmBtn = document.createElement('button');
        this._confirmBtn.type = 'button';
        this._confirmBtn.classList.add('confirm-dialog__confirm');
        this._confirmBtn.addEventListener('click', () => this._close(true));

        actions.appendChild(this._cancelBtn);
        actions.appendChild(this._confirmBtn);

        dialog.appendChild(this._titleEl);
        dialog.appendChild(this._messageEl);
        dialog.appendChild(actions);

        // Handle native cancel (Escape key)
        dialog.addEventListener('cancel', (e) => {
            e.preventDefault();
            this._close(false);
        });

        return dialog;
    }

    /**
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

export default ConfirmDialog;
