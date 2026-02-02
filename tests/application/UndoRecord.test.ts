// @ts-nocheck
/**
 * Tests for src/application/UndoRecord.js
 * Tests UndoRecord value object — construction, immutability, validation
 */
import { UndoRecord } from '../../src/application/UndoRecord.js';

describe('UndoRecord Value Object', () => {

    beforeEach(() => {
        UndoRecord._resetIdCounter();
    });

    describe('construction', () => {
        test('should create record with valid parameters', () => {
            const record = new UndoRecord({
                label: 'Move 3 decorations',
                commandType: 'MOVE_DECORATIONS',
                forwardData: { targetLayerId: 'layer-2', ids: ['d1', 'd2'] },
                reverseData: { sourceMapping: { d1: 'layer-1', d2: 'layer-1' } }
            });

            expect(record.id).toBe('undo-1');
            expect(record.label).toBe('Move 3 decorations');
            expect(record.commandType).toBe('MOVE_DECORATIONS');
            expect(record.forwardData).toEqual({ targetLayerId: 'layer-2', ids: ['d1', 'd2'] });
            expect(record.reverseData).toEqual({ sourceMapping: { d1: 'layer-1', d2: 'layer-1' } });
            expect(record.timestamp).toBeInstanceOf(Date);
        });

        test('should generate sequential ids', () => {
            const r1 = new UndoRecord({
                label: 'Action 1',
                commandType: 'CMD_1',
                forwardData: { x: 1 },
                reverseData: { x: 0 }
            });
            const r2 = new UndoRecord({
                label: 'Action 2',
                commandType: 'CMD_2',
                forwardData: { x: 2 },
                reverseData: { x: 1 }
            });

            expect(r1.id).toBe('undo-1');
            expect(r2.id).toBe('undo-2');
        });

        test('should trim label and commandType', () => {
            const record = new UndoRecord({
                label: '  Move decorations  ',
                commandType: '  MOVE  ',
                forwardData: { a: 1 },
                reverseData: { a: 0 }
            });

            expect(record.label).toBe('Move decorations');
            expect(record.commandType).toBe('MOVE');
        });
    });

    describe('validation', () => {
        test('should throw on empty label', () => {
            expect(() => new UndoRecord({
                label: '',
                commandType: 'CMD',
                forwardData: { a: 1 },
                reverseData: { a: 0 }
            })).toThrow('label must be a non-empty string');
        });

        test('should throw on whitespace-only label', () => {
            expect(() => new UndoRecord({
                label: '   ',
                commandType: 'CMD',
                forwardData: { a: 1 },
                reverseData: { a: 0 }
            })).toThrow('label must be a non-empty string');
        });

        test('should throw on non-string label', () => {
            expect(() => new UndoRecord({
                label: 123,
                commandType: 'CMD',
                forwardData: { a: 1 },
                reverseData: { a: 0 }
            })).toThrow('label must be a non-empty string');
        });

        test('should throw on empty commandType', () => {
            expect(() => new UndoRecord({
                label: 'Valid',
                commandType: '',
                forwardData: { a: 1 },
                reverseData: { a: 0 }
            })).toThrow('commandType must be a non-empty string');
        });

        test('should throw on non-string commandType', () => {
            expect(() => new UndoRecord({
                label: 'Valid',
                commandType: null,
                forwardData: { a: 1 },
                reverseData: { a: 0 }
            })).toThrow('commandType must be a non-empty string');
        });

        test('should throw on null forwardData', () => {
            expect(() => new UndoRecord({
                label: 'Valid',
                commandType: 'CMD',
                forwardData: null,
                reverseData: { a: 0 }
            })).toThrow('forwardData must be a non-null object');
        });

        test('should throw on non-object forwardData', () => {
            expect(() => new UndoRecord({
                label: 'Valid',
                commandType: 'CMD',
                forwardData: 'string',
                reverseData: { a: 0 }
            })).toThrow('forwardData must be a non-null object');
        });

        test('should throw on null reverseData', () => {
            expect(() => new UndoRecord({
                label: 'Valid',
                commandType: 'CMD',
                forwardData: { a: 1 },
                reverseData: null
            })).toThrow('reverseData must be a non-null object');
        });

        test('should throw on non-object reverseData', () => {
            expect(() => new UndoRecord({
                label: 'Valid',
                commandType: 'CMD',
                forwardData: { a: 1 },
                reverseData: 42
            })).toThrow('reverseData must be a non-null object');
        });
    });

    describe('immutability', () => {
        test('should freeze the record', () => {
            const record = new UndoRecord({
                label: 'Test',
                commandType: 'CMD',
                forwardData: { a: 1 },
                reverseData: { a: 0 }
            });

            expect(() => { record.label = 'Changed'; }).toThrow();
            expect(record.label).toBe('Test');
        });

        test('should freeze forwardData', () => {
            const record = new UndoRecord({
                label: 'Test',
                commandType: 'CMD',
                forwardData: { a: 1 },
                reverseData: { a: 0 }
            });

            expect(() => { record.forwardData.a = 999; }).toThrow();
            expect(record.forwardData.a).toBe(1);
        });

        test('should freeze reverseData', () => {
            const record = new UndoRecord({
                label: 'Test',
                commandType: 'CMD',
                forwardData: { a: 1 },
                reverseData: { b: 2 }
            });

            expect(() => { record.reverseData.b = 999; }).toThrow();
            expect(record.reverseData.b).toBe(2);
        });

        test('should not be affected by mutation of constructor input', () => {
            const fwd = { a: 1 };
            const rev = { b: 2 };
            const record = new UndoRecord({
                label: 'Test',
                commandType: 'CMD',
                forwardData: fwd,
                reverseData: rev
            });

            fwd.a = 999;
            rev.b = 999;

            expect(record.forwardData.a).toBe(1);
            expect(record.reverseData.b).toBe(2);
        });
    });
});
