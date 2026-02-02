// @ts-nocheck
/**
 * Tests for domain value objects:
 * LayerId, ZoomLevel, ScreenCoordinate, WorldCoordinate, MapCoordinate, ContinentCoordinate
 */
import { LayerId } from '../../src/domain/LayerId.js';
import { ZoomLevel } from '../../src/domain/ZoomLevel.js';
import { ScreenCoordinate } from '../../src/domain/ScreenCoordinate.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';
import { MapCoordinate } from '../../src/domain/MapCoordinate.js';
import { ContinentCoordinate } from '../../src/domain/ContinentCoordinate.js';

// ─── LayerId ──────────────────────────────────────────────────────────────────
describe('LayerId', () => {
    test('constructs from string', () => {
        const id = new LayerId('my-layer');
        expect(id.id).toBe('my-layer');
    });

    test('constructs from number', () => {
        const id = new LayerId(42);
        expect(id.id).toBe('42');
    });

    test('trims whitespace', () => {
        const id = new LayerId('  trimmed  ');
        expect(id.id).toBe('trimmed');
    });

    test('throws for non-string/number', () => {
        expect(() => new LayerId(null)).toThrow();
        expect(() => new LayerId({})).toThrow();
        expect(() => new LayerId([])).toThrow();
    });

    test('throws for empty string', () => {
        expect(() => new LayerId('')).toThrow();
        expect(() => new LayerId('   ')).toThrow();
    });

    test('throws for id exceeding 256 chars', () => {
        expect(() => new LayerId('a'.repeat(257))).toThrow();
    });

    test('accepts exactly 256 chars', () => {
        const id = new LayerId('a'.repeat(256));
        expect(id.id).toHaveLength(256);
    });

    test('equals – same id', () => {
        expect(new LayerId('x').equals(new LayerId('x'))).toBe(true);
    });

    test('equals – different id', () => {
        expect(new LayerId('x').equals(new LayerId('y'))).toBe(false);
    });

    test('equals – non-LayerId returns false', () => {
        expect(new LayerId('x').equals('x')).toBe(false);
    });

    test('clone creates equal copy', () => {
        const id = new LayerId('abc');
        const clone = id.clone();
        expect(clone.id).toBe('abc');
        expect(clone).not.toBe(id);
    });

    test('getValue returns string', () => {
        expect(new LayerId('foo').getValue()).toBe('foo');
    });

    test('toObject', () => {
        expect(new LayerId('foo').toObject()).toEqual({ id: 'foo' });
    });

    test('toString', () => {
        expect(new LayerId('foo').toString()).toBe('foo');
    });

    test('static fromObject', () => {
        const id = LayerId.fromObject({ id: 'bar' });
        expect(id.id).toBe('bar');
    });
});

// ─── ZoomLevel ────────────────────────────────────────────────────────────────
describe('ZoomLevel', () => {
    test('constructs with default range', () => {
        const z = new ZoomLevel(1);
        expect(z.scale).toBe(1);
        expect(z.min).toBe(0.1);
        expect(z.max).toBe(10);
    });

    test('constructs with custom range', () => {
        const z = new ZoomLevel(2, 0.5, 5);
        expect(z.min).toBe(0.5);
        expect(z.max).toBe(5);
    });

    test('throws for non-number scale', () => {
        expect(() => new ZoomLevel('bad')).toThrow();
    });

    test('throws for non-finite values', () => {
        expect(() => new ZoomLevel(NaN)).toThrow();
        expect(() => new ZoomLevel(Infinity)).toThrow();
    });

    test('throws when min >= max', () => {
        expect(() => new ZoomLevel(1, 5, 5)).toThrow();
        expect(() => new ZoomLevel(1, 5, 3)).toThrow();
    });

    test('throws when scale out of range', () => {
        expect(() => new ZoomLevel(0.05, 0.1, 10)).toThrow();
        expect(() => new ZoomLevel(11, 0.1, 10)).toThrow();
    });

    test('isAtMinimum', () => {
        const z = new ZoomLevel(0.1, 0.1, 10);
        expect(z.isAtMinimum()).toBe(true);
        expect(new ZoomLevel(1).isAtMinimum()).toBe(false);
    });

    test('isAtMaximum', () => {
        const z = new ZoomLevel(10, 0.1, 10);
        expect(z.isAtMaximum()).toBe(true);
        expect(new ZoomLevel(1).isAtMaximum()).toBe(false);
    });

    test('withScale clamps to range', () => {
        const z = new ZoomLevel(1, 0.1, 10);
        expect(z.withScale(5).scale).toBe(5);
        expect(z.withScale(0.01).scale).toBe(0.1);
        expect(z.withScale(100).scale).toBe(10);
    });

    test('equals', () => {
        const a = new ZoomLevel(1, 0.1, 10);
        const b = new ZoomLevel(1, 0.1, 10);
        expect(a.equals(b)).toBe(true);
        expect(a.equals(new ZoomLevel(2, 0.1, 10))).toBe(false);
        expect(a.equals('not-a-zoom')).toBe(false);
    });

    test('clone creates equal copy', () => {
        const z = new ZoomLevel(3, 1, 5);
        const c = z.clone();
        expect(c.scale).toBe(3);
        expect(c).not.toBe(z);
    });

    test('toObject', () => {
        expect(new ZoomLevel(2, 1, 5).toObject()).toEqual({ scale: 2, min: 1, max: 5 });
    });

    test('toString', () => {
        const s = new ZoomLevel(2, 1, 5).toString();
        expect(s).toContain('2.00');
    });

    test('static fromObject', () => {
        const z = ZoomLevel.fromObject({ scale: 2, min: 1, max: 5 });
        expect(z.scale).toBe(2);
    });
});

// ─── ScreenCoordinate ─────────────────────────────────────────────────────────
describe('ScreenCoordinate', () => {
    test('constructs with x, y', () => {
        const sc = new ScreenCoordinate(10, 20);
        expect(sc.x).toBe(10);
        expect(sc.y).toBe(20);
    });

    test('throws for non-numbers', () => {
        expect(() => new ScreenCoordinate('a', 0)).toThrow();
        expect(() => new ScreenCoordinate(0, null)).toThrow();
    });

    test('throws for non-finite', () => {
        expect(() => new ScreenCoordinate(NaN, 0)).toThrow();
        expect(() => new ScreenCoordinate(0, Infinity)).toThrow();
    });

    test('distanceTo', () => {
        const a = new ScreenCoordinate(0, 0);
        const b = new ScreenCoordinate(3, 4);
        expect(a.distanceTo(b)).toBe(5);
    });

    test('distanceTo throws for wrong type', () => {
        const sc = new ScreenCoordinate(0, 0);
        expect(() => sc.distanceTo({ x: 0, y: 0 })).toThrow();
    });

    test('equals', () => {
        expect(new ScreenCoordinate(5, 6).equals(new ScreenCoordinate(5, 6))).toBe(true);
        expect(new ScreenCoordinate(5, 6).equals(new ScreenCoordinate(5, 7))).toBe(false);
        expect(new ScreenCoordinate(5, 6).equals(null)).toBe(false);
    });

    test('clone', () => {
        const sc = new ScreenCoordinate(5, 6);
        const c = sc.clone();
        expect(c.x).toBe(5);
        expect(c).not.toBe(sc);
    });

    test('toObject', () => {
        expect(new ScreenCoordinate(5, 6).toObject()).toEqual({ x: 5, y: 6 });
    });

    test('toString', () => {
        expect(new ScreenCoordinate(5, 6).toString()).toContain('5');
    });

    test('static fromObject', () => {
        const sc = ScreenCoordinate.fromObject({ x: 7, y: 8 });
        expect(sc.x).toBe(7);
    });
});

// ─── WorldCoordinate ──────────────────────────────────────────────────────────
describe('WorldCoordinate', () => {
    test('constructs with defaults z=0 rotation=0', () => {
        const wc = new WorldCoordinate(1, 2);
        expect(wc.x).toBe(1);
        expect(wc.y).toBe(2);
        expect(wc.z).toBe(0);
        expect(wc.rotation).toBe(0);
    });

    test('constructs with full args', () => {
        const wc = new WorldCoordinate(1, 2, 3, 90);
        expect(wc.z).toBe(3);
        expect(wc.rotation).toBe(90);
    });

    test('throws for non-numbers', () => {
        expect(() => new WorldCoordinate('a', 0)).toThrow();
        expect(() => new WorldCoordinate(0, 0, 'bad', 0)).toThrow();
    });

    test('throws for non-finite', () => {
        expect(() => new WorldCoordinate(NaN, 0)).toThrow();
        expect(() => new WorldCoordinate(0, Infinity)).toThrow();
    });

    test('distanceTo 3D', () => {
        const a = new WorldCoordinate(0, 0, 0);
        const b = new WorldCoordinate(1, 0, 0);
        expect(a.distanceTo(b)).toBe(1);
    });

    test('distanceTo throws for wrong type', () => {
        const wc = new WorldCoordinate(0, 0);
        expect(() => wc.distanceTo({ x: 0, y: 0, z: 0 })).toThrow();
    });

    test('equals – all fields match', () => {
        const a = new WorldCoordinate(1, 2, 3, 90);
        const b = new WorldCoordinate(1, 2, 3, 90);
        expect(a.equals(b)).toBe(true);
    });

    test('equals – z differs', () => {
        expect(new WorldCoordinate(1, 2, 3).equals(new WorldCoordinate(1, 2, 4))).toBe(false);
    });

    test('equals – non-WorldCoordinate', () => {
        expect(new WorldCoordinate(1, 2).equals(null)).toBe(false);
    });

    test('clone', () => {
        const wc = new WorldCoordinate(1, 2, 3, 45);
        const c = wc.clone();
        expect(c.rotation).toBe(45);
        expect(c).not.toBe(wc);
    });

    test('toObject', () => {
        const obj = new WorldCoordinate(1, 2, 3, 90).toObject();
        expect(obj).toEqual({ x: 1, y: 2, z: 3, rotation: 90 });
    });

    test('toString', () => {
        const s = new WorldCoordinate(1, 2, 3, 45).toString();
        expect(s).toContain('1');
        expect(s).toContain('45');
    });

    test('static fromObject', () => {
        const wc = WorldCoordinate.fromObject({ x: 1, y: 2, z: 3, rotation: 90 });
        expect(wc.z).toBe(3);
    });
});

// ─── MapCoordinate ────────────────────────────────────────────────────────────
describe('MapCoordinate', () => {
    test('constructs', () => {
        const mc = new MapCoordinate(5, 10);
        expect(mc.x).toBe(5);
        expect(mc.y).toBe(10);
    });

    test('throws for non-numbers', () => {
        expect(() => new MapCoordinate('a', 0)).toThrow();
    });

    test('throws for non-finite', () => {
        expect(() => new MapCoordinate(NaN, 0)).toThrow();
    });

    test('distanceTo', () => {
        const a = new MapCoordinate(0, 0);
        const b = new MapCoordinate(3, 4);
        expect(a.distanceTo(b)).toBe(5);
    });

    test('distanceTo throws for wrong type', () => {
        expect(() => new MapCoordinate(0, 0).distanceTo({ x: 0, y: 0 })).toThrow();
    });

    test('equals', () => {
        expect(new MapCoordinate(1, 2).equals(new MapCoordinate(1, 2))).toBe(true);
        expect(new MapCoordinate(1, 2).equals(new MapCoordinate(1, 3))).toBe(false);
        expect(new MapCoordinate(1, 2).equals(null)).toBe(false);
    });

    test('clone', () => {
        const mc = new MapCoordinate(1, 2);
        const c = mc.clone();
        expect(c.x).toBe(1);
        expect(c).not.toBe(mc);
    });

    test('toObject', () => {
        expect(new MapCoordinate(1, 2).toObject()).toEqual({ x: 1, y: 2 });
    });

    test('toString', () => {
        expect(new MapCoordinate(1, 2).toString()).toContain('1');
    });

    test('static fromObject', () => {
        const mc = MapCoordinate.fromObject({ x: 3, y: 4 });
        expect(mc.y).toBe(4);
    });
});

// ─── ContinentCoordinate ──────────────────────────────────────────────────────
describe('ContinentCoordinate', () => {
    test('constructs', () => {
        const cc = new ContinentCoordinate(100, 200);
        expect(cc.x).toBe(100);
        expect(cc.y).toBe(200);
    });

    test('throws for non-numbers', () => {
        expect(() => new ContinentCoordinate('a', 0)).toThrow();
    });

    test('throws for non-finite', () => {
        expect(() => new ContinentCoordinate(0, NaN)).toThrow();
    });

    test('distanceTo', () => {
        const a = new ContinentCoordinate(0, 0);
        const b = new ContinentCoordinate(5, 12);
        expect(a.distanceTo(b)).toBe(13);
    });

    test('distanceTo throws for wrong type', () => {
        expect(() => new ContinentCoordinate(0, 0).distanceTo({ x: 0, y: 0 })).toThrow();
    });

    test('equals', () => {
        expect(new ContinentCoordinate(1, 2).equals(new ContinentCoordinate(1, 2))).toBe(true);
        expect(new ContinentCoordinate(1, 2).equals(new ContinentCoordinate(1, 3))).toBe(false);
        expect(new ContinentCoordinate(1, 2).equals(null)).toBe(false);
    });

    test('clone', () => {
        const cc = new ContinentCoordinate(1, 2);
        const c = cc.clone();
        expect(c.x).toBe(1);
        expect(c).not.toBe(cc);
    });

    test('toObject', () => {
        expect(new ContinentCoordinate(3, 4).toObject()).toEqual({ x: 3, y: 4 });
    });

    test('toString', () => {
        expect(new ContinentCoordinate(3, 4).toString()).toContain('3');
    });

    test('static fromObject', () => {
        const cc = ContinentCoordinate.fromObject({ x: 5, y: 6 });
        expect(cc.y).toBe(6);
    });
});
