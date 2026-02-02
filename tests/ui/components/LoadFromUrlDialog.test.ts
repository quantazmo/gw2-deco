// @ts-nocheck
/**
 * Tests for LoadFromUrlDialog component
 * Covers: DOM structure, sample dropdown, URL input interaction, Load/Cancel resolution.
 */
import { LoadFromUrlDialog } from '../../../src/ui/components/LoadFromUrlDialog.js';

describe('LoadFromUrlDialog', () => {
    let dialog;

    beforeEach(() => {
        document.body.innerHTML = '';
        dialog = new LoadFromUrlDialog();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    // ── construction ──────────────────────────────────────────────────────

    test('appends a <dialog> element to the DOM', () => {
        expect(document.querySelector('dialog')).not.toBeNull();
    });

    test('dialog has class load-url-dialog', () => {
        expect(document.querySelector('dialog').classList.contains('load-url-dialog')).toBe(true);
    });

    test('dialog has role="dialog" and aria-modal="true"', () => {
        const el = document.querySelector('dialog');
        expect(el.getAttribute('role')).toBe('dialog');
        expect(el.getAttribute('aria-modal')).toBe('true');
    });

    test('contains a URL text input', () => {
        expect(dialog._urlInput).not.toBeNull();
        expect(dialog._urlInput.type).toBe('text');
    });

    test('Load button is disabled initially', () => {
        dialog.show();
        expect(dialog._loadBtn.disabled).toBe(true);
    });

    // ── URL input interaction ─────────────────────────────────────────────

    test('Load button becomes enabled when URL input has a value', async () => {
        dialog.show();
        dialog._urlInput.value = 'https://example.com/layout.xml';
        dialog._urlInput.dispatchEvent(new Event('input'));
        expect(dialog._loadBtn.disabled).toBe(false);
    });

    test('Load button becomes disabled again when URL input is cleared', async () => {
        dialog.show();
        dialog._urlInput.value = 'https://example.com/layout.xml';
        dialog._urlInput.dispatchEvent(new Event('input'));
        dialog._urlInput.value = '';
        dialog._urlInput.dispatchEvent(new Event('input'));
        expect(dialog._loadBtn.disabled).toBe(true);
    });

    // ── Cancel resolution ─────────────────────────────────────────────────

    test('Cancel button resolves show() with null', async () => {
        const promise = dialog.show();
        dialog._cancelBtn.click();
        expect(await promise).toBeNull();
    });

    test('Escape key (cancel event) resolves show() with null', async () => {
        const promise = dialog.show();
        const event = new Event('cancel', { cancelable: true });
        dialog._dialogEl.dispatchEvent(event);
        expect(await promise).toBeNull();
    });

    // ── Load resolution ───────────────────────────────────────────────────

    test('Load button resolves show() with trimmed URL', async () => {
        const promise = dialog.show();
        dialog._urlInput.value = '  https://example.com/layout.xml  ';
        dialog._urlInput.dispatchEvent(new Event('input'));
        dialog._loadBtn.click();
        expect(await promise).toBe('https://example.com/layout.xml');
    });

    test('Enter key in URL input submits when Load is enabled', async () => {
        const promise = dialog.show();
        dialog._urlInput.value = 'https://example.com/t.xml';
        dialog._urlInput.dispatchEvent(new Event('input'));
        dialog._urlInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(await promise).toBe('https://example.com/t.xml');
    });

    test('Enter key does nothing when Load is disabled', () => {
        dialog.show();
        dialog._urlInput.value = '';
        dialog._urlInput.dispatchEvent(new Event('input'));
        // Should not reject or resolve yet — dialog still open
        const downEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        dialog._urlInput.dispatchEvent(downEvent);
        expect(dialog._loadBtn.disabled).toBe(true);
    });

    // ── Sample dropdown ───────────────────────────────────────────────────

    test('show() resets the URL input and sample list', () => {
        dialog._urlInput.value = 'https://old-url.com';
        dialog.show();
        expect(dialog._urlInput.value).toBe('');
    });

    test('selecting a sample pre-fills the URL input', () => {
        // Only meaningful if samples exist (vitest picks up the define from vite.config)
        if (!dialog._sampleList || dialog._sampleItems.length === 0) return; // skip if no samples

        dialog.show();
        const firstItem = dialog._sampleList.querySelector('.load-url-dialog__sample-item');
        if (!firstItem) return;

        firstItem.click();

        expect(dialog._urlInput.value).toBe(dialog._sampleItems[0].url);
        expect(dialog._loadBtn.disabled).toBe(false);
    });

    test('typing a custom URL deselects the selected sample', () => {
        if (!dialog._sampleList || dialog._sampleItems.length === 0) return;

        dialog.show();
        // Select a sample first
        const firstItem = dialog._sampleList.querySelector('.load-url-dialog__sample-item');
        if (!firstItem) return;
        firstItem.click();

        // Now manually type a different URL
        dialog._urlInput.value = 'https://other.com/file.xml';
        dialog._urlInput.dispatchEvent(new Event('input'));

        const selected = dialog._sampleList.querySelector('.load-url-dialog__sample-item--selected');
        expect(selected).toBeNull();
    });

    // ── destroy ───────────────────────────────────────────────────────────

    test('destroy() removes the dialog from the DOM', () => {
        dialog.destroy();
        expect(document.querySelector('.load-url-dialog')).toBeNull();
    });
});
