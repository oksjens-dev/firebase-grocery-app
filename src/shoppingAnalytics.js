const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const groupShoppingTrips = (events, gapHours = 4) => {
  const sorted = events
    .map((event) => ({ ...event, date: toDate(event.checkedAt || event.boughtAt) }))
    .filter((event) => event.date)
    .sort((left, right) => left.date - right.date);

  return sorted.reduce((trips, event) => {
    const current = trips[trips.length - 1];
    const gap = current ? event.date - current.endedAt : Number.POSITIVE_INFINITY;
    if (!current || gap > gapHours * 60 * 60 * 1000) {
      trips.push({ startedAt: event.date, endedAt: event.date, events: [event] });
    } else {
      current.endedAt = event.date;
      current.events.push(event);
    }
    return trips;
  }, []);
};

export const buildShoppingAnalytics = (events, now = new Date()) => {
  const trips = groupShoppingTrips(events);
  const intervals = trips.slice(1).map((trip, index) => (
    (trip.startedAt - trips[index].startedAt) / 86400000
  ));
  const averageDaysBetweenTrips = intervals.length
    ? intervals.reduce((total, days) => total + days, 0) / intervals.length
    : null;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyTrips = trips.filter((trip) => trip.startedAt >= monthStart && trip.startedAt <= now);
  const weekdayCounts = trips.reduce((counts, trip) => {
    const weekday = trip.startedAt.toLocaleDateString('en-US', { weekday: 'long' });
    counts[weekday] = (counts[weekday] || 0) + 1;
    return counts;
  }, {});
  const commonShoppingDay = Object.entries(weekdayCounts).sort((left, right) => right[1] - left[1])[0]?.[0] || null;
  const totalEvents = trips.reduce((total, trip) => total + trip.events.length, 0);
  const categoryCounts = events.reduce((counts, event) => {
    const category = event.category || 'other';
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});
  const topCategory = Object.entries(categoryCounts).sort((left, right) => right[1] - left[1])[0]?.[0] || null;

  return {
    trips,
    tripsThisMonth: monthlyTrips.length,
    averageDaysBetweenTrips,
    commonShoppingDay,
    averageItemsPerTrip: trips.length ? totalEvents / trips.length : null,
    topCategory,
  };
};

export const getDailyShoppingInsight = (analytics, now = new Date()) => {
  if (analytics.trips.length < 2) {
    return {
      value: analytics.trips.length || '—',
      title: 'Building your shopping rhythm',
      detail: 'Check off items after each shop to unlock timing insights.',
    };
  }
  const facts = [
    { value: `${analytics.averageDaysBetweenTrips.toFixed(1)}d`, title: 'Between shopping trips', detail: 'Your average time between completed shops.' },
    { value: analytics.tripsThisMonth, title: 'Shopping trips this month', detail: 'Trips are grouped from check-offs within four hours.' },
    { value: analytics.commonShoppingDay.slice(0, 3), title: 'Your usual shopping day', detail: `You most often shop on ${analytics.commonShoppingDay}.` },
    { value: analytics.averageItemsPerTrip.toFixed(1), title: 'Items per shopping trip', detail: 'Your average number of checked-off items.' },
  ];
  const day = Math.floor(new Date(now).setHours(0, 0, 0, 0) / 86400000);
  return facts[((day % facts.length) + facts.length) % facts.length];
};

export const eventYear = (event) => toDate(event.checkedAt || event.boughtAt)?.getFullYear() || null;
