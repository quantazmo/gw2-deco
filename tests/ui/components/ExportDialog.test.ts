// @ts-nocheck
/**
 * Tests for ExportDialog component
 * Covers US2 (pre-check, decoration count, confirm disabled) and US3 (cancel, Escape).
 */
import { ExportDialog } from '../../../src/ui/components/ExportDialog.js';
import { Layer } from '../../../src/domain/Layer.js';
import { Decoration } from '../../../src/domain/Decoration.js';
import { WorldCoordinate } from '../../../src/domain/WorldCoordinate.js';

function makeLayer(id, name, visible = true, decorationCount = 0) {
    const layer = new Layer(id, name);
    layer.isVisible = visible;
    for (let i = 0; i < decorationCount; i++) {
        const pos = new WorldCoordinate(i, i, 0, 0);
        layer.addDecoration(new Decoration(`${id}-d${i}`, `Dec ${i}`, pos));
    }
    return layer;
}

describe('ExportDialog', () => {
    let dialog;

    beforeEach(() => {
        document.body.innerHTML = '';
        dialog = new ExportDialog();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('constructor', () => {
        test('creates a dialog element in the DOM', () => {
            expect(document.querySelector('dialog.export-dialog')).not.toBeNull();
        });

        test('has role="dialog"', () => {
            const el = document.querySelector('dialog');
            expect(el.getAttribute('role')).toBe('dialog');
        });

        test('has aria-modal="true"', () => {
            const el = document.querySelector('dialog');
            expect(el.getAttribute('aria-modal')).toBe('true');
        });
    });

    describe('US2 — pre-check state from layer visibility', () => {
        test('visible layers are pre-checked', async () => {
            const layer = makeLayer('l1', 'Layer A', true);
            const promise = dialog.show([layer]);

            const checkbox = document.querySelector('.export-dialog__checkbox');
            expect(checkbox.checked).toBe(true);

            // cancel to resolve
            document.querySelector('.export-dialog__cancel').click();
            await promise;
        });

        test('hidden layers are pre-unchecked', async () => {
            const layer = makeLayer('l1', 'Layer A', false);
            const promise = dialog.show([layer]);

            const checkbox = document.querySelector('.export-dialog__checkbox');
            expect(checkbox.checked).toBe(false);

            document.querySelector('.export-dialog__cancel').click();
            await promise;
        });

        test('each layer gets its own checkbox row', async () => {
            const layers = [
                makeLayer('l1', 'Layer 1', true),
                makeLayer('l2', 'Layer 2', false),
                makeLayer('l3', 'Layer 3', true)
            ];
            const promise = dialog.show(layers);

            const checkboxes = document.querySelectorAll('.export-dialog__checkbox');
            expect(checkboxes.length).toBe(3);
            expect(checkboxes[0].checked).toBe(true);
            expect(checkboxes[1].checked).toBe(false);
            expect(checkboxes[2].checked).toBe(true);

            document.querySelector('.export-dialog__cancel').click();
            await promise;
        });

        test('toggling a checkbox does NOT change layer.isVisible', async () => {
            const layer = makeLayer('l1', 'Layer A', true);
            const promise = dialog.show([layer]);

            const checkbox = document.querySelector('.export-dialog__checkbox');
            checkbox.checked = false;
            checkbox.dispatchEvent(new Event('change'));

            expect(layer.isVisible).toBe(true); // unchanged

            document.querySelector('.export-dialog__cancel').click();
            await promise;
        });
    });

    describe('US2 — decoration count badge', () => {
        test('displays decoration count for each layer row', async () => {
            const layer = makeLayer('l1', 'My Layer', true, 5);
            const promise = dialog.show([layer]);

            const countEl = document.querySelector('.export-dialog__layer-count');
            expect(countEl.textContent).toBe('5 decorations');

            document.querySelector('.export-dialog__cancel').click();
            await promise;
        });

        test('displays "1 decoration" (singular) for one decoration', async () => {
            const layer = makeLayer('l1', 'My Layer', true, 1);
            const promise = dialog.show([layer]);

            const countEl = document.querySelector('.export-dialog__layer-count');
            expect(countEl.textContent).toBe('1 decoration');

            document.querySelector('.export-dialog__cancel').click();
            await promise;
        });

        test('displays "0 decorations" for an empty layer', async () => {
            const layer = makeLayer('l1', 'My Layer', true, 0);
            const promise = dialog.show([layer]);

            const countEl = document.querySelector('.export-dialog__layer-count');
            expect(countEl.textContent).toBe('0 decorations');

            document.querySelector('.export-dialog__cancel').click();
            await promise;
        });
    });

    describe('US2 — confirm button state', () => {
        test('Confirm is enabled when at least one layer is checked', async () => {
            const layer = makeLayer('l1', 'Layer A', true);
            const promise = dialog.show([layer]);

            const confirmBtn = document.querySelector('.export-dialog__confirm');
            expect(confirmBtn.disabled).toBe(false);

            document.querySelector('.export-dialog__cancel').click();
            await promise;
        });

        test('Confirm is disabled when all layers are unchecked', async () => {
            const layer = makeLayer('l1', 'Layer A', false);
            const promise = dialog.show([layer]);

            const confirmBtn = document.querySelector('.export-dialog__confirm');
            expect(confirmBtn.disabled).toBe(true);

            document.querySelector('.export-dialog__cancel').click();
            await promise;
        });

        test('explanatory message is shown when nothing is checked', async () => {
            const layer = makeLayer('l1', 'Layer A', false);
            const promise = dialog.show([layer]);

            const msg = document.querySelector('.export-dialog__empty-msg');
            expect(msg.hidden).toBe(false);

            document.querySelector('.export-dialog__cancel').click();
            await promise;
        });

        test('explanatory message is hidden when at least one layer is checked', async () => {
            const layer = makeLayer('l1', 'Layer A', true);
            const promise = dialog.show([layer]);

            const msg = document.querySelector('.export-dialog__empty-msg');
            expect(msg.hidden).toBe(true);

            document.querySelector('.export-dialog__cancel').click();
            await promise;
        });

        test('unchecking all layers disables Confirm', async () => {
            const layer = makeLayer('l1', 'Layer A', true);
            const promise = dialog.show([layer]);

            const checkbox = document.querySelector('.export-dialog__checkbox');
            checkbox.checked = false;
            checkbox.dispatchEvent(new Event('change'));

            const confirmBtn = document.querySelector('.export-dialog__confirm');
            expect(confirmBtn.disabled).toBe(true);

            document.querySelector('.export-dialog__cancel').click();
            await promise;
        });

        test('re-checking at least one layer re-enables Confirm', async () => {
            const layers = [
                makeLayer('l1', 'Layer 1', false),
                makeLayer('l2', 'Layer 2', false)
            ];
            const promise = dialog.show(layers);

            const checkboxes = document.querySelectorAll('.export-dialog__checkbox');
            checkboxes[0].checked = true;
            checkboxes[0].dispatchEvent(new Event('change'));

            const confirmBtn = document.querySelector('.export-dialog__confirm');
            expect(confirmBtn.disabled).toBe(false);

            document.querySelector('.export-dialog__cancel').click();
            await promise;
        });
    });

    describe('US2 — Confirm resolves with selected layer IDs', () => {
        test('resolves with IDs of checked layers', async () => {
            const layers = [
                makeLayer('l1', 'Layer 1', true),
                makeLayer('l2', 'Layer 2', false),
                makeLayer('l3', 'Layer 3', true)
            ];
            const promise = dialog.show(layers);

            document.querySelector('.export-dialog__confirm').click();
            const result = await promise;

            expect(result).toEqual(['l1', 'l3']);
        });

        test('resolves with all IDs when all are checked', async () => {
            const layers = [
                makeLayer('l1', 'Layer 1', true),
                makeLayer('l2', 'Layer 2', true)
            ];
            const promise = dialog.show(layers);

            document.querySelector('.export-dialog__confirm').click();
            const result = await promise;

            expect(result).toEqual(['l1', 'l2']);
        });
    });

    describe('US3 — Cancel without side effects', () => {
        test('Cancel button click resolves with null', async () => {
            const layer = makeLayer('l1', 'Layer A', true);
            const promise = dialog.show([layer]);

            document.querySelector('.export-dialog__cancel').click();
            const result = await promise;

            expect(result).toBeNull();
        });

        test('Escape key resolves with null (via cancel event)', async () => {
            const layer = makeLayer('l1', 'Layer A', true);
            const promise = dialog.show([layer]);

            const dialogEl = document.querySelector('dialog');
            dialogEl.dispatchEvent(new Event('cancel'));
            const result = await promise;

            expect(result).toBeNull();
        });

        test('layer.isVisible is unchanged after cancel', async () => {
            const layer1 = makeLayer('l1', 'Layer 1', true);
            const layer2 = makeLayer('l2', 'Layer 2', false);
            const promise = dialog.show([layer1, layer2]);

            document.querySelector('.export-dialog__cancel').click();
            await promise;

            expect(layer1.isVisible).toBe(true);
            expect(layer2.isVisible).toBe(false);
        });
    });
});
