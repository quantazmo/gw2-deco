/**
 * Handler for SetPanCommand
 */
import { PanChangedEvent } from '../../domain/events/PanChangedEvent.js';

export class SetPanHandler {
    layout: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     */
    constructor(layout: unknown) {
        this.layout = layout;
    }

    /**
     * Executes the set pan command
     * @param {SetPanCommand|Object} command - The command to execute
     * @returns {Object} Result object with the new pan offset
     */
    execute(command: any) { // TODO: typed command interface pending domain migration
        const { offset } = command;

        // Validate offset
        if (!offset || typeof offset.x !== 'number' || typeof offset.y !== 'number') {
            throw new Error('SetPanHandler: Invalid offset, must have numeric x and y properties');
        }

        // Emit domain event (using {x:0, y:0} as oldPan since layout doesn't track pan state)
        const event = new PanChangedEvent(
            this.layout.id,
            { x: 0, y: 0 },
            offset
        );
        this.layout.addEvent(event);

        return {
            offset: offset
        };
    }
}

export default SetPanHandler;
