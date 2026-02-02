// @ts-nocheck
/**
 * Tests for src/domain/CoordinateConversionService.js
 * Tests coordinate system transformations between different spaces
 */
import { CoordinateConversionService } from '../../src/domain/CoordinateConversionService.js';
import { ContinentCoordinate } from '../../src/domain/ContinentCoordinate.js';
import { MapCoordinate } from '../../src/domain/MapCoordinate.js';
import { ScreenCoordinate } from '../../src/domain/ScreenCoordinate.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';

describe('CoordinateConversionService', () => {

    test('continentToMap should convert continent coordinates to map coordinates', () => {
        const continentCoord = new ContinentCoordinate(8192, 8192); // Quarter point
        // continent_rect: [[nw_x, nw_y], [se_x, se_y]] in continent space
        // map_rect:       [[bl_x, bl_y], [tr_x, tr_y]] in map-local space
        const mapFloorData = {
            continent_rect: [[0, 16384], [16384, 0]],
            map_rect: [[0, 0], [16384, 16384]]
        };

        const mapCoord = CoordinateConversionService.continentToMap(continentCoord, mapFloorData);

        expect(mapCoord instanceof MapCoordinate).toBeTruthy();
        // continent (8192, 8192) is the centre → map (8192, 8192)
        expect(mapCoord.x).toBeCloseTo(8192);
        expect(mapCoord.y).toBeCloseTo(8192);
    });

    test('continentToMap should throw on null continent coordinate', () => {
        const mapFloorData = {
            rect: [[0, 16384], [16384, 0]]
        };

        expect(() => {
            CoordinateConversionService.continentToMap(null, mapFloorData);
        }).toThrow();
    });

    test('continentToMap should throw on null map floor data', () => {
        const continentCoord = new ContinentCoordinate(8192, 8192);

        expect(() => {
            CoordinateConversionService.continentToMap(continentCoord, null);
        }).toThrow();
    });

    test('continentToMap should throw on invalid map floor data', () => {
        const continentCoord = new ContinentCoordinate(8192, 8192);

        expect(() => {
            CoordinateConversionService.continentToMap(continentCoord, {});
        }).toThrow();

        expect(() => {
            CoordinateConversionService.continentToMap(continentCoord, { rect: null });
        }).toThrow();
    });

    test('mapToScreen should convert map coordinates to screen coordinates', () => {
        const mapCoord = new MapCoordinate(5000, 5000);
        const zoomState = {
            xZoom: 1,
            yZoom: 1,
            xPan: 0,
            yPan: 0
        };
        const scale = { x: 0.05, y: 0.05 }; // 500px / 10000 map units

        const screenCoord = CoordinateConversionService.mapToScreen(mapCoord, zoomState, scale);

        expect(screenCoord instanceof ScreenCoordinate).toBeTruthy();
        // Verify the result is within screen bounds
        expect(screenCoord.x >= 0).toBeTruthy();
        expect(screenCoord.y >= 0).toBeTruthy();
    });

    test('mapToScreen should throw on null map coordinate', () => {
        const zoomState = {
            xZoom: 1,
            yZoom: 1,
            xPan: 0,
            yPan: 0
        };
        const scale = { x: 1, y: 1 };

        expect(() => {
            CoordinateConversionService.mapToScreen(null, zoomState, scale);
        }).toThrow();
    });

    test('mapToScreen should throw on null zoom state', () => {
        const mapCoord = new MapCoordinate(5000, 5000);
        const scale = { x: 1, y: 1 };

        expect(() => {
            CoordinateConversionService.mapToScreen(mapCoord, null, scale);
        }).toThrow();
    });

    test('mapToScreen should throw on invalid zoom state', () => {
        const mapCoord = new MapCoordinate(5000, 5000);
        const scale = { x: 1, y: 1 };

        expect(() => {
            CoordinateConversionService.mapToScreen(mapCoord, { xZoom: null }, scale);
        }).toThrow();

        expect(() => {
            CoordinateConversionService.mapToScreen(mapCoord, { yZoom: null }, scale);
        }).toThrow();
    });

    test('screenToMap should convert screen coordinates to map coordinates', () => {
        const screenCoord = new ScreenCoordinate(250, 250);
        const zoomState = {
            xZoom: 1,
            yZoom: 1,
            xPan: 0,
            yPan: 0
        };
        const scale = { x: 0.05, y: 0.05 }; // 500px / 10000 map units

        const mapCoord = CoordinateConversionService.screenToMap(screenCoord, zoomState, scale);

        expect(mapCoord instanceof MapCoordinate).toBeTruthy();
        expect(mapCoord.x >= 0).toBeTruthy();
        expect(mapCoord.y >= 0).toBeTruthy();
    });

    test('screenToMap should throw on null screen coordinate', () => {
        const zoomState = {
            xZoom: 1,
            yZoom: 1,
            xPan: 0,
            yPan: 0
        };
        const scale = { x: 1, y: 1 };

        expect(() => {
            CoordinateConversionService.screenToMap(null, zoomState, scale);
        }).toThrow();
    });

    test('screenToMap should throw on null zoom state', () => {
        const screenCoord = new ScreenCoordinate(250, 250);
        const scale = { x: 1, y: 1 };

        expect(() => {
            CoordinateConversionService.screenToMap(screenCoord, null, scale);
        }).toThrow();
    });

    test('screenToMap should throw on invalid zoom state', () => {
        const screenCoord = new ScreenCoordinate(250, 250);
        const scale = { x: 1, y: 1 };

        expect(() => {
            CoordinateConversionService.screenToMap(screenCoord, { xZoom: null }, scale);
        }).toThrow();

        expect(() => {
            CoordinateConversionService.screenToMap(screenCoord, { yZoom: null }, scale);
        }).toThrow();
    });

    test('worldToMap should convert world coordinates to map coordinates', () => {
        const worldCoord = new WorldCoordinate(0, 0, 0, 0);
        const mapFloorData = {
            rect: [[0, 16384], [16384, 0]]
        };

        const mapCoord = CoordinateConversionService.worldToMap(worldCoord, mapFloorData);

        expect(mapCoord instanceof MapCoordinate).toBeTruthy();
    });

    test('worldToMap should throw on null world coordinate', () => {
        const mapFloorData = {
            rect: [[0, 16384], [16384, 0]]
        };

        expect(() => {
            CoordinateConversionService.worldToMap(null, mapFloorData);
        }).toThrow();
    });

    test('worldToMap should throw on null map floor data', () => {
        const worldCoord = new WorldCoordinate(0, 0, 0, 0);

        expect(() => {
            CoordinateConversionService.worldToMap(worldCoord, null);
        }).toThrow();
    });

    test('service should handle chained conversions', () => {
        const continentCoord = new ContinentCoordinate(8192, 8192);
        const mapFloorData = {
            continent_rect: [[0, 16384], [16384, 0]],
            map_rect: [[0, 0], [16384, 16384]]
        };
        const zoomState = {
            xZoom: 1,
            yZoom: 1,
            xPan: 0,
            yPan: 0
        };
        const scale = { x: 0.0305, y: 0.0305 }; // 500px / 16384 map units

        const mapCoord = CoordinateConversionService.continentToMap(continentCoord, mapFloorData);
        const screenCoord = CoordinateConversionService.mapToScreen(mapCoord, zoomState, scale);

        expect(screenCoord instanceof ScreenCoordinate).toBeTruthy();
    });

});
