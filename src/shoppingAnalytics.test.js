import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShoppingAnalytics, getDailyShoppingInsight, groupShoppingTrips } from './shoppingAnalytics.js';

const at = (iso) => ({ checkedAt: new Date(iso) });

test('groups nearby check-offs into one shopping trip', () => {
  const trips = groupShoppingTrips([
    at('2026-10-01T10:00:00Z'),
    at('2026-10-01T10:20:00Z'),
    at('2026-10-05T12:00:00Z'),
  ]);
  assert.equal(trips.length, 2);
  assert.equal(trips[0].events.length, 2);
});

test('calculates time between shopping trips from check-off timestamps', () => {
  const analytics = buildShoppingAnalytics([
    at('2026-10-01T10:00:00Z'),
    at('2026-10-05T10:00:00Z'),
    at('2026-10-09T10:00:00Z'),
  ], new Date('2026-10-20T10:00:00Z'));
  assert.equal(analytics.averageDaysBetweenTrips, 4);
  assert.equal(getDailyShoppingInsight(analytics, new Date('2026-10-20T10:00:00Z')).detail.length > 0, true);
});
