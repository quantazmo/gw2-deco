// @ts-nocheck
/**
 * Additional tests for src/domain/CoordinateConversionService.js
 * Covers: mapToContinent, worldToMap edge cases
 */
import { CoordinateConversionService } from '../../src/domain/CoordinateConversionService.js';
import { ContinentCoordinate } from '../../src/domain/ContinentCoordinate.js';
import { MapCoordinate } from '../../src/domain/MapCoordinate.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';

const FLOOR_DATA = {
    continent_rect: [[0, 16384], [16384, 0]],
    map_rect: [[0, 0], [16384, 16384]]
};

describe('CoordinateConversionService — additional coverage', () => {

    describe('mapToContinent', () => {
        test('converts map coordinates to continent coordinates', () => {
            const mapCoord = new MapCoordinate(8192, 8192);
            const result = CoordinateConversionService.mapToContinent(mapCoord, FLOOR_DATA);
            expect(result).toBeInstanceOf(ContinentCoordinate);
            expect(result.x).toBeCloseTo(8192);
        });

        test('round-trips continent → map → continent', () => {
            const original = new ContinentCoordinate(4000, 12000);
            const mapCoord = CoordinateConversionService.continentToMap(original, FLOOR_DATA);
            const back = CoordinateConversionService.mapToContinent(mapCoord, FLOOR_DATA);
            expect(back.x).toBeCloseTo(original.x, 2);
            expect(back.y).toBeCloseTo(original.y, 2);
        });

        test('throws on null mapCoord', () => {
            expect(() =>
                CoordinateConversionService.mapToContinent(null, FLOOR_DATA)
            ).toThrow();
        });

        test('throws on null mapFloorData', () => {
            expect(() =>
                CoordinateConversionService.mapToContinent(new MapCoordinate(0, 0), null)
            ).toThrow();
        });

        test('throws when continent_rect or map_rect is missing', () => {
            expect(() =>
                CoordinateConversionService.mapToContinent(new MapCoordinate(0, 0), {})
            ).toThrow();
        });
    });

    describe('worldToMap — additional paths', () => {
        test('converts world coordinates using object-format bounds', () => {
            const worldCoord = new WorldCoordinate(100, 200, 0, 0);
            const mapFloorData = {
                bounds: {
                    min: { x: 0, y: 0 },
                    max: { x: 500, y: 500 }
                }
            };
            const result = CoordinateConversionService.worldToMap(worldCoord, mapFloorData);
            expect(result).toBeInstanceOf(MapCoordinate);
            expect(result.x).toBe(100);
            expect(result.y).toBe(200);
        });

        test('converts world coordinates using GW2 API array-format rect', () => {
            const worldCoord = new WorldCoordinate(5500, 21000, 0, 0);
            const mapFloorData = {
                rect: [[5120, 25600], [10240, 20480]]
            };
            const result = CoordinateConversionService.worldToMap(worldCoord, mapFloorData);
            expect(result).toBeInstanceOf(MapCoordinate);
        });

        test('throws when bounds has neither min/max nor correct array format', () => {
            const worldCoord = new WorldCoordinate(0, 0, 0, 0);
            expect(() =>
                CoordinateConversionService.worldToMap(worldCoord, { bounds: {} })
            ).toThrow();
        });

        test('throws on invalid array format for rect', () => {
            const worldCoord = new WorldCoordinate(0, 0, 0, 0);
            expect(() =>
                CoordinateConversionService.worldToMap(worldCoord, { rect: [[1, 2]] })
            ).toThrow();
        });

        test('throws on missing bounds/rect key entirely', () => {
            const worldCoord = new WorldCoordinate(0, 0, 0, 0);
            expect(() =>
                CoordinateConversionService.worldToMap(worldCoord, { other: 'data' })
            ).toThrow();
        });
    });

    describe('continentToMap — missing continent_rect/map_rect', () => {
        test('throws when continent_rect is present but map_rect is missing', () => {
            const coord = new ContinentCoordinate(1000, 1000);
            expect(() =>
                CoordinateConversionService.continentToMap(coord, { continent_rect: [[0, 100], [100, 0]] })
            ).toThrow();
        });
    });

    describe('screenToMap — missing scale throws', () => {
        test('throws on null scale', () => {
            expect(() =>
                CoordinateConversionService.screenToMap(
                    { x: 100, y: 100 },
                    { xZoom: 1, yZoom: 1, xPan: 0, yPan: 0 },
                    null
                )
            ).toThrow();
        });
    });

    describe('mapToScreen — missing scale throws', () => {
        test('throws on null scale', () => {
            expect(() =>
                CoordinateConversionService.mapToScreen(
                    { x: 100, y: 100 },
                    { xZoom: 1, yZoom: 1, xPan: 0, yPan: 0 },
                    null
                )
            ).toThrow();
        });
    });
});
