// @ts-nocheck
/**
 * Additional tests for src/domain/LayoutValidationService.js
 * Covers: getValidationSummary, scale warnings, missing validateState, validateLayout
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

function makeLayerWithDec(layerId = 'l1', decId = 'd1', decName = 'Tree') {
    const layer = new Layer(layerId, 'Layer');
    layer.addDecoration(new Decoration(decId, decName, makeCoord(), 0, 1));
    return layer;
}

function makeValidLayout() {
    const layout = new HomesteadLayout('t1', 'Valid Layout');
    layout.setMap(new GW2Map(1, 'Test Map', 1, 1));
    layout.addLayer(makeLayerWithDec());
    return layout;
}

describe('LayoutValidationService — additional coverage', () => {

    describe('getValidationSummary', () => {
        test('returns "Layout is valid" for valid result', () => {
            const layout = makeValidLayout();
            const validationResult = DecorationLayoutValidationService.validateLayout(layout);
            const summary = DecorationLayoutValidationService.getValidationSummary(validationResult);
            expect(summary.summary).toBe('Layout is valid');
            expect(summary.isValid).toBe(true);
            expect(summary.errorCount).toBe(0);
        });

        test('returns error count in summary for invalid result', () => {
            const layout = new HomesteadLayout('t1', 'Invalid');
            // no map, no layers
            const validationResult = DecorationLayoutValidationService.validateLayout(layout);
            const summary = DecorationLayoutValidationService.getValidationSummary(validationResult);
            expect(summary.isValid).toBe(false);
            expect(summary.errorCount).toBeGreaterThan(0);
            expect(summary.summary).toContain('error');
        });

        test('includes ERROR: prefixed messages in details', () => {
            const layout = new HomesteadLayout('t1', 'T');
            const result = DecorationLayoutValidationService.validateLayout(layout);
            const summary = DecorationLayoutValidationService.getValidationSummary(result);
            expect(summary.details.some(d => d.startsWith('ERROR:'))).toBe(true);
        });

        test('warningCount is 0 when no warnings', () => {
            const layout = makeValidLayout();
            const result = DecorationLayoutValidationService.validateLayout(layout);
            const summary = DecorationLayoutValidationService.getValidationSummary(result);
            expect(summary.warningCount).toBe(0);
        });
    });

    describe('validateDecoration — scale warnings', () => {
        test('returns warning when scale < 0.1', () => {
            const dec = new Decoration('d1', 'Tree', makeCoord(), 0, 0.05);
            const result = DecorationLayoutValidationService.validateDecoration(dec);
            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0]).toContain('small');
        });

        test('returns warning when scale > 100', () => {
            const dec = new Decoration('d1', 'Tree', makeCoord(), 0, 150);
            const result = DecorationLayoutValidationService.validateDecoration(dec);
            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0]).toContain('large');
        });

        test('no warnings for scale = 1', () => {
            const dec = new Decoration('d1', 'Tree', makeCoord(), 0, 1);
            const result = DecorationLayoutValidationService.validateDecoration(dec);
            expect(result.warnings).toHaveLength(0);
        });

        test('null decoration returns isValid:false', () => {
            const result = DecorationLayoutValidationService.validateDecoration(null);
            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain('null');
        });
    });

    describe('validateDecoration — missing validateState method', () => {
        test('returns error when decoration lacks validateState', () => {
            const fakeDec = { id: 'd1', name: 'Fake', scale: 1 };
            const result = DecorationLayoutValidationService.validateDecoration(fakeDec);
            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain('validateState');
        });
    });

    describe('validateLayer — missing validateState method', () => {
        test('returns error when layer lacks validateState', () => {
            const fakeLayer = {
                id: 'l1',
                name: 'Fake',
                getAllDecorations: () => []
            };
            const result = DecorationLayoutValidationService.validateLayer(fakeLayer);
            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain('validateState');
        });

        test('null layer returns isValid:false', () => {
            const result = DecorationLayoutValidationService.validateLayer(null);
            expect(result.isValid).toBe(false);
        });

        test('warns when layer has no decorations', () => {
            const fakeLayer = {
                id: 'l1',
                name: 'Fake',
                validateState: () => ({ isValid: true, errors: [] }),
                getAllDecorations: () => []
            };
            const result = DecorationLayoutValidationService.validateLayer(fakeLayer);
            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0]).toContain('no decorations');
        });
    });

    describe('validateLayout', () => {
        test('validates a fully valid layout', () => {
            const result = DecorationLayoutValidationService.validateLayout(makeValidLayout());
            expect(result.isValid).toBe(true);
        });

        test('returns errors when layout is null', () => {
            const result = DecorationLayoutValidationService.validateLayout(null);
            expect(result.isValid).toBe(false);
            expect(result.errors.layout.length).toBeGreaterThan(0);
        });

        test('returns layer errors for empty layers', () => {
            const layout = new HomesteadLayout('t1', 'T');
            layout.setMap(new GW2Map(1, 'Map', 1, 1));
            // No layers added
            const result = DecorationLayoutValidationService.validateLayout(layout);
            expect(result.errors.layers.length).toBeGreaterThan(0);
        });

        test('collects decoration warnings for large scale', () => {
            const layout = new HomesteadLayout('t1', 'T');
            layout.setMap(new GW2Map(1, 'Map', 1, 1));
            const layer = new Layer('l1', 'Layer');
            layer.addDecoration(new Decoration('d1', 'Big', makeCoord(), 0, 200));
            layout.addLayer(layer);
            const result = DecorationLayoutValidationService.validateLayout(layout);
            // Warnings may be in layers or decorations
            const allWarnings = Object.values(result.warnings).flat();
            expect(allWarnings.some(w => w.includes('large'))).toBe(true);
        });
    });
});
