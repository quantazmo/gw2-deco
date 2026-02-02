/**
 * DomainEvent - Base class for all domain events
 * Domain events represent something that happened in the domain
 */
export class DomainEvent {
    aggregateId: string;
    eventType: string;
    timestamp: Date;
    version: number;

    constructor(aggregateId: string, eventType: string) {
        if (!aggregateId) {
            throw new Error('DomainEvent: aggregateId is required');
        }
        if (!eventType) {
            throw new Error('DomainEvent: eventType is required');
        }

        this.aggregateId = aggregateId;
        this.eventType = eventType;
        this.timestamp = new Date();
        this.version = 1;
    }

    getEventType(): string {
        return this.eventType;
    }

    getAggregateId(): string {
        return this.aggregateId;
    }

    getTimestamp(): Date {
        return this.timestamp;
    }

    getVersion(): number {
        return this.version;
    }

    toObject(): Record<string, unknown> {
        return {
            aggregateId: this.aggregateId,
            eventType: this.eventType,
            timestamp: this.timestamp.toISOString(),
            version: this.version
        };
    }

    toString(): string {
        return `${this.constructor.name}(${this.aggregateId}, ${this.timestamp.toISOString()})`;
    }
}

export default DomainEvent;
