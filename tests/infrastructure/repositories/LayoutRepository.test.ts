// @ts-nocheck
/**
 * Tests for LayoutRepository
 * Validates localStorage serialization, deserialization, error recovery, and version checks.
 */

import { PanelLayoutRepository } from '../../../src/infrastructure/repositories/PanelLayoutRepository.js';
import { DockLayoutConfiguration, createPanelNode, createSplitNode, createTabGroupNode } from '../../../src/domain/DockLayoutConfiguration.js';
import { LAYOUT } from '../../../src/config/constants.js';
import { setupLocalStorageMock } from '../mocks/localStorageMock.js';

describe('LayoutRepository', () => {
    let repository;
    let mockStorage;

    beforeEach(() => {
        mockStorage = setupLocalStorageMock();
        repository = new PanelLayoutRepository(mockStorage);
    });

    afterEach(() => {
        mockStorage.clear();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // save
    // ─────────────────────────────────────────────────────────────────────────

    describe('save', () => {
        it('should serialize a LayoutConfiguration to JSON and write to localStorage', () => {
            const layout = DockLayoutConfiguration.createDefault();
            repository.save(layout);

            const stored = mockStorage.getItem(LAYOUT.LAYOUT_STORAGE_KEY);
            expect(stored).not.toBeNull();

            const parsed = JSON.parse(stored);
            expect(parsed.version).toBe(1);
            expect(parsed.tree).toBeDefined();
            expect(parsed.tree.type).toBe('split');
        });

        it('should store the complete tree structure', () => {
            const layout = DockLayoutConfiguration.createDefault();
            repository.save(layout);

            const parsed = JSON.parse(mockStorage.getItem(LAYOUT.LAYOUT_STORAGE_KEY));
            // Default has map in first, right side in second
            expect(parsed.tree.first.type).toBe('panel');
            expect(parsed.tree.first.panelId).toBe('map');
        });

        it('should serialize a layout with TabGroupNode', () => {
            const tree = createSplitNode('vertical', 0.7,
                createPanelNode('map'),
                createTabGroupNode(['layers', 'inspector'], 0)
            );
            // We need the decorationList somewhere — augment with a full valid tree
            const fullTree = createSplitNode('vertical', 0.7,
                createPanelNode('map'),
                createSplitNode('horizontal', 0.5,
                    createTabGroupNode(['layers', 'inspector'], 1),
                    createPanelNode('decorationList')
                )
            );
            const layout = new DockLayoutConfiguration(fullTree, 1);
            repository.save(layout);

            const parsed = JSON.parse(mockStorage.getItem(LAYOUT.LAYOUT_STORAGE_KEY));
            // Find the tabgroup node
            const rightSide = parsed.tree.second.first;
            expect(rightSide.type).toBe('tabgroup');
            expect(rightSide.panels).toEqual(['layers', 'inspector']);
            expect(rightSide.activeIndex).toBe(1);
        });

        it('should not throw when storage write succeeds', () => {
            const layout = DockLayoutConfiguration.createDefault();
            expect(() => repository.save(layout)).not.toThrow();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // load
    // ─────────────────────────────────────────────────────────────────────────

    describe('load', () => {
        it('should return default layout when localStorage key is missing', () => {
            const result = repository.load();

            expect(result).toBeInstanceOf(DockLayoutConfiguration);
            const validation = result.validate();
            expect(validation.valid).toBe(true);
            // Default: map in first child
            expect(result.tree.first.panelId).toBe('map');
        });

        it('should deserialize a previously saved layout', () => {
            const layout = DockLayoutConfiguration.createDefault();
            repository.save(layout);

            const loaded = repository.load();

            expect(loaded).toBeInstanceOf(DockLayoutConfiguration);
            expect(loaded.version).toBe(1);
            expect(loaded.tree).toEqual(layout.tree);
        });

        it('should return default layout when JSON is corrupt', () => {
            mockStorage.setItem(LAYOUT.LAYOUT_STORAGE_KEY, '{ not valid json !!');

            const result = repository.load();

            const validation = result.validate();
            expect(validation.valid).toBe(true);
        });

        it('should return default layout when stored JSON has invalid tree', () => {
            // Missing a required panel id
            const badDoc = JSON.stringify({
                version: 1,
                tree: {
                    type: 'panel',
                    panelId: 'map'   // only one panel — fails completeness check
                }
            });
            mockStorage.setItem(LAYOUT.LAYOUT_STORAGE_KEY, badDoc);

            const result = repository.load();

            // Should fall back to default (all 4 panels present)
            const validation = result.validate();
            expect(validation.valid).toBe(true);
            expect(result.tree.first.panelId).toBe('map');
        });

        it('should return default layout when stored version is unsupported', () => {
            const futureDoc = JSON.stringify({
                version: 999,
                tree: { type: 'panel', panelId: 'map' }
            });
            mockStorage.setItem(LAYOUT.LAYOUT_STORAGE_KEY, futureDoc);

            const result = repository.load();

            const validation = result.validate();
            expect(validation.valid).toBe(true);
        });

        it('should return default layout when stored document has no tree property', () => {
            const noTree = JSON.stringify({ version: 1 });
            mockStorage.setItem(LAYOUT.LAYOUT_STORAGE_KEY, noTree);

            const result = repository.load();

            const validation = result.validate();
            expect(validation.valid).toBe(true);
        });

        it('should reconstruct a TabGroupNode correctly', () => {
            const tree = createSplitNode('vertical', 0.75,
                createPanelNode('map'),
                createTabGroupNode(['layers', 'decorationList'], 0)
            );
            const layout = new DockLayoutConfiguration(tree, 1);
            repository.save(layout);

            const loaded = repository.load();

            const tabNode = loaded.tree.second;
            expect(tabNode.type).toBe('tabgroup');
            expect(tabNode.panels).toEqual(['layers', 'decorationList']);
            expect(tabNode.activeIndex).toBe(0);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // clear
    // ─────────────────────────────────────────────────────────────────────────

    describe('clear', () => {
        it('should remove the layout entry from localStorage', () => {
            const layout = DockLayoutConfiguration.createDefault();
            repository.save(layout);
            expect(mockStorage.getItem(LAYOUT.LAYOUT_STORAGE_KEY)).not.toBeNull();

            repository.clear();

            expect(mockStorage.getItem(LAYOUT.LAYOUT_STORAGE_KEY)).toBeNull();
        });

        it('should not throw when key does not exist', () => {
            expect(() => repository.clear()).not.toThrow();
        });
    });
});
