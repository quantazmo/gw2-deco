// @ts-nocheck
/**
 * Handler for MergeLayerCommand.
 * Moves all decorations from the source layer to the target layer,
 * then deletes the source layer. Produces a single UndoRecord.
 */
import { UndoRecord } from '../UndoRecord.js';
import { LayerDeletedEvent } from '../../domain/events/LayerDeletedEvent.js';

export class MergeLayerHandler {
    layout: any;
    selectionStore: any;
    undoRedoManager: any;

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     * @param {SelectionStore} [selectionStore] - Optional selection store for auto-deselect
     * @param {UndoRedoManager} [undoRedoManager] - Optional undo/redo manager
     */
    constructor(layout: unknown, selectionStore: unknown = null, undoRedoManager: unknown = null) {
        this.layout = layout;
        this.selectionStore = selectionStore || null;
        this.undoRedoManager = undoRedoManager || null;
    }

    /**
     * Executes the merge layer command.
     * @param {{ sourceLayerId: string, targetLayerId: string }} command
     */
    execute(command: any) {
        const { sourceLayerId, targetLayerId } = command;

        if (!sourceLayerId || !targetLayerId) {
            throw new Error('MergeLayerHandler: sourceLayerId and targetLayerId are required');
        }
        if (sourceLayerId === targetLayerId) {
            throw new Error('MergeLayerHandler: source and target layers must be different');
        }

        const sourceLayer = this.layout.getLayer(sourceLayerId);
        if (!sourceLayer) {
            throw new Error(`MergeLayerHandler: source layer "${sourceLayerId}" not found`);
        }

        const targetLayer = this.layout.getLayer(targetLayerId);
        if (!targetLayer) {
            throw new Error(`MergeLayerHandler: target layer "${targetLayerId}" not found`);
        }

        // Capture full source layer state BEFORE moving for undo
        const decorationDTOs = sourceLayer.getAllDecorations().map(d => d.toDTO());
        // Use uid (unique instance id, the Layer Map key) not id (prop-type id shared by multiple instances)
        const decorationIds = decorationDTOs.map(d => (d.uid || d.id) as string);
        const wasActive = this.layout.activeLayerId === sourceLayerId;

        // Auto-deselect decorations that are in the source layer
        if (this.selectionStore && decorationIds.length > 0) {
            const decorationIdSet = new Set(decorationIds);
            this.selectionStore.deselectByLayer(sourceLayerId, (id) => decorationIdSet.has(id));
        }

        // Move all decorations from source to target
        if (decorationIds.length > 0) {
            this.layout.moveDecorations(decorationIds, targetLayerId);
        }

        // Remove the (now empty) source layer
        this.layout.removeLayer(sourceLayerId);

        // Emit domain event so the UI (layers panel) removes the source layer
        const event = new LayerDeletedEvent(this.layout.id, sourceLayerId);
        this.layout.addEvent(event);

        // Push undo record
        if (this.undoRedoManager) {
            const record = new UndoRecord({
                label: `Merge layer "${sourceLayer.name}" into "${targetLayer.name}"`,
                commandType: 'MergeLayerCommand',
                forwardData: { sourceLayerId, targetLayerId },
                reverseData: {
                    sourceLayerId,
                    sourceLayerName: sourceLayer.name,
                    sourceLayerIsVisible: sourceLayer.isVisible,
                    wasActive,
                    targetLayerId,
                    decorationDTOs
                }
            });
            this.undoRedoManager.push(record);
        }
    }
}

export default MergeLayerHandler;
