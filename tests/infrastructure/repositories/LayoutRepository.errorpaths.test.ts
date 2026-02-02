// @ts-nocheck
/**
 * Additional tests for LayoutRepository — targeting uncovered error paths.
 * Uncovered lines: 43 (save catch/warn), 82 (clear catch/warn)
 */
import { PanelLayoutRepository } from '../../../src/infrastructure/repositories/PanelLayoutRepository.js';
import { DockLayoutConfiguration } from '../../../src/domain/DockLayoutConfiguration.js';

describe('LayoutRepository — error path coverage', () => {

    // ─────────────────────────────────────────────────────────────────────────
    // save() – storage.setItem throws (line 43)
    // ─────────────────────────────────────────────────────────────────────────
    describe('save – storage throws', () => {
        test('degrades gracefully when setItem throws (quota exceeded)', () => {
            const throwingStorage = {
                setItem: () => { throw new Error('QuotaExceededError'); },
                getItem: () => null,
                removeItem: () => { }
            };
            const repo = new PanelLayoutRepository(throwingStorage);
            const layout = DockLayoutConfiguration.createDefault();
            // Should not throw
            expect(() => repo.save(layout)).not.toThrow();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // clear() – storage.removeItem throws (line 82)
    // ─────────────────────────────────────────────────────────────────────────
    describe('clear – storage throws', () => {
        test('degrades gracefully when removeItem throws', () => {
            const throwingStorage = {
                setItem: () => { },
                getItem: () => null,
                removeItem: () => { throw new Error('SecurityError'); }
            };
            const repo = new PanelLayoutRepository(throwingStorage);
            // Should not throw
            expect(() => repo.clear()).not.toThrow();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // load() – storage.getItem throws
    // ─────────────────────────────────────────────────────────────────────────
    describe('load – storage getItem throws', () => {
        test('returns default layout when getItem throws', () => {
            const throwingStorage = {
                setItem: () => { },
                getItem: () => { throw new Error('SecurityError'); },
                removeItem: () => { }
            };
            const repo = new PanelLayoutRepository(throwingStorage);
            const result = repo.load();
            expect(result).toBeInstanceOf(DockLayoutConfiguration);
            expect(result.validate().valid).toBe(true);
        });
    });
});
