
/**
 * domHelpers.js
 * Pure utility functions for DOM manipulation
 * No side effects, easy to test
 */

/** Create Element Options */
class CreateElementOptions<K extends keyof HTMLElementEventMap> {
    /**  Element ID */
    id?: string;
    /** Class name(s) */
    className?: string | string[];
    /** Other attributes to set */
    attributes?: Record<string, string | number | boolean>;
    /** Inner HTML content */
    innerHTML?: string;
    /** Text content */
    textContent?: string;
    /** Events */
    events?: Partial<{ [EventName in K]: (e: HTMLElementEventMap[EventName]) => void }>;
    /** Parent Element */
    parent?: HTMLElement;
}

/**
 * Create an HTML element with optional attributes and classes
 */
function createElement<K1 extends keyof HTMLElementTagNameMap, K2 extends keyof HTMLElementEventMap>(tag: K1, options: CreateElementOptions<K2> = {}): HTMLElementTagNameMap[K1] {
    const element = document.createElement(tag);

    if (options.id) {
        element.id = options.id;
    }

    if (options.className) {
        addClass(element, options.className);
    }

    if (options.attributes) {
        setAttributes(element, options.attributes);
    }

    if (options.innerHTML) {
        element.innerHTML = options.innerHTML;
    }

    if (options.textContent) {
        element.textContent = options.textContent;
    }

    if (options.events) {
        for (const [event, handler] of Object.entries(options.events)) {
            if (handler) {
                element.addEventListener(event, handler as EventListener);
            }
        }
    }

    if (options.parent) {
        options.parent.appendChild(element);
    }
    return element;
}

/**
 * Add one or more classes to an element
 */
function addClass(element: HTMLElement, classNames: string | string[]): void {
    if (Array.isArray(classNames)) {
        element.classList.add(...classNames.filter(str => str.trim() !== ''));
    } else {
        element.classList.add(classNames);
    }
}

/**
 * Remove one or more classes from an element
 */
function removeClass(element: HTMLElement, classNames: string | string[]): void {
    if (Array.isArray(classNames)) {
        element.classList.remove(...classNames);
    } else {
        element.classList.remove(classNames);
    }
}

/**
 * Toggle a class on an element
 * @param {HTMLElement} element
 * @param {string} className
 * @param {boolean} force - Optional: force add (true) or remove (false)
 */
function toggleClass(element: HTMLElement, className: string, force?: boolean): void {
    if (force === undefined) {
        element.classList.toggle(className);
    } else {
        element.classList.toggle(className, force);
    }
}

/**
 * Check if element has a class
 * @param {HTMLElement} element
 * @param {string} className
 * @returns {boolean}
 */
function hasClass(element: HTMLElement, className: string): boolean {
    return element.classList.contains(className);
}

/**
 * Set multiple attributes on an element
 * @param element
 * @param attributes - Key-value pairs of attributes
 */
function setAttributes(element: HTMLElement, attributes: Record<string, string | number | boolean>): void {
    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, String(value));
    });
}

/**
 * Get an attribute value
 * @param {HTMLElement} element
 * @param {string} attributeName
 * @returns {string|null}
 */
function getAttribute(element: Element, attributeName: string): string | null {
    return element.getAttribute(attributeName);
}

/**
 * Remove an attribute
 * @param {HTMLElement} element
 * @param {string} attributeName
 */
function removeAttribute(element: Element, attributeName: string): void {
    element.removeAttribute(attributeName);
}

/**
 * Set style properties
 * @param {HTMLElement} element
 * @param {Object} styles - Key-value pairs of CSS properties
 */
function setStyles(element: HTMLElement, styles: Record<string, string>): void {
    Object.entries(styles).forEach(([property, value]) => {
        element.style.setProperty(property, value);
    });
}

/**
 * Get computed style property
 * @param {HTMLElement} element
 * @param {string} property
 * @returns {string}
 */
function getComputedStyle(element: Element, property: string): string {
    return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * Show an element (remove display: none)
 * @param {HTMLElement} element
 */
function show(element: HTMLElement): void {
    element.style.display = '';
}

/**
 * Hide an element (set display: none)
 * @param {HTMLElement} element
 */
function hide(element: HTMLElement): void {
    element.style.display = 'none';
}

/**
 * Check if element is visible
 * @param {HTMLElement} element
 * @returns {boolean}
 */
function isVisible(element: HTMLElement): boolean {
    return element.style.display !== 'none';
}

/**
 * Clear all child elements
 * @param {HTMLElement} element
 */
function empty(element: Element): void {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/**
 * Append child elements
 * @param {HTMLElement} parent
 * @param {HTMLElement|HTMLElement[]} children
 */
function append(parent: HTMLElement, children: HTMLElement | HTMLElement[]): void {
    if (Array.isArray(children)) {
        children.forEach(child => parent.appendChild(child));
    } else {
        parent.appendChild(children);
    }
}

/**
 * Prepend child elements
 * @param {HTMLElement} parent
 * @param {HTMLElement|HTMLElement[]} children
 */
function prepend(parent: HTMLElement, children: HTMLElement | HTMLElement[]): void {
    if (Array.isArray(children)) {
        children.reverse().forEach(child => {
            parent.insertBefore(child, parent.firstChild);
        });
    } else {
        parent.insertBefore(children, parent.firstChild);
    }
}

/**
 * Insert element after reference element
 * @param {HTMLElement} newElement
 * @param {HTMLElement} referenceElement
 */
function insertAfter(newElement: HTMLElement, referenceElement: HTMLElement): void {
    referenceElement.parentNode?.insertBefore(newElement, referenceElement.nextSibling);
}

/**
 * Remove an element from the DOM
 * @param {HTMLElement} element
 */
function remove(element: HTMLElement): void {
    element.parentNode?.removeChild(element);
}

/**
 * Find first element matching selector
 * @param {string} selector
 * @param {HTMLElement} context - Search context (default: document)
 * @returns {HTMLElement|null}
 */
function query(selector: string, context: ParentNode = document): HTMLElement | null {
    return context.querySelector<HTMLElement>(selector);
}

/**
 * Find all elements matching selector
 * @param {string} selector
 * @param {HTMLElement} context - Search context (default: document)
 * @returns {HTMLElement[]}
 */
function queryAll(selector: string, context: ParentNode = document): HTMLElement[] {
    return Array.from(context.querySelectorAll<HTMLElement>(selector));
}

/**
 * Get element by ID
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function getById(id: string): HTMLElement | null {
    return document.getElementById(id);
}

/**
 * Get elements by class name
 * @param {string} className
 * @param {HTMLElement} context - Search context (default: document)
 * @returns {HTMLElement[]}
 */
function getByClass(className: string, context: Document | HTMLElement = document): HTMLElement[] {
    return Array.from(context.getElementsByClassName(className)).filter((element): element is HTMLElement => element instanceof HTMLElement);
}

/**
 * Get elements by tag name
 * @param {string} tagName
 * @param {HTMLElement} context - Search context (default: document)
 * @returns {HTMLElement[]}
 */
function getByTag(tagName: string, context: Document | HTMLElement = document): HTMLElement[] {
    return Array.from(context.getElementsByTagName(tagName)).filter((element): element is HTMLElement => element instanceof HTMLElement);
}

/**
 * Get closest ancestor matching selector
 * @param {HTMLElement} element
 * @param {string} selector
 * @returns {HTMLElement|null}
 */
function closest(element: HTMLElement, selector: string): HTMLElement | null {
    return element.closest<HTMLElement>(selector);
}

/**
 * Get offset position of element relative to viewport
 * @param {HTMLElement} element
 * @returns {Object} {top, left, width, height}
 */
function getOffset(element: HTMLElement): { top: number; left: number; width: number; height: number } {
    const rect = element.getBoundingClientRect();
    return {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
    };
}

/**
 * Get position of element relative to parent
 * @param {HTMLElement} element
 * @returns {Object} {top, left}
 */
function getPosition(element: HTMLElement): { top: number; left: number } {
    return {
        top: element.offsetTop,
        left: element.offsetLeft
    };
}

/**
 * Get element dimensions
 * @param {HTMLElement} element
 * @returns {Object} {width, height}
 */
function getSize(element: HTMLElement): { width: number; height: number } {
    return {
        width: element.offsetWidth,
        height: element.offsetHeight
    };
}

/**
 * Check if element is in viewport
 * @param {HTMLElement} element
 * @returns {boolean}
 */
function isInViewport(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth
    );
}

/**
 * Add event listener with cleanup function
 * @param {HTMLElement} element
 * @param {string} event
 * @param {Function} handler
 * @param {Object} options - Event listener options
 * @returns {Function} Cleanup function
 */
function on<E extends keyof HTMLElementEventMap>(element: HTMLElement, event: E, handler: (event: HTMLElementEventMap[E]) => void, options?: boolean | AddEventListenerOptions): () => void {
    element.addEventListener(event, handler, options);
    return () => element.removeEventListener(event, handler, options);
}

/**
 * Add one-time event listener
 * @param {HTMLElement} element
 * @param {string} event
 * @param {Function} handler
 * @param {Object} options - Event listener options
 */
function once<E extends keyof HTMLElementEventMap>(element: HTMLElement, event: E, handler: (event: HTMLElementEventMap[E]) => void, options?: boolean | AddEventListenerOptions): void {
    const wrapper = (evt: HTMLElementEventMap[E]) => {
        handler(evt);
        element.removeEventListener(event, wrapper, options);
    };
    element.addEventListener(event, wrapper, options);
}

/**
 * Focus an element
 * @param {HTMLElement} element
 */
function focus(element: HTMLElement): void {
    element.focus();
}

/**
 * Blur an element
 * @param {HTMLElement} element
 */
function blur(element: HTMLElement): void {
    element.blur();
}

function addInputElement(element: HTMLElement, placeholder: string, debounce: number, callback: (value?: string) => void): void {
    let timerId: ReturnType<typeof setTimeout>;

    const inputWrapper = createElement('div', {
        className: 'decoration-text-input-wrapper'
    });

    const input = createElement('input', {
        className: 'decoration-text-input'
    });
    input.type = 'text';
    input.placeholder = `${placeholder}…`;
    input.setAttribute('aria-label', placeholder);

    const clearButton = createElement('button', {
        className: 'decoration-text-input-clear'
    });
    clearButton.type = 'button';
    clearButton.title = 'Clear search';
    clearButton.setAttribute('aria-label', 'Clear search');
    clearButton.textContent = '×';
    clearButton.style.display = 'none';

    input.addEventListener('input', () => {
        // Clear any existing active timer to reset the countdown
        clearTimeout(timerId);

        // Start a brand new timer
        timerId = setTimeout(() => {
            clearButton.style.display = input.value ? '' : 'none';
            callback(input.value);
        }, debounce);
    });

    clearButton.addEventListener('click', () => {
        input.value = '';
        callback();
        input.focus();
    });

    inputWrapper.appendChild(input);
    inputWrapper.appendChild(clearButton);
    element.appendChild(inputWrapper);
}

export {
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
    addInputElement
};
