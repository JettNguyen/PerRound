export interface HistoryListing {
  rounds: number | null;
  /** oldest first; a snapshot is written only when price or stock changes */
  snapshots: { at: Date; price: number; inStock: boolean }[];
}

export interface HistoryPoint {
  /** YYYY-MM-DD */
  day: string;
  /** lowest box price per round in stock anywhere that day, in dollars; null when none were in stock */
  low: number | null;
}

const DAY = 86_400_000;
const dayOf = (d: Date) => d.toISOString().slice(0, 10);

/** The cheapest in-stock price per round for each day, carrying each store's last known price forward. */
export function dailyLow(listings: HistoryListing[], now = new Date()): HistoryPoint[] {
  const usable = listings.filter((l) => l.rounds && l.rounds > 0 && l.snapshots.length);
  if (!usable.length) return [];
  const first = Math.min(...usable.map((l) => l.snapshots[0]!.at.getTime()));
  const points: HistoryPoint[] = [];
  const cursor = usable.map(() => -1);
  for (let t = Date.parse(dayOf(new Date(first))); t <= now.getTime(); t += DAY) {
    const endOfDay = t + DAY;
    let low: number | null = null;
    usable.forEach((l, i) => {
      while (cursor[i]! + 1 < l.snapshots.length && l.snapshots[cursor[i]! + 1]!.at.getTime() < endOfDay) cursor[i]!++;
      const s = l.snapshots[cursor[i]!];
      if (s?.inStock) {
        const pr = s.price / l.rounds!;
        if (low === null || pr < low) low = pr;
      }
    });
    points.push({ day: dayOf(new Date(t)), low });
  }
  return points;
}
