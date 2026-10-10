/**
 * Handler for DeleteLayerCommand
 * Produces an UndoRecord containing the deleted layer and all its decorations for undo.
 * Auto-deselects decorations in the deleted layer via SelectionStore.
 */
import { LayerId } from '../../domain/LayerId.js';
import { LayerDeletedEvent } from '../../domain/events/LayerDeletedEvent.js';
import { UndoRecord } from '../UndoRecord.js';
import { UndoRedoManager } from '../UndoRedoManager.ts';
import { HomesteadLayout } from '../../domain/HomesteadLayout.ts';

type LayerSelectionStore = {
    deselectByLayer(layerId: string, decorationBelongsToLayer: (id: string) => boolean): void;
};

export class DeleteLayerHandler {
    layout: HomesteadLayout;
    selectionStore: LayerSelectionStore | null;
    undoRedoManager: UndoRedoManager | null;

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     * @param {SelectionStore} [selectionStore] - Optional selection store for auto-deselect
     * @param {UndoRedoManager} [undoRedoManager] - Optional undo/redo manager for undo support
     */
    constructor(layout: HomesteadLayout, selectionStore: LayerSelectionStore | null = null, undoRedoManager: UndoRedoManager | null = null) {
        this.layout = layout;
        this.selectionStore = selectionStore || null;
        this.undoRedoManager = undoRedoManager || null;
    }

    /**
     * Executes the delete layer command
     * @param {DeleteLayerCommand} command - The command to execute
     */
    execute(command: { layerId: string }): void {
        const layerId = new LayerId(command.layerId);
        const layer = this.layout.getLayer(layerId.id);

        if (!layer) {
            throw new Error(`DeleteLayerHandler: Layer with id ${layerId.id} not found`);
        }

        // Capture full layer state BEFORE deletion for undo
        const wasActive = this.layout.activeLayerId === layerId.id;
        const decorationDTOs = layer.getAllDecorations().map(d => d.toDTO());

        // Auto-deselect decorations in the layer being deleted
        if (this.selectionStore) {
            const decorationIds = new Set(layer.getAllDecorations().map(d => d.id));
            this.selectionStore.deselectByLayer(layerId.id, (id) => decorationIds.has(id));
        }

        // Remove the layer
        this.layout.removeLayer(layerId.id);

        // Push undo record if manager is available
        if (this.undoRedoManager) {
            const record = new UndoRecord({
                label: `Delete layer "${layer.name}"`,
                commandType: 'DeleteLayerCommand',
                forwardData: { layerId: layerId.id },
                reverseData: {
                    layerId: layerId.id,
                    layerName: layer.name,
                    isVisible: layer.isVisible,
                    wasActive,
                    decorations: decorationDTOs
                }
            });
            this.undoRedoManager.push(record);
        }

        // Emit domain event
        const event = new LayerDeletedEvent(
            this.layout.id,
            command.layerId
        );
        this.layout.addEvent(event);
    }
}

export default DeleteLayerHandler;
