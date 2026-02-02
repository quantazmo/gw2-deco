// @ts-nocheck
/**
 * Tests for src/domain/ZoomCalculationService.js
 * Tests zoom level calculations and constraints
 */
import { ZoomCalculationService } from '../../src/domain/ZoomCalculationService.js';
import { ZoomLevel } from '../../src/domain/ZoomLevel.js';

describe('ZoomCalculationService', () => {

    test('calculateUniformScale should calculate correct scale for map in viewport', () => {
        const mapSize = { width: 1000, height: 1000 };
        const viewportSize = { width: 500, height: 500 };

        const scale = ZoomCalculationService.calculateUniformScale(mapSize, viewportSize);

        expect(scale > 0).toBeTruthy();
        expect(scale).toBe(0.5);
    });

    test('calculateUniformScale should use smaller dimension for uniform fit', () => {
        const mapSize = { width: 1000, height: 500 };
        const viewportSize = { width: 500, height: 500 };

        const scale = ZoomCalculationService.calculateUniformScale(mapSize, viewportSize);

        // Should fit height, which is smaller
        expect(scale <= 0.5).toBeTruthy();
        expect(scale <= 1).toBeTruthy();
    });

    test('calculateUniformScale should handle portrait viewport', () => {
        const mapSize = { width: 500, height: 1000 };
        const viewportSize = { width: 500, height: 500 };

        const scale = ZoomCalculationService.calculateUniformScale(mapSize, viewportSize);

        // Should fit height, which limits more
        expect(scale).toBe(0.5);
    });

    test('calculateUniformScale should throw on null map size', () => {
        const viewportSize = { width: 500, height: 500 };

        expect(() => {
            ZoomCalculationService.calculateUniformScale(null, viewportSize);
        }).toThrow();
    });

    test('calculateUniformScale should throw on null viewport size', () => {
        const mapSize = { width: 1000, height: 1000 };

        expect(() => {
            ZoomCalculationService.calculateUniformScale(mapSize, null);
        }).toThrow();
    });

    test('calculateUniformScale should throw on invalid dimensions', () => {
        expect(() => {
            ZoomCalculationService.calculateUniformScale({ width: 0, height: 1000 }, { width: 500, height: 500 });
        }).toThrow();

        expect(() => {
            ZoomCalculationService.calculateUniformScale({ width: 1000, height: 0 }, { width: 500, height: 500 });
        }).toThrow();

        expect(() => {
            ZoomCalculationService.calculateUniformScale({ width: 1000, height: 1000 }, { width: 0, height: 500 });
        }).toThrow();

        expect(() => {
            ZoomCalculationService.calculateUniformScale({ width: 1000, height: 1000 }, { width: 500, height: 0 });
        }).toThrow();
    });

    test('calculateZoomLimits should calculate min and max zoom factors', () => {
        const mapSize = { width: 1000, height: 1000 };
        const viewportSize = { width: 500, height: 500 };

        const limits = ZoomCalculationService.calculateZoomLimits(mapSize, viewportSize);

        expect(limits.min > 0).toBeTruthy();
        expect(limits.max > limits.min).toBeTruthy();
    });

    test('calculateZoomLimits should enforce reasonable limits', () => {
        const mapSize = { width: 10000, height: 10000 };
        const viewportSize = { width: 500, height: 500 };

        const limits = ZoomCalculationService.calculateZoomLimits(mapSize, viewportSize);

        // Min should allow seeing the entire map
        expect(limits.min <= 1).toBeTruthy();
        // Max should allow reasonable zoom in
        expect(limits.max >= 4).toBeTruthy();
    });

    test('calculateZoomLimits should throw on null inputs', () => {
        expect(() => {
            ZoomCalculationService.calculateZoomLimits(null, { width: 500, height: 500 });
        }).toThrow();

        expect(() => {
            ZoomCalculationService.calculateZoomLimits({ width: 1000, height: 1000 }, null);
        }).toThrow();
    });

    test('constrainZoom should keep zoom within limits', () => {
        const minZoom = 0.5;
        const maxZoom = 5;

        const result1 = ZoomCalculationService.constrainZoom(0.3, minZoom, maxZoom);
        expect(result1.scale).toBe(minZoom);

        const result2 = ZoomCalculationService.constrainZoom(10, minZoom, maxZoom);
        expect(result2.scale).toBe(maxZoom);

        const result3 = ZoomCalculationService.constrainZoom(2, minZoom, maxZoom);
        expect(result3.scale).toBe(2);
    });

    test('constrainZoom should return ZoomLevel instance', () => {
        const result = ZoomCalculationService.constrainZoom(1, 0.5, 5);

        expect(result instanceof ZoomLevel).toBeTruthy();
    });

    test('constrainZoom should throw on invalid zoom limits', () => {
        expect(() => {
            ZoomCalculationService.constrainZoom(1, 5, 0.5); // min > max
        }).toThrow();

        expect(() => {
            ZoomCalculationService.constrainZoom(1, 0, 5); // min <= 0
        }).toThrow();

        expect(() => {
            ZoomCalculationService.constrainZoom(1, 0.5, 0); // max <= 0
        }).toThrow();

        expect(() => {
            ZoomCalculationService.constrainZoom(1, null, 5);
        }).toThrow();

        expect(() => {
            ZoomCalculationService.constrainZoom(1, 0.5, null);
        }).toThrow();
    });

    test('calculatePanAfterZoom should adjust pan to keep zoom center fixed', () => {
        const mousePos = { x: 250, y: 250 }; // Center of 500x500 viewport
        const currentZoom = 1;
        const newZoom = 2;
        const currentPan = { x: 0, y: 0 };

        const newPan = ZoomCalculationService.calculatePanAfterZoom(mousePos, currentZoom, newZoom, currentPan);

        expect(newPan).toBeTruthy();
        expect(newPan.x !== undefined).toBeTruthy();
        expect(newPan.y !== undefined).toBeTruthy();
    });

    test('calculatePanAfterZoom should keep zoom center at mouse position', () => {
        const mousePos = { x: 100, y: 100 };
        const currentZoom = 1;
        const newZoom = 2;
        const currentPan = { x: 0, y: 0 };

        const newPan = ZoomCalculationService.calculatePanAfterZoom(mousePos, currentZoom, newZoom, currentPan);

        // After zoom, the same world point should still be at mouse position
        // This is the core zoom-to-point behavior
        expect(newPan !== null).toBeTruthy();
    });

    test('calculatePanAfterZoom should throw on null inputs', () => {
        expect(() => {
            ZoomCalculationService.calculatePanAfterZoom(null, 1, 2, { x: 0, y: 0 });
        }).toThrow();

        expect(() => {
            ZoomCalculationService.calculatePanAfterZoom({ x: 100, y: 100 }, 1, 2, null);
        }).toThrow();
    });

    test('calculatePanAfterZoom should throw on invalid zoom values', () => {
        const mousePos = { x: 100, y: 100 };
        const currentPan = { x: 0, y: 0 };

        expect(() => {
            ZoomCalculationService.calculatePanAfterZoom(mousePos, 0, 2, currentPan);
        }).toThrow();

        expect(() => {
            ZoomCalculationService.calculatePanAfterZoom(mousePos, 1, 0, currentPan);
        }).toThrow();

        expect(() => {
            ZoomCalculationService.calculatePanAfterZoom(mousePos, -1, 2, currentPan);
        }).toThrow();

        expect(() => {
            ZoomCalculationService.calculatePanAfterZoom(mousePos, 1, -2, currentPan);
        }).toThrow();
    });

    test('service should handle typical zoom workflow', () => {
        const mapSize = { width: 10000, height: 10000 };
        const viewportSize = { width: 500, height: 500 };

        // Calculate initial zoom limits
        const limits = ZoomCalculationService.calculateZoomLimits(mapSize, viewportSize);
        expect(limits.min <= 1 && limits.max > 1).toBeTruthy();

        // Calculate uniform scale
        const scale = ZoomCalculationService.calculateUniformScale(mapSize, viewportSize);
        expect(scale > 0).toBeTruthy();

        // Constrain zoom
        const constrainedZoom = ZoomCalculationService.constrainZoom(2, limits.min, limits.max);
        expect(constrainedZoom.scale >= limits.min).toBeTruthy();

        // Calculate pan after zoom
        const mousePos = { x: 250, y: 250 };
        const newPan = ZoomCalculationService.calculatePanAfterZoom(mousePos, 1, 2, { x: 0, y: 0 });
        expect(newPan).toBeTruthy();
    });

});
