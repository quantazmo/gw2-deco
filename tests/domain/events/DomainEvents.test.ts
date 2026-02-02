// @ts-nocheck
/**
 * Tests for new domain events:
 * DecorationsMovedEvent, DecorationsDeletedEvent, MapSwitchedEvent, AllLayersClearedEvent
 */
import { DecorationsMovedEvent } from '../../../src/domain/events/DecorationsMovedEvent.js';
import { DecorationsDeletedEvent } from '../../../src/domain/events/DecorationsDeletedEvent.js';
import { MapSwitchedEvent } from '../../../src/domain/events/MapSwitchedEvent.js';
import { AllLayersClearedEvent } from '../../../src/domain/events/AllLayersClearedEvent.js';

describe('DecorationsMovedEvent', () => {
    test('should construct with valid parameters', () => {
        const sourceMapping = new Map([['d1', 'layer-1'], ['d2', 'layer-1']]);
        const event = new DecorationsMovedEvent('tpl-1', ['d1', 'd2'], sourceMapping, 'layer-2');

        expect(event.aggregateId).toBe('tpl-1');
        expect(event.eventType).toBe('DecorationsMoved');
        expect(event.decorationIds).toEqual(['d1', 'd2']);
        expect(event.sourceMapping.get('d1')).toBe('layer-1');
        expect(event.targetLayerId).toBe('layer-2');
        expect(event.timestamp).toBeInstanceOf(Date);
    });

    test('should defensively copy decorationIds', () => {
        const ids = ['d1', 'd2'];
        const event = new DecorationsMovedEvent('tpl-1', ids, new Map(), 'layer-2');
        ids.push('d3');
        expect(event.decorationIds).toEqual(['d1', 'd2']);
    });

    test('should defensively copy sourceMapping', () => {
        const mapping = new Map([['d1', 'layer-1']]);
        const event = new DecorationsMovedEvent('tpl-1', ['d1'], mapping, 'layer-2');
        mapping.set('d2', 'layer-2');
        expect(event.sourceMapping.has('d2')).toBe(false);
    });

    test('should throw on empty decorationIds', () => {
        expect(() => new DecorationsMovedEvent('tpl-1', [], new Map(), 'layer-2'))
            .toThrow('decorationIds must be a non-empty array');
    });

    test('should throw on missing targetLayerId', () => {
        expect(() => new DecorationsMovedEvent('tpl-1', ['d1'], new Map(), null))
            .toThrow('targetLayerId is required');
    });

    test('toObject should serialize correctly', () => {
        const sourceMapping = new Map([['d1', 'layer-1']]);
        const event = new DecorationsMovedEvent('tpl-1', ['d1'], sourceMapping, 'layer-2');
        const obj = event.toObject();

        expect(obj.eventType).toBe('DecorationsMoved');
        expect(obj.decorationIds).toEqual(['d1']);
        expect(obj.sourceMapping).toEqual({ d1: 'layer-1' });
        expect(obj.targetLayerId).toBe('layer-2');
    });
});

describe('DecorationsDeletedEvent', () => {
    test('should construct with valid parameters', () => {
        const sourceMapping = new Map([['d1', 'layer-1']]);
        const event = new DecorationsDeletedEvent('tpl-1', ['d1'], sourceMapping);

        expect(event.aggregateId).toBe('tpl-1');
        expect(event.eventType).toBe('DecorationsDeleted');
        expect(event.decorationIds).toEqual(['d1']);
        expect(event.sourceMapping.get('d1')).toBe('layer-1');
    });

    test('should throw on empty decorationIds', () => {
        expect(() => new DecorationsDeletedEvent('tpl-1', [], new Map()))
            .toThrow('decorationIds must be a non-empty array');
    });

    test('toObject should serialize correctly', () => {
        const sourceMapping = new Map([['d1', 'layer-1'], ['d2', 'layer-2']]);
        const event = new DecorationsDeletedEvent('tpl-1', ['d1', 'd2'], sourceMapping);
        const obj = event.toObject();

        expect(obj.eventType).toBe('DecorationsDeleted');
        expect(obj.decorationIds).toEqual(['d1', 'd2']);
        expect(obj.sourceMapping).toEqual({ d1: 'layer-1', d2: 'layer-2' });
    });
});

describe('MapSwitchedEvent', () => {
    test('should construct with valid parameters', () => {
        const event = new MapSwitchedEvent('tpl-1', 100, 200, 'Shimmering Equinox');

        expect(event.aggregateId).toBe('tpl-1');
        expect(event.eventType).toBe('MapSwitched');
        expect(event.previousMapId).toBe(100);
        expect(event.newMapId).toBe(200);
        expect(event.newMapName).toBe('Shimmering Equinox');
    });

    test('should allow null previousMapId (first load)', () => {
        const event = new MapSwitchedEvent('tpl-1', null, 200, 'Isle of Reflection');
        expect(event.previousMapId).toBeNull();
    });

    test('should throw on missing newMapId', () => {
        expect(() => new MapSwitchedEvent('tpl-1', 100, null, 'Map'))
            .toThrow('newMapId is required');
    });

    test('should throw on missing newMapName', () => {
        expect(() => new MapSwitchedEvent('tpl-1', 100, 200, ''))
            .toThrow('newMapName is required');
    });

    test('toObject should serialize correctly', () => {
        const event = new MapSwitchedEvent('tpl-1', 100, 200, 'Shimmering Equinox');
        const obj = event.toObject();

        expect(obj.eventType).toBe('MapSwitched');
        expect(obj.previousMapId).toBe(100);
        expect(obj.newMapId).toBe(200);
        expect(obj.newMapName).toBe('Shimmering Equinox');
    });
});

describe('AllLayersClearedEvent', () => {
    test('should construct with valid parameters', () => {
        const event = new AllLayersClearedEvent('tpl-1', 3);

        expect(event.aggregateId).toBe('tpl-1');
        expect(event.eventType).toBe('AllLayersCleared');
        expect(event.previousLayerCount).toBe(3);
    });

    test('should accept zero layer count', () => {
        const event = new AllLayersClearedEvent('tpl-1', 0);
        expect(event.previousLayerCount).toBe(0);
    });

    test('should throw on negative layer count', () => {
        expect(() => new AllLayersClearedEvent('tpl-1', -1))
            .toThrow('previousLayerCount must be a non-negative number');
    });

    test('should throw on non-number layer count', () => {
        expect(() => new AllLayersClearedEvent('tpl-1', 'three'))
            .toThrow('previousLayerCount must be a non-negative number');
    });

    test('toObject should serialize correctly', () => {
        const event = new AllLayersClearedEvent('tpl-1', 5);
        const obj = event.toObject();

        expect(obj.eventType).toBe('AllLayersCleared');
        expect(obj.previousLayerCount).toBe(5);
    });
});
