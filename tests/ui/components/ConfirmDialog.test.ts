// @ts-nocheck
/**
 * Tests for ConfirmDialog component
 * Covers: show/resolve with confirm, show/resolve with cancel,
 * cancel-focused-by-default, accessibility attributes
 */
import { ConfirmDialog } from '../../../src/ui/components/ConfirmDialog.js';

describe('ConfirmDialog', () => {

    let dialog;

    beforeEach(() => {
        document.body.innerHTML = '';
        dialog = new ConfirmDialog();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('constructor', () => {
        test('should create a dialog element in the DOM', () => {
            const el = document.querySelector('dialog');
            expect(el).not.toBeNull();
        });

        test('should have role="alertdialog"', () => {
            const el = document.querySelector('dialog');
            expect(el.getAttribute('role')).toBe('alertdialog');
        });

        test('should have aria-modal="true"', () => {
            const el = document.querySelector('dialog');
            expect(el.getAttribute('aria-modal')).toBe('true');
        });

        test('should have confirm-dialog class', () => {
            const el = document.querySelector('dialog');
            expect(el.classList.contains('confirm-dialog')).toBe(true);
        });
    });

    describe('show', () => {
        test('should display the dialog with provided title and message', async () => {
            // Don't await — we'll resolve it manually
            const promise = dialog.show({
                title: 'Switch Map?',
                message: 'All layers will be removed.',
                confirmLabel: 'Switch',
                cancelLabel: 'Cancel'
            });

            const titleEl = document.querySelector('.confirm-dialog__title');
            const messageEl = document.querySelector('.confirm-dialog__message');
            expect(titleEl.textContent).toBe('Switch Map?');
            expect(messageEl.textContent).toBe('All layers will be removed.');

            // Click cancel to resolve
            const cancelBtn = document.querySelector('.confirm-dialog__cancel');
            cancelBtn.click();
            const result = await promise;
            expect(result).toBe(false);
        });

        test('should use custom button labels', async () => {
            const promise = dialog.show({
                title: 'Test',
                message: 'Test message',
                confirmLabel: 'Yes, Switch',
                cancelLabel: 'No, Keep'
            });

            const confirmBtn = document.querySelector('.confirm-dialog__confirm');
            const cancelBtn = document.querySelector('.confirm-dialog__cancel');
            expect(confirmBtn.textContent).toBe('Yes, Switch');
            expect(cancelBtn.textContent).toBe('No, Keep');

            cancelBtn.click();
            await promise;
        });

        test('should use default labels when none provided', async () => {
            const promise = dialog.show({
                title: 'Test',
                message: 'Msg'
            });

            const confirmBtn = document.querySelector('.confirm-dialog__confirm');
            const cancelBtn = document.querySelector('.confirm-dialog__cancel');
            expect(confirmBtn.textContent).toBe('Confirm');
            expect(cancelBtn.textContent).toBe('Cancel');

            cancelBtn.click();
            await promise;
        });
    });

    describe('resolve with confirm', () => {
        test('should resolve with true when confirm is clicked', async () => {
            const promise = dialog.show({
                title: 'Switch?',
                message: 'Switch map?'
            });

            const confirmBtn = document.querySelector('.confirm-dialog__confirm');
            confirmBtn.click();

            const result = await promise;
            expect(result).toBe(true);
        });

        test('should close the dialog after confirm', async () => {
            const promise = dialog.show({
                title: 'Test',
                message: 'Test'
            });

            const confirmBtn = document.querySelector('.confirm-dialog__confirm');
            confirmBtn.click();
            await promise;

            const el = document.querySelector('dialog');
            expect(el.open).toBe(false);
        });
    });

    describe('resolve with cancel', () => {
        test('should resolve with false when cancel is clicked', async () => {
            const promise = dialog.show({
                title: 'Switch?',
                message: 'Switch map?'
            });

            const cancelBtn = document.querySelector('.confirm-dialog__cancel');
            cancelBtn.click();

            const result = await promise;
            expect(result).toBe(false);
        });

        test('should close the dialog after cancel', async () => {
            const promise = dialog.show({
                title: 'Test',
                message: 'Test'
            });

            const cancelBtn = document.querySelector('.confirm-dialog__cancel');
            cancelBtn.click();
            await promise;

            const el = document.querySelector('dialog');
            expect(el.open).toBe(false);
        });

        test('should resolve with false on native dialog cancel (Escape key)', async () => {
            const promise = dialog.show({
                title: 'Test',
                message: 'Test'
            });

            const el = document.querySelector('dialog');
            // Dispatch the cancel event (native dialog Escape behavior)
            el.dispatchEvent(new Event('cancel'));

            const result = await promise;
            expect(result).toBe(false);
        });
    });

    describe('cancel-focused-by-default', () => {
        test('should focus the cancel button when shown', async () => {
            const promise = dialog.show({
                title: 'Test',
                message: 'Test'
            });

            const cancelBtn = document.querySelector('.confirm-dialog__cancel');
            expect(document.activeElement).toBe(cancelBtn);

            cancelBtn.click();
            await promise;
        });
    });

    describe('accessibility attributes', () => {
        test('should have aria-labelledby pointing to title', async () => {
            const promise = dialog.show({
                title: 'Switch Map?',
                message: 'All layers will be removed.'
            });

            const el = document.querySelector('dialog');
            const titleEl = document.querySelector('.confirm-dialog__title');
            expect(el.getAttribute('aria-labelledby')).toBe(titleEl.id);

            const cancelBtn = document.querySelector('.confirm-dialog__cancel');
            cancelBtn.click();
            await promise;
        });

        test('should have aria-describedby pointing to message', async () => {
            const promise = dialog.show({
                title: 'Test',
                message: 'Info message'
            });

            const el = document.querySelector('dialog');
            const messageEl = document.querySelector('.confirm-dialog__message');
            expect(el.getAttribute('aria-describedby')).toBe(messageEl.id);

            const cancelBtn = document.querySelector('.confirm-dialog__cancel');
            cancelBtn.click();
            await promise;
        });

        test('confirm button should have appropriate type', async () => {
            const promise = dialog.show({
                title: 'Test',
                message: 'Test'
            });

            const confirmBtn = document.querySelector('.confirm-dialog__confirm');
            expect(confirmBtn.type).toBe('button');

            const cancelBtn = document.querySelector('.confirm-dialog__cancel');
            cancelBtn.click();
            await promise;
        });

        test('cancel button should have appropriate type', async () => {
            const promise = dialog.show({
                title: 'Test',
                message: 'Test'
            });

            const cancelBtn = document.querySelector('.confirm-dialog__cancel');
            expect(cancelBtn.type).toBe('button');

            cancelBtn.click();
            await promise;
        });
    });

    describe('reuse', () => {
        test('should be reusable for multiple show calls', async () => {
            // First show
            const p1 = dialog.show({ title: 'First', message: 'First msg' });
            document.querySelector('.confirm-dialog__confirm').click();
            const r1 = await p1;
            expect(r1).toBe(true);

            // Second show
            const p2 = dialog.show({ title: 'Second', message: 'Second msg' });
            expect(document.querySelector('.confirm-dialog__title').textContent).toBe('Second');
            document.querySelector('.confirm-dialog__cancel').click();
            const r2 = await p2;
            expect(r2).toBe(false);
        });
    });
});
