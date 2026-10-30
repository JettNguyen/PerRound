import { describeShipping, planOrder, type OrderPlan, type ShippingRule } from './shipping.ts';

/** One store's listing, flattened with what we need from its store. */
export interface OfferRow {
  id: number;
  productId: number;
  retailerId: string;
  retailerName: string;
  url: string;
  title: string;
  price: number;
  rounds: number | null;
  inStock: boolean;
  purchaseLimit: number | null;
  shipsFree: boolean;
  brand: string | null;
  grain: number | null;
  bullet: string | null;
  casing: string | null;
  condition: string;
  shot: string | null;
  /** when we last read the store's catalog, as an ISO date */
  checkedAt: string | null;
  shipping: ShippingRule;
  shippingNote: string | null;
  noShipStates: string[];
}

export interface SearchParams {
  /** about how many rounds the shopper wants; shipping and box count are planned around it */
  want: number;
  includeOutOfStock?: boolean;
  /** two-letter state; stores that won't ship there are left out */
  state?: string;
  brands?: string[];
  casings?: string[];
  conditions?: string[];
  bullets?: string[];
  retailers?: string[];
  grains?: number[];
  /**
   * Box price per round below which a listing is assumed mislabeled (a case count on a box price, a
   * component sold as ammo) and left out. Set from the caliber's typical price.
   */
  floor?: number | null;
}

/**
 * Half of what the cheapest tenth of a caliber's listings cost per round. Real deals rarely go lower;
 * label mistakes often do. A median would sit too high where premium loads dominate (9mm).
 */
export const FLOOR = { percentile: 0.1, share: 0.5 };

/** FLOOR for a caliber, from the box price per round of each listing in stock. */
export function floorOf(perRound: number[]): number | null {
  if (!perRound.length) return null;
  const s = [...perRound].sort((a, b) => a - b);
  // the same interpolation as Postgres's percentile_cont
  const at = FLOOR.percentile * (s.length - 1);
  const lo = Math.floor(at);
  const v = s[lo]! + (s[Math.min(lo + 1, s.length - 1)]! - s[lo]!) * (at - lo);
  return v * FLOOR.share;
}

export interface Offer {
  id: number;
  retailerId: string;
  retailerName: string;
  url: string;
  title: string;
  price: number;
  rounds: number;
  inStock: boolean;
  purchaseLimit: number | null;
  /** cost per round for the box by itself, before shipping */
  boxPerRound: number;
  plan: OrderPlan;
  shippingKnown: boolean;
  /** false when the smallest order from this listing is more than twice what the shopper is buying */
  fits: boolean;
  shipsFree: boolean;
  /** the store's shipping rule in words, e.g. "Free shipping over $200. Under that, figured at checkout" */
  shippingRule: string;
  shippingNote: string | null;
  checkedAt: string | null;
}

export interface Group {
  productId: number;
  brand: string | null;
  grain: number | null;
  bullet: string | null;
  casing: string | null;
  condition: string;
  shot: string | null;
  best: Offer;
  offers: Offer[];
  storeCount: number;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface SearchResult {
  groups: Group[];
  total: number;
  /** loads that match but are sold out everywhere; left out of `groups` unless includeOutOfStock */
  soldOut: number;
  /** stores with at least one offer in `groups` */
  stores: number;
  facets: Record<'brand' | 'casing' | 'condition' | 'bullet' | 'grain' | 'retailer', FacetValue[]>;
}

function facet(rows: OfferRow[], pick: (r: OfferRow) => string | null | undefined): FacetValue[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const v = pick(r);
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

// stores name steel and aluminum cases because they're the exception, so a listing that doesn't say is brass
const casingOf = (r: OfferRow) => r.casing ?? 'brass';

// in stock first, then offers sized for what the shopper is buying, then cheapest per round
const cmp = (a: Offer, b: Offer) =>
  Number(b.inStock) - Number(a.inStock) || Number(b.fits) - Number(a.fits) || a.plan.perRound - b.plan.perRound;

/**
 * Turns a caliber's listings into ranked groups: the same load from different stores and box sizes
 * collapses into one card, led by whichever offer is cheapest for the amount the shopper wants.
 */
export function search(rows: OfferRow[], p: SearchParams): SearchResult {
  const state = p.state?.toUpperCase();
  const base = rows.filter((r) => r.rounds && r.rounds > 0 && !(state && r.noShipStates.includes(state)));

  // facet counts come from before the shopper's own filters, so picking one brand doesn't hide the others
  const shown = p.includeOutOfStock ? base : base.filter((r) => r.inStock);
  const facets: SearchResult['facets'] = {
    brand: facet(shown, (r) => r.brand),
    casing: facet(shown, casingOf),
    condition: facet(shown, (r) => r.condition),
    bullet: facet(shown, (r) => r.bullet),
    grain: facet(shown, (r) => (r.grain ? String(r.grain) : null)),
    retailer: facet(shown, (r) => r.retailerId),
  };

  const inList = (list: string[] | undefined, v: string | null) => !list?.length || (v !== null && list.includes(v));

  const byProduct = new Map<number, (Offer & { row: OfferRow })[]>();
  for (const r of base) {
    if (!inList(p.brands, r.brand) || !inList(p.casings, casingOf(r)) || !inList(p.conditions, r.condition)) continue;
    if (!inList(p.bullets, r.bullet) || !inList(p.retailers, r.retailerId)) continue;
    if (p.grains?.length && (r.grain === null || !p.grains.includes(r.grain))) continue;
    const rounds = r.rounds!;
    if (p.floor != null && r.price / rounds < p.floor) continue;
    const plan = planOrder(r.price, rounds, r.shipping, p.want, { limit: r.purchaseLimit, shipsFree: r.shipsFree });
    const offer = {
      id: r.id,
      row: r,
      retailerId: r.retailerId,
      retailerName: r.retailerName,
      url: r.url,
      title: r.title,
      price: r.price,
      rounds,
      inStock: r.inStock,
      purchaseLimit: r.purchaseLimit,
      boxPerRound: r.price / rounds,
      plan,
      shippingKnown: plan.shipping !== null,
      fits: plan.rounds <= p.want * 2,
      shipsFree: r.shipsFree,
      shippingRule: describeShipping(r.shipping),
      shippingNote: r.shippingNote,
      checkedAt: r.checkedAt,
    };
    const list = byProduct.get(r.productId);
    if (list) list.push(offer);
    else byProduct.set(r.productId, [offer]);
  }

  const groups: Group[] = [];
  const stores = new Set<string>();
  let soldOut = 0;
  for (const [productId, all] of byProduct) {
    all.sort(cmp);
    // a store often lists one load in several box sizes; only its best deal for this amount is worth showing
    const seen = new Set<string>();
    let list = all.filter((o) => !seen.has(o.retailerId) && seen.add(o.retailerId));
    if (!list[0]!.inStock) soldOut++;
    if (!p.includeOutOfStock) list = list.filter((o) => o.inStock);
    if (!list.length) continue;
    const r = list[0]!.row;
    const clean = list.map(({ row: _row, ...o }) => o);
    for (const o of clean) stores.add(o.retailerId);
    groups.push({
      productId,
      brand: r.brand,
      grain: r.grain,
      bullet: r.bullet,
      casing: r.casing,
      condition: r.condition,
      shot: r.shot,
      best: clean[0]!,
      offers: clean,
      storeCount: clean.length,
    });
  }
  groups.sort((a, b) => cmp(a.best, b.best));

  return { groups, total: groups.length, soldOut, stores: stores.size, facets };
}
