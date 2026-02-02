// @ts-nocheck
/**
 * Handler for SwitchMapCommand
 * Clears all layers via HomesteadLayout.clearAllLayers(),
 * clears UndoRedoManager, loads the new layout as the first layer.
 */
import { Layer } from '../../domain/Layer.js';
import { Decoration } from '../../domain/Decoration.js';
import { WorldCoordinate } from '../../domain/WorldCoordinate.js';
import { LayerCreatedEvent } from '../../domain/events/LayerCreatedEvent.js';
import { AllLayersClearedEvent } from '../../domain/events/AllLayersClearedEvent.js';
import { XmlLayoutAdapter } from '../../infrastructure/XmlLayoutAdapter.js';

export class SwitchMapHandler {
    layout: any; // JS domain object � fully typed once domain migrates to TypeScript
    xmlAdapter: any; // JS domain object � fully typed once domain migrates to TypeScript
    undoRedoManager: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     * @param {XmlLayoutAdapter} xmlAdapter - XML layout adapter
     * @param {UndoRedoManager} undoRedoManager - Undo/redo manager to clear on switch
     */
    constructor(layout: unknown, xmlAdapter: unknown, undoRedoManager: unknown) {
        this.layout = layout;
        this.xmlAdapter = xmlAdapter;
        this.undoRedoManager = undoRedoManager;
    }

    /**
     * Executes the switch map command
     * @param {Object} command - The command payload with xmlContent and fileName
     * @returns {Object} Result with success, mapId, mapName, layerId, decorationCount
     */
    execute(command: any) { // TODO: typed command interface pending domain migration
        const { xmlContent, fileName } = command;

        if (!xmlContent || typeof xmlContent !== 'string' || xmlContent.trim().length === 0) {
            throw new Error('SwitchMapHandler: xmlContent is required');
        }

        // Parse the XML layout
        const layoutData = XmlLayoutAdapter.parseLayoutSync
            ? XmlLayoutAdapter.parseLayoutSync(xmlContent)
            : this._parseSync(xmlContent);

        // Record previous layer count for event
        const previousLayerCount = this.layout.getLayerCount();

        // 1. Clear all layers
        this.layout.clearAllLayers();

        // Emit AllLayersClearedEvent
        this.layout.addEvent(
            new AllLayersClearedEvent(this.layout.id, previousLayerCount)
        );

        // 2. Clear undo/redo history
        this.undoRedoManager.clear();

        // 3. Create a layer from the new layout
        return this._createLayerFromLayout(layoutData, fileName);
    }

    /**
     * Creates a layer from parsed layout data and adds it to the layout
     * @private
     */
    _createLayerFromLayout(layoutData, fileName) {
        const layerId = `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const layerName = fileName
            ? fileName.replace(/\.xml$/i, '')
            : `Layer ${this.layout.getLayerCount() + 1}`;

        const layer = new Layer(layerId, layerName);

        const decorations = layoutData.decorations || [];
        for (const decData of decorations) {
            const position = new WorldCoordinate(
                decData.position.x,
                decData.position.y,
                decData.position.z || 0,
                0
            );
            // Decoration.create() sets id = XML prop-type and assigns a new unique uid.
            const decoration = Decoration.create(
                decData.id,
                decData.name,
                position,
                decData.rotation && typeof decData.rotation === 'object'
                    ? decData.rotation.y || 0
                    : decData.rotation || 0,
                decData.scale || 1
            );
            layer.addDecoration(decoration);
        }

        this.layout.addLayer(layer);

        // Emit LayerCreatedEvent
        const event = new LayerCreatedEvent(
            this.layout.id,
            layerId,
            layerName
        );
        (event as any).layer = layer; // attach convenience property not in domain Event base type
        this.layout.addEvent(event);

        return {
            success: true,
            layerId,
            layerName,
            decorationCount: decorations.length
        };
    }

    /**
     * Fallback sync parse using XmlLayoutAdapter static methods
     * @private
     */
    _parseSync(xmlContent) {
        const validation = XmlLayoutAdapter.validateXmlString(xmlContent);
        if (!validation.isValid) {
            throw new Error(`XML validation failed: ${validation.errors.join(', ')}`);
        }

        const xmlDoc = XmlLayoutAdapter._parseXmlString(xmlContent);
        return XmlLayoutAdapter._extractLayout(xmlDoc);
    }
}

export default SwitchMapHandler;
