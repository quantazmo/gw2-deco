// @ts-nocheck
/**
 * Tests for src/domain/GW2Map.js
 */
import { GW2Map } from '../../src/domain/GW2Map.js';
import { MapBoundary } from '../../src/domain/MapBoundary.js';

const triangle = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }];

describe('GW2Map', () => {
    describe('constructor / validate', () => {
        test('creates with valid args', () => {
            const m = new GW2Map(1, 'Homestead', 1, 0);
            expect(m.id).toBe(1);
            expect(m.name).toBe('Homestead');
            expect(m.continent_id).toBe(1);
            expect(m.floor).toBe(0);
            expect(m.tiles).toEqual([]);
            expect(m.boundary).toBeNull();
            expect(m.rect).toBeNull();
        });

        test('floor defaults to 0', () => {
            const m = new GW2Map(1, 'Map', 1);
            expect(m.floor).toBe(0);
        });

        test('throws for non-integer id', () => {
            expect(() => new GW2Map(1.5, 'Map', 1)).toThrow();
            expect(() => new GW2Map('bad', 'Map', 1)).toThrow();
        });

        test('throws for negative id', () => {
            expect(() => new GW2Map(-1, 'Map', 1)).toThrow();
        });

        test('throws for non-string name', () => {
            expect(() => new GW2Map(1, 42, 1)).toThrow();
        });

        test('throws for empty name', () => {
            expect(() => new GW2Map(1, '   ', 1)).toThrow();
        });

        test('throws for non-integer continentId', () => {
            expect(() => new GW2Map(1, 'Map', 1.5)).toThrow();
        });

        test('throws for negative continentId', () => {
            expect(() => new GW2Map(1, 'Map', -1)).toThrow();
        });
    });

    describe('setBoundary', () => {
        test('sets a MapBoundary', () => {
            const m = new GW2Map(1, 'Map', 1);
            const b = new MapBoundary(triangle);
            m.setBoundary(b);
            expect(m.boundary).toBe(b);
        });

        test('throws for invalid boundary', () => {
            const m = new GW2Map(1, 'Map', 1);
            expect(() => m.setBoundary(null)).toThrow();
            expect(() => m.setBoundary({})).toThrow();
        });
    });

    describe('setTiles / addTile / hasTiles', () => {
        test('setTiles replaces tiles', () => {
            const m = new GW2Map(1, 'Map', 1);
            m.setTiles([{ x: 0, y: 0 }]);
            expect(m.tiles).toHaveLength(1);
        });

        test('setTiles throws for non-array', () => {
            const m = new GW2Map(1, 'Map', 1);
            expect(() => m.setTiles('bad')).toThrow();
        });

        test('addTile adds a single tile', () => {
            const m = new GW2Map(1, 'Map', 1);
            m.addTile({ x: 1, y: 2 });
            expect(m.tiles).toHaveLength(1);
        });

        test('addTile throws for null', () => {
            const m = new GW2Map(1, 'Map', 1);
            expect(() => m.addTile(null)).toThrow();
        });

        test('hasTiles returns false when empty', () => {
            expect(new GW2Map(1, 'Map', 1).hasTiles()).toBe(false);
        });

        test('hasTiles returns true after adding', () => {
            const m = new GW2Map(1, 'Map', 1);
            m.addTile({ x: 0, y: 0 });
            expect(m.hasTiles()).toBe(true);
        });
    });

    describe('setRect / getRect', () => {
        test('sets and gets rect', () => {
            const m = new GW2Map(1, 'Map', 1);
            m.setRect({ x: 0, y: 0 }, { x: 100, y: 200 });
            const r = m.getRect();
            expect(r.min).toEqual({ x: 0, y: 0 });
            expect(r.max).toEqual({ x: 100, y: 200 });
            expect(r.width).toBe(100);
            expect(r.height).toBe(200);
        });

        test('throws for invalid args', () => {
            const m = new GW2Map(1, 'Map', 1);
            expect(() => m.setRect(null, { x: 100, y: 200 })).toThrow();
            expect(() => m.setRect({ x: 0, y: 0 }, null)).toThrow();
        });
    });

    describe('hasBoundary', () => {
        test('returns false initially', () => {
            expect(new GW2Map(1, 'Map', 1).hasBoundary()).toBe(false);
        });

        test('returns true after setBoundary', () => {
            const m = new GW2Map(1, 'Map', 1);
            m.setBoundary(new MapBoundary(triangle));
            expect(m.hasBoundary()).toBe(true);
        });
    });

    describe('validateState', () => {
        test('valid map returns isValid true', () => {
            const m = new GW2Map(1, 'Map', 1);
            expect(m.validateState().isValid).toBe(true);
        });

        test('with boundary includes boundary validation', () => {
            const m = new GW2Map(1, 'Map', 1);
            m.setBoundary(new MapBoundary(triangle));
            const result = m.validateState();
            expect(result.isValid).toBe(true);
        });
    });

    describe('toDTO', () => {
        test('returns DTO with core fields', () => {
            const m = new GW2Map(1, 'Homestead', 2, 3);
            const dto = m.toDTO();
            expect(dto.id).toBe(1);
            expect(dto.name).toBe('Homestead');
            expect(dto.continent_id).toBe(2);
            expect(dto.floor).toBe(3);
            expect(dto.boundary).toBeNull();
            expect(dto.rect).toBeNull();
        });

        test('includes boundary in DTO', () => {
            const m = new GW2Map(1, 'Map', 1);
            m.setBoundary(new MapBoundary(triangle));
            expect(m.toDTO().boundary).toBeTruthy();
        });

        test('includes rect in DTO', () => {
            const m = new GW2Map(1, 'Map', 1);
            m.setRect({ x: 0, y: 0 }, { x: 100, y: 200 });
            expect(m.toDTO().rect).toBeTruthy();
        });
    });

    describe('clone', () => {
        test('creates independent copy', () => {
            const m = new GW2Map(1, 'Map', 1, 2);
            m.addTile({ x: 0, y: 0 });
            m.setBoundary(new MapBoundary(triangle));
            m.setRect({ x: 0, y: 0 }, { x: 100, y: 100 });
            const c = m.clone();
            expect(c.id).toBe(1);
            expect(c.tiles).toHaveLength(1);
            expect(c.boundary).toBeTruthy();
            expect(c.rect).toBeTruthy();
            expect(c).not.toBe(m);
        });

        test('clone without boundary/rect', () => {
            const m = new GW2Map(1, 'Map', 1);
            const c = m.clone();
            expect(c.boundary).toBeNull();
            expect(c.rect).toBeNull();
        });
    });

    describe('equals', () => {
        test('equal maps', () => {
            const a = new GW2Map(1, 'Map', 1, 0);
            const b = new GW2Map(1, 'Map', 1, 0);
            expect(a.equals(b)).toBe(true);
        });

        test('different id', () => {
            expect(new GW2Map(1, 'Map', 1).equals(new GW2Map(2, 'Map', 1))).toBe(false);
        });

        test('non-GW2Map returns false', () => {
            expect(new GW2Map(1, 'Map', 1).equals(null)).toBe(false);
        });
    });

    describe('toString', () => {
        test('includes id and name', () => {
            const s = new GW2Map(42, 'Hearth', 1).toString();
            expect(s).toContain('42');
            expect(s).toContain('Hearth');
        });
    });

    describe('static fromDTO', () => {
        test('creates from basic DTO', () => {
            const dto = { id: 1, name: 'Map', continent_id: 1, floor: 0 };
            const m = GW2Map.fromDTO(dto);
            expect(m.id).toBe(1);
        });

        test('creates from DTO with tiles, boundary, rect', () => {
            const dto = {
                id: 1, name: 'Map', continent_id: 1, floor: 0,
                tiles: [{ x: 0, y: 0 }],
                boundary: { points: triangle },
                rect: { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } }
            };
            const m = GW2Map.fromDTO(dto);
            expect(m.tiles).toHaveLength(1);
            expect(m.boundary).toBeTruthy();
            expect(m.rect).toBeTruthy();
        });
    });
});
