/**
 * Handler for SetZoomCommand
 */
import { ZoomChangedEvent } from '../../domain/events/ZoomChangedEvent.js';

export class SetZoomHandler {
    layout: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     */
    constructor(layout: unknown) {
        this.layout = layout;
    }

    /**
     * Executes the set zoom command
     * @param {SetZoomCommand|Object} command - The command to execute
     * @returns {Object} Result object with the new zoom level
     */
    execute(command: any) { // TODO: typed command interface pending domain migration
        const { zoomLevel } = command;

        // Validate zoom level
        if (typeof zoomLevel !== 'number' || zoomLevel < 0) {
            throw new Error(`SetZoomHandler: Invalid zoom level ${zoomLevel}`);
        }

        // Emit domain event (using 0 as oldZoom since layout doesn't track zoom state)
        const event = new ZoomChangedEvent(
            this.layout.id,
            0,
            zoomLevel
        );
        this.layout.addEvent(event);

        return {
            zoomLevel: zoomLevel
        };
    }
}

export default SetZoomHandler;
