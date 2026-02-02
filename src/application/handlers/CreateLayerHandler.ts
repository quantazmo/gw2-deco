/**
 * Handler for CreateLayerCommand
 * Produces an UndoRecord for undo support when UndoRedoManager is provided.
 */
import { Layer } from '../../domain/Layer.js';
import { LayerCreatedEvent } from '../../domain/events/LayerCreatedEvent.js';
import { UndoRecord } from '../UndoRecord.js';
import { LAYER_COLORS } from '../../config/constants.js';

export class CreateLayerHandler {
    layout: any; // JS domain object � fully typed once domain migrates to TypeScript
    undoRedoManager: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     * @param {UndoRedoManager} [undoRedoManager] - Optional undo/redo manager for undo support
     */
    constructor(layout: unknown, undoRedoManager: unknown = null) {
        this.layout = layout;
        this.undoRedoManager = undoRedoManager || null;
    }

    /**
     * Executes the create layer command
     * @param {CreateLayerCommand} command - The command to execute
     * @returns {Layer} The created layer
     */
    execute(command: any) { // TODO: typed command interface pending domain migration
        // Auto-generate ID if not provided
        const layerId = command.id || `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Auto-generate name based on existing layer count if not provided
        const layerCount = this.layout.getLayerCount();
        const layerName = command.name || `Layer ${layerCount + 1}`;

        // Auto-assign color: prefer an unused palette color; fall back to random from palette
        const usedColors = new Set(this.layout.getAllLayers().map((l: any) => l.color));
        const unusedColors = (LAYER_COLORS as readonly string[]).filter(c => !usedColors.has(c));
        const pool = unusedColors.length > 0 ? unusedColors : (LAYER_COLORS as readonly string[]);
        const randomColor = pool[Math.floor(Math.random() * pool.length)];
        const color = command.color || randomColor;

        const layer = new Layer(layerId, layerName, command.isVisible, color);

        this.layout.addLayer(layer);

        // Push undo record if manager is available
        if (this.undoRedoManager) {
            const record = new UndoRecord({
                label: `Create layer "${layerName}"`,
                commandType: 'CreateLayerCommand',
                forwardData: { layerId: layer.id, layerName: layer.name, isVisible: layer.isVisible },
                reverseData: { layerId: layer.id }
            });
            this.undoRedoManager.push(record);
        }

        // Emit domain event
        const event = new LayerCreatedEvent(
            this.layout.id,
            layer.id,
            layerName
        );
        (event as any).layer = layer; // Attach layer for convenience
        this.layout.addEvent(event);

        return layer;
    }

    /**
     * Alias for execute() to match test interface
     * @param {CreateLayerCommand} command - The command to execute
     * @returns {Object} Result object with the created layer
     */
    handle(command: any) { // TODO: typed command interface pending domain migration
        if (!command) {
            throw new Error('CreateLayerHandler.handle: command is required');
        }
        if (!command.layout) {
            throw new Error('CreateLayerHandler.handle: layout is required in command');
        }
        if (!command.layerName || String(command.layerName).trim().length === 0) {
            throw new Error('CreateLayerHandler.handle: layerName cannot be empty');
        }

        // Generate unique layer ID
        const layerId = `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create new layer
        const layer = new Layer(layerId, command.layerName);

        // Add to layout
        command.layout.addLayer(layer);

        // Emit domain event
        const event = new LayerCreatedEvent(
            command.layout.id,
            layerId,
            command.layerName
        );
        (event as any).layer = layer; // attach convenience property not in domain Event base type
        command.layout.addEvent(event);

        return {
            layer: layer,
            layerId: layerId
        };
    }
}

export default CreateLayerHandler;
