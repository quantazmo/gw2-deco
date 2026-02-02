// @ts-nocheck
/**
 * domHelpers.js
 * Pure utility functions for DOM manipulation
 * No side effects, easy to test
 */

/**
 * Create an HTML element with optional attributes and classes
 * @param {string} tag - HTML tag name
 * @param {Object} options - Options object
 * @param {string} options.id - Element ID
 * @param {string|string[]} options.className - Class name(s)
 * @param {Object} options.attributes - Other attributes to set
 * @param {string} options.innerHTML - Inner HTML content
 * @param {string} options.textContent - Text content
 * @returns {HTMLElement}
 */
function createElement(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.id) {
        element.id = options.id;
    }

    if (options.className) {
        if (Array.isArray(options.className)) {
            element.classList.add(...options.className);
        } else {
            element.className = options.className;
        }
    }

    if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
    }

    if (options.innerHTML) {
        element.innerHTML = options.innerHTML;
    }

    if (options.textContent) {
        element.textContent = options.textContent;
    }

    return element;
}

/**
 * Add one or more classes to an element
 * @param {HTMLElement} element
 * @param {string|string[]} classNames
 */
function addClass(element, classNames) {
    if (Array.isArray(classNames)) {
        element.classList.add(...classNames);
    } else {
        element.classList.add(classNames);
    }
}

/**
 * Remove one or more classes from an element
 * @param {HTMLElement} element
 * @param {string|string[]} classNames
 */
function removeClass(element, classNames) {
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
function toggleClass(element, className, force) {
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
function hasClass(element, className) {
    return element.classList.contains(className);
}

/**
 * Set multiple attributes on an element
 * @param {HTMLElement} element
 * @param {Object} attributes - Key-value pairs of attributes
 */
function setAttributes(element, attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });
}

/**
 * Get an attribute value
 * @param {HTMLElement} element
 * @param {string} attributeName
 * @returns {string|null}
 */
function getAttribute(element, attributeName) {
    return element.getAttribute(attributeName);
}

/**
 * Remove an attribute
 * @param {HTMLElement} element
 * @param {string} attributeName
 */
function removeAttribute(element, attributeName) {
    element.removeAttribute(attributeName);
}

/**
 * Set style properties
 * @param {HTMLElement} element
 * @param {Object} styles - Key-value pairs of CSS properties
 */
function setStyles(element, styles) {
    Object.entries(styles).forEach(([property, value]) => {
        element.style[property] = value;
    });
}

/**
 * Get computed style property
 * @param {HTMLElement} element
 * @param {string} property
 * @returns {string}
 */
function getComputedStyle(element, property) {
    return window.getComputedStyle(element)[property];
}

/**
 * Show an element (remove display: none)
 * @param {HTMLElement} element
 */
function show(element) {
    element.style.display = '';
}

/**
 * Hide an element (set display: none)
 * @param {HTMLElement} element
 */
function hide(element) {
    element.style.display = 'none';
}

/**
 * Check if element is visible
 * @param {HTMLElement} element
 * @returns {boolean}
 */
function isVisible(element) {
    return element.style.display !== 'none';
}

/**
 * Clear all child elements
 * @param {HTMLElement} element
 */
function empty(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/**
 * Append child elements
 * @param {HTMLElement} parent
 * @param {HTMLElement|HTMLElement[]} children
 */
function append(parent, children) {
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
function prepend(parent, children) {
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
function insertAfter(newElement, referenceElement) {
    referenceElement.parentNode.insertBefore(newElement, referenceElement.nextSibling);
}

/**
 * Remove an element from the DOM
 * @param {HTMLElement} element
 */
function remove(element) {
    element.parentNode.removeChild(element);
}

/**
 * Find first element matching selector
 * @param {string} selector
 * @param {HTMLElement} context - Search context (default: document)
 * @returns {HTMLElement|null}
 */
function query(selector, context = document) {
    return context.querySelector(selector);
}

/**
 * Find all elements matching selector
 * @param {string} selector
 * @param {HTMLElement} context - Search context (default: document)
 * @returns {HTMLElement[]}
 */
function queryAll(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

/**
 * Get element by ID
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function getById(id) {
    return document.getElementById(id);
}

/**
 * Get elements by class name
 * @param {string} className
 * @param {HTMLElement} context - Search context (default: document)
 * @returns {HTMLElement[]}
 */
function getByClass(className, context = document) {
    return Array.from(context.getElementsByClassName(className));
}

/**
 * Get elements by tag name
 * @param {string} tagName
 * @param {HTMLElement} context - Search context (default: document)
 * @returns {HTMLElement[]}
 */
function getByTag(tagName, context = document) {
    return Array.from(context.getElementsByTagName(tagName));
}

/**
 * Get closest ancestor matching selector
 * @param {HTMLElement} element
 * @param {string} selector
 * @returns {HTMLElement|null}
 */
function closest(element, selector) {
    return element.closest(selector);
}

/**
 * Get offset position of element relative to viewport
 * @param {HTMLElement} element
 * @returns {Object} {top, left, width, height}
 */
function getOffset(element) {
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
function getPosition(element) {
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
function getSize(element) {
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
function isInViewport(element) {
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
function on(element, event, handler, options) {
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
function once(element, event, handler, options) {
    const wrapper = (evt) => {
        handler(evt);
        element.removeEventListener(event, wrapper, options);
    };
    element.addEventListener(event, wrapper, options);
}

/**
 * Focus an element
 * @param {HTMLElement} element
 */
function focus(element) {
    element.focus();
}

/**
 * Blur an element
 * @param {HTMLElement} element
 */
function blur(element) {
    element.blur();
}

function addInputElement(element: HTMLElement, placeholder: string, debounce: number, callback: CallableFunction): void {
    let timerId;

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
            callback.apply(this, [input.value])
        }, debounce);
    });

    clearButton.addEventListener('click', () => {
        input.value = '';
        callback.apply(this)
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
