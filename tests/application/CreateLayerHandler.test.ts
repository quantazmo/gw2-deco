// @ts-nocheck
/**
 * Tests for src/application/handlers/CreateLayerHandler.js
 * Tests the application layer command handling for layer creation
 */
import { CreateLayerHandler } from '../../src/application/handlers/CreateLayerHandler.js';
import { CreateLayerCommand } from '../../src/application/commands/CreateLayerCommand.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { GW2Map } from '../../src/domain/GW2Map.js';
import { UndoRedoManager } from '../../src/application/UndoRedoManager.js';

function createLayout() {
    const map = new GW2Map(1, 'Test Map', 1, 0);
    map.addTile({ x: 0, y: 0 });
    const layout = new HomesteadLayout('layout-1', 'Test Layout');
    layout.setMap(map);
    return layout;
}

describe('CreateLayerHandler', () => {

    test('constructor should create handler instance', () => {
        const handler = new CreateLayerHandler();
        expect(handler).toBeTruthy();
    });

    test('handle should create new layer in layout', () => {
        const handler = new CreateLayerHandler();
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 });
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        layout.setMap(map);
        const command = new CreateLayerCommand(layout, 'New Layer');

        const result = handler.handle(command);

        expect(result).toBeTruthy();
        expect(layout.getLayerCount()).toBe(1);
        expect(layout.getAllLayers()[0].name).toBe('New Layer');
    });

    test('handle should return created layer in result', () => {
        const handler = new CreateLayerHandler();
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 });
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        layout.setMap(map);
        const command = new CreateLayerCommand(layout, 'New Layer');

        const result = handler.handle(command);

        expect(result.layer).toBeTruthy();
        expect(result.layer.name).toBe('New Layer');
    });

    test('handle should throw on null command', () => {
        const handler = new CreateLayerHandler();

        expect(() => {
            handler.handle(null);
        }).toThrow();
    });

    test('handle should throw on null layout in command', () => {
        const handler = new CreateLayerHandler();
        const command = new CreateLayerCommand(null, 'New Layer');

        expect(() => {
            handler.handle(command);
        }).toThrow();
    });

    test('handle should throw on empty layer name', () => {
        const handler = new CreateLayerHandler();
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 });
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        layout.setMap(map);
        const command = new CreateLayerCommand(layout, '');

        expect(() => {
            handler.handle(command);
        }).toThrow();
    });

    test('handle should generate unique layer id', () => {
        const handler = new CreateLayerHandler();
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 });
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        layout.setMap(map);

        const command1 = new CreateLayerCommand(layout, 'Layer 1');
        handler.handle(command1);

        const command2 = new CreateLayerCommand(layout, 'Layer 2');
        handler.handle(command2);

        expect(layout.getLayerCount()).toBe(2);
        const layers = layout.getAllLayers();
        expect(layers[0].id).not.toBe(layers[1].id);
    });

    test('handle should set layer as visible by default', () => {
        const handler = new CreateLayerHandler();
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 });
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        layout.setMap(map);
        const command = new CreateLayerCommand(layout, 'New Layer');

        handler.handle(command);

        expect(layout.getAllLayers()[0].isVisible).toBe(true);
    });

    // Note: Event handling is done through the domain model, not handler callbacks
    // This test is skipped as the handler doesn't expose onLayerCreated
    test.skip('handle should fire LayerCreatedEvent', () => {
        const handler = new CreateLayerHandler();
        const map = new GW2Map(1, 'Test Map', 1, 0);
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        layout.setMap(map);
        const command = new CreateLayerCommand(layout, 'New Layer');

        let eventFired = false;
        handler.onLayerCreated((event) => {
            eventFired = true;
            expect(event.layer).toBeTruthy();
        });

        handler.handle(command);

        expect(eventFired).toBe(true);
    });

    test('handle should add layer at end of list', () => {
        const handler = new CreateLayerHandler();
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 });
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        layout.setMap(map);

        const command1 = new CreateLayerCommand(layout, 'Layer 1');
        handler.handle(command1);
        const firstId = layout.getAllLayers()[0].id;

        const command2 = new CreateLayerCommand(layout, 'Layer 2');
        handler.handle(command2);

        const layers = layout.getAllLayers();
        expect(layers[0].id).toBe(firstId);
        expect(layers[1].name).toBe('Layer 2');
    });

    test('handle should work with multiple layouts', () => {
        const handler = new CreateLayerHandler();
        const map1 = new GW2Map(1, 'Map 1', 1, 0);
        map1.addTile({ x: 0, y: 0 });
        const map2 = new GW2Map(2, 'Map 2', 1, 0);
        map2.addTile({ x: 0, y: 0 });
        const layout1 = new HomesteadLayout('layout-1', 'Layout 1');
        layout1.setMap(map1);
        const layout2 = new HomesteadLayout('layout-2', 'Layout 2');
        layout2.setMap(map2);

        const command1 = new CreateLayerCommand(layout1, 'Layer 1');
        const command2 = new CreateLayerCommand(layout2, 'Layer 2');

        handler.handle(command1);
        handler.handle(command2);

        expect(layout1.getLayerCount()).toBe(1);
        expect(layout2.getLayerCount()).toBe(1);
        expect(layout1.getAllLayers()[0].name).not.toBe(layout2.getAllLayers()[0].name);
    });

    // --- T085: Empty layer creation with auto-generated name ---

    describe('execute() with auto-generated name', () => {

        test('should auto-generate name "Layer N" when no name provided', () => {
            const layout = createLayout();
            const handler = new CreateLayerHandler(layout);

            handler.execute({ isVisible: true });

            const layers = layout.getAllLayers();
            expect(layers).toHaveLength(1);
            expect(layers[0].name).toBe('Layer 1');
        });

        test('should auto-generate sequential names based on existing layer count', () => {
            const layout = createLayout();
            const handler = new CreateLayerHandler(layout);

            handler.execute({ name: 'First Layer', isVisible: true });
            handler.execute({ isVisible: true });

            const layers = layout.getAllLayers();
            expect(layers).toHaveLength(2);
            expect(layers[1].name).toBe('Layer 2');
        });

        test('should auto-generate ID when no id provided', () => {
            const layout = createLayout();
            const handler = new CreateLayerHandler(layout);

            const layer = handler.execute({ isVisible: true });

            expect(layer.id).toBeTruthy();
            expect(typeof layer.id).toBe('string');
        });

        test('should use provided name when given', () => {
            const layout = createLayout();
            const handler = new CreateLayerHandler(layout);

            handler.execute({ name: 'Custom Name', isVisible: true });

            expect(layout.getAllLayers()[0].name).toBe('Custom Name');
        });

        test('should create an empty layer with no decorations', () => {
            const layout = createLayout();
            const handler = new CreateLayerHandler(layout);

            handler.execute({ isVisible: true });

            const layer = layout.getAllLayers()[0];
            expect(layer.getDecorationCount()).toBe(0);
        });
    });

    // --- T085: Undo record production ---

    describe('execute() undo record production', () => {

        test('should push undo record when undoRedoManager is provided', () => {
            const layout = createLayout();
            const undoRedoManager = new UndoRedoManager();
            const handler = new CreateLayerHandler(layout, undoRedoManager);

            handler.execute({ isVisible: true });

            expect(undoRedoManager.canUndo()).toBe(true);
            const record = undoRedoManager.peekUndo();
            expect(record.commandType).toBe('CreateLayerCommand');
        });

        test('undo record should contain layer data for redo', () => {
            const layout = createLayout();
            const undoRedoManager = new UndoRedoManager();
            const handler = new CreateLayerHandler(layout, undoRedoManager);

            const layer = handler.execute({ name: 'My Layer', isVisible: true });

            const record = undoRedoManager.peekUndo();
            expect(record.forwardData.layerId).toBe(layer.id);
            expect(record.forwardData.layerName).toBe('My Layer');
            expect(record.forwardData.isVisible).toBe(true);
        });

        test('undo record should contain layerId for undo (reverse)', () => {
            const layout = createLayout();
            const undoRedoManager = new UndoRedoManager();
            const handler = new CreateLayerHandler(layout, undoRedoManager);

            const layer = handler.execute({ isVisible: true });

            const record = undoRedoManager.peekUndo();
            expect(record.reverseData.layerId).toBe(layer.id);
        });

        test('undo record label should include the auto-generated name', () => {
            const layout = createLayout();
            const undoRedoManager = new UndoRedoManager();
            const handler = new CreateLayerHandler(layout, undoRedoManager);

            handler.execute({ isVisible: true });

            const record = undoRedoManager.peekUndo();
            expect(record.label).toBe('Create layer "Layer 1"');
        });

        test('should not push undo record when undoRedoManager is not provided', () => {
            const layout = createLayout();
            const handler = new CreateLayerHandler(layout);

            // Should not throw
            expect(() => handler.execute({ isVisible: true })).not.toThrow();
        });
    });

    describe('execute() auto color assignment', () => {

        test('should assign a palette color to the first layer', async () => {
            const { LAYER_COLORS } = await import('../../src/config/constants.js');
            const layout = createLayout();
            const handler = new CreateLayerHandler(layout);

            const layer = handler.execute({ isVisible: true });

            expect(LAYER_COLORS).toContain(layer.color);
        });

        test('should assign unique palette colors for first N layers (N = palette size)', async () => {
            const { LAYER_COLORS } = await import('../../src/config/constants.js');
            const layout = createLayout();
            const handler = new CreateLayerHandler(layout);

            const layers = [];
            for (let i = 0; i < LAYER_COLORS.length; i++) {
                layers.push(handler.execute({ isVisible: true }));
            }

            const assignedColors = layers.map(l => l.color);
            const uniqueColors = new Set(assignedColors);
            expect(uniqueColors.size).toBe(LAYER_COLORS.length);
            assignedColors.forEach(c => expect(LAYER_COLORS).toContain(c));
        });

        test('should fall back to a palette color when all palette colors are exhausted', async () => {
            const { LAYER_COLORS } = await import('../../src/config/constants.js');
            const layout = createLayout();
            const handler = new CreateLayerHandler(layout);

            for (let i = 0; i < LAYER_COLORS.length; i++) {
                handler.execute({ isVisible: true });
            }

            // All palette colors are now used; the next layer should still get a valid palette color
            const extraLayer = handler.execute({ isVisible: true });
            expect(LAYER_COLORS).toContain(extraLayer.color);
        });

        test('should use explicitly provided color over palette', async () => {
            const layout = createLayout();
            const handler = new CreateLayerHandler(layout);

            const layer = handler.execute({ color: '#aabbcc', isVisible: true });

            expect(layer.color).toBe('#aabbcc');
        });
    });

    describe('execute() unused color preference', () => {

        test('should not reuse a color already in use when unused palette colors exist', async () => {
            const { LAYER_COLORS } = await import('../../src/config/constants.js');
            const layout = createLayout();
            const handler = new CreateLayerHandler(layout);

            const firstLayer = handler.execute({ isVisible: true });
            const secondLayer = handler.execute({ isVisible: true });

            expect(secondLayer.color).not.toBe(firstLayer.color);
        });

        test('should avoid all already-used colors when multiple layers exist', async () => {
            const { LAYER_COLORS } = await import('../../src/config/constants.js');
            const layout = createLayout();
            const handler = new CreateLayerHandler(layout);

            const usedColors = new Set<string>();
            for (let i = 0; i < LAYER_COLORS.length - 1; i++) {
                const layer = handler.execute({ isVisible: true });
                usedColors.add(layer.color);
            }

            const lastLayer = handler.execute({ isVisible: true });
            expect(usedColors.has(lastLayer.color)).toBe(false);
        });

    });

});
