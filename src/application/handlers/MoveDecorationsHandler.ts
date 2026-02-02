// @ts-nocheck
/**
 * Handler for MoveDecorationsCommand
 * Moves decorations from their current layers to a target layer.
 * Produces an UndoRecord with source mapping for undo.
 * Emits DecorationsMovedEvent.
 */
import { DecorationsMovedEvent } from '../../domain/events/DecorationsMovedEvent.js';
import { UndoRecord } from '../UndoRecord.js';

export class MoveDecorationsHandler {
    layout: any; // JS domain object � fully typed once domain migrates to TypeScript
    undoRedoManager: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     * @param {UndoRedoManager} [undoRedoManager] - Optional undo/redo manager
     */
    constructor(layout: unknown, undoRedoManager: unknown) {
        this.layout = layout;
        this.undoRedoManager = undoRedoManager || null;
    }

    /**
     * Executes the move decorations command
     * @param {Object} command - { decorationIds: string[], targetLayerId: string }
     * @returns {{ success: boolean, moved: number, skipped: number, sourceMapping: Object }}
     */
    execute(command: any) { // TODO: typed command interface pending domain migration
        const { decorationIds, targetLayerId } = command;

        if (!Array.isArray(decorationIds) || decorationIds.length === 0) {
            return { success: true, moved: 0, skipped: 0, sourceMapping: {} };
        }

        const targetLayer = this.layout.getLayer(targetLayerId);
        if (!targetLayer) {
            throw new Error(`MoveDecorationsHandler: target layer "${targetLayerId}" not found`);
        }

        // Capture original indices before moving (for undo order preservation)
        const originalIndices = {};
        for (const decorationId of decorationIds) {
            const sourceLayer = this.layout.getDecorationLayer(decorationId);
            if (sourceLayer && sourceLayer.id !== targetLayerId) {
                originalIndices[decorationId] = sourceLayer.getDecorationIndex(decorationId);
            }
        }

        const { moved, skipped } = this.layout.moveDecorations(decorationIds, targetLayerId);

        const sourceMapping = Object.fromEntries(moved);

        // Push undo record if manager is available and decorations were actually moved
        if (this.undoRedoManager && moved.size > 0) {
            const movedCount = moved.size;
            const targetName = targetLayer.name || targetLayerId;
            const record = new UndoRecord({
                label: `Move ${movedCount} decoration${movedCount > 1 ? 's' : ''} to ${targetName}`,
                commandType: 'MoveDecorationsCommand',
                forwardData: { decorationIds: Array.from(moved.keys()), targetLayerId },
                reverseData: { sourceMapping, originalIndices }
            });
            this.undoRedoManager.push(record);
        }

        // Emit domain event if decorations were moved
        if (moved.size > 0) {
            const event = new DecorationsMovedEvent(
                this.layout.id,
                Array.from(moved.keys()),
                moved,
                targetLayerId
            );
            this.layout.pendingEvents.push(event);
        }

        return {
            success: true,
            moved: moved.size,
            skipped: skipped.length,
            sourceMapping
        };
    }
}

export default MoveDecorationsHandler;
