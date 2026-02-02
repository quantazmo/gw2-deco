// @ts-nocheck
/**
 * Tests for DecorationInfoDialog component
 * Covers: show with decoration data, close on button click,
 * accessibility attributes, displays all decoration fields
 */
import { DecorationInfoDialog } from '../../../src/ui/components/DecorationInfoDialog.js';

function makeDecoration(overrides = {}) {
    return {
        id: '419',
        uid: '7',
        name: 'Oak Tree',
        position: { x: 1234.5, y: 6789.0, z: -42.0 },
        rotation: 90,
        rotX: 10,
        rotZ: 20,
        scale: 1.5,
        ...overrides
    };
}

describe('DecorationInfoDialog', () => {
    let dialog;

    beforeEach(() => {
        document.body.innerHTML = '';
        dialog = new DecorationInfoDialog();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('constructor', () => {
        test('should create a dialog element in the DOM', () => {
            const el = document.querySelector('dialog');
            expect(el).not.toBeNull();
        });

        test('should have role="dialog"', () => {
            const el = document.querySelector('dialog');
            expect(el.getAttribute('role')).toBe('dialog');
        });

        test('should have aria-modal="true"', () => {
            const el = document.querySelector('dialog');
            expect(el.getAttribute('aria-modal')).toBe('true');
        });

        test('should have decoration-info-dialog class', () => {
            const el = document.querySelector('dialog');
            expect(el.classList.contains('decoration-info-dialog')).toBe(true);
        });
    });

    describe('show', () => {
        test('should display the decoration name as the title', () => {
            const promise = dialog.show({ decoration: makeDecoration() });
            const titleEl = document.querySelector('.decoration-info-dialog__title');
            expect(titleEl.textContent).toBe('Oak Tree');
            const okBtn = document.querySelector('.decoration-info-dialog__ok');
            okBtn.click();
            return promise;
        });

        test('should display the type ID (id field)', () => {
            const promise = dialog.show({ decoration: makeDecoration({ id: '419' }) });
            const content = document.querySelector('.decoration-info-dialog__body').textContent;
            expect(content).toContain('419');
            const okBtn = document.querySelector('.decoration-info-dialog__ok');
            okBtn.click();
            return promise;
        });

        test('should display the instance UID', () => {
            const promise = dialog.show({ decoration: makeDecoration({ uid: '7' }) });
            const content = document.querySelector('.decoration-info-dialog__body').textContent;
            expect(content).toContain('7');
            const okBtn = document.querySelector('.decoration-info-dialog__ok');
            okBtn.click();
            return promise;
        });

        test('should display position x, y, z', () => {
            const promise = dialog.show({ decoration: makeDecoration({ position: { x: 1234.5, y: 6789.0, z: -42.0 } }) });
            const content = document.querySelector('.decoration-info-dialog__body').textContent;
            expect(content).toContain('1234.5');
            expect(content).toContain('6789');
            expect(content).toContain('-42');
            const okBtn = document.querySelector('.decoration-info-dialog__ok');
            okBtn.click();
            return promise;
        });

        test('should display rotation value', () => {
            const promise = dialog.show({ decoration: makeDecoration({ rotation: 90 }) });
            const content = document.querySelector('.decoration-info-dialog__body').textContent;
            expect(content).toContain('90');
            const okBtn = document.querySelector('.decoration-info-dialog__ok');
            okBtn.click();
            return promise;
        });

        test('should display rotX and rotZ values', () => {
            const promise = dialog.show({ decoration: makeDecoration({ rotX: 10, rotZ: 20 }) });
            const content = document.querySelector('.decoration-info-dialog__body').textContent;
            expect(content).toContain('10');
            expect(content).toContain('20');
            const okBtn = document.querySelector('.decoration-info-dialog__ok');
            okBtn.click();
            return promise;
        });

        test('should display scale value', () => {
            const promise = dialog.show({ decoration: makeDecoration({ scale: 1.5 }) });
            const content = document.querySelector('.decoration-info-dialog__body').textContent;
            expect(content).toContain('1.5');
            const okBtn = document.querySelector('.decoration-info-dialog__ok');
            okBtn.click();
            return promise;
        });

        test('should resolve when OK button is clicked', async () => {
            const promise = dialog.show({ decoration: makeDecoration() });
            const okBtn = document.querySelector('.decoration-info-dialog__ok');
            okBtn.click();
            const result = await promise;
            expect(result).toBeUndefined();
        });

        test('should close on Escape key (cancel event)', async () => {
            const promise = dialog.show({ decoration: makeDecoration() });
            const el = document.querySelector('dialog');
            el.dispatchEvent(new Event('cancel'));
            await promise;
        });

        test('should close when clicking the backdrop', async () => {
            const promise = dialog.show({ decoration: makeDecoration() });
            const el = document.querySelector('dialog');
            // Simulate clicking the dialog element itself (backdrop click)
            const clickEvent = new MouseEvent('click', { bubbles: false });
            Object.defineProperty(clickEvent, 'target', { value: el, writable: false });
            el.dispatchEvent(clickEvent);
            await promise;
        });
    });

    describe('layer name display', () => {
        test('should display layer name when provided', () => {
            const promise = dialog.show({ decoration: makeDecoration(), layerName: 'Background' });
            const content = document.querySelector('.decoration-info-dialog__body').textContent;
            expect(content).toContain('Background');
            const okBtn = document.querySelector('.decoration-info-dialog__ok');
            okBtn.click();
            return promise;
        });

        test('should not show layer name row when not provided', () => {
            const promise = dialog.show({ decoration: makeDecoration() });
            const rows = document.querySelectorAll('.decoration-info-dialog__row');
            const labels = Array.from(rows).map(r => r.querySelector('.decoration-info-dialog__label')?.textContent);
            expect(labels).not.toContain('Layer');
            const okBtn = document.querySelector('.decoration-info-dialog__ok');
            okBtn.click();
            return promise;
        });
    });
});
