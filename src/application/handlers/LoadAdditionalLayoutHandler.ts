/**
 * Handler for LoadAdditionalLayoutCommand
 * Parses XML layout and adds it as a new layer to the existing layout.
 * If the layout is for a different map, returns a confirmation request.
 */
import { Layer } from '../../domain/Layer.js';
import { Decoration } from '../../domain/Decoration.js';
import { WorldCoordinate } from '../../domain/WorldCoordinate.js';
import { LayerCreatedEvent } from '../../domain/events/LayerCreatedEvent.js';
import { ParsedLayoutData, XmlLayoutAdapter } from '../../infrastructure/XmlLayoutAdapter.js';
import { LAYER_COLORS } from '../../config/constants.js';
import { HomesteadLayout } from '../../domain/HomesteadLayout.ts';
import { LoadAdditionalLayoutCommand } from '../commands/LoadAdditionalLayoutCommand.ts';

export class LoadAdditionalLayoutHandler {
    layout: HomesteadLayout;
    xmlAdapter: XmlLayoutAdapter;

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     * @param {XmlLayoutAdapter} xmlAdapter - XML layout adapter
     */
    constructor(layout: HomesteadLayout, xmlAdapter: XmlLayoutAdapter) {
        this.layout = layout;
        this.xmlAdapter = xmlAdapter;
    }

    /**
     * Executes the load additional layout command
     * @param {Object} command - The command payload with xmlContent and fileName
     * @returns {Object} Result: success with layer info, or requiresConfirmation
     */
    execute(command: LoadAdditionalLayoutCommand) {
        const { xmlContent, fileName } = command;

        if (!xmlContent || typeof xmlContent !== 'string' || xmlContent.trim().length === 0) {
            throw new Error('LoadAdditionalLayoutHandler: xmlContent is required');
        }

        // Parse the XML layout
        const layoutData = XmlLayoutAdapter.parseLayoutSync
            ? XmlLayoutAdapter.parseLayoutSync(xmlContent)
            : this._parseSync(xmlContent);

        const newMapId = layoutData.id;
        const newMapName = layoutData.name;

        // If no map is loaded yet (first load), this is handled as a first-load
        const currentMap = this.layout.map;
        if (!this.layout.hasMapLoaded() || !currentMap) {
            return this._createLayerFromLayout(layoutData, fileName);
        }

        // Compare map IDs
        const currentMapId = currentMap.id;
        const currentMapName = currentMap.name || 'Unknown';

        if (String(currentMapId) !== String(newMapId)) {
            // Different map — return confirmation request
            return {
                success: false,
                requiresConfirmation: true,
                currentMapId,
                currentMapName,
                newMapId,
                newMapName,
                xmlContent,
                fileName
            };
        }

        // Same map — add as additional layer
        return this._createLayerFromLayout(layoutData, fileName);
    }

    /**
     * Creates a layer from parsed layout data and adds it to the layout
     * @private
     */
    _createLayerFromLayout(layoutData: ParsedLayoutData, fileName: string) {
        // Generate unique layer ID
        const layerId = `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Derive layer name from fileName (strip extension) or layout name
        const layerName = fileName
            ? fileName.replace(/\.xml$/i, '')
            : `Layer ${this.layout.getLayerCount() + 1}`;

        // Pick a random unused palette color for the new layer
        const usedColors = new Set(this.layout.getAllLayers().map(layer => layer.color));
        const unusedColors = (LAYER_COLORS as readonly string[]).filter(c => !usedColors.has(c));
        const pool = unusedColors.length > 0 ? unusedColors : (LAYER_COLORS as readonly string[]);
        const color = pool[Math.floor(Math.random() * pool.length)];

        // Create the layer
        const layer = new Layer(layerId, layerName, true, color);

        // Add decorations from parsed layout data
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
            if (decData.rotation && typeof decData.rotation === 'object') {
                decoration.rotX = decData.rotation.x || 0;
                decoration.rotZ = decData.rotation.z || 0;
            }
            layer.addDecoration(decoration);
        }

        // Add layer to layout
        this.layout.addLayer(layer);

        // Emit domain event
        const event = Object.assign(new LayerCreatedEvent(
            this.layout.id,
            layerId,
            layerName
        ), { layer });
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
    _parseSync(xmlContent: string): ParsedLayoutData {
        const validation = XmlLayoutAdapter.validateXmlString(xmlContent);
        if (!validation.isValid) {
            throw new Error(`XML validation failed: ${validation.errors.join(', ')}`);
        }

        // Use the internal _parseXmlString and _extractLayout methods
        const xmlDoc = XmlLayoutAdapter._parseXmlString(xmlContent);
        return XmlLayoutAdapter._extractLayout(xmlDoc);
    }
}

export default LoadAdditionalLayoutHandler;
