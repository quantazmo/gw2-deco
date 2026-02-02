// @ts-nocheck
/**
 * Handler for DeleteDecorationsCommand
 * Deletes decorations from their layers via HomesteadLayout.removeDecorations().
 * Produces an UndoRecord with full decoration data for undo restore.
 * Emits DecorationsDeletedEvent.
 * Clears selection for deleted IDs.
 */
import { DecorationsDeletedEvent } from '../../domain/events/DecorationsDeletedEvent.js';
import { UndoRecord } from '../UndoRecord.js';

export class DeleteDecorationsHandler {
    layout: any; // JS domain object � fully typed once domain migrates to TypeScript
    selectionStore: any; // JS domain object � fully typed once domain migrates to TypeScript
    undoRedoManager: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     * @param {SelectionStore} [selectionStore] - Optional selection store for auto-deselect
     * @param {UndoRedoManager} [undoRedoManager] - Optional undo/redo manager
     */
    constructor(layout: unknown, selectionStore: unknown, undoRedoManager: unknown) {
        this.layout = layout;
        this.selectionStore = selectionStore || null;
        this.undoRedoManager = undoRedoManager || null;
    }

    /**
     * Executes the delete decorations command
     * @param {Object} command - { decorationIds: string[] }
     * @returns {{ success: boolean, deleted: number }}
     */
    execute(command: any) { // TODO: typed command interface pending domain migration
        const { decorationIds } = command;

        if (!Array.isArray(decorationIds) || decorationIds.length === 0) {
            return { success: true, deleted: 0 };
        }

        // Capture original indices before deleting (for undo order preservation)
        const originalIndices = {};
        for (const decorationId of decorationIds) {
            const sourceLayer = this.layout.getDecorationLayer(decorationId);
            if (sourceLayer) {
                originalIndices[decorationId] = sourceLayer.getDecorationIndex(decorationId);
            }
        }

        const { removed } = this.layout.removeDecorations(decorationIds);

        // Push undo record if manager is available and decorations were actually deleted
        if (this.undoRedoManager && removed.size > 0) {
            const deletedCount = removed.size;
            // Store full decoration data for undo restore
            const removedData = {};
            const sourceMapping = {};
            for (const [id, { sourceLayerId, decoration }] of removed) {
                sourceMapping[id] = sourceLayerId;
                removedData[id] = {
                    sourceLayerId,
                    decoration: decoration.toDTO(),
                    originalIndex: originalIndices[id] !== undefined ? originalIndices[id] : -1
                };
            }
            const record = new UndoRecord({
                label: `Delete ${deletedCount} decoration${deletedCount > 1 ? 's' : ''}`,
                commandType: 'DeleteDecorationsCommand',
                forwardData: { decorationIds: Array.from(removed.keys()) },
                reverseData: { removedData }
            });
            this.undoRedoManager.push(record);
        }

        // Clear selection for deleted IDs
        if (this.selectionStore && removed.size > 0) {
            this.selectionStore.clearSelection();
        }

        // Emit domain event if decorations were deleted
        if (removed.size > 0) {
            const sourceMapping = new Map();
            for (const [id, { sourceLayerId }] of removed) {
                sourceMapping.set(id, sourceLayerId);
            }
            const event = new DecorationsDeletedEvent(
                this.layout.id,
                Array.from(removed.keys()),
                sourceMapping
            );
            this.layout.pendingEvents.push(event);
        }

        return {
            success: true,
            deleted: removed.size
        };
    }
}

export default DeleteDecorationsHandler;
