/**
 * Creates a linear scale transformation function
 * Maps values from an input domain to an output range using linear interpolation
 * 
 * @returns {Object} Scale function with methods:
 *   - (value: number): number - Transform a value from domain to range
 *   - domain(values: [number, number]): this - Set input domain [min, max]
 *   - range(values: [number, number]): this - Set output range [min, max]
 *   - copy(): Object - Create independent clone of scale
 *   - rescaleX(transform): Object - Create new scale rescaled by zoom transform
 *   - rescaleY(transform): Object - Create new scale rescaled by zoom transform
 * 
 * @example
 * const xScale = scaleLinear().domain([0, 100]).range([0, 500]);
 * xScale(50); // Returns 250
 * 
 * @example
 * const scale = scaleLinear().domain([0, 1000]).range([0, 800]);
 * const cloned = scale.copy(); // Independent copy
 */
export function scaleLinear() {
    let domainMin = 0;
    let domainMax = 1;
    let rangeMin = 0;
    let rangeMax = 1;

    /**
     * Transform a value from domain to range using linear interpolation
     * @param {number} value - Input value in domain
     * @returns {number} Output value in range
     */
    function scale(value) {
        // Normalize input to [0, 1]
        const normalized = (value - domainMin) / (domainMax - domainMin);
        // Scale to output range
        return normalized * (rangeMax - rangeMin) + rangeMin;
    }

    /**
     * Set or get the input domain
     * @param {[number, number]} [values] - Domain [min, max]. If undefined, returns current domain.
     * @returns {Object|[number, number]} This scale for chaining, or current domain if called without arguments
     */
    scale.domain = function (values) {
        if (values === undefined) {
            return [domainMin, domainMax];
        }
        domainMin = values[0];
        domainMax = values[1];
        return scale;
    };

    /**
     * Set or get the output range
     * @param {[number, number]} [values] - Range [min, max]. If undefined, returns current range.
     * @returns {Object|[number, number]} This scale for chaining, or current range if called without arguments
     */
    scale.range = function (values) {
        if (values === undefined) {
            return [rangeMin, rangeMax];
        }
        rangeMin = values[0];
        rangeMax = values[1];
        return scale;
    };

    /**
     * Create an independent copy of this scale
     * @returns {Object} New scale with same domain and range
     */
    scale.copy = function () {
        return scaleLinear()
            .domain([domainMin, domainMax])
            .range([rangeMin, rangeMax]);
    };

    /**
     * Create a new scale rescaled by zoom transform (for X axis)
     * Used to recalculate domain values when zoom/pan is applied
     * 
     * @param {Object} transform - Zoom transform with properties: k (scale), x (pan)
     * @returns {Object} New rescaled linear scale
     * 
     * @example
     * const transform = { k: 2, x: 100, y: 0 };
     * const rescaled = xScale.rescaleX(transform);
     * // rescaled now maps the zoomed/panned domain
     */
    scale.rescaleX = function (transform) {
        // Formula: newValue = (oldValue - transform.x) / transform.k
        // Create scale that undoes the zoom/pan transformation
        const k = transform.k;
        const x = transform.x;

        // Map from transformed screen space back to original domain
        // rangeMin and rangeMax represent current screen coordinates
        // We need to reverse the zoom/pan to get back to domain values
        const newMin = (rangeMin - x) / k;
        const newMax = (rangeMax - x) / k;

        return scaleLinear()
            .domain([newMin, newMax])
            .range([rangeMin, rangeMax]);
    };

    /**
     * Create a new scale rescaled by zoom transform (for Y axis)
     * Used to recalculate domain values when zoom/pan is applied
     * 
     * @param {Object} transform - Zoom transform with properties: k (scale), y (pan)
     * @returns {Object} New rescaled linear scale
     */
    scale.rescaleY = function (transform) {
        const k = transform.k;
        const y = transform.y;

        // Same logic as rescaleX but for Y axis
        const newMin = (rangeMin - y) / k;
        const newMax = (rangeMax - y) / k;

        return scaleLinear()
            .domain([newMin, newMax])
            .range([rangeMin, rangeMax]);
    };

    return scale;
}
