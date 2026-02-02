/**
 * DecorationLayoutValidationService - Domain Service for validating layouts, layers, and decorations
 */
export class DecorationLayoutValidationService {
    /**
     * Validate a single decoration
     * @param {Decoration} decoration - The decoration to validate
     * @returns {ValidationResult} - {isValid: boolean, errors: string[], warnings: string[]}
     */
    static validateDecoration(decoration: unknown): { isValid: boolean; errors: string[]; warnings: string[] } {
        const errors = [];
        const warnings = [];

        if (!decoration) {
            return { isValid: false, errors: ['Decoration is null or undefined'], warnings: [] };
        }

        try {
            const dec = decoration as { validateState?(): { isValid: boolean; errors: string[] }; scale?: number };
            if (typeof dec.validateState === 'function') {
                const result = dec.validateState();
                if (!result.isValid) {
                    errors.push(...result.errors);
                }
            } else {
                errors.push('Invalid decoration object: missing validateState method');
            }
        } catch (error) {
            errors.push(`Decoration validation error: ${(error as Error).message}`);
        }

        // Additional business rule validations
        const decorAny = decoration as { scale?: number };
        if (decorAny.scale !== undefined && decorAny.scale < 0.1) {
            warnings.push('Decoration scale is very small (< 0.1)');
        }
        if (decorAny.scale !== undefined && decorAny.scale > 100) {
            warnings.push('Decoration scale is very large (> 100)');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate a layer and all its decorations
     * @param {Layer} layer - The layer to validate
     * @returns {ValidationResult} - {isValid: boolean, errors: string[], warnings: string[]}
     */
    static validateLayer(layer: unknown): { isValid: boolean; errors: string[]; warnings: string[] } {
        const errors = [];
        const warnings = [];

        if (!layer) {
            return { isValid: false, errors: ['Layer is null or undefined'], warnings: [] };
        }

        try {
            const lyr = layer as { validateState?(): { isValid: boolean; errors: string[] }; getAllDecorations?(): Array<{ id: string }> };
            if (typeof lyr.validateState === 'function') {
                const result = lyr.validateState();
                if (!result.isValid) {
                    errors.push(...result.errors);
                }
            } else {
                errors.push('Invalid layer object: missing validateState method');
            }
        } catch (error) {
            errors.push(`Layer validation error: ${(error as Error).message}`);
        }

        // Validate all decorations in the layer
        const lyrAny = layer as { getAllDecorations?(): Array<{ id: string }> };
        if (typeof lyrAny.getAllDecorations === 'function') {
            const decorations = lyrAny.getAllDecorations();
            if (decorations.length === 0) {
                warnings.push('Layer contains no decorations');
            }

            for (const decoration of decorations) {
                const decorResult = this.validateDecoration(decoration);
                if (!decorResult.isValid) {
                    errors.push(`Decoration "${decoration.id}": ${decorResult.errors.join(', ')}`);
                }
                if (decorResult.warnings && decorResult.warnings.length > 0) {
                    warnings.push(`Decoration "${decoration.id}": ${decorResult.warnings.join(', ')}`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate an entire layout
     * @param {HomesteadLayout} layout - The layout to validate
     * @returns {Object} - {isValid: boolean, errors: Object, warnings: Object}
     *   errors/warnings have keys: layout, map, layers, decorations
     */
    static validateLayout(layout: unknown): { isValid: boolean; errors: { layout: string[]; map: string[]; layers: string[]; decorations: string[] }; warnings: { layout: string[]; map: string[]; layers: string[]; decorations: string[] } } {
        const result = {
            isValid: false,
            errors: {
                layout: [] as string[],
                map: [] as string[],
                layers: [] as string[],
                decorations: [] as string[]
            },
            warnings: {
                layout: [] as string[],
                map: [] as string[],
                layers: [] as string[],
                decorations: [] as string[]
            }
        };

        if (!layout) {
            result.errors.layout.push('Layout is null or undefined');
            return result;
        }

        type LayoutLike = {
            validateState?(): { isValid: boolean; errors: string[] };
            getMapLoaded?: unknown;
            hasMapLoaded?(): boolean;
            map?: { validateState?(): { isValid: boolean; errors: string[] } } | null;
            getAllLayers?(): Array<{ id: string }>;
        };
        const tmpl = layout as LayoutLike;

        // Validate layout itself
        try {
            if (typeof tmpl.validateState === 'function') {
                const layoutResult = tmpl.validateState();
                if (!layoutResult.isValid) {
                    result.errors.layout.push(...layoutResult.errors);
                }
            } else {
                result.errors.layout.push('Invalid layout object: missing validateState method');
            }
        } catch (error) {
            result.errors.layout.push(`Layout validation error: ${(error as Error).message}`);
        }

        // Validate map
        if (typeof tmpl.getMapLoaded !== 'undefined' || typeof tmpl.hasMapLoaded === 'function') {
            if (!tmpl.hasMapLoaded?.()) {
                result.errors.map.push('No map is loaded');
            } else if (tmpl.map && typeof tmpl.map.validateState === 'function') {
                const mapResult = tmpl.map.validateState();
                if (!mapResult.isValid) {
                    result.errors.map.push(...mapResult.errors);
                }
            }
        }

        // Validate layers
        if (typeof tmpl.getAllLayers === 'function') {
            const layers = tmpl.getAllLayers();

            if (layers.length === 0) {
                result.errors.layers.push('Layout has no layers');
            }

            for (const layer of layers) {
                const layerResult = this.validateLayer(layer);
                if (!layerResult.isValid) {
                    result.errors.layers.push(`Layer "${layer.id}": ${layerResult.errors.join(', ')}`);
                }
                if (layerResult.warnings && layerResult.warnings.length > 0) {
                    result.warnings.layers.push(`Layer "${layer.id}": ${layerResult.warnings.join(', ')}`);
                }

                // Collect decoration issues
                if (layerResult.errors.some(e => e.includes('Decoration'))) {
                    result.errors.decorations.push(...layerResult.errors.filter(e => e.includes('Decoration')));
                }
            }
        }

        result.isValid = Object.values(result.errors).every(arr => arr.length === 0);

        return result;
    }

    /**
     * Get a summary of validation results suitable for UI display
     * @param {Object} validationResult - Result from validateLayout
     * @returns {Object} - {summary: string, errorCount: number, warningCount: number, details: string[]}
     */
    static getValidationSummary(validationResult: { isValid: boolean; errors: Record<string, string[]>; warnings: Record<string, string[]> }) {
        const allErrors = Object.values(validationResult.errors).flat();
        const allWarnings = Object.values(validationResult.warnings).flat();

        const summary = validationResult.isValid
            ? 'Layout is valid'
            : `Layout has ${allErrors.length} error(s)`;

        return {
            summary,
            isValid: validationResult.isValid,
            errorCount: allErrors.length,
            warningCount: allWarnings.length,
            details: [
                ...allErrors.map(e => `ERROR: ${e}`),
                ...allWarnings.map(w => `WARNING: ${w}`)
            ]
        };
    }
}

export default DecorationLayoutValidationService;
