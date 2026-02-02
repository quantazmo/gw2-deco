// @ts-nocheck
/**
 * Tests for SetZoomHandler
 */
import { SetZoomHandler } from '../../src/application/handlers/SetZoomHandler.js';
import { SetZoomCommand } from '../../src/application/commands/SetZoomCommand.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';

describe('SetZoomHandler', () => {
    let layout;
    let handler;

    beforeEach(() => {
        layout = new HomesteadLayout('test-layout', 'Test Layout');
        handler = new SetZoomHandler(layout);
    });

    test('should emit ZoomChangedEvent with correct zoom level', () => {
        const command = new SetZoomCommand(2.5);

        handler.execute(command);

        const events = layout.getPendingEvents();
        expect(events).toHaveLength(1);
        expect(events[0].constructor.name).toBe('ZoomChangedEvent');
        expect(events[0].newZoom).toBe(2.5);
    });

    test('should return zoom level in result', () => {
        const command = new SetZoomCommand(1.5);

        const result = handler.execute(command);

        expect(result.zoomLevel).toBe(1.5);
    });

    test('should accept zoom level of 0', () => {
        const command = new SetZoomCommand(0);

        const result = handler.execute(command);

        expect(result.zoomLevel).toBe(0);
    });

    test('should throw error for negative zoom level', () => {
        const command = new SetZoomCommand(-1);

        expect(() => handler.execute(command)).toThrow('Invalid zoom level -1');
    });

    test('should throw error for non-numeric zoom level', () => {
        const command = { zoomLevel: 'invalid' };

        expect(() => handler.execute(command)).toThrow('Invalid zoom level');
    });
});
