// @ts-nocheck
/**
 * renderHelpers.js
 * SVG rendering utilities for map visualization
 * Functions for creating SVG elements with proper scaling and positioning
 */

/**
 * Create an SVG element
 * @param {string} tagName - SVG element tag name
 * @param {Object} attributes - Attributes to set
 * @returns {SVGElement}
 */
function createSvgElement(tagName, attributes = {}) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);

    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });

    return element;
}

/**
 * Create an SVG circle element
 * @param {number} cx - Center x coordinate
 * @param {number} cy - Center y coordinate
 * @param {number} radius - Circle radius
 * @param {Object} options - Additional options
 * @param {string} options.fill - Fill color
 * @param {string} options.stroke - Stroke color
 * @param {number} options.strokeWidth - Stroke width
 * @param {string} options.className - CSS class
 * @param {number} options.opacity - Opacity (0-1)
 * @returns {SVGCircleElement}
 */
function createCircle(cx, cy, radius, options = {}) {
    const attributes = {
        cx,
        cy,
        r: radius
    };

    if (options.fill) attributes.fill = options.fill;
    if (options.stroke) attributes.stroke = options.stroke;
    if (options.strokeWidth !== undefined) attributes['stroke-width'] = options.strokeWidth;
    if (options.className) attributes.class = options.className;
    if (options.opacity !== undefined) attributes.opacity = options.opacity;

    return createSvgElement('circle', attributes);
}

/**
 * Create an SVG polygon (for drawing boundaries)
 * @param {Array<[number, number]>} points - Array of [x, y] coordinates
 * @param {Object} options - Additional options
 * @param {string} options.fill - Fill color
 * @param {string} options.stroke - Stroke color
 * @param {number} options.strokeWidth - Stroke width
 * @param {string} options.className - CSS class
 * @param {number} options.opacity - Opacity (0-1)
 * @returns {SVGPolygonElement}
 */
function createPolygon(points, options = {}) {
    const pointsString = points.map(([x, y]) => `${x},${y}`).join(' ');

    const attributes = {
        points: pointsString
    };

    if (options.fill) attributes.fill = options.fill;
    if (options.stroke) attributes.stroke = options.stroke;
    if (options.strokeWidth !== undefined) attributes['stroke-width'] = options.strokeWidth;
    if (options.className) attributes.class = options.className;
    if (options.opacity !== undefined) attributes.opacity = options.opacity;

    return createSvgElement('polygon', attributes);
}

/**
 * Create an SVG polyline (for drawing paths)
 * @param {Array<[number, number]>} points - Array of [x, y] coordinates
 * @param {Object} options - Additional options
 * @param {string} options.stroke - Stroke color
 * @param {number} options.strokeWidth - Stroke width
 * @param {string} options.className - CSS class
 * @param {number} options.opacity - Opacity (0-1)
 * @returns {SVGPolylineElement}
 */
function createPolyline(points, options = {}) {
    const pointsString = points.map(([x, y]) => `${x},${y}`).join(' ');

    const attributes = {
        points: pointsString,
        fill: 'none'
    };

    if (options.stroke) attributes.stroke = options.stroke;
    if (options.strokeWidth !== undefined) attributes['stroke-width'] = options.strokeWidth;
    if (options.className) attributes.class = options.className;
    if (options.opacity !== undefined) attributes.opacity = options.opacity;

    return createSvgElement('polyline', attributes);
}

/**
 * Create an SVG rectangle
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Width
 * @param {number} height - Height
 * @param {Object} options - Additional options
 * @param {string} options.fill - Fill color
 * @param {string} options.stroke - Stroke color
 * @param {number} options.strokeWidth - Stroke width
 * @param {string} options.className - CSS class
 * @returns {SVGRectElement}
 */
function createRect(x, y, width, height, options = {}) {
    const attributes = {
        x,
        y,
        width,
        height
    };

    if (options.fill) attributes.fill = options.fill;
    if (options.stroke) attributes.stroke = options.stroke;
    if (options.strokeWidth !== undefined) attributes['stroke-width'] = options.strokeWidth;
    if (options.className) attributes.class = options.className;

    return createSvgElement('rect', attributes);
}

/**
 * Create an SVG line
 * @param {number} x1 - Start x coordinate
 * @param {number} y1 - Start y coordinate
 * @param {number} x2 - End x coordinate
 * @param {number} y2 - End y coordinate
 * @param {Object} options - Additional options
 * @param {string} options.stroke - Stroke color
 * @param {number} options.strokeWidth - Stroke width
 * @param {string} options.className - CSS class
 * @returns {SVGLineElement}
 */
function createLine(x1, y1, x2, y2, options = {}) {
    const attributes = {
        x1,
        y1,
        x2,
        y2
    };

    if (options.stroke) attributes.stroke = options.stroke;
    if (options.strokeWidth !== undefined) attributes['stroke-width'] = options.strokeWidth;
    if (options.className) attributes.class = options.className;

    return createSvgElement('line', attributes);
}

/**
 * Create an SVG text element
 * @param {string} text - Text content
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} options - Additional options
 * @param {string} options.fontSize - Font size
 * @param {string} options.fill - Text color
 * @param {string} options.textAnchor - Text anchor (start, middle, end)
 * @param {string} options.className - CSS class
 * @returns {SVGTextElement}
 */
function createText(text, x, y, options = {}) {
    const attributes = {
        x,
        y
    };

    if (options.fontSize) attributes['font-size'] = options.fontSize;
    if (options.fill) attributes.fill = options.fill;
    if (options.textAnchor) attributes['text-anchor'] = options.textAnchor;
    if (options.className) attributes.class = options.className;

    const textElement = createSvgElement('text', attributes);
    textElement.textContent = text;

    return textElement;
}

/**
 * Create an SVG group element
 * @param {Object} options - Additional options
 * @param {string} options.className - CSS class
 * @param {string} options.id - Element ID
 * @returns {SVGGElement}
 */
function createGroup(options = {}) {
    const attributes = {};

    if (options.className) attributes.class = options.className;
    if (options.id) attributes.id = options.id;

    return createSvgElement('g', attributes);
}

/**
 * Create an SVG path element
 * @param {string} d - Path data (d attribute)
 * @param {Object} options - Additional options
 * @param {string} options.fill - Fill color
 * @param {string} options.stroke - Stroke color
 * @param {number} options.strokeWidth - Stroke width
 * @param {string} options.className - CSS class
 * @returns {SVGPathElement}
 */
function createPath(d, options = {}) {
    const attributes = {
        d
    };

    if (options.fill) attributes.fill = options.fill;
    if (options.stroke) attributes.stroke = options.stroke;
    if (options.strokeWidth !== undefined) attributes['stroke-width'] = options.strokeWidth;
    if (options.className) attributes.class = options.className;

    return createSvgElement('path', attributes);
}

/**
 * Set SVG element attributes
 * @param {SVGElement} element
 * @param {Object} attributes
 */
function setSvgAttributes(element, attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });
}

/**
 * Get SVG element attribute
 * @param {SVGElement} element
 * @param {string} attributeName
 * @returns {string|null}
 */
function getSvgAttribute(element, attributeName) {
    return element.getAttribute(attributeName);
}

/**
 * Transform an element (translate, scale, rotate)
 * @param {SVGElement} element
 * @param {Object} transform
 * @param {number} transform.tx - Translate x
 * @param {number} transform.ty - Translate y
 * @param {number} transform.sx - Scale x
 * @param {number} transform.sy - Scale y
 * @param {number} transform.rotation - Rotation in degrees
 */
function transformElement(element, transform = {}) {
    const parts = [];

    if (transform.tx !== undefined || transform.ty !== undefined) {
        parts.push(`translate(${transform.tx || 0}, ${transform.ty || 0})`);
    }

    if (transform.sx !== undefined || transform.sy !== undefined) {
        parts.push(`scale(${transform.sx || 1}, ${transform.sy || 1})`);
    }

    if (transform.rotation !== undefined) {
        parts.push(`rotate(${transform.rotation})`);
    }

    if (parts.length > 0) {
        element.setAttribute('transform', parts.join(' '));
    }
}

/**
 * Update circle position and size
 * @param {SVGCircleElement} circle
 * @param {number} cx - Center x
 * @param {number} cy - Center y
 * @param {number} radius - Radius
 */
function updateCircle(circle, cx, cy, radius) {
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', radius);
}

/**
 * Update polygon points
 * @param {SVGPolygonElement} polygon
 * @param {Array<[number, number]>} points - Array of [x, y] coordinates
 */
function updatePolygon(polygon, points) {
    const pointsString = points.map(([x, y]) => `${x},${y}`).join(' ');
    polygon.setAttribute('points', pointsString);
}

/**
 * Calculate screen position from world coordinates with zoom and pan
 * @param {number} x - World x coordinate
 * @param {number} y - World y coordinate
 * @param {Object} transform - Transform object with sx, sy, tx, ty
 * @returns {Object} {x, y} screen coordinates
 */
function worldToScreen(x, y, transform) {
    return {
        x: x * transform.sx + transform.tx,
        y: y * transform.sy + transform.ty
    };
}

/**
 * Calculate world coordinates from screen position with zoom and pan
 * @param {number} screenX - Screen x coordinate
 * @param {number} screenY - Screen y coordinate
 * @param {Object} transform - Transform object with sx, sy, tx, ty
 * @returns {Object} {x, y} world coordinates
 */
function screenToWorld(screenX, screenY, transform) {
    return {
        x: (screenX - transform.tx) / transform.sx,
        y: (screenY - transform.ty) / transform.sy
    };
}

export {
    createSvgElement,
    createCircle,
    createPolygon,
    createPolyline,
    createRect,
    createLine,
    createText,
    createGroup,
    createPath,
    setSvgAttributes,
    getSvgAttribute,
    transformElement,
    updateCircle,
    updatePolygon,
    worldToScreen,
    screenToWorld
};
