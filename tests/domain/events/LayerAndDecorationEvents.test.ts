// @ts-nocheck
/**
 * Tests for domain event classes not covered by DomainEvents.test.js:
 * DomainEvent (base), LayerCreatedEvent, LayerDeletedEvent, LayerRenamedEvent,
 * LayerSelectedEvent, LayerVisibilityToggledEvent, DecorationAddedEvent,
 * DecorationDeletedEvent, DecorationUpdatedEvent, LayoutLoadedEvent,
 * ZoomChangedEvent, PanChangedEvent.
 */
import { DomainEvent } from '../../../src/domain/events/DomainEvent.js';
import { LayerCreatedEvent } from '../../../src/domain/events/LayerCreatedEvent.js';
import { LayerDeletedEvent } from '../../../src/domain/events/LayerDeletedEvent.js';
import { LayerRenamedEvent } from '../../../src/domain/events/LayerRenamedEvent.js';
import { LayerSelectedEvent } from '../../../src/domain/events/LayerSelectedEvent.js';
import { LayerVisibilityToggledEvent } from '../../../src/domain/events/LayerVisibilityToggledEvent.js';
import { DecorationAddedEvent } from '../../../src/domain/events/DecorationAddedEvent.js';
import { DecorationDeletedEvent } from '../../../src/domain/events/DecorationDeletedEvent.js';
import { DecorationUpdatedEvent } from '../../../src/domain/events/DecorationUpdatedEvent.js';
import { LayoutLoadedEvent } from '../../../src/domain/events/LayoutLoadedEvent.js';
import { ZoomChangedEvent } from '../../../src/domain/events/ZoomChangedEvent.js';
import { PanChangedEvent } from '../../../src/domain/events/PanChangedEvent.js';

// ─── DomainEvent (base) ───────────────────────────────────────────────────────

describe('DomainEvent – base class', () => {
    test('constructs with aggregateId, eventType, timestamp, version', () => {
        const evt = new DomainEvent('agg-1', 'TestEvent');
        expect(evt.aggregateId).toBe('agg-1');
        expect(evt.eventType).toBe('TestEvent');
        expect(evt.timestamp).toBeInstanceOf(Date);
        expect(evt.version).toBe(1);
    });

    test('throws when aggregateId is missing', () => {
        expect(() => new DomainEvent(null, 'Test')).toThrow('aggregateId is required');
    });

    test('throws when eventType is missing', () => {
        expect(() => new DomainEvent('agg', null)).toThrow('eventType is required');
    });

    test('getEventType returns eventType', () => {
        const evt = new DomainEvent('agg', 'Foo');
        expect(evt.getEventType()).toBe('Foo');
    });

    test('getAggregateId returns aggregateId', () => {
        const evt = new DomainEvent('agg-42', 'Bar');
        expect(evt.getAggregateId()).toBe('agg-42');
    });

    test('getTimestamp returns a Date', () => {
        const evt = new DomainEvent('agg', 'Baz');
        expect(evt.getTimestamp()).toBeInstanceOf(Date);
    });

    test('getVersion returns 1', () => {
        const evt = new DomainEvent('agg', 'Qux');
        expect(evt.getVersion()).toBe(1);
    });

    test('toObject serializes correctly', () => {
        const evt = new DomainEvent('agg', 'Serialized');
        const obj = evt.toObject();
        expect(obj.aggregateId).toBe('agg');
        expect(obj.eventType).toBe('Serialized');
        expect(typeof obj.timestamp).toBe('string'); // ISO string
        expect(obj.version).toBe(1);
    });

    test('toString returns class name and aggregateId', () => {
        const evt = new DomainEvent('agg-99', 'MyEvent');
        const str = evt.toString();
        expect(str).toContain('DomainEvent');
        expect(str).toContain('agg-99');
    });
});

// ─── LayerCreatedEvent ────────────────────────────────────────────────────────

describe('LayerCreatedEvent', () => {
    test('constructs with layoutId, layerId, layerName', () => {
        const evt = new LayerCreatedEvent('tpl-1', 'layer-1', 'My Layer');
        expect(evt.aggregateId).toBe('tpl-1');
        expect(evt.eventType).toBe('LayerCreated');
        expect(evt.layerId).toBe('layer-1');
        expect(evt.layerName).toBe('My Layer');
    });

    test('throws when layerId is missing', () => {
        expect(() => new LayerCreatedEvent('tpl', null, 'Name')).toThrow('layerId is required');
    });

    test('throws when layerName is missing', () => {
        expect(() => new LayerCreatedEvent('tpl', 'l1', '')).toThrow('layerName is required');
    });

    test('getLayerId returns layerId', () => {
        const evt = new LayerCreatedEvent('tpl', 'l1', 'L1');
        expect(evt.getLayerId()).toBe('l1');
    });

    test('getLayerName returns layerName', () => {
        const evt = new LayerCreatedEvent('tpl', 'l1', 'L1');
        expect(evt.getLayerName()).toBe('L1');
    });

    test('toObject includes layerId and layerName', () => {
        const obj = new LayerCreatedEvent('tpl', 'l1', 'L1').toObject();
        expect(obj.layerId).toBe('l1');
        expect(obj.layerName).toBe('L1');
        expect(obj.eventType).toBe('LayerCreated');
    });
});

// ─── LayerDeletedEvent ────────────────────────────────────────────────────────

describe('LayerDeletedEvent', () => {
    test('constructs with layoutId and layerId', () => {
        const evt = new LayerDeletedEvent('tpl-1', 'layer-2');
        expect(evt.aggregateId).toBe('tpl-1');
        expect(evt.eventType).toBe('LayerDeleted');
        expect(evt.layerId).toBe('layer-2');
    });

    test('throws when layerId is missing', () => {
        expect(() => new LayerDeletedEvent('tpl', null)).toThrow('layerId is required');
    });

    test('getLayerId returns layerId', () => {
        const evt = new LayerDeletedEvent('tpl', 'l2');
        expect(evt.getLayerId()).toBe('l2');
    });

    test('toObject includes layerId', () => {
        const obj = new LayerDeletedEvent('tpl', 'l2').toObject();
        expect(obj.layerId).toBe('l2');
        expect(obj.eventType).toBe('LayerDeleted');
    });
});

// ─── LayerRenamedEvent ────────────────────────────────────────────────────────

describe('LayerRenamedEvent', () => {
    test('constructs with all required fields', () => {
        const evt = new LayerRenamedEvent('tpl', 'l1', 'Old', 'New');
        expect(evt.layerId).toBe('l1');
        expect(evt.oldName).toBe('Old');
        expect(evt.newName).toBe('New');
        expect(evt.eventType).toBe('LayerRenamed');
    });

    test('throws when layerId is missing', () => {
        expect(() => new LayerRenamedEvent('tpl', null, 'Old', 'New')).toThrow('layerId is required');
    });

    test('throws when oldName is missing', () => {
        expect(() => new LayerRenamedEvent('tpl', 'l1', '', 'New')).toThrow('oldName and newName are required');
    });

    test('throws when newName is missing', () => {
        expect(() => new LayerRenamedEvent('tpl', 'l1', 'Old', '')).toThrow('oldName and newName are required');
    });

    test('getters return correct values', () => {
        const evt = new LayerRenamedEvent('tpl', 'l1', 'Old', 'New');
        expect(evt.getLayerId()).toBe('l1');
        expect(evt.getOldName()).toBe('Old');
        expect(evt.getNewName()).toBe('New');
    });

    test('toObject includes all fields', () => {
        const obj = new LayerRenamedEvent('tpl', 'l1', 'Old', 'New').toObject();
        expect(obj.layerId).toBe('l1');
        expect(obj.oldName).toBe('Old');
        expect(obj.newName).toBe('New');
    });
});

// ─── LayerSelectedEvent ───────────────────────────────────────────────────────

describe('LayerSelectedEvent', () => {
    test('constructs with layerId', () => {
        const evt = new LayerSelectedEvent('tpl', 'l1');
        expect(evt.layerId).toBe('l1');
        expect(evt.eventType).toBe('LayerSelected');
    });

    test('accepts null layerId (deselect all)', () => {
        const evt = new LayerSelectedEvent('tpl', null);
        expect(evt.layerId).toBeNull();
    });

    test('getLayerId returns layerId', () => {
        const evt = new LayerSelectedEvent('tpl', 'l1');
        expect(evt.getLayerId()).toBe('l1');
    });

    test('toObject includes layerId', () => {
        const obj = new LayerSelectedEvent('tpl', 'l1').toObject();
        expect(obj.layerId).toBe('l1');
        expect(obj.eventType).toBe('LayerSelected');
    });
});

// ─── LayerVisibilityToggledEvent ─────────────────────────────────────────────

describe('LayerVisibilityToggledEvent', () => {
    test('constructs with layerId and isVisible = true', () => {
        const evt = new LayerVisibilityToggledEvent('tpl', 'l1', true);
        expect(evt.layerId).toBe('l1');
        expect(evt.isVisible).toBe(true);
        expect(evt.eventType).toBe('LayerVisibilityToggled');
    });

    test('constructs with isVisible = false', () => {
        const evt = new LayerVisibilityToggledEvent('tpl', 'l1', false);
        expect(evt.isVisible).toBe(false);
    });

    test('throws when layerId is missing', () => {
        expect(() => new LayerVisibilityToggledEvent('tpl', null, true)).toThrow('layerId is required');
    });

    test('throws when isVisible is not a boolean', () => {
        expect(() => new LayerVisibilityToggledEvent('tpl', 'l1', 1)).toThrow('isVisible must be a boolean');
        expect(() => new LayerVisibilityToggledEvent('tpl', 'l1', 'true')).toThrow('isVisible must be a boolean');
    });

    test('getLayerId and getIsVisible return correct values', () => {
        const evt = new LayerVisibilityToggledEvent('tpl', 'l1', false);
        expect(evt.getLayerId()).toBe('l1');
        expect(evt.getIsVisible()).toBe(false);
    });

    test('toObject includes layerId and isVisible', () => {
        const obj = new LayerVisibilityToggledEvent('tpl', 'l1', true).toObject();
        expect(obj.layerId).toBe('l1');
        expect(obj.isVisible).toBe(true);
    });
});

// ─── DecorationAddedEvent ─────────────────────────────────────────────────────

describe('DecorationAddedEvent', () => {
    const mockDecoration = { id: 'd1', toDTO: () => ({ id: 'd1' }) };

    test('constructs with layerId and decoration', () => {
        const evt = new DecorationAddedEvent('tpl', 'l1', mockDecoration);
        expect(evt.layerId).toBe('l1');
        expect(evt.decoration).toBe(mockDecoration);
        expect(evt.eventType).toBe('DecorationAdded');
    });

    test('throws when layerId is missing', () => {
        expect(() => new DecorationAddedEvent('tpl', null, mockDecoration)).toThrow('layerId is required');
    });

    test('throws when decoration is missing', () => {
        expect(() => new DecorationAddedEvent('tpl', 'l1', null)).toThrow('decoration is required');
    });

    test('getLayerId and getDecoration return correct values', () => {
        const evt = new DecorationAddedEvent('tpl', 'l1', mockDecoration);
        expect(evt.getLayerId()).toBe('l1');
        expect(evt.getDecoration()).toBe(mockDecoration);
    });

    test('toObject calls toDTO on decoration when available', () => {
        const obj = new DecorationAddedEvent('tpl', 'l1', mockDecoration).toObject();
        expect(obj.layerId).toBe('l1');
        expect(obj.decoration).toEqual({ id: 'd1' });
    });

    test('toObject falls back to raw decoration when toDTO is absent', () => {
        const rawDec = { id: 'd2' };
        const obj = new DecorationAddedEvent('tpl', 'l1', rawDec).toObject();
        expect(obj.decoration).toBe(rawDec);
    });
});

// ─── DecorationDeletedEvent ───────────────────────────────────────────────────

describe('DecorationDeletedEvent', () => {
    test('constructs with layerId and decorationId', () => {
        const evt = new DecorationDeletedEvent('tpl', 'l1', 'd1');
        expect(evt.layerId).toBe('l1');
        expect(evt.decorationId).toBe('d1');
        expect(evt.eventType).toBe('DecorationDeleted');
    });

    test('throws when layerId is missing', () => {
        expect(() => new DecorationDeletedEvent('tpl', null, 'd1')).toThrow('layerId is required');
    });

    test('throws when decorationId is missing', () => {
        expect(() => new DecorationDeletedEvent('tpl', 'l1', null)).toThrow('decorationId is required');
    });

    test('getLayerId and getDecorationId return correct values', () => {
        const evt = new DecorationDeletedEvent('tpl', 'l1', 'd1');
        expect(evt.getLayerId()).toBe('l1');
        expect(evt.getDecorationId()).toBe('d1');
    });

    test('toObject includes layerId and decorationId', () => {
        const obj = new DecorationDeletedEvent('tpl', 'l1', 'd1').toObject();
        expect(obj.layerId).toBe('l1');
        expect(obj.decorationId).toBe('d1');
        expect(obj.eventType).toBe('DecorationDeleted');
    });
});

// ─── DecorationUpdatedEvent ───────────────────────────────────────────────────

describe('DecorationUpdatedEvent', () => {
    const mockDec = { id: 'd1', toDTO: () => ({ id: 'd1', x: 5 }) };

    test('constructs with layerId and decoration', () => {
        const evt = new DecorationUpdatedEvent('tpl', 'l1', mockDec);
        expect(evt.layerId).toBe('l1');
        expect(evt.decoration).toBe(mockDec);
        expect(evt.eventType).toBe('DecorationUpdated');
    });

    test('throws when layerId is missing', () => {
        expect(() => new DecorationUpdatedEvent('tpl', null, mockDec)).toThrow('layerId is required');
    });

    test('throws when decoration is missing', () => {
        expect(() => new DecorationUpdatedEvent('tpl', 'l1', null)).toThrow('decoration is required');
    });

    test('getLayerId and getDecoration return correct values', () => {
        const evt = new DecorationUpdatedEvent('tpl', 'l1', mockDec);
        expect(evt.getLayerId()).toBe('l1');
        expect(evt.getDecoration()).toBe(mockDec);
    });

    test('toObject calls toDTO when available', () => {
        const obj = new DecorationUpdatedEvent('tpl', 'l1', mockDec).toObject();
        expect(obj.decoration).toEqual({ id: 'd1', x: 5 });
    });

    test('toObject falls back to raw object when toDTO is absent', () => {
        const raw = { id: 'd2' };
        const obj = new DecorationUpdatedEvent('tpl', 'l1', raw).toObject();
        expect(obj.decoration).toBe(raw);
    });
});

// ─── LayoutLoadedEvent ──────────────────────────────────────────────────────

describe('LayoutLoadedEvent', () => {
    const mockLayout = { id: 'tpl-1', toDTO: () => ({ id: 'tpl-1' }) };

    test('constructs with layoutId and layout', () => {
        const evt = new LayoutLoadedEvent('tpl-1', mockLayout);
        expect(evt.aggregateId).toBe('tpl-1');
        expect(evt.layout).toBe(mockLayout);
        expect(evt.eventType).toBe('LayoutLoaded');
    });

    test('throws when layout is missing', () => {
        expect(() => new LayoutLoadedEvent('tpl', null)).toThrow('layout is required');
    });

    test('getLayout returns the layout', () => {
        const evt = new LayoutLoadedEvent('tpl', mockLayout);
        expect(evt.getLayout()).toBe(mockLayout);
    });

    test('toObject calls toDTO when available', () => {
        const obj = new LayoutLoadedEvent('tpl', mockLayout).toObject();
        expect(obj.layout).toEqual({ id: 'tpl-1' });
        expect(obj.eventType).toBe('LayoutLoaded');
    });

    test('toObject falls back to raw layout when toDTO is absent', () => {
        const rawTpl = { id: 'tpl-raw' };
        const obj = new LayoutLoadedEvent('tpl', rawTpl).toObject();
        expect(obj.layout).toBe(rawTpl);
    });
});

// ─── ZoomChangedEvent ─────────────────────────────────────────────────────────

describe('ZoomChangedEvent', () => {
    test('constructs with oldZoom and newZoom', () => {
        const evt = new ZoomChangedEvent('tpl', 1.0, 2.0);
        expect(evt.oldZoom).toBe(1.0);
        expect(evt.newZoom).toBe(2.0);
        expect(evt.eventType).toBe('ZoomChanged');
    });

    test('throws when oldZoom is not a number', () => {
        expect(() => new ZoomChangedEvent('tpl', 'one', 2)).toThrow('oldZoom and newZoom must be numbers');
    });

    test('throws when newZoom is not a number', () => {
        expect(() => new ZoomChangedEvent('tpl', 1, null)).toThrow('oldZoom and newZoom must be numbers');
    });

    test('getOldZoom and getNewZoom return correct values', () => {
        const evt = new ZoomChangedEvent('tpl', 1, 3);
        expect(evt.getOldZoom()).toBe(1);
        expect(evt.getNewZoom()).toBe(3);
    });

    test('toObject includes oldZoom and newZoom', () => {
        const obj = new ZoomChangedEvent('tpl', 1, 2).toObject();
        expect(obj.oldZoom).toBe(1);
        expect(obj.newZoom).toBe(2);
        expect(obj.eventType).toBe('ZoomChanged');
    });
});

// ─── PanChangedEvent ─────────────────────────────────────────────────────────

describe('PanChangedEvent', () => {
    const oldPan = { x: 0, y: 0 };
    const newPan = { x: 10, y: 20 };

    test('constructs with oldPan and newPan', () => {
        const evt = new PanChangedEvent('tpl', oldPan, newPan);
        expect(evt.oldPan).toEqual({ x: 0, y: 0 });
        expect(evt.newPan).toEqual({ x: 10, y: 20 });
        expect(evt.eventType).toBe('PanChanged');
    });

    test('throws when oldPan is missing x', () => {
        expect(() => new PanChangedEvent('tpl', { y: 0 }, newPan))
            .toThrow('oldPan and newPan must have x and y properties');
    });

    test('throws when newPan is null', () => {
        expect(() => new PanChangedEvent('tpl', oldPan, null))
            .toThrow('oldPan and newPan must have x and y properties');
    });

    test('getOldPan and getNewPan return correct values', () => {
        const evt = new PanChangedEvent('tpl', oldPan, newPan);
        expect(evt.getOldPan()).toEqual({ x: 0, y: 0 });
        expect(evt.getNewPan()).toEqual({ x: 10, y: 20 });
    });

    test('toObject includes copies of oldPan and newPan', () => {
        const evt = new PanChangedEvent('tpl', oldPan, newPan);
        const obj = evt.toObject();
        expect(obj.oldPan).toEqual({ x: 0, y: 0 });
        expect(obj.newPan).toEqual({ x: 10, y: 20 });
        // Verify defensive copy
        obj.oldPan.x = 999;
        expect(evt.oldPan.x).toBe(0);
    });
});
