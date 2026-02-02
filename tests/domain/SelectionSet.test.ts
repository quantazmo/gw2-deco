// @ts-nocheck
/**
 * Tests for src/domain/SelectionSet.js
 * Tests SelectionSet value object — immutability, all methods, edge cases
 */
import { SelectionSet } from '../../src/domain/SelectionSet.js';

describe('SelectionSet Value Object', () => {

    describe('constructor', () => {
        test('should create empty selection set by default', () => {
            const set = new SelectionSet();
            expect(set.isEmpty()).toBe(true);
            expect(set.size).toBe(0);
        });

        test('should create selection set with initial ids', () => {
            const set = new SelectionSet(['a', 'b', 'c']);
            expect(set.size).toBe(3);
            expect(set.contains('a')).toBe(true);
            expect(set.contains('b')).toBe(true);
            expect(set.contains('c')).toBe(true);
        });

        test('should deduplicate initial ids', () => {
            const set = new SelectionSet(['a', 'a', 'b']);
            expect(set.size).toBe(2);
        });
    });

    describe('add', () => {
        test('should return new SelectionSet with id added', () => {
            const set = new SelectionSet();
            const result = set.add('deco-1');

            expect(result.contains('deco-1')).toBe(true);
            expect(result.size).toBe(1);
        });

        test('should not mutate original', () => {
            const set = new SelectionSet();
            set.add('deco-1');

            expect(set.isEmpty()).toBe(true);
        });

        test('should silently ignore duplicate ids', () => {
            const set = new SelectionSet(['deco-1']);
            const result = set.add('deco-1');

            expect(result.size).toBe(1);
        });

        test('should ignore empty string ids', () => {
            const set = new SelectionSet();
            const result = set.add('');

            expect(result.isEmpty()).toBe(true);
        });

        test('should ignore whitespace-only string ids', () => {
            const set = new SelectionSet();
            const result = set.add('   ');

            expect(result.isEmpty()).toBe(true);
        });

        test('should ignore non-string ids', () => {
            const set = new SelectionSet();
            const result = set.add(123);

            expect(result.isEmpty()).toBe(true);
        });

        test('should ignore null and undefined ids', () => {
            const set = new SelectionSet();
            expect(set.add(null).isEmpty()).toBe(true);
            expect(set.add(undefined).isEmpty()).toBe(true);
        });
    });

    describe('remove', () => {
        test('should return new SelectionSet with id removed', () => {
            const set = new SelectionSet(['deco-1', 'deco-2']);
            const result = set.remove('deco-1');

            expect(result.contains('deco-1')).toBe(false);
            expect(result.contains('deco-2')).toBe(true);
            expect(result.size).toBe(1);
        });

        test('should not mutate original', () => {
            const set = new SelectionSet(['deco-1']);
            set.remove('deco-1');

            expect(set.contains('deco-1')).toBe(true);
        });

        test('should handle removing a non-existent id gracefully', () => {
            const set = new SelectionSet(['deco-1']);
            const result = set.remove('deco-999');

            expect(result.size).toBe(1);
            expect(result.contains('deco-1')).toBe(true);
        });
    });

    describe('toggle', () => {
        test('should add id when not present', () => {
            const set = new SelectionSet();
            const result = set.toggle('deco-1');

            expect(result.contains('deco-1')).toBe(true);
        });

        test('should remove id when already present', () => {
            const set = new SelectionSet(['deco-1']);
            const result = set.toggle('deco-1');

            expect(result.contains('deco-1')).toBe(false);
        });

        test('should not mutate original', () => {
            const set = new SelectionSet(['deco-1']);
            set.toggle('deco-1');

            expect(set.contains('deco-1')).toBe(true);
        });

        test('should ignore empty string ids', () => {
            const set = new SelectionSet();
            const result = set.toggle('');
            expect(result.isEmpty()).toBe(true);
        });

        test('should ignore non-string ids', () => {
            const set = new SelectionSet();
            const result = set.toggle(42);
            expect(result.isEmpty()).toBe(true);
        });
    });

    describe('addRange', () => {
        test('should add multiple ids at once', () => {
            const set = new SelectionSet();
            const result = set.addRange(['a', 'b', 'c']);

            expect(result.size).toBe(3);
            expect(result.contains('a')).toBe(true);
            expect(result.contains('b')).toBe(true);
            expect(result.contains('c')).toBe(true);
        });

        test('should merge with existing ids', () => {
            const set = new SelectionSet(['x']);
            const result = set.addRange(['a', 'b']);

            expect(result.size).toBe(3);
            expect(result.contains('x')).toBe(true);
        });

        test('should not mutate original', () => {
            const set = new SelectionSet();
            set.addRange(['a', 'b']);

            expect(set.isEmpty()).toBe(true);
        });

        test('should skip invalid ids in the array', () => {
            const set = new SelectionSet();
            const result = set.addRange(['a', '', null, 42, 'b', '  ']);

            expect(result.size).toBe(2);
            expect(result.contains('a')).toBe(true);
            expect(result.contains('b')).toBe(true);
        });

        test('should return same-valued set when given non-array', () => {
            const set = new SelectionSet(['x']);
            const result = set.addRange('not-an-array');

            expect(result.size).toBe(1);
            expect(result.contains('x')).toBe(true);
        });

        test('should handle empty array', () => {
            const set = new SelectionSet(['x']);
            const result = set.addRange([]);

            expect(result.size).toBe(1);
        });
    });

    describe('clear', () => {
        test('should return empty SelectionSet', () => {
            const set = new SelectionSet(['a', 'b', 'c']);
            const result = set.clear();

            expect(result.isEmpty()).toBe(true);
            expect(result.size).toBe(0);
        });

        test('should not mutate original', () => {
            const set = new SelectionSet(['a', 'b']);
            set.clear();

            expect(set.size).toBe(2);
        });
    });

    describe('contains', () => {
        test('should return true for present ids', () => {
            const set = new SelectionSet(['deco-1']);
            expect(set.contains('deco-1')).toBe(true);
        });

        test('should return false for absent ids', () => {
            const set = new SelectionSet(['deco-1']);
            expect(set.contains('deco-999')).toBe(false);
        });

        test('should return false for empty set', () => {
            const set = new SelectionSet();
            expect(set.contains('deco-1')).toBe(false);
        });
    });

    describe('removeByFilter', () => {
        test('should remove items matching predicate', () => {
            const set = new SelectionSet(['layer1-d1', 'layer1-d2', 'layer2-d1']);
            const result = set.removeByFilter(id => id.startsWith('layer1'));

            expect(result.size).toBe(1);
            expect(result.contains('layer2-d1')).toBe(true);
        });

        test('should not mutate original', () => {
            const set = new SelectionSet(['a', 'b']);
            set.removeByFilter(() => true);

            expect(set.size).toBe(2);
        });

        test('should return same-valued set when predicate matches nothing', () => {
            const set = new SelectionSet(['a', 'b']);
            const result = set.removeByFilter(() => false);

            expect(result.size).toBe(2);
        });

        test('should handle non-function predicate gracefully', () => {
            const set = new SelectionSet(['a']);
            const result = set.removeByFilter('not-a-function');

            expect(result.size).toBe(1);
        });
    });

    describe('toArray', () => {
        test('should return array of all ids', () => {
            const set = new SelectionSet(['a', 'b', 'c']);
            const arr = set.toArray();

            expect(arr).toHaveLength(3);
            expect(arr).toContain('a');
            expect(arr).toContain('b');
            expect(arr).toContain('c');
        });

        test('should return empty array for empty set', () => {
            const set = new SelectionSet();
            expect(set.toArray()).toEqual([]);
        });

        test('returned array should not affect internal state', () => {
            const set = new SelectionSet(['a']);
            const arr = set.toArray();
            arr.push('b');

            expect(set.size).toBe(1);
        });
    });

    describe('size', () => {
        test('should return 0 for empty set', () => {
            expect(new SelectionSet().size).toBe(0);
        });

        test('should return correct count', () => {
            expect(new SelectionSet(['a', 'b', 'c']).size).toBe(3);
        });
    });

    describe('isEmpty', () => {
        test('should return true for empty set', () => {
            expect(new SelectionSet().isEmpty()).toBe(true);
        });

        test('should return false for non-empty set', () => {
            expect(new SelectionSet(['a']).isEmpty()).toBe(false);
        });
    });

    describe('equals', () => {
        test('should return true for identical sets', () => {
            const a = new SelectionSet(['x', 'y']);
            const b = new SelectionSet(['x', 'y']);

            expect(a.equals(b)).toBe(true);
        });

        test('should return true for sets with same ids in different order', () => {
            const a = new SelectionSet(['y', 'x']);
            const b = new SelectionSet(['x', 'y']);

            expect(a.equals(b)).toBe(true);
        });

        test('should return false for different sets', () => {
            const a = new SelectionSet(['x']);
            const b = new SelectionSet(['y']);

            expect(a.equals(b)).toBe(false);
        });

        test('should return false for different sizes', () => {
            const a = new SelectionSet(['x', 'y']);
            const b = new SelectionSet(['x']);

            expect(a.equals(b)).toBe(false);
        });

        test('should return true for two empty sets', () => {
            expect(new SelectionSet().equals(new SelectionSet())).toBe(true);
        });

        test('should return false when compared to non-SelectionSet', () => {
            const set = new SelectionSet(['a']);
            expect(set.equals(null)).toBe(false);
            expect(set.equals({})).toBe(false);
            expect(set.equals(['a'])).toBe(false);
        });
    });

    describe('immutability', () => {
        test('all mutation methods should return new instances', () => {
            const original = new SelectionSet(['a']);

            const added = original.add('b');
            const removed = original.remove('a');
            const toggled = original.toggle('a');
            const ranged = original.addRange(['c']);
            const cleared = original.clear();
            const filtered = original.removeByFilter(() => true);

            expect(added).not.toBe(original);
            expect(removed).not.toBe(original);
            expect(toggled).not.toBe(original);
            expect(ranged).not.toBe(original);
            expect(cleared).not.toBe(original);
            expect(filtered).not.toBe(original);
        });

        test('internal Set should not be exposed', () => {
            const set = new SelectionSet(['a', 'b']);
            const arr = set.toArray();
            arr.length = 0;

            expect(set.size).toBe(2);
        });
    });
});
