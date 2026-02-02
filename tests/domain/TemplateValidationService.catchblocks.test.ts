// @ts-nocheck
/**
 * Additional tests for LayoutValidationService — targeting catch blocks and
 * missing branches not covered by existing tests.
 *
 * Uncovered lines (previous run): 28, 69, 82, 133-136, 141-146, 162, 170, 200
 */
import { DecorationLayoutValidationService } from '../../src/domain/DecorationLayoutValidationService.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { GW2Map } from '../../src/domain/GW2Map.js';
import { Layer } from '../../src/domain/Layer.js';
import { Decoration } from '../../src/domain/Decoration.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';

function makeCoord() {
    return new WorldCoordinate(10, 20, 0, 0);
}

describe('LayoutValidationService — catch blocks and missing branches', () => {

    // ─────────────────────────────────────────────────────────────────────────
    // validateDecoration – catch block (line 28)
    // ─────────────────────────────────────────────────────────────────────────
    describe('validateDecoration – validateState throws', () => {
        test('catches exception thrown by validateState and reports error', () => {
            const badDec = {
                id: 'd1',
                name: 'Bad',
                scale: 1,
                validateState: () => { throw new Error('boom'); }
            };
            const result = DecorationLayoutValidationService.validateDecoration(badDec);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('boom') || e.includes('error'))).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // validateLayer – catch block (line 69)
    // ─────────────────────────────────────────────────────────────────────────
    describe('validateLayer – validateState throws', () => {
        test('catches exception thrown by layer.validateState and reports error', () => {
            const badLayer = {
                id: 'l1',
                name: 'Bad',
                validateState: () => { throw new Error('layer exploded'); },
                getAllDecorations: () => []
            };
            const result = DecorationLayoutValidationService.validateLayer(badLayer);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('layer exploded') || e.includes('error'))).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // validateLayer – decoration warnings propagated (line 82)
    // ─────────────────────────────────────────────────────────────────────────
    describe('validateLayer – decoration scale warnings', () => {
        test('propagates scale warnings from decorations into layer result', () => {
            // Layer with a decoration that has scale > 100 → validateDecoration returns warnings
            const layer = new Layer('l1', 'Layer 1');
            layer.addDecoration(new Decoration('d1', 'Big', makeCoord(), 0, 200));
            const result = DecorationLayoutValidationService.validateLayer(layer);
            expect(result.isValid).toBe(true); // scale warning does not make it invalid
            expect(result.warnings.some(w => w.includes('large') || w.includes('d1'))).toBe(true);
        });

        test('propagates tiny scale warnings from decorations into layer result', () => {
            const layer = new Layer('l1', 'Layer 1');
            layer.addDecoration(new Decoration('d1', 'Tiny', makeCoord(), 0, 0.01));
            const result = DecorationLayoutValidationService.validateLayer(layer);
            expect(result.isValid).toBe(true);
            expect(result.warnings.some(w => w.includes('small') || w.includes('d1'))).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // validateLayout – layout missing validateState (lines 133-136)
    // ─────────────────────────────────────────────────────────────────────────
    describe('validateLayout – layout object missing validateState', () => {
        test('reports error when layout has no validateState method', () => {
            const fakeLayout = {
                // no validateState
                hasMapLoaded: () => false,
                getAllLayers: () => []
            };
            const result = DecorationLayoutValidationService.validateLayout(fakeLayout);
            expect(result.errors.layout.some(e => e.includes('validateState'))).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // validateLayout – layout.validateState throws (lines 141-146)
    // ─────────────────────────────────────────────────────────────────────────
    describe('validateLayout – layout.validateState throws', () => {
        test('catches exception from layout.validateState', () => {
            const throwingLayout = {
                validateState: () => { throw new Error('layout exploded'); },
                hasMapLoaded: () => false,
                getAllLayers: () => []
            };
            const result = DecorationLayoutValidationService.validateLayout(throwingLayout);
            expect(result.errors.layout.some(e => e.includes('layout exploded') || e.includes('error'))).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // validateLayout – no map loaded (line 162 area)
    // ─────────────────────────────────────────────────────────────────────────
    describe('validateLayout – no map loaded', () => {
        test('reports map error when hasMapLoaded returns false', () => {
            // Use a fake layout that has getMapLoaded defined (so the map validation block runs)
            // but hasMapLoaded() returns false
            const fakeLayout = {
                validateState: () => ({ isValid: true, errors: [] }),
                getMapLoaded: null, // typeof is 'object', not 'undefined' → block runs
                hasMapLoaded: () => false,
                getAllLayers: () => []
            };
            const result = DecorationLayoutValidationService.validateLayout(fakeLayout);
            expect(result.errors.map.some(e => e.includes('map') || e.includes('No'))).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // validateLayout – map.validateState returns errors (line 170 area)
    // ─────────────────────────────────────────────────────────────────────────
    describe('validateLayout – map validateState errors', () => {
        test('collects errors from map.validateState', () => {
            const fakeLayout = {
                validateState: () => ({ isValid: true, errors: [] }),
                getMapLoaded: true,
                hasMapLoaded: () => true,
                map: {
                    validateState: () => ({ isValid: false, errors: ['invalid map boundary'] })
                },
                getAllLayers: () => []
            };
            const result = DecorationLayoutValidationService.validateLayout(fakeLayout);
            expect(result.errors.map.some(e => e.includes('invalid map boundary'))).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // validateLayout – layer warnings collected (line ~200 area)
    // ─────────────────────────────────────────────────────────────────────────
    describe('validateLayout – layer warnings propagated', () => {
        test('collects layer-level warnings into result.warnings.layers', () => {
            const layout = new HomesteadLayout('t1', 'T');
            layout.setMap(new GW2Map(1, 'Map', 1, 1));
            const layer = new Layer('l1', 'Layer 1');
            // Scale > 100 triggers a decoration warning which becomes a layer warning
            layer.addDecoration(new Decoration('d1', 'BigDec', makeCoord(), 0, 150));
            layout.addLayer(layer);
            const result = DecorationLayoutValidationService.validateLayout(layout);
            const allWarnings = Object.values(result.warnings).flat();
            expect(allWarnings.length).toBeGreaterThan(0);
        });

        test('collects decoration errors into result.errors.decorations', () => {
            const fakeLayout = {
                validateState: () => ({ isValid: true, errors: [] }),
                getMapLoaded: true,
                hasMapLoaded: () => true,
                map: { validateState: () => ({ isValid: true, errors: [] }) },
                getAllLayers: () => [{
                    id: 'l1',
                    validateState: () => ({ isValid: true, errors: [] }),
                    getAllDecorations: () => [{
                        id: 'd1',
                        scale: 1,
                        validateState: () => ({ isValid: false, errors: ['Decoration state bad'] })
                    }]
                }]
            };
            const result = DecorationLayoutValidationService.validateLayout(fakeLayout);
            expect(result.errors.decorations.length).toBeGreaterThan(0);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // getValidationSummary – includes WARNING: prefixed messages in details
    // ─────────────────────────────────────────────────────────────────────────
    describe('getValidationSummary – warnings in details', () => {
        test('includes WARNING: prefix for warnings in details', () => {
            const layout = new HomesteadLayout('t1', 'T');
            layout.setMap(new GW2Map(1, 'Map', 1, 1));
            const layer = new Layer('l1', 'Layer');
            layer.addDecoration(new Decoration('d1', 'Dec', makeCoord(), 0, 200));
            layout.addLayer(layer);
            const validationResult = DecorationLayoutValidationService.validateLayout(layout);
            const summary = DecorationLayoutValidationService.getValidationSummary(validationResult);
            expect(summary.warningCount).toBeGreaterThan(0);
            expect(summary.details.some(d => d.startsWith('WARNING:'))).toBe(true);
        });
    });
});
