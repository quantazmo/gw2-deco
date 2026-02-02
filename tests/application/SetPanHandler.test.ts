// @ts-nocheck
/**
 * Tests for SetPanHandler
 */
import { SetPanHandler } from '../../src/application/handlers/SetPanHandler.js';
import { SetPanCommand } from '../../src/application/commands/SetPanCommand.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';

describe('SetPanHandler', () => {
    let layout;
    let handler;

    beforeEach(() => {
        layout = new HomesteadLayout('test-layout', 'Test Layout');
        handler = new SetPanHandler(layout);
    });

    test('should emit PanChangedEvent with correct offset', () => {
        const command = new SetPanCommand({ x: 100, y: 200 });

        handler.execute(command);

        const events = layout.getPendingEvents();
        expect(events).toHaveLength(1);
        expect(events[0].constructor.name).toBe('PanChangedEvent');
        expect(events[0].newPan.x).toBe(100);
        expect(events[0].newPan.y).toBe(200);
    });

    test('should return offset in result', () => {
        const command = new SetPanCommand({ x: 50, y: 75 });

        const result = handler.execute(command);

        expect(result.offset).toEqual({ x: 50, y: 75 });
    });

    test('should accept negative offsets', () => {
        const command = new SetPanCommand({ x: -100, y: -200 });

        const result = handler.execute(command);

        expect(result.offset).toEqual({ x: -100, y: -200 });
    });

    test('should throw error for missing offset', () => {
        const command = { offset: null };

        expect(() => handler.execute(command)).toThrow('Invalid offset');
    });

    test('should throw error for offset without x property', () => {
        const command = { offset: { y: 100 } };

        expect(() => handler.execute(command)).toThrow('Invalid offset');
    });

    test('should throw error for offset without y property', () => {
        const command = { offset: { x: 100 } };

        expect(() => handler.execute(command)).toThrow('Invalid offset');
    });

    test('should throw error for non-numeric x value', () => {
        const command = { offset: { x: 'invalid', y: 100 } };

        expect(() => handler.execute(command)).toThrow('Invalid offset');
    });
});
