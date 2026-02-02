// @ts-nocheck
/**
 * Tests for src/ui/domHelpers.js
 * Pure DOM utility functions — all testable in jsdom
 */
import {
    createElement,
    addClass,
    removeClass,
    toggleClass,
    hasClass,
    setAttributes,
    getAttribute,
    removeAttribute,
    setStyles,
    getComputedStyle,
    show,
    hide,
    isVisible,
    empty,
    append,
    prepend,
    insertAfter,
    remove,
    query,
    queryAll,
    getById,
    getByClass,
    getByTag,
    closest,
    getOffset,
    getPosition,
    getSize,
    isInViewport,
    on,
    once,
    focus,
    blur,
} from '../../src/ui/domHelpers.js';

describe('domHelpers', () => {

    // ─────────────────────────────────────────────────────────────────────────
    // createElement
    // ─────────────────────────────────────────────────────────────────────────

    test('createElement creates element with tag only', () => {
        const el = createElement('div');
        expect(el.tagName).toBe('DIV');
    });

    test('createElement sets id option (line 22)', () => {
        const el = createElement('div', { id: 'my-id' });
        expect(el.id).toBe('my-id');
    });

    test('createElement sets className as string', () => {
        const el = createElement('div', { className: 'foo' });
        expect(el.classList.contains('foo')).toBe(true);
    });

    test('createElement sets className as array (line 27)', () => {
        const el = createElement('div', { className: ['foo', 'bar'] });
        expect(el.classList.contains('foo')).toBe(true);
        expect(el.classList.contains('bar')).toBe(true);
    });

    test('createElement sets attributes (lines 34-35)', () => {
        const el = createElement('input', { attributes: { type: 'text', 'aria-label': 'Name' } });
        expect(el.getAttribute('type')).toBe('text');
        expect(el.getAttribute('aria-label')).toBe('Name');
    });

    test('createElement sets innerHTML (line 40)', () => {
        const el = createElement('div', { innerHTML: '<span>Hi</span>' });
        expect(el.innerHTML).toBe('<span>Hi</span>');
    });

    test('createElement sets textContent', () => {
        const el = createElement('p', { textContent: 'Hello' });
        expect(el.textContent).toBe('Hello');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // addClass / removeClass / toggleClass / hasClass
    // ─────────────────────────────────────────────────────────────────────────

    test('addClass adds single class', () => {
        const el = document.createElement('div');
        addClass(el, 'active');
        expect(el.classList.contains('active')).toBe(true);
    });

    test('addClass adds multiple classes as array (line 57)', () => {
        const el = document.createElement('div');
        addClass(el, ['foo', 'bar']);
        expect(el.classList.contains('foo')).toBe(true);
        expect(el.classList.contains('bar')).toBe(true);
    });

    test('removeClass removes single class', () => {
        const el = document.createElement('div');
        el.className = 'foo bar';
        removeClass(el, 'foo');
        expect(el.classList.contains('foo')).toBe(false);
        expect(el.classList.contains('bar')).toBe(true);
    });

    test('removeClass removes multiple classes as array (line 70)', () => {
        const el = document.createElement('div');
        el.className = 'foo bar baz';
        removeClass(el, ['foo', 'bar']);
        expect(el.classList.contains('foo')).toBe(false);
        expect(el.classList.contains('bar')).toBe(false);
        expect(el.classList.contains('baz')).toBe(true);
    });

    test('toggleClass toggles class without force', () => {
        const el = document.createElement('div');
        toggleClass(el, 'active');
        expect(el.classList.contains('active')).toBe(true);
        toggleClass(el, 'active');
        expect(el.classList.contains('active')).toBe(false);
    });

    test('toggleClass adds class with force=true', () => {
        const el = document.createElement('div');
        toggleClass(el, 'active', true);
        expect(el.classList.contains('active')).toBe(true);
    });

    test('toggleClass removes class with force=false', () => {
        const el = document.createElement('div');
        el.classList.add('active');
        toggleClass(el, 'active', false);
        expect(el.classList.contains('active')).toBe(false);
    });

    test('hasClass returns true when element has class', () => {
        const el = document.createElement('div');
        el.className = 'foo';
        expect(hasClass(el, 'foo')).toBe(true);
    });

    test('hasClass returns false when element lacks class', () => {
        const el = document.createElement('div');
        expect(hasClass(el, 'missing')).toBe(false);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // setAttributes / getAttribute / removeAttribute
    // ─────────────────────────────────────────────────────────────────────────

    test('setAttributes sets multiple attributes', () => {
        const el = document.createElement('input');
        setAttributes(el, { type: 'checkbox', name: 'opt' });
        expect(el.getAttribute('type')).toBe('checkbox');
        expect(el.getAttribute('name')).toBe('opt');
    });

    test('getAttribute retrieves attribute value', () => {
        const el = document.createElement('span');
        el.setAttribute('data-value', '42');
        expect(getAttribute(el, 'data-value')).toBe('42');
    });

    test('removeAttribute removes an attribute', () => {
        const el = document.createElement('button');
        el.setAttribute('disabled', '');
        removeAttribute(el, 'disabled');
        expect(el.hasAttribute('disabled')).toBe(false);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // setStyles / getComputedStyle
    // ─────────────────────────────────────────────────────────────────────────

    test('setStyles sets multiple inline styles', () => {
        const el = document.createElement('div');
        setStyles(el, { color: 'red', display: 'none' });
        expect(el.style.color).toBe('red');
        expect(el.style.display).toBe('none');
    });

    test('getComputedStyle returns style property value', () => {
        const el = document.createElement('div');
        el.style.display = 'block';
        document.body.appendChild(el);
        const val = getComputedStyle(el, 'display');
        expect(typeof val).toBe('string');
        document.body.removeChild(el);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // show / hide / isVisible
    // ─────────────────────────────────────────────────────────────────────────

    test('hide sets display to none', () => {
        const el = document.createElement('div');
        hide(el);
        expect(el.style.display).toBe('none');
    });

    test('show clears display style', () => {
        const el = document.createElement('div');
        el.style.display = 'none';
        show(el);
        expect(el.style.display).toBe('');
    });

    test('isVisible returns false when display is none', () => {
        const el = document.createElement('div');
        el.style.display = 'none';
        expect(isVisible(el)).toBe(false);
    });

    test('isVisible returns true when display is not none', () => {
        const el = document.createElement('div');
        expect(isVisible(el)).toBe(true);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // empty
    // ─────────────────────────────────────────────────────────────────────────

    test('empty removes all children', () => {
        const el = document.createElement('div');
        el.innerHTML = '<span></span><p></p>';
        empty(el);
        expect(el.children.length).toBe(0);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // append / prepend / insertAfter / remove
    // ─────────────────────────────────────────────────────────────────────────

    test('append adds single child', () => {
        const parent = document.createElement('div');
        const child = document.createElement('span');
        append(parent, child);
        expect(parent.firstChild).toBe(child);
    });

    test('append adds array of children (line 192)', () => {
        const parent = document.createElement('div');
        const a = document.createElement('span');
        const b = document.createElement('em');
        append(parent, [a, b]);
        expect(parent.children[0]).toBe(a);
        expect(parent.children[1]).toBe(b);
    });

    test('prepend inserts single child at start', () => {
        const parent = document.createElement('div');
        const existing = document.createElement('p');
        parent.appendChild(existing);
        const newEl = document.createElement('span');
        prepend(parent, newEl);
        expect(parent.firstChild).toBe(newEl);
    });

    test('prepend inserts array of children at start (line 205-208)', () => {
        const parent = document.createElement('div');
        const existing = document.createElement('p');
        parent.appendChild(existing);
        const a = document.createElement('span');
        const b = document.createElement('em');
        prepend(parent, [a, b]);
        // After reverse + insertBefore: a becomes first, b second, existing third
        expect(parent.children[0]).toBe(a);
        expect(parent.children[1]).toBe(b);
    });

    test('insertAfter inserts element after reference', () => {
        const parent = document.createElement('div');
        const ref = document.createElement('span');
        const sibling = document.createElement('p');
        parent.appendChild(ref);
        parent.appendChild(sibling);
        const newEl = document.createElement('em');
        insertAfter(newEl, ref);
        expect(parent.children[1]).toBe(newEl);
    });

    test('remove removes element from DOM', () => {
        const parent = document.createElement('div');
        const child = document.createElement('span');
        parent.appendChild(child);
        remove(child);
        expect(parent.children.length).toBe(0);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // query / queryAll / getById / getByClass / getByTag / closest
    // ─────────────────────────────────────────────────────────────────────────

    test('query returns first matching element', () => {
        const container = document.createElement('div');
        container.innerHTML = '<span class="x"></span><span class="x"></span>';
        const found = query('.x', container);
        expect(found).not.toBeNull();
    });

    test('queryAll returns all matching elements', () => {
        const container = document.createElement('div');
        container.innerHTML = '<span class="y"></span><span class="y"></span>';
        const all = queryAll('.y', container);
        expect(all.length).toBe(2);
    });

    test('getById returns element by id', () => {
        const el = document.createElement('div');
        el.id = 'test-dom-helper-id';
        document.body.appendChild(el);
        expect(getById('test-dom-helper-id')).toBe(el);
        document.body.removeChild(el);
    });

    test('getByClass returns elements by class name', () => {
        const container = document.createElement('div');
        container.innerHTML = '<div class="grp"></div><div class="grp"></div>';
        document.body.appendChild(container);
        const els = getByClass('grp', container);
        expect(els.length).toBe(2);
        document.body.removeChild(container);
    });

    test('getByTag returns elements by tag name', () => {
        const container = document.createElement('div');
        container.innerHTML = '<p></p><p></p><span></span>';
        const paras = getByTag('p', container);
        expect(paras.length).toBe(2);
    });

    test('closest returns nearest ancestor matching selector', () => {
        const outer = document.createElement('div');
        outer.className = 'outer';
        const inner = document.createElement('span');
        outer.appendChild(inner);
        document.body.appendChild(outer);
        expect(closest(inner, '.outer')).toBe(outer);
        document.body.removeChild(outer);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // getOffset / getPosition / getSize
    // ─────────────────────────────────────────────────────────────────────────

    test('getOffset returns object with top, left, width, height', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);
        const offset = getOffset(el);
        expect(offset).toHaveProperty('top');
        expect(offset).toHaveProperty('left');
        expect(offset).toHaveProperty('width');
        expect(offset).toHaveProperty('height');
        document.body.removeChild(el);
    });

    test('getPosition returns offsetTop and offsetLeft', () => {
        const el = document.createElement('div');
        const pos = getPosition(el);
        expect(pos).toHaveProperty('top');
        expect(pos).toHaveProperty('left');
    });

    test('getSize returns offsetWidth and offsetHeight', () => {
        const el = document.createElement('div');
        const size = getSize(el);
        expect(size).toHaveProperty('width');
        expect(size).toHaveProperty('height');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // isInViewport
    // ─────────────────────────────────────────────────────────────────────────

    test('isInViewport returns boolean', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);
        const result = isInViewport(el);
        expect(typeof result).toBe('boolean');
        document.body.removeChild(el);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // on / once
    // ─────────────────────────────────────────────────────────────────────────

    test('on adds event listener and returns cleanup function', () => {
        const el = document.createElement('button');
        let count = 0;
        const off = on(el, 'click', () => count++);
        el.click();
        expect(count).toBe(1);
        off();
        el.click();
        expect(count).toBe(1); // no longer listening
    });

    test('once fires handler exactly once', () => {
        const el = document.createElement('button');
        let count = 0;
        once(el, 'click', () => count++);
        el.click();
        el.click();
        expect(count).toBe(1);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // focus / blur
    // ─────────────────────────────────────────────────────────────────────────

    test('focus focuses the element', () => {
        const el = document.createElement('button');
        document.body.appendChild(el);
        focus(el);
        expect(document.activeElement).toBe(el);
        document.body.removeChild(el);
    });

    test('blur blurs the element', () => {
        const el = document.createElement('button');
        document.body.appendChild(el);
        el.focus();
        blur(el);
        expect(document.activeElement).not.toBe(el);
        document.body.removeChild(el);
    });
});
