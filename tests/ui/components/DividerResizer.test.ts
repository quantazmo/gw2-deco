// @ts-nocheck
/**
 * Tests for DividerResizer — covers mouse-drag interaction (lines 58-122).
 */
import { DividerResizer } from '../../../src/ui/components/DividerResizer.js';

describe('DividerResizer', () => {
    let container;
    let firstChild;
    let dividerEl;
    let secondChild;
    let onRatioChange;
    let resizer;

    function fireMouseEvent(target, type, options = {}) {
        const e = new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX: options.clientX ?? 0,
            clientY: options.clientY ?? 0,
            ...options
        });
        target.dispatchEvent(e);
        return e;
    }

    beforeEach(() => {
        document.body.innerHTML = '';
        onRatioChange = vi.fn();
        resizer = new DividerResizer('vertical', onRatioChange);

        // Build a layout: container > [firstChild, divider, secondChild]
        container = document.createElement('div');
        firstChild = document.createElement('div');
        dividerEl = resizer.getElement();
        secondChild = document.createElement('div');
        container.appendChild(firstChild);
        container.appendChild(dividerEl);
        container.appendChild(secondChild);
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        // Cleanup any leftover global listeners
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    // ─────────────────────────────────────────────────────────────────────────
    // getElement
    // ─────────────────────────────────────────────────────────────────────────
    test('getElement returns a div with divider-resizer class', () => {
        expect(dividerEl.tagName).toBe('DIV');
        expect(dividerEl.classList.contains('divider-resizer')).toBe(true);
        expect(dividerEl.classList.contains('divider-vertical')).toBe(true);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // mousedown – starts tracking
    // ─────────────────────────────────────────────────────────────────────────
    test('mousedown starts drag and adds divider-resizing class to body', () => {
        fireMouseEvent(dividerEl, 'mousedown', { clientX: 50, clientY: 50 });
        expect(document.body.classList.contains('divider-resizing')).toBe(true);
        // cleanup
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    // ─────────────────────────────────────────────────────────────────────────
    // mousemove – updates flex values
    // ─────────────────────────────────────────────────────────────────────────
    test('mousemove updates flex on first and second children', () => {
        // Mock getBoundingClientRect to return non-zero so ratio is computed
        container.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100 });

        fireMouseEvent(dividerEl, 'mousedown', { clientX: 50, clientY: 50 });
        document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 100, clientY: 50 }));

        // firstChild flex should be updated
        expect(firstChild.style.flex).not.toBe('');
        // cleanup
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    // ─────────────────────────────────────────────────────────────────────────
    // mousemove – horizontal direction
    // ─────────────────────────────────────────────────────────────────────────
    test('horizontal direction uses clientY for ratio', () => {
        const hResizer = new DividerResizer('horizontal', onRatioChange);
        const hFirst = document.createElement('div');
        const hDivider = hResizer.getElement();
        const hSecond = document.createElement('div');
        const hContainer = document.createElement('div');
        hContainer.appendChild(hFirst);
        hContainer.appendChild(hDivider);
        hContainer.appendChild(hSecond);
        hContainer.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 });
        document.body.appendChild(hContainer);

        fireMouseEvent(hDivider, 'mousedown', { clientX: 50, clientY: 100 });
        document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 50, clientY: 100 }));

        expect(hFirst.style.flex).not.toBe('');
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    // ─────────────────────────────────────────────────────────────────────────
    // mouseup – commits ratio
    // ─────────────────────────────────────────────────────────────────────────
    test('mouseup fires onRatioChange with last ratio', () => {
        container.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100 });

        fireMouseEvent(dividerEl, 'mousedown', { clientX: 50, clientY: 50 });
        document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 80, clientY: 50 }));
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 80, clientY: 50 }));

        expect(onRatioChange).toHaveBeenCalled();
        expect(document.body.classList.contains('divider-resizing')).toBe(false);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // mouseup without prior mousemove – does not call onRatioChange
    // ─────────────────────────────────────────────────────────────────────────
    test('mouseup without drag does not call onRatioChange (no lastRatio)', () => {
        fireMouseEvent(dividerEl, 'mousedown', { clientX: 50, clientY: 50 });
        // No mousemove fired — lastRatio remains null
        // But container has 0-size rect (jsdom), so _computeRatio returns null
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        expect(onRatioChange).not.toHaveBeenCalled();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // _computeRatio – zero-size container returns null
    // ─────────────────────────────────────────────────────────────────────────
    test('mousemove with zero-size container does not update flex (ratio null)', () => {
        // jsdom returns 0-size rect by default, so ratio is null
        fireMouseEvent(dividerEl, 'mousedown', { clientX: 50, clientY: 50 });
        document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 100, clientY: 50 }));
        // firstChild flex should remain empty (no ratio change)
        expect(firstChild.style.flex).toBe('');
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    // ─────────────────────────────────────────────────────────────────────────
    // options: minRatio and maxRatio override
    // ─────────────────────────────────────────────────────────────────────────
    test('ratio is clamped to minRatio when set in options', () => {
        const clampedCb = vi.fn();
        const clampedResizer = new DividerResizer('vertical', clampedCb, { minRatio: 0.4, maxRatio: 0.6 });
        const cFirst = document.createElement('div');
        const cDivider = clampedResizer.getElement();
        const cSecond = document.createElement('div');
        const cContainer = document.createElement('div');
        cContainer.appendChild(cFirst);
        cContainer.appendChild(cDivider);
        cContainer.appendChild(cSecond);
        cContainer.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100 });
        document.body.appendChild(cContainer);

        fireMouseEvent(cDivider, 'mousedown', { clientX: 0, clientY: 50 });
        document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 0, clientY: 50 }));
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        // With clientX=0 → ratio = 0/200 = 0.0, clamped to minRatio = 0.4
        expect(clampedCb).toHaveBeenCalledWith(0.4);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // mousemove when _splitContainer is null (line 70 return branch)
    // ─────────────────────────────────────────────────────────────────────────
    test('mousemove before mousedown does nothing (splitContainer is null)', () => {
        // Don't call mousedown — splitContainer remains null
        document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 100, clientY: 50 }));
        // No flex changes
        expect(firstChild.style.flex).toBe('');
    });

    test('mousemove after splitContainer is nulled returns early (line 70)', () => {
        // Mousedown registers the handler, then we null _splitContainer to trigger line 70
        fireMouseEvent(dividerEl, 'mousedown', { clientX: 50, clientY: 50 });
        resizer._splitContainer = null;
        document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 100, clientY: 50 }));
        expect(firstChild.style.flex).toBe('');
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    // ─────────────────────────────────────────────────────────────────────────
    // mousemove with no firstChild (line 75 false branch)
    // ─────────────────────────────────────────────────────────────────────────
    test('mousemove does not crash when divider has no previousElementSibling', () => {
        // Create a divider with no preceding sibling
        const isolatedContainer = document.createElement('div');
        const isolatedDivider = resizer.getElement();
        const isolatedSecond = document.createElement('div');
        isolatedContainer.appendChild(isolatedDivider);
        isolatedContainer.appendChild(isolatedSecond);
        isolatedContainer.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100 });
        document.body.appendChild(isolatedContainer);

        fireMouseEvent(isolatedDivider, 'mousedown', { clientX: 50, clientY: 50 });
        document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 100, clientY: 50 }));
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        // Should not throw; secondChild flex still updated
        expect(isolatedSecond.style.flex).not.toBe('');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // mousemove with no secondChild (line 76 false branch)
    // ─────────────────────────────────────────────────────────────────────────
    test('mousemove does not crash when divider has no nextElementSibling', () => {
        const isolatedContainer = document.createElement('div');
        const isolatedFirst = document.createElement('div');
        const isolatedDivider = new DividerResizer('vertical', vi.fn()).getElement();
        isolatedContainer.appendChild(isolatedFirst);
        isolatedContainer.appendChild(isolatedDivider);
        // No second child
        isolatedContainer.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100 });
        document.body.appendChild(isolatedContainer);

        fireMouseEvent(isolatedDivider, 'mousedown', { clientX: 50, clientY: 50 });
        document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 100, clientY: 50 }));
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        // firstChild flex should still be updated
        expect(isolatedFirst.style.flex).not.toBe('');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // horizontal direction with zero-height container (line 112 return null)
    // ─────────────────────────────────────────────────────────────────────────
    test('horizontal direction with zero-height container returns null ratio', () => {
        const cb = vi.fn();
        const hResizer = new DividerResizer('horizontal', cb);
        const hFirst = document.createElement('div');
        const hDivider = hResizer.getElement();
        const hSecond = document.createElement('div');
        const hContainer = document.createElement('div');
        hContainer.appendChild(hFirst);
        hContainer.appendChild(hDivider);
        hContainer.appendChild(hSecond);
        // Zero height container — _computeRatio returns null
        hContainer.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 0, right: 200, bottom: 0 });
        document.body.appendChild(hContainer);

        fireMouseEvent(hDivider, 'mousedown', { clientX: 50, clientY: 50 });
        document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 50, clientY: 50 }));
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        // No ratio change since computation returned null
        expect(cb).not.toHaveBeenCalled();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // _computeRatio direct call — guard when _splitContainer is null (line 104)
    // ─────────────────────────────────────────────────────────────────────────
    test('_computeRatio returns null when _splitContainer is null (line 104)', () => {
        // Call private method directly — splitContainer is null by default before mousedown
        const result = resizer._computeRatio(100, 50);
        expect(result).toBeNull();
    });
});
