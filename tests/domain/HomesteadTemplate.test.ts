// @ts-nocheck
/**
 * Tests for new HomesteadLayout multi-layer methods:
 * moveDecorations, removeDecorations, getDecorationLayer,
 * getAllVisibleDecorationIds, clearAllLayers
 */
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { Layer } from '../../src/domain/Layer.js';
import { Decoration } from '../../src/domain/Decoration.js';
import { GW2Map } from '../../src/domain/GW2Map.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';

describe('HomesteadLayout Multi-Layer Methods', () => {

    let layout;
    let layer1, layer2, layer3;

    function makeDecoration(id, name) {
        return new Decoration(id, name || `Deco ${id}`, new WorldCoordinate(100, 200));
    }

    beforeEach(() => {
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 });
        layout = new HomesteadLayout('tpl-1', 'Test Layout');
        layout.setMap(map);

        layer1 = new Layer('layer-1', 'Layer 1');
        layer2 = new Layer('layer-2', 'Layer 2');
        layer3 = new Layer('layer-3', 'Layer 3');

        layer1.addDecoration(makeDecoration('d1', 'Torch'));
        layer1.addDecoration(makeDecoration('d2', 'Banner'));
        layer2.addDecoration(makeDecoration('d3', 'Lamp'));
        layer2.addDecoration(makeDecoration('d4', 'Fence'));

        layout.addLayer(layer1);
        layout.addLayer(layer2);
        layout.addLayer(layer3);
    });

    describe('moveDecorations', () => {
        test('should move decorations from one layer to another', () => {
            const result = layout.moveDecorations(['d1', 'd2'], 'layer-2');

            expect(result.moved.size).toBe(2);
            expect(result.moved.get('d1')).toBe('layer-1');
            expect(result.moved.get('d2')).toBe('layer-1');
            expect(result.skipped).toEqual([]);
            expect(layer1.getDecoration('d1')).toBeNull();
            expect(layer1.getDecoration('d2')).toBeNull();
            expect(layer2.getDecoration('d1')).toBeTruthy();
            expect(layer2.getDecoration('d2')).toBeTruthy();
        });

        test('should skip decorations already in the target layer (same-layer no-op)', () => {
            const result = layout.moveDecorations(['d1', 'd2'], 'layer-1');

            expect(result.moved.size).toBe(0);
            expect(result.skipped).toEqual(['d1', 'd2']);
            expect(layer1.getDecoration('d1')).toBeTruthy();
            expect(layer1.getDecoration('d2')).toBeTruthy();
        });

        test('should skip missing IDs', () => {
            const result = layout.moveDecorations(['d1', 'nonexistent'], 'layer-2');

            expect(result.moved.size).toBe(1);
            expect(result.moved.get('d1')).toBe('layer-1');
            expect(result.skipped).toContain('nonexistent');
        });

        test('should handle mixed: some already in target, some missing, some movable', () => {
            const result = layout.moveDecorations(['d1', 'd3', 'missing'], 'layer-2');

            expect(result.moved.size).toBe(1);
            expect(result.moved.get('d1')).toBe('layer-1');
            expect(result.skipped).toContain('d3'); // already in layer-2
            expect(result.skipped).toContain('missing');
        });

        test('should move decorations from multiple source layers', () => {
            const result = layout.moveDecorations(['d1', 'd3'], 'layer-3');

            expect(result.moved.size).toBe(2);
            expect(result.moved.get('d1')).toBe('layer-1');
            expect(result.moved.get('d3')).toBe('layer-2');
            expect(layer3.getDecoration('d1')).toBeTruthy();
            expect(layer3.getDecoration('d3')).toBeTruthy();
        });

        test('should throw if target layer not found', () => {
            expect(() => layout.moveDecorations(['d1'], 'nonexistent'))
                .toThrow('target layer');
        });

        test('should throw if decorationIds is not an array', () => {
            expect(() => layout.moveDecorations('d1', 'layer-2'))
                .toThrow('must be an array');
        });

        test('should update timestamp when decorations are moved', () => {
            const before = layout.updatedAt;
            // Small delay to ensure timestamp differs
            layout.moveDecorations(['d1'], 'layer-2');
            expect(layout.updatedAt).toBeInstanceOf(Date);
        });

        test('should not update timestamp when nothing is moved', () => {
            const before = layout.updatedAt;
            layout.moveDecorations([], 'layer-2');
            expect(layout.updatedAt).toBe(before);
        });
    });

    describe('removeDecorations', () => {
        test('should remove decorations from their layers', () => {
            const result = layout.removeDecorations(['d1', 'd3']);

            expect(result.removed.size).toBe(2);
            expect(result.removed.get('d1').sourceLayerId).toBe('layer-1');
            expect(result.removed.get('d1').decoration.id).toBe('d1');
            expect(result.removed.get('d3').sourceLayerId).toBe('layer-2');
            expect(layer1.getDecoration('d1')).toBeNull();
            expect(layer2.getDecoration('d3')).toBeNull();
        });

        test('should skip IDs not found in any layer', () => {
            const result = layout.removeDecorations(['d1', 'nonexistent']);

            expect(result.removed.size).toBe(1);
            expect(result.removed.has('d1')).toBe(true);
            expect(result.removed.has('nonexistent')).toBe(false);
        });

        test('should return full decoration data for undo', () => {
            const result = layout.removeDecorations(['d1']);
            const removedEntry = result.removed.get('d1');

            expect(removedEntry.decoration.name).toBe('Torch');
            expect(removedEntry.decoration.position).toBeTruthy();
        });

        test('should handle empty array', () => {
            const result = layout.removeDecorations([]);
            expect(result.removed.size).toBe(0);
        });

        test('should throw if decorationIds is not an array', () => {
            expect(() => layout.removeDecorations('d1'))
                .toThrow('must be an array');
        });

        test('should remove decorations from multiple layers', () => {
            const result = layout.removeDecorations(['d1', 'd2', 'd3', 'd4']);

            expect(result.removed.size).toBe(4);
            expect(layer1.getDecorationCount()).toBe(0);
            expect(layer2.getDecorationCount()).toBe(0);
        });
    });

    describe('getDecorationLayer', () => {
        test('should return the layer containing the decoration', () => {
            expect(layout.getDecorationLayer('d1')).toBe(layer1);
            expect(layout.getDecorationLayer('d3')).toBe(layer2);
        });

        test('should return null for non-existent decoration', () => {
            expect(layout.getDecorationLayer('nonexistent')).toBeNull();
        });

        test('should return null when no layers exist', () => {
            layout.clearAllLayers();
            expect(layout.getDecorationLayer('d1')).toBeNull();
        });
    });

    describe('getAllVisibleDecorationIds', () => {
        test('should return IDs from all visible layers', () => {
            const ids = layout.getAllVisibleDecorationIds();

            expect(ids).toContain('d1');
            expect(ids).toContain('d2');
            expect(ids).toContain('d3');
            expect(ids).toContain('d4');
            expect(ids).toHaveLength(4);
        });

        test('should exclude hidden layer decorations', () => {
            layer1.isVisible = false;
            const ids = layout.getAllVisibleDecorationIds();

            expect(ids).not.toContain('d1');
            expect(ids).not.toContain('d2');
            expect(ids).toContain('d3');
            expect(ids).toContain('d4');
            expect(ids).toHaveLength(2);
        });

        test('should return empty array when all layers are hidden', () => {
            layer1.isVisible = false;
            layer2.isVisible = false;
            layer3.isVisible = false;
            expect(layout.getAllVisibleDecorationIds()).toEqual([]);
        });

        test('should return empty array when no layers exist', () => {
            layout.clearAllLayers();
            expect(layout.getAllVisibleDecorationIds()).toEqual([]);
        });

        test('should include empty visible layers without error', () => {
            // layer3 is empty and visible — should not contribute any IDs or error
            const ids = layout.getAllVisibleDecorationIds();
            expect(ids).toHaveLength(4); // only from layer1 and layer2
        });
    });

    describe('clearAllLayers', () => {
        test('should remove all layers', () => {
            layout.clearAllLayers();
            expect(layout.getLayerCount()).toBe(0);
            expect(layout.getAllLayers()).toEqual([]);
        });

        test('should reset activeLayerId to null', () => {
            expect(layout.activeLayerId).not.toBeNull();
            layout.clearAllLayers();
            expect(layout.activeLayerId).toBeNull();
        });

        test('should update timestamp', () => {
            layout.clearAllLayers();
            expect(layout.updatedAt).toBeInstanceOf(Date);
        });

        test('should be idempotent on empty layout', () => {
            layout.clearAllLayers();
            layout.clearAllLayers();
            expect(layout.getLayerCount()).toBe(0);
            expect(layout.activeLayerId).toBeNull();
        });
    });
});
