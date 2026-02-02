// @ts-nocheck
/**
 * Tests for DecorationReportDialog component
 * Covers: dialog structure, visible-only layer filtering, decoration counts, OK button closes.
 */
import { DecorationReportDialog } from '../../../src/ui/components/DecorationReportDialog.js';

function makeLayer(id, name, isVisible, decorations) {
    // decorations can be a count (number) or an array of { id, name } objects
    let decorationList;
    if (typeof decorations === 'number') {
        decorationList = [];
        for (let i = 0; i < decorations; i++) {
            decorationList.push({ id: `${id}-d${i}`, name: `Decoration ${i}` });
        }
    } else {
        decorationList = decorations;
    }
    return {
        id,
        name,
        isVisible,
        getAllDecorations: () => decorationList,
    };
}

function makeInventory(entries) {
    // entries: Array<{ id: number, count: number }>
    return {
        getCount: (id) => {
            const entry = entries.find(e => e.id === Number(id));
            return entry ? entry.count : 0;
        }
    };
}

describe('DecorationReportDialog', () => {
    let dialog;

    beforeEach(() => {
        document.body.innerHTML = '';
        dialog = new DecorationReportDialog();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    // ── constructor ──────────────────────────────────────────────────────────

    describe('constructor', () => {
        test('appends a <dialog> element to the DOM', () => {
            expect(document.querySelector('dialog.decoration-report-dialog')).not.toBeNull();
        });

        test('dialog has role="dialog"', () => {
            const el = document.querySelector('dialog.decoration-report-dialog');
            expect(el.getAttribute('role')).toBe('dialog');
        });

        test('dialog has aria-modal="true"', () => {
            const el = document.querySelector('dialog.decoration-report-dialog');
            expect(el.getAttribute('aria-modal')).toBe('true');
        });
    });

    // ── show() ───────────────────────────────────────────────────────────────

    describe('show()', () => {
        test('returns a Promise', () => {
            const layers = [makeLayer('l1', 'Layer 1', true, 3)];
            const result = dialog.show('Gilded Hollow', layers);
            expect(result).toBeInstanceOf(Promise);
            // cleanup
            document.querySelector('.decoration-report-dialog__ok').click();
            return result;
        });

        test('displays the map name in the dialog', async () => {
            const layers = [makeLayer('l1', 'Layer 1', true, 2)];
            const p = dialog.show('Gilded Hollow', layers);
            const mapEl = document.querySelector('.decoration-report-dialog__map-name');
            expect(mapEl).not.toBeNull();
            expect(mapEl.textContent).toContain('Gilded Hollow');
            document.querySelector('.decoration-report-dialog__ok').click();
            await p;
        });

        test('lists only visible layers', async () => {
            const layers = [
                makeLayer('l1', 'Visible Layer', true, 5),
                makeLayer('l2', 'Hidden Layer', false, 3),
                makeLayer('l3', 'Also Visible', true, 1),
            ];
            const p = dialog.show('Windswept Haven', layers);
            const rows = document.querySelectorAll('.decoration-report-dialog__layer-row');
            expect(rows.length).toBe(2);
            document.querySelector('.decoration-report-dialog__ok').click();
            await p;
        });

        test('shows correct decoration count for each visible layer', async () => {
            const layers = [
                makeLayer('l1', 'Alpha', true, 7),
                makeLayer('l2', 'Beta', true, 0),
            ];
            const p = dialog.show('Gilded Hollow', layers);
            const rows = document.querySelectorAll('.decoration-report-dialog__layer-row');
            expect(rows[0].textContent).toContain('Alpha');
            expect(rows[0].textContent).toContain('7');
            expect(rows[1].textContent).toContain('Beta');
            expect(rows[1].textContent).toContain('0');
            document.querySelector('.decoration-report-dialog__ok').click();
            await p;
        });

        test('uses singular "decoration" for count of 1', async () => {
            const layers = [makeLayer('l1', 'Solo', true, 1)];
            const p = dialog.show('Gilded Hollow', layers);
            const row = document.querySelector('.decoration-report-dialog__layer-row');
            expect(row.textContent).toContain('1 decoration');
            document.querySelector('.decoration-report-dialog__ok').click();
            await p;
        });

        test('uses plural "decorations" for count of 0', async () => {
            const layers = [makeLayer('l1', 'Empty', true, 0)];
            const p = dialog.show('Gilded Hollow', layers);
            const row = document.querySelector('.decoration-report-dialog__layer-row');
            expect(row.textContent).toContain('0 decorations');
            document.querySelector('.decoration-report-dialog__ok').click();
            await p;
        });

        test('uses plural "decorations" for count > 1', async () => {
            const layers = [makeLayer('l1', 'Many', true, 5)];
            const p = dialog.show('Gilded Hollow', layers);
            const row = document.querySelector('.decoration-report-dialog__layer-row');
            expect(row.textContent).toContain('5 decorations');
            document.querySelector('.decoration-report-dialog__ok').click();
            await p;
        });

        test('shows message when no visible layers', async () => {
            const layers = [makeLayer('l1', 'Hidden', false, 3)];
            const p = dialog.show('Gilded Hollow', layers);
            const emptyMsg = document.querySelector('.decoration-report-dialog__empty-msg');
            expect(emptyMsg).not.toBeNull();
            expect(emptyMsg.hidden).toBe(false);
            const rows = document.querySelectorAll('.decoration-report-dialog__layer-row');
            expect(rows.length).toBe(0);
            document.querySelector('.decoration-report-dialog__ok').click();
            await p;
        });

        test('hides empty message when there are visible layers', async () => {
            const layers = [makeLayer('l1', 'Visible', true, 2)];
            const p = dialog.show('Gilded Hollow', layers);
            const emptyMsg = document.querySelector('.decoration-report-dialog__empty-msg');
            expect(emptyMsg.hidden).toBe(true);
            document.querySelector('.decoration-report-dialog__ok').click();
            await p;
        });
    });

    // ── OK button ────────────────────────────────────────────────────────────

    describe('OK button', () => {
        test('OK button is present in the dialog', async () => {
            const p = dialog.show('Gilded Hollow', []);
            const okBtn = document.querySelector('.decoration-report-dialog__ok');
            expect(okBtn).not.toBeNull();
            okBtn.click();
            await p;
        });

        test('OK button resolves the Promise', async () => {
            const p = dialog.show('Gilded Hollow', []);
            document.querySelector('.decoration-report-dialog__ok').click();
            await expect(p).resolves.toBeUndefined();
        });

        test('OK button closes the dialog', async () => {
            const p = dialog.show('Gilded Hollow', []);
            const el = document.querySelector('dialog.decoration-report-dialog');
            // jsdom may not implement dialog.close(); polyfill for the test
            if (!el.close) el.close = vi.fn();
            else vi.spyOn(el, 'close');
            document.querySelector('.decoration-report-dialog__ok').click();
            await p;
            // Either close() was called or the open attribute was removed
            const wasClosed = typeof el.close === 'function'
                ? (el.close.mock?.calls.length > 0 || !el.hasAttribute('open'))
                : !el.hasAttribute('open');
            expect(wasClosed).toBe(true);
        });
    });

    // ── title ────────────────────────────────────────────────────────────────

    describe('title', () => {
        test('dialog has a title element with "Decoration Report" text', async () => {
            const p = dialog.show('Gilded Hollow', []);
            const title = document.querySelector('.decoration-report-dialog__title');
            expect(title).not.toBeNull();
            expect(title.textContent).toBe('Decoration Report');
            document.querySelector('.decoration-report-dialog__ok').click();
            await p;
        });
    });

    // ── missing decorations ──────────────────────────────────────────────────

    describe('missing decorations (account inventory)', () => {
        test('renders no missing section when no inventory is provided', async () => {
            const layers = [makeLayer('l1', 'Layer 1', true, [{ id: '35', name: 'Pot' }])];
            const p = dialog.show('Gilded Hollow', layers);
            const section = document.querySelector('.decoration-report-dialog__missing-section');
            expect(section).toBeNull();
            document.querySelector('.decoration-report-dialog__ok').click();
            await p;
        });

        test('renders no missing section when all visible decorations are owned', async () => {
            const layers = [makeLayer('l1', 'Layer 1', true, [{ id: '35', name: 'Pot' }])];
            const inventory = makeInventory([{ id: 35, count: 5 }]);
            const p = dialog.show('Gilded Hollow', layers, inventory);
            const section = document.querySelector('.decoration-report-dialog__missing-section');
            expect(section).toBeNull();
            document.querySelector('.decoration-report-dialog__ok').click();
            await p;
        });

        test('renders a missing section when some visible decorations have count 0', async () => {
            const layers = [
                makeLayer('l1', 'Layer 1', true, [
                    { id: '35', name: 'Pot' },
                    { id: '70', name: 'Bench' },
                ]),
            ];
            const inventory = makeInventory([{ id: 35, count: 5 }]); // 70 is missing
            const p = dialog.show('Gilded Hollow', layers, inventory);
            const section = document.querySelector('.decoration-report-dialog__missing-section');
            expect(section).not.toBeNull();
            document.querySelector('.decoration-report-dialog__ok').click();
            await p;
        });

        test('lists each missing decoration by name', async () => {
            const layers = [
                makeLayer('l1', 'Layer 1', true, [
                    { id: '35', name: 'Pot' },
                    { id: '70', name: 'Bench' },
                ]),
            ];
            const inventory = makeInventory([{ id: 35, count: 5 }]); // 70 missing
            const p = dialog.show('Gilded Hollow', layers, inventory);
            const items = document.querySelectorAll('.decoration-report-dialog__missing-item');
            expect(items.length).toBe(1);
            expect(items[0].textContent).toContain('Bench');
            document.querySelector('.decoration-report-dialog__ok').click();
            await p;
        });

        test('deduplicates missing decorations by id across layers', async () => {
            const layers = [
                makeLayer('l1', 'Layer 1', true, [{ id: '70', name: 'Bench' }]),
                makeLayer('l2', 'Layer 2', true, [{ id: '70', name: 'Bench' }]),
            ];
            const inventory = makeInventory([]); // nothing owned
            const p = dialog.show('Gilded Hollow', layers, inventory);
            const items = document.querySelectorAll('.decoration-report-dialog__missing-item');
            expect(items.length).toBe(1);
            document.querySelector('.decoration-report-dialog__ok').click();
            await p;
        });

        test('ignores decorations from hidden layers when computing missing', async () => {
            const layers = [
                makeLayer('l1', 'Visible', true, [{ id: '35', name: 'Pot' }]),
                makeLayer('l2', 'Hidden', false, [{ id: '70', name: 'Bench' }]),
            ];
            const inventory = makeInventory([]); // nothing owned
            const p = dialog.show('Gilded Hollow', layers, inventory);
            const items = document.querySelectorAll('.decoration-report-dialog__missing-item');
            // Only decoration 35 (from visible layer) should be listed
            expect(items.length).toBe(1);
            expect(items[0].textContent).toContain('Pot');
            document.querySelector('.decoration-report-dialog__ok').click();
            await p;
        });

        test('shows quantity needed for each missing decoration type', async () => {
            const layers = [
                makeLayer('l1', 'Layer 1', true, [{ id: '70', name: 'Bench' }]),
                makeLayer('l2', 'Layer 2', true, [{ id: '70', name: 'Bench' }]),
                makeLayer('l3', 'Layer 3', true, [{ id: '70', name: 'Bench' }]),
            ];
            const inventory = makeInventory([]);
            const p = dialog.show('Gilded Hollow', layers, inventory);
            const items = document.querySelectorAll('.decoration-report-dialog__missing-item');
            expect(items.length).toBe(1);
            expect(items[0].textContent).toContain('3');
            document.querySelector('.decoration-report-dialog__ok').click();
            await p;
        });

        test('sorts missing decorations alphabetically by name', async () => {
            const layers = [
                makeLayer('l1', 'Layer 1', true, [
                    { id: '70', name: 'Zzz Chair' },
                    { id: '35', name: 'Aaa Bench' },
                    { id: '125', name: 'Mmm Table' },
                ]),
            ];
            const inventory = makeInventory([]);
            const p = dialog.show('Gilded Hollow', layers, inventory);
            const items = document.querySelectorAll('.decoration-report-dialog__missing-item');
            expect(items.length).toBe(3);
            expect(items[0].textContent).toContain('Aaa Bench');
            expect(items[1].textContent).toContain('Mmm Table');
            expect(items[2].textContent).toContain('Zzz Chair');
            document.querySelector('.decoration-report-dialog__ok').click();
            await p;
        });

        test('wraps items in a scrollable list container', async () => {
            const layers = [
                makeLayer('l1', 'Layer 1', true, [{ id: '70', name: 'Bench' }]),
            ];
            const inventory = makeInventory([]);
            const p = dialog.show('Gilded Hollow', layers, inventory);
            const list = document.querySelector('.decoration-report-dialog__missing-list');
            expect(list).not.toBeNull();
            document.querySelector('.decoration-report-dialog__ok').click();
            await p;
        });
    });
});
