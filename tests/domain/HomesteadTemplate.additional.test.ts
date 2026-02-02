// @ts-nocheck
/**
 * Additional tests for src/domain/HomesteadLayout.js
 * Covers: validateState, toDTO, fromDTO, clone, equals, toString,
 *         addEvent/getPendingEvents/clearPendingEvents, setActiveLayer, validateMapLoaded
 */
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { GW2Map } from '../../src/domain/GW2Map.js';
import { Layer } from '../../src/domain/Layer.js';
import { Decoration } from '../../src/domain/Decoration.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';

function makeMap() {
    return new GW2Map(1, 'Test Map', 1, 1);
}

function makeLayer(id = 'l1', name = 'Layer') {
    const layer = new Layer(id, name);
    // Add a decoration so validateState passes (Layer requires at least one)
    layer.addDecoration(new Decoration('d1', 'Torch', new WorldCoordinate(10, 20, 0, 0)));
    return layer;
}

describe('HomesteadLayout — additional coverage', () => {

    describe('validateState', () => {
        test('returns isValid:true for a valid layout with map and layers', () => {
            const layout = new HomesteadLayout('t1', 'My Layout');
            layout.setMap(makeMap());
            layout.addLayer(makeLayer());
            const result = layout.validateState();
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('returns isValid:false when no map loaded', () => {
            const layout = new HomesteadLayout('t1', 'No Map');
            layout.addLayer(makeLayer());
            const result = layout.validateState();
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('map'))).toBe(true);
        });

        test('returns isValid:false when no layers', () => {
            const layout = new HomesteadLayout('t1', 'No Layers');
            layout.setMap(makeMap());
            const result = layout.validateState();
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('layer'))).toBe(true);
        });
    });

    describe('validateMapLoaded', () => {
        test('returns isValid:true when map is set', () => {
            const layout = new HomesteadLayout('t1', 'Has Map');
            layout.setMap(makeMap());
            expect(layout.validateMapLoaded().isValid).toBe(true);
        });

        test('returns isValid:false when no map', () => {
            const layout = new HomesteadLayout('t1', 'No Map');
            const result = layout.validateMapLoaded();
            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain('No map');
        });
    });

    describe('toDTO', () => {
        test('contains expected fields', () => {
            const layout = new HomesteadLayout('t1', 'My Layout');
            layout.setMap(makeMap());
            layout.addLayer(makeLayer('l1'));
            const dto = layout.toDTO();
            expect(dto.id).toBe('t1');
            expect(dto.name).toBe('My Layout');
            expect(dto.map).not.toBeNull();
            expect(dto.layers).toHaveLength(1);
            expect(dto.activeLayerId).toBe('l1');
            expect(dto.createdAt).toBeTruthy();
            expect(dto.updatedAt).toBeTruthy();
        });

        test('map is null in DTO when no map set', () => {
            const layout = new HomesteadLayout('t1', 'Layout');
            const dto = layout.toDTO();
            expect(dto.map).toBeNull();
        });
    });

    describe('fromDTO', () => {
        test('creates layout from DTO with map and layers', () => {
            const original = new HomesteadLayout('t1', 'DTO Layout');
            original.setMap(makeMap());
            original.addLayer(makeLayer('l1'));
            const dto = original.toDTO();
            const restored = HomesteadLayout.fromDTO(dto);
            expect(restored.id).toBe('t1');
            expect(restored.name).toBe('DTO Layout');
            expect(restored.map).not.toBeNull();
            expect(restored.getLayerCount()).toBe(1);
            expect(restored.activeLayerId).toBe('l1');
        });

        test('creates layout from DTO without map', () => {
            const dto = {
                id: 't2',
                name: 'No Map Layout',
                map: null,
                layers: [],
                activeLayerId: null
            };
            const layout = HomesteadLayout.fromDTO(dto);
            expect(layout.id).toBe('t2');
            expect(layout.map).toBeNull();
        });

        test('round-trips through toDTO and fromDTO', () => {
            const original = new HomesteadLayout('t1', 'Round Trip');
            original.setMap(makeMap());
            original.addLayer(makeLayer('l1'));
            const restored = HomesteadLayout.fromDTO(original.toDTO());
            expect(restored.equals(original)).toBe(true);
        });
    });

    describe('clone', () => {
        test('creates independent copy', () => {
            const layout = new HomesteadLayout('t1', 'Original');
            layout.setMap(makeMap());
            layout.addLayer(makeLayer('l1'));
            const clone = layout.clone();
            expect(clone.id).toBe('t1');
            expect(clone.getLayerCount()).toBe(1);
        });

        test('clone is independent — adding layer to clone does not affect original', () => {
            const layout = new HomesteadLayout('t1', 'Original');
            layout.setMap(makeMap());
            layout.addLayer(makeLayer('l1'));
            const clone = layout.clone();
            clone.addLayer(makeLayer('l2', 'Layer 2'));
            expect(layout.getLayerCount()).toBe(1);
            expect(clone.getLayerCount()).toBe(2);
        });

        test('clone without map works', () => {
            const layout = new HomesteadLayout('t1', 'No Map');
            const clone = layout.clone();
            expect(clone.map).toBeNull();
        });
    });

    describe('equals', () => {
        test('equal layouts return true', () => {
            const a = new HomesteadLayout('t1', 'Layout');
            a.setMap(makeMap());
            a.addLayer(makeLayer('l1'));
            const b = HomesteadLayout.fromDTO(a.toDTO());
            expect(a.equals(b)).toBe(true);
        });

        test('different id returns false', () => {
            const a = new HomesteadLayout('t1', 'T');
            const b = new HomesteadLayout('t2', 'T');
            expect(a.equals(b)).toBe(false);
        });

        test('different name returns false', () => {
            const a = new HomesteadLayout('t1', 'Layout A');
            const b = new HomesteadLayout('t1', 'Layout B');
            expect(a.equals(b)).toBe(false);
        });

        test('different layer count returns false', () => {
            const a = new HomesteadLayout('t1', 'T');
            a.setMap(makeMap());
            a.addLayer(makeLayer('l1'));
            const b = new HomesteadLayout('t1', 'T');
            expect(a.equals(b)).toBe(false);
        });

        test('non-HomesteadLayout returns false', () => {
            const t = new HomesteadLayout('t1', 'T');
            expect(t.equals(null)).toBe(false);
            expect(t.equals({ id: 't1' })).toBe(false);
        });
    });

    describe('toString', () => {
        test('includes id, name, and layer count', () => {
            const layout = new HomesteadLayout('t1', 'My Layout');
            layout.addLayer(makeLayer('l1'));
            layout.addLayer(makeLayer('l2', 'Layer 2'));
            const str = layout.toString();
            expect(str).toContain('t1');
            expect(str).toContain('My Layout');
            expect(str).toContain('2');
        });
    });

    describe('addEvent / getPendingEvents / clearPendingEvents', () => {
        test('addEvent appends to pending events', () => {
            const layout = new HomesteadLayout('t1', 'T');
            layout.addEvent({ type: 'MapLoaded', payload: {} });
            expect(layout.getPendingEvents()).toHaveLength(1);
        });

        test('getPendingEvents returns copy (not reference)', () => {
            const layout = new HomesteadLayout('t1', 'T');
            layout.addEvent({ type: 'Event1' });
            const events = layout.getPendingEvents();
            events.push({ type: 'Extra' });
            expect(layout.getPendingEvents()).toHaveLength(1);
        });

        test('clearPendingEvents empties the array', () => {
            const layout = new HomesteadLayout('t1', 'T');
            layout.addEvent({ type: 'E1' });
            layout.addEvent({ type: 'E2' });
            layout.clearPendingEvents();
            expect(layout.getPendingEvents()).toHaveLength(0);
        });

        test('multiple events are returned in order', () => {
            const layout = new HomesteadLayout('t1', 'T');
            layout.addEvent({ type: 'A' });
            layout.addEvent({ type: 'B' });
            layout.addEvent({ type: 'C' });
            const events = layout.getPendingEvents();
            expect(events[0].type).toBe('A');
            expect(events[2].type).toBe('C');
        });
    });

    describe('setActiveLayer', () => {
        test('sets active layer id', () => {
            const layout = new HomesteadLayout('t1', 'T');
            layout.addLayer(makeLayer('l1'));
            layout.addLayer(makeLayer('l2', 'Layer 2'));
            layout.setActiveLayer('l2');
            expect(layout.activeLayerId).toBe('l2');
        });

        test('throws when layer id does not exist', () => {
            const layout = new HomesteadLayout('t1', 'T');
            layout.addLayer(makeLayer('l1'));
            expect(() => layout.setActiveLayer('nonexistent')).toThrow();
        });
    });

    describe('constructor — invalid inputs', () => {
        test('throws on empty id', () => {
            expect(() => new HomesteadLayout('', 'Name')).toThrow();
        });

        test('throws on non-string non-number id', () => {
            expect(() => new HomesteadLayout([], 'Name')).toThrow();
        });

        test('throws when name is not a string (line 31)', () => {
            expect(() => new HomesteadLayout('id1', 42)).toThrow('HomesteadLayout: name must be a string');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // setMap — error paths (lines 40, 44)
    // ─────────────────────────────────────────────────────────────────────────
    describe('setMap — error paths', () => {
        test('throws when map is null (line 40)', () => {
            const layout = new HomesteadLayout('t1', 'T');
            expect(() => layout.setMap(null)).toThrow('map must be a GW2Map instance');
        });

        test('throws when map has no validateState function (line 40)', () => {
            const layout = new HomesteadLayout('t1', 'T');
            expect(() => layout.setMap({ id: 1 })).toThrow('map must be a GW2Map instance');
        });

        test('throws when map validateState returns invalid (line 44)', () => {
            const layout = new HomesteadLayout('t1', 'T');
            const fakeMap = { validateState: () => ({ isValid: false, errors: ['bad map'] }) };
            expect(() => layout.setMap(fakeMap)).toThrow('invalid map');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // addLayer — error paths (lines 62, 65)
    // ─────────────────────────────────────────────────────────────────────────
    describe('addLayer — error paths', () => {
        test('throws when layer has no id (line 62)', () => {
            const layout = new HomesteadLayout('t1', 'T');
            expect(() => layout.addLayer({})).toThrow('layer must have an id');
        });

        test('throws when adding duplicate layer id (line 65)', () => {
            const layout = new HomesteadLayout('t1', 'T');
            layout.addLayer(makeLayer('l1'));
            expect(() => layout.addLayer(makeLayer('l1'))).toThrow('already exists');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // removeLayer — error path (line 80)
    // ─────────────────────────────────────────────────────────────────────────
    describe('removeLayer — error path', () => {
        test('throws when layer not found (line 80)', () => {
            const layout = new HomesteadLayout('t1', 'T');
            expect(() => layout.removeLayer('nonexistent')).toThrow('not found');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // getActiveLayer — returns null when no activeLayerId (lines 109-112)
    // ─────────────────────────────────────────────────────────────────────────
    describe('getActiveLayer — null when no active layer', () => {
        test('returns null when activeLayerId is null', () => {
            const layout = new HomesteadLayout('t1', 'T');
            // No layers added → activeLayerId stays null
            expect(layout.getActiveLayer()).toBeNull();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // renameLayer — error paths (lines 132, 135)
    // ─────────────────────────────────────────────────────────────────────────
    describe('renameLayer — error paths', () => {
        test('throws when layer not found (line 132)', () => {
            const layout = new HomesteadLayout('t1', 'T');
            expect(() => layout.renameLayer('nope', 'New Name')).toThrow('not found');
        });

        test('throws when newName is empty string (line 135)', () => {
            const layout = new HomesteadLayout('t1', 'T');
            layout.addLayer(makeLayer('l1'));
            expect(() => layout.renameLayer('l1', '')).toThrow('newName must be a non-empty string');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // toggleLayerVisibility — error path (line 147)
    // ─────────────────────────────────────────────────────────────────────────
    describe('toggleLayerVisibility — error path', () => {
        test('throws when layer not found (line 147)', () => {
            const layout = new HomesteadLayout('t1', 'T');
            expect(() => layout.toggleLayerVisibility('nope')).toThrow('not found');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // addDecorationToLayer — error paths (lines 159, 162)
    // ─────────────────────────────────────────────────────────────────────────
    describe('addDecorationToLayer — error paths', () => {
        test('throws when layer not found (line 159)', () => {
            const layout = new HomesteadLayout('t1', 'T');
            expect(() => layout.addDecorationToLayer('nope', new Decoration('d1', 'T', new WorldCoordinate(0, 0, 0, 0))))
                .toThrow('not found');
        });

        test('throws when decoration has no id (line 162)', () => {
            const layout = new HomesteadLayout('t1', 'T');
            layout.addLayer(makeLayer('l1'));
            expect(() => layout.addDecorationToLayer('l1', {})).toThrow('decoration must have an id');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // removeDecorationFromLayer — error path (line 174)
    // ─────────────────────────────────────────────────────────────────────────
    describe('removeDecorationFromLayer — error path', () => {
        test('throws when layer not found (line 174)', () => {
            const layout = new HomesteadLayout('t1', 'T');
            expect(() => layout.removeDecorationFromLayer('nope', 'd1')).toThrow('not found');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // updateDecorationInLayer — updates position, rotation, scale (lines 197, 209, 212)
    // ─────────────────────────────────────────────────────────────────────────
    describe('updateDecorationInLayer — update fields', () => {
        test('updates position as WorldCoordinate (line 197)', () => {
            const layout = new HomesteadLayout('t1', 'T');
            const layer = makeLayer('l1');
            layout.addLayer(layer);
            const newPos = new WorldCoordinate(99, 88, 0, 0);
            layout.updateDecorationInLayer('l1', 'd1', { position: newPos });
            const dec = layer.getDecoration('d1');
            expect(dec.position.x).toBe(99);
        });

        test('updates rotation (line 209)', () => {
            const layout = new HomesteadLayout('t1', 'T');
            const layer = makeLayer('l1');
            layout.addLayer(layer);
            layout.updateDecorationInLayer('l1', 'd1', { rotation: 45 });
            const dec = layer.getDecoration('d1');
            expect(dec.rotation).toBe(45);
        });

        test('updates scale (line 212)', () => {
            const layout = new HomesteadLayout('t1', 'T');
            const layer = makeLayer('l1');
            layout.addLayer(layer);
            layout.updateDecorationInLayer('l1', 'd1', { scale: 2.5 });
            const dec = layer.getDecoration('d1');
            expect(dec.scale).toBe(2.5);
        });

        test('updates position as plain object', () => {
            const layout = new HomesteadLayout('t1', 'T');
            const layer = makeLayer('l1');
            layout.addLayer(layer);
            layout.updateDecorationInLayer('l1', 'd1', { position: { x: 5, y: 10 } });
            const dec = layer.getDecoration('d1');
            expect(dec.position.x).toBe(5);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // getDecorationFromLayer — null when layer not found (lines 222-226)
    // ─────────────────────────────────────────────────────────────────────────
    describe('getDecorationFromLayer — null for missing layer', () => {
        test('returns null when layer does not exist (lines 222-226)', () => {
            const layout = new HomesteadLayout('t1', 'T');
            expect(layout.getDecorationFromLayer('nope', 'd1')).toBeNull();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // validateState — error collection branches (lines 269, 277, 289)
    // ─────────────────────────────────────────────────────────────────────────
    describe('validateState — error branches', () => {
        test('collects validate() error when id is corrupted (line 269)', () => {
            const layout = new HomesteadLayout('t1', 'T');
            layout.setMap(makeMap());
            layout.addLayer(makeLayer());
            // Corrupt id so validate() throws
            layout.id = null;
            const result = layout.validateState();
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('id'))).toBe(true);
        });

        test('collects map error when map is invalid (line 277)', () => {
            const layout = new HomesteadLayout('t1', 'T');
            layout.setMap(makeMap());
            layout.addLayer(makeLayer());
            // Override map with one that returns invalid
            layout.map = { validateState: () => ({ isValid: false, errors: ['Map broken'] }) };
            const result = layout.validateState();
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('Map'))).toBe(true);
        });

        test('collects layer error when layer is invalid (line 289)', () => {
            const layout = new HomesteadLayout('t1', 'T');
            layout.setMap(makeMap());
            const layer = makeLayer('l1');
            layout.addLayer(layer);
            // Override layer validateState to return invalid
            layer.validateState = () => ({ isValid: false, errors: ['Layer broken'] });
            const result = layout.validateState();
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('l1'))).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // equals — false branches (lines 473, 479)
    // ─────────────────────────────────────────────────────────────────────────
    describe('equals — map and layer mismatch', () => {
        test('returns false when one layout has map and other does not (line 473)', () => {
            const a = new HomesteadLayout('t1', 'T');
            a.setMap(makeMap());
            const b = new HomesteadLayout('t1', 'T');
            // b has no map
            expect(a.equals(b)).toBe(false);
        });

        test('returns false when layer content differs (line 479)', () => {
            const a = new HomesteadLayout('t1', 'T');
            a.addLayer(makeLayer('l1'));
            const b = new HomesteadLayout('t1', 'T');
            b.addLayer(makeLayer('l1'));
            // Override a's layer equals to return false (simulates different layer content)
            a.layers.get('l1').equals = () => false;
            expect(a.equals(b)).toBe(false);
        });
    });
});
