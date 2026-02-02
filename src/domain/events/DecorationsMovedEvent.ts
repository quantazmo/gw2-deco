/**
 * DecorationsMovedEvent - Domain event fired when decorations are moved between layers
 */
import { DomainEvent } from './DomainEvent.ts';

export class DecorationsMovedEvent extends DomainEvent {
    decorationIds: string[];
    sourceMapping: Map<string, string>;
    targetLayerId: string;
    /**
     * @param {string} layoutId - The layout aggregate ID
     * @param {string[]} decorationIds - IDs of moved decorations
     * @param {Map<string, string>} sourceMapping - decorationId → sourceLayerId
     * @param {string} targetLayerId - The target layer ID
     */
    constructor(layoutId: string, decorationIds: string[], sourceMapping: Map<string, string> | Record<string, string>, targetLayerId: string) {
        super(layoutId, 'DecorationsMoved');
        if (!Array.isArray(decorationIds) || decorationIds.length === 0) {
            throw new Error('DecorationsMovedEvent: decorationIds must be a non-empty array');
        }
        if (!targetLayerId) {
            throw new Error('DecorationsMovedEvent: targetLayerId is required');
        }
        this.decorationIds = [...decorationIds];
        this.sourceMapping = sourceMapping instanceof Map ? new Map(sourceMapping) : new Map(Object.entries(sourceMapping || {}));
        this.targetLayerId = targetLayerId;
    }

    toObject() {
        return {
            ...super.toObject(),
            decorationIds: this.decorationIds,
            sourceMapping: Object.fromEntries(this.sourceMapping),
            targetLayerId: this.targetLayerId
        };
    }
}

export default DecorationsMovedEvent;
