import { describe, expect, it } from 'vitest';
import { floorOf, search, type OfferRow } from '../src/search.ts';
import { dailyLow } from '../src/history.ts';


const at = '2026-10-30T12:00:00.000Z';
const row = (o: Partial<OfferRow>): OfferRow => ({
  id: 1, productId: 1, retailerId: 'sgammo', retailerName: 'SGAmmo', url: 'https://example.com', title: 'Federal 9mm 115gr FMJ - 50 Rounds',
  price: 15, rounds: 50, inStock: true, purchaseLimit: null, shipsFree: false, brand: 'Federal', grain: 115,
  bullet: 'fmj', casing: 'brass', condition: 'new', shot: null, checkedAt: at,
  shipping: { kind: 'unknown' }, shippingNote: null, noShipStates: [], ...o,
});

describe('search', () => {
  it('groups the same load from two stores and leads with the cheaper one delivered', () => {
    const rows = [
      row({ id: 1, retailerId: 'velocity', retailerName: 'Velocity', price: 14, shipping: { kind: 'flat', fee: 30 } }),
      row({ id: 2, retailerId: 'sgammo', price: 15, shipping: { kind: 'free_over', fee: null, over: 100 } }),
    ];
    const r = search(rows, { want: 500 });
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0]!.storeCount).toBe(2);
    // velocity: 10 boxes $140 + $30 = $170; sgammo: $150, free over $100
    expect(r.groups[0]!.best.id).toBe(2);
    expect(r.groups[0]!.best.plan.total).toBe(150);
  });

  it('keeps one offer per store, the best for the amount wanted', () => {
    const rows = [
      row({ id: 1, price: 15, rounds: 50 }),
      row({ id: 2, price: 250, rounds: 1000 }),
      row({ id: 3, retailerId: 'velocity', retailerName: 'Velocity', price: 16, rounds: 50 }),
    ];
    const g = search(rows, { want: 1000 }).groups[0]!;
    expect(g.offers.map((o) => o.id)).toEqual([2, 3]);
    expect(g.storeCount).toBe(2);
  });

  it('puts a cheaper bulk case behind offers sized for the amount wanted', () => {
    const rows = [row({ id: 1, price: 15, rounds: 50 }), row({ id: 2, productId: 2, price: 280, rounds: 2000 })];
    const r = search(rows, { want: 500 });
    expect(r.groups.map((g) => g.best.id)).toEqual([1, 2]);
    expect(r.groups[1]!.best.fits).toBe(false);
  });

  it('leaves out prices too low to be real', () => {
    const rows = [row({ id: 1, price: 2, rounds: 250 }), row({ id: 2, productId: 2, price: 15, rounds: 50 })];
    expect(search(rows, { want: 500, floor: 0.05 }).groups.map((g) => g.best.id)).toEqual([2]);
  });

  it('leaves out stores that will not ship to the chosen state', () => {
    const r = search([row({ noShipStates: ['CA'] })], { want: 500, state: 'ca' });
    expect(r.total).toBe(0);
  });

  it('keeps facet counts from before the filters', () => {
    const rows = [row({ id: 1, brand: 'Federal' }), row({ id: 2, productId: 2, brand: 'Blazer' })];
    const r = search(rows, { want: 500, brands: ['Blazer'] });
    expect(r.total).toBe(1);
    expect(r.facets.brand.map((f) => f.value).sort()).toEqual(['Blazer', 'Federal']);
  });

  it('counts loads sold out everywhere and shows them only when asked', () => {
    const rows = [
      row({ id: 1, productId: 1 }),
      row({ id: 2, productId: 1, retailerId: 'velocity', retailerName: 'Velocity', inStock: false }),
      row({ id: 3, productId: 2, inStock: false }),
    ];
    const r = search(rows, { want: 500 });
    expect(r.groups.map((g) => g.best.id)).toEqual([1]);
    expect(r.groups[0]!.storeCount).toBe(1);
    expect(r.soldOut).toBe(1);
    expect(search(rows, { want: 500, includeOutOfStock: true }).groups.map((g) => g.best.id)).toEqual([1, 3]);
  });
});

describe('casing', () => {
  it('counts a listing that does not name its case as brass', () => {
    const rows = [row({ id: 1, casing: null }), row({ id: 2, productId: 2, casing: 'steel' })];
    const r = search(rows, { want: 500, casings: ['brass'] });
    expect(r.groups.map((g) => g.best.id)).toEqual([1]);
    expect(r.facets.casing.map((f) => f.value).sort()).toEqual(['brass', 'steel']);
  });
});

describe('floorOf', () => {
  it('takes half the tenth percentile, interpolated like Postgres', () => {
    // tenth percentile of 0.10..0.20 (11 values) is 0.11
    const v = Array.from({ length: 11 }, (_, i) => 0.1 + i * 0.01);
    expect(floorOf(v)).toBeCloseTo(0.055, 6);
    expect(floorOf([])).toBeNull();
  });
});

describe('dailyLow', () => {
  it('carries the last price forward and skips days nothing was in stock', () => {
    const d = (s: string) => new Date(`${s}T10:00:00Z`);
    const pts = dailyLow(
      [
        { rounds: 50, snapshots: [{ at: d('2026-10-01'), price: 15, inStock: true }, { at: d('2026-10-03'), price: 15, inStock: false }] },
        { rounds: 100, snapshots: [{ at: d('2026-10-02'), price: 25, inStock: true }, { at: d('2026-10-03'), price: 25, inStock: false }] },
      ],
      d('2026-10-04'),
    );
    expect(pts.map((p) => p.low)).toEqual([0.3, 0.25, null, null]);
  });
});
