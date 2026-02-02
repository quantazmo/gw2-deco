// @ts-nocheck
/**
 * XML Layout Adapter
 * Handles parsing and validating XML layout files
 * Responsible for converting XML strings into layout objects
 */

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {string[]} errors - Array of error messages (empty if valid)
 */

export class XmlLayoutAdapter {
    /**
     * Parse an XML layout string and return a layout object
     * @param {string} xmlString - The XML content as a string
     * @returns {Promise<Object>} Layout object with id, name, decorations
     * @throws {Error} If XML is invalid or required fields are missing
     */
    static async parseLayout(xmlString) {
        const validationResult = this.validateXmlString(xmlString);
        if (!validationResult.isValid) {
            throw new Error(`XML validation failed:\n${validationResult.errors.join('\n')}`);
        }

        const xmlDoc = this._parseXmlString(xmlString);
        return this._extractLayout(xmlDoc);
    }

    /**
     * Validate an XML string before parsing
     * @param {string} xmlString - The XML content to validate
     * @returns {ValidationResult} Validation result
     */
    static validateXmlString(xmlString) {
        const errors = [];

        // Check if string is empty
        if (!xmlString || typeof xmlString !== 'string' || xmlString.trim().length === 0) {
            errors.push('XML string cannot be empty');
            return { isValid: false, errors };
        }

        // Try to parse and check for parser errors
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

            if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                errors.push('XML parsing error: Invalid XML syntax');
                return { isValid: false, errors };
            }

            // Validate required root element
            const rootElement = xmlDoc.documentElement;
            if (!rootElement) {
                errors.push('XML document has no root element');
                return { isValid: false, errors };
            }

            // Validate required attributes on root
            if (!rootElement.hasAttribute('mapId')) {
                errors.push('Root element must have a "mapId" attribute');
            }
            if (!rootElement.hasAttribute('mapName')) {
                errors.push('Root element must have a "mapName" attribute');
            }

            // Validate mapId is a valid number
            const mapId = rootElement.getAttribute('mapId');
            if (isNaN(parseInt(mapId))) {
                errors.push(`mapId must be a valid number, got: "${mapId}"`);
            }

            // Validate each decoration has required fields
            const props = xmlDoc.getElementsByTagName('prop');
            for (let i = 0; i < props.length; i++) {
                const propErrors = this._validatePropElement(props[i], i);
                errors.push(...propErrors);
            }
        } catch (error) {
            errors.push(`Unexpected error during validation: ${error.message}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate a single prop (decoration) element
     * @private
     */
    static _validatePropElement(propElement, index) {
        const errors = [];
        const requiredAttrs = ['id', 'name', 'pos', 'rot', 'scl'];

        for (const attr of requiredAttrs) {
            if (!propElement.hasAttribute(attr)) {
                errors.push(`Decoration #${index + 1} is missing required attribute: "${attr}"`);
            }
        }

        // Validate position format if present
        if (propElement.hasAttribute('pos')) {
            const pos = propElement.getAttribute('pos').trim().split(/\s+/);
            if (pos.length !== 3 || !pos.every(v => !isNaN(parseFloat(v)))) {
                errors.push(`Decoration #${index + 1} has invalid "pos" format. Expected 3 numbers, got: "${propElement.getAttribute('pos')}"`);
            }
        }

        // Validate rotation format if present
        if (propElement.hasAttribute('rot')) {
            const rot = propElement.getAttribute('rot').trim().split(/\s+/);
            if (rot.length !== 3 || !rot.every(v => !isNaN(parseFloat(v)))) {
                errors.push(`Decoration #${index + 1} has invalid "rot" format. Expected 3 numbers, got: "${propElement.getAttribute('rot')}"`);
            }
        }

        // Validate scale is a number if present
        if (propElement.hasAttribute('scl')) {
            const scl = propElement.getAttribute('scl');
            if (isNaN(parseFloat(scl))) {
                errors.push(`Decoration #${index + 1} has invalid "scl" value. Expected a number, got: "${scl}"`);
            }
        }

        // Validate id is a number if present
        if (propElement.hasAttribute('id')) {
            const id = propElement.getAttribute('id');
            if (isNaN(parseInt(id))) {
                errors.push(`Decoration #${index + 1} has invalid "id" value. Expected an integer, got: "${id}"`);
            }
        }

        return errors;
    }

    /**
     * Parse XML string into DOM
     * @private
     */
    static _parseXmlString(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
            throw new Error('XML parsing failed: Invalid XML structure');
        }

        return xmlDoc;
    }

    /**
     * Extract layout data from parsed XML document
     * @private
     */
    static _extractLayout(xmlDoc) {
        const xmlMap = xmlDoc.documentElement;
        const mapId = parseInt(xmlMap.getAttribute('mapId'));
        const mapName = xmlMap.getAttribute('mapName');

        const decorations = [...xmlDoc.getElementsByTagName('prop')]
            .map((xmlProp, index) => {
                try {
                    return this._extractDecoration(xmlProp);
                } catch (error) {
                    throw new Error(`Error parsing decoration #${index + 1}: ${error.message}`);
                }
            });

        return {
            id: mapId,
            name: mapName,
            decorations
        };
    }

    /**
     * Extract a single decoration from a prop element
     * @private
     */
    static _extractDecoration(xmlProp) {
        const position = xmlProp.getAttribute('pos').trim().split(/\s+/).map(v => parseFloat(v));
        const rotation = xmlProp.getAttribute('rot').trim().split(/\s+/).map(v => parseFloat(v));

        return {
            id: parseInt(xmlProp.getAttribute('id')),
            name: xmlProp.getAttribute('name'),
            position: {
                x: position[0],
                y: position[1],
                z: position[2]
            },
            rotation: {
                x: rotation[0],
                y: rotation[1],
                z: rotation[2]
            },
            scale: parseFloat(xmlProp.getAttribute('scl'))
        };
    }
}
