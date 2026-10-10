/**
 * ConfirmDialog Component
 * Modal confirmation dialog using native <dialog> element.
 * Promise-based API: show() returns a Promise that resolves to true (confirm) or false (cancel).
 * Cancel button focused by default for safe UX.
 * ARIA attributes for accessibility.
 */

import { createElement } from "../domHelpers";

let _instanceCount = 0;

export class ConfirmDialog {
    _dialogEl: HTMLDialogElement;
    _titleEl!: HTMLHeadingElement;
    _messageEl!: HTMLParagraphElement;
    _confirmBtn!: HTMLButtonElement;
    _cancelBtn!: HTMLButtonElement;
    private _id: string;

    _resolve: ((value: boolean) => void) | null;

    constructor(type?: string) {
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
    show({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel' }: {
        title: string; message: string; confirmLabel?: string; cancelLabel?: string;
    }): Promise<boolean> {
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

        return new Promise<boolean>((resolve) => {
            this._resolve = resolve;
        });
    }

    private _createDialogElement(): HTMLDialogElement {
        const titleId = `${this._id}-title`;
        const messageId = `${this._id}-message`;

        const dialog = createElement('dialog', {
            className: 'confirm-dialog',
            attributes: {
                role: 'alertdialog',
                'aria-modal': 'true',
                'aria-labelledby': titleId,
                'aria-describedby': messageId
            },
            events: {
                // Handle native cancel (Escape key)
                cancel: (e) => {
                    e.preventDefault();
                    this._close(false);
                }
            }
        });

        // Title
        this._titleEl = createElement('h2', {
            className: 'confirm-dialog__title',
            id: titleId,
            parent: dialog
        });

        // Message
        this._messageEl = createElement('p', {
            className: 'confirm-dialog__message',
            id: messageId,
            parent: dialog
        });

        // Actions container
        const actions = createElement('div', {
            className: 'confirm-dialog__actions',
            parent: dialog
        });

        // Confirm button
        this._confirmBtn = createElement('button', {
            className: 'confirm-dialog__confirm',
            parent: actions,
            events: {
                click: () => this._close(true)
            }
        });

        // Cancel button
        this._cancelBtn = createElement('button', {
            className: 'confirm-dialog__cancel',
            parent: actions,
            events: {
                click: () => this._close(false)
            }
        });

        return dialog;
    }

    private _close(result: boolean): void {
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
    destroy(): void {
        if (this._dialogEl && this._dialogEl.parentNode) {
            this._dialogEl.parentNode.removeChild(this._dialogEl);
        }
    }
}

export default ConfirmDialog;
