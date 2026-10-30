import { describeShipping, normalizeTitle, planOrder, type OrderPlan, type ShippingRule } from '@perround/shared';

/** One store's listing, flattened with what we need from its store. */
export interface OfferRow {
  id: number;
  productId: number;
  retailerId: string;
  retailerName: string;
  url: string;
  title: string;
  imageUrl: string | null;
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
  lastSeenAt: Date;
  lastChangedAt: Date;
  shipping: ShippingRule;
  shippingNote: string | null;
  noShipStates: string[];
}

export type SortKey = 'perRound' | 'price' | 'total' | 'newest';

export interface SearchParams {
  /** about how many rounds the shopper wants; shipping and box count are planned around it */
  want: number;
  includeOutOfStock?: boolean;
  /** two-letter state; stores that won't ship there are left out */
  state?: string;
  shippingKnownOnly?: boolean;
  brands?: string[];
  casings?: string[];
  conditions?: string[];
  bullets?: string[];
  retailers?: string[];
  grains?: number[];
  grainMin?: number;
  grainMax?: number;
  /** words that must all appear in the title */
  match?: string;
  /** words that must not appear in the title */
  exclude?: string;
  sort: SortKey;
  /**
   * Box price per round below which a listing is assumed mislabeled (a case count on a box price, a
   * component sold as ammo) and left out. Set from the caliber's typical price.
   */
  floor?: number;
}

/**
 * Half of what the cheapest tenth of a caliber's listings cost per round. Real deals rarely go lower;
 * label mistakes often do. A median would sit too high where premium loads dominate (9mm).
 */
export const FLOOR = { percentile: 0.1, share: 0.5 };

export interface Offer {
  id: number;
  retailerId: string;
  retailerName: string;
  url: string;
  title: string;
  imageUrl: string | null;
  price: number;
  rounds: number;
  inStock: boolean;
  purchaseLimit: number | null;
  /** cost per round for the box by itself, before shipping */
  boxPerRound: number;
  plan: OrderPlan;
  shippingKnown: boolean;
  shipsFree: boolean;
  /** the store's shipping rule in words, e.g. "Free shipping over $200. Under that, figured at checkout" */
  shippingRule: string;
  shippingNote: string | null;
  lastSeenAt: string;
  lastChangedAt: string;
}

export interface Group {
  productId: number;
  brand: string | null;
  grain: number | null;
  bullet: string | null;
  casing: string | null;
  condition: string;
  shot: string | null;
  imageUrl: string | null;
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
  offerCount: number;
  facets: Record<'brand' | 'casing' | 'condition' | 'bullet' | 'grain' | 'retailer', FacetValue[]>;
}

const words = (s?: string) => (s ? normalizeTitle(s).split(' ').filter(Boolean) : []);

function facet(rows: OfferRow[], pick: (r: OfferRow) => string | null | undefined): FacetValue[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const v = pick(r);
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

const sortValue: Record<SortKey, (o: Offer) => number> = {
  perRound: (o) => o.plan.perRound,
  price: (o) => o.price,
  total: (o) => o.plan.total,
  newest: (o) => -Date.parse(o.lastChangedAt),
};

/**
 * Turns a caliber's listings into ranked groups: the same load from different stores and box sizes
 * collapses into one card, led by whichever offer is cheapest for the amount the shopper wants.
 */
export function search(rows: OfferRow[], p: SearchParams): SearchResult {
  const state = p.state?.toUpperCase();
  const base = rows.filter(
    (r) => r.rounds && r.rounds > 0 && (p.includeOutOfStock || r.inStock) && !(state && r.noShipStates.includes(state)),
  );

  // facet counts come from before the shopper's own filters, so picking one brand doesn't hide the others
  const facets: SearchResult['facets'] = {
    brand: facet(base, (r) => r.brand),
    casing: facet(base, (r) => r.casing),
    condition: facet(base, (r) => r.condition),
    bullet: facet(base, (r) => r.bullet),
    grain: facet(base, (r) => (r.grain ? String(r.grain) : null)),
    retailer: facet(base, (r) => r.retailerId),
  };

  const need = words(p.match);
  const avoid = words(p.exclude);
  const inList = (list: string[] | undefined, v: string | null) => !list?.length || (v !== null && list.includes(v));

  const offers: (Offer & { productId: number; row: OfferRow })[] = [];
  for (const r of base) {
    if (!inList(p.brands, r.brand) || !inList(p.casings, r.casing) || !inList(p.conditions, r.condition)) continue;
    if (!inList(p.bullets, r.bullet) || !inList(p.retailers, r.retailerId)) continue;
    if (p.grains?.length && (r.grain === null || !p.grains.includes(r.grain))) continue;
    if (p.grainMin !== undefined && (r.grain === null || r.grain < p.grainMin)) continue;
    if (p.grainMax !== undefined && (r.grain === null || r.grain > p.grainMax)) continue;
    if (need.length || avoid.length) {
      const t = ` ${normalizeTitle(r.title)} `;
      if (!need.every((w) => t.includes(w)) || avoid.some((w) => t.includes(w))) continue;
    }
    const rounds = r.rounds!;
    if (p.floor !== undefined && r.price / rounds < p.floor) continue;
    const plan = planOrder(r.price, rounds, r.shipping, p.want, { limit: r.purchaseLimit, shipsFree: r.shipsFree });
    if (p.shippingKnownOnly && plan.shipping === null) continue;
    offers.push({
      id: r.id,
      productId: r.productId,
      row: r,
      retailerId: r.retailerId,
      retailerName: r.retailerName,
      url: r.url,
      title: r.title,
      imageUrl: r.imageUrl,
      price: r.price,
      rounds,
      inStock: r.inStock,
      purchaseLimit: r.purchaseLimit,
      boxPerRound: r.price / rounds,
      plan,
      shippingKnown: plan.shipping !== null,
      shipsFree: r.shipsFree,
      shippingRule: describeShipping(r.shipping),
      shippingNote: r.shippingNote,
      lastSeenAt: r.lastSeenAt.toISOString(),
      lastChangedAt: r.lastChangedAt.toISOString(),
    });
  }

  const key = sortValue[p.sort];
  // in stock first, then the chosen order
  const cmp = (a: Offer, b: Offer) => Number(b.inStock) - Number(a.inStock) || key(a) - key(b);

  const byProduct = new Map<number, typeof offers>();
  for (const o of offers) {
    const list = byProduct.get(o.productId);
    if (list) list.push(o);
    else byProduct.set(o.productId, [o]);
  }

  const groups: Group[] = [];
  for (const [productId, all] of byProduct) {
    all.sort(cmp);
    // a store often lists one load in several box sizes; only its best deal for this amount is worth showing
    const stores = new Set<string>();
    const list = all.filter((o) => !stores.has(o.retailerId) && stores.add(o.retailerId));
    const first = list[0]!;
    const r = first.row;
    const clean = list.map(({ row: _row, productId: _pid, ...o }) => o);
    groups.push({
      productId,
      brand: r.brand,
      grain: r.grain,
      bullet: r.bullet,
      casing: r.casing,
      condition: r.condition,
      shot: r.shot,
      imageUrl: list.find((o) => o.imageUrl)?.imageUrl ?? null,
      best: clean[0]!,
      offers: clean,
      storeCount: list.length,
    });
  }
  groups.sort((a, b) => cmp(a.best, b.best));

  return { groups, total: groups.length, offerCount: offers.length, facets };
}
