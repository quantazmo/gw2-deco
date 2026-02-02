/**
 * DecorationsDeletedEvent - Domain event fired when decorations are deleted
 */
import { DomainEvent } from './DomainEvent.ts';

export class DecorationsDeletedEvent extends DomainEvent {
    decorationIds: string[];
    sourceMapping: Map<string, string>;
    /**
     * @param {string} layoutId - The layout aggregate ID
     * @param {string[]} decorationIds - IDs of deleted decorations
     * @param {Map<string, string>} sourceMapping - decorationId → sourceLayerId
     */
    constructor(layoutId: string, decorationIds: string[], sourceMapping: Map<string, string> | Record<string, string>) {
        super(layoutId, 'DecorationsDeleted');
        if (!Array.isArray(decorationIds) || decorationIds.length === 0) {
            throw new Error('DecorationsDeletedEvent: decorationIds must be a non-empty array');
        }
        this.decorationIds = [...decorationIds];
        this.sourceMapping = sourceMapping instanceof Map ? new Map(sourceMapping) : new Map(Object.entries(sourceMapping || {}));
    }

    toObject() {
        return {
            ...super.toObject(),
            decorationIds: this.decorationIds,
            sourceMapping: Object.fromEntries(this.sourceMapping)
        };
    }
}

export default DecorationsDeletedEvent;
