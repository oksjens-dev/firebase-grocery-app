import test from 'node:test';
import assert from 'node:assert/strict';

import {
  chooseMergedItem,
  findDuplicateGroups,
  findItemSuggestions,
  inferItemCategory,
  itemSimilarity,
  normalizeItemName,
} from './itemMatching.js';

test('normalizes quantities, plurals, and known grocery synonyms', () => {
  assert.equal(normalizeItemName('2 bags of Organic Spring Onions'), 'spring onion');
  assert.equal(normalizeItemName('Scallions'), 'spring onion');
  assert.equal(itemSimilarity('Courgettes', 'zucchini'), 1);
});

test('ranks matching recently bought items ahead of unrelated products', () => {
  const suggestions = findItemSuggestions([
    { id: 'tomatoes', name: 'Tomatoes', boughtAt: { seconds: 20 } },
    { id: 'milk', name: 'Whole Milk', boughtAt: { seconds: 10 } },
  ], 'whole mil');

  assert.deepEqual(suggestions.map((item) => item.id), ['milk']);
});

test('remembers the category of a semantically equivalent item', () => {
  const category = inferItemCategory([
    { name: 'Organic whole milk', category: 'dairy' },
  ], 'milk');

  assert.equal(category, 'dairy');
});

test('groups true equivalents without merging a more specific product', () => {
  const groups = findDuplicateGroups([
    { id: '1', name: 'Green onions' },
    { id: '2', name: 'Scallions' },
    { id: '3', name: 'Red onion' },
  ]);

  assert.equal(groups.length, 1);
  assert.deepEqual(new Set(groups[0].map((item) => item.id)), new Set(['1', '2']));
});

test('merges counts and keeps an active duplicate on the shopping list', () => {
  const merged = chooseMergedItem([
    { id: 'bought', name: 'Courgette', category: 'veggies', isBought: true, buyCount: 2, boughtAt: { seconds: 20 } },
    { id: 'active', name: 'Zucchini', category: 'other', isBought: false, buyCount: 1, createdAt: { seconds: 30 } },
  ]);

  assert.equal(merged.keeper.id, 'active');
  assert.equal(merged.data.isBought, false);
  assert.equal(merged.data.category, 'veggies');
  assert.equal(merged.data.buyCount, 3);
  assert.deepEqual(merged.duplicates.map((item) => item.id), ['bought']);
});
