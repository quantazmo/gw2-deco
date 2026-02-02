// @ts-nocheck
/**
 * Additional tests for ConfirmDialog — targeting uncovered branches.
 * Uncovered lines: 38 (showModal fallback), 114 (close fallback), 128-129 (destroy)
 */
import { ConfirmDialog } from '../../../src/ui/components/ConfirmDialog.js';

describe('ConfirmDialog — additional branch coverage', () => {

    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    // ─────────────────────────────────────────────────────────────────────────
    // show – when showModal IS a function (line 38): calls showModal
    // ─────────────────────────────────────────────────────────────────────────
    describe('show – showModal path', () => {
        test('calls showModal when it is a function', async () => {
            const dialog = new ConfirmDialog();
            const dialogEl = document.querySelector('dialog');

            // Make showModal a real function (jsdom may not implement it)
            const mockShowModal = vi.fn();
            Object.defineProperty(dialogEl, 'showModal', { value: mockShowModal, configurable: true, writable: true });

            const promise = dialog.show({ title: 'T', message: 'M' });
            expect(mockShowModal).toHaveBeenCalled();

            const cancelBtn = document.querySelector('.confirm-dialog__cancel');
            cancelBtn.click();
            await promise;
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // show – showModal fallback (setAttribute path): when showModal is absent
    // ─────────────────────────────────────────────────────────────────────────
    describe('show – showModal fallback', () => {
        test('falls back to setting open attribute when showModal is not a function', async () => {
            const dialog = new ConfirmDialog();
            const dialogEl = document.querySelector('dialog');

            // Remove showModal to trigger the fallback branch
            Object.defineProperty(dialogEl, 'showModal', { value: undefined, configurable: true, writable: true });

            const promise = dialog.show({ title: 'T', message: 'M' });
            expect(dialogEl.hasAttribute('open')).toBe(true);

            // Click cancel to resolve
            const cancelBtn = document.querySelector('.confirm-dialog__cancel');
            cancelBtn.click();
            await promise;
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // _close – when close IS a function (line 114): calls close
    // ─────────────────────────────────────────────────────────────────────────
    describe('_close – close path', () => {
        test('calls close when it is a function', async () => {
            const dialog = new ConfirmDialog();
            const dialogEl = document.querySelector('dialog');

            // Make both showModal and close be jest fns
            Object.defineProperty(dialogEl, 'showModal', { value: vi.fn(), configurable: true, writable: true });
            const mockClose = vi.fn();
            Object.defineProperty(dialogEl, 'close', { value: mockClose, configurable: true, writable: true });

            const promise = dialog.show({ title: 'T', message: 'M' });
            const cancelBtn = document.querySelector('.confirm-dialog__cancel');
            cancelBtn.click();
            await promise;

            expect(mockClose).toHaveBeenCalled();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // close fallback (removeAttribute path): when close is not a function
    // ─────────────────────────────────────────────────────────────────────────
    describe('_close – close fallback', () => {
        test('removes open attribute when close is not a function', async () => {
            const dialog = new ConfirmDialog();
            const dialogEl = document.querySelector('dialog');

            // Ensure close is not a function
            Object.defineProperty(dialogEl, 'close', { value: undefined, configurable: true, writable: true });

            const promise = dialog.show({ title: 'T', message: 'M' });
            const cancelBtn = document.querySelector('.confirm-dialog__cancel');
            cancelBtn.click();
            await promise;

            // After closing, the open attribute should be gone
            expect(dialogEl.hasAttribute('open')).toBe(false);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // destroy – removes dialog from DOM (lines 128-129)
    // ─────────────────────────────────────────────────────────────────────────
    describe('destroy', () => {
        test('removes the dialog element from its parent', () => {
            const dialog = new ConfirmDialog();
            expect(document.querySelector('dialog')).not.toBeNull();

            dialog.destroy();

            expect(document.querySelector('dialog')).toBeNull();
        });

        test('does not throw when called on already destroyed dialog', () => {
            const dialog = new ConfirmDialog();
            dialog.destroy();
            // Second call should be safe
            expect(() => dialog.destroy()).not.toThrow();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // _close – _resolve null guard
    // ─────────────────────────────────────────────────────────────────────────
    describe('_close – _resolve is null', () => {
        test('does not throw when _resolve has already been cleared', () => {
            const dialog = new ConfirmDialog();
            // _resolve is null before show() is called
            // Clicking confirm button should not throw
            dialog.show({ title: 'T', message: 'M' });
            const confirmBtn = document.querySelector('.confirm-dialog__confirm');
            confirmBtn.click();
            // Calling _close again when _resolve is already null
            expect(() => confirmBtn.click()).not.toThrow();
        });
    });
});
