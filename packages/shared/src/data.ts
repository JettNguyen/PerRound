import type { Category } from './calibers.ts';
import type { ShippingRule } from './shipping.ts';
import type { OfferRow } from './search.ts';

// The site is a set of static files. After a crawl, `npm run export` writes these from the database
// and the browser does the searching. Listings are tuples because 12 gauge alone has about 10,000.

/** data/stores.json */
export interface StoreInfo {
  id: string;
  name: string;
  homepage: string;
  shipping: ShippingRule;
  shippingNote: string | null;
  shippingUrl: string | null;
  noShipStates: string[];
  inStock: number;
  checkedAt: string | null;
  checkOk: boolean | null;
}

export interface CaliberSummary {
  slug: string;
  name: string;
  category: Category;
  popular: boolean;
  /** listings in stock, leaving out prices too low to be real */
  offers: number;
  /** cheapest box price per round in stock, before shipping */
  lowPerRound: number | null;
}

/** data/calibers.json */
export interface CalibersFile {
  builtAt: string;
  calibers: CaliberSummary[];
}

export type ProductTuple = [id: number, brand: string | null, grain: number | null, bullet: string | null, casing: string | null, condition: string, shot: string | null];

/** `url` leaves off the store's homepage when the listing lives there */
export type ListingTuple = [id: number, productId: number, store: string, url: string, title: string, price: number, rounds: number, inStock: 0 | 1, limit: number | null, shipsFree: 0 | 1];

/** data/ammo/<caliber>.json */
export interface AmmoFile {
  caliber: string;
  /** see FLOOR */
  floor: number | null;
  products: ProductTuple[];
  listings: ListingTuple[];
}

/** data/history/<caliber>.json: for each load with more than a day of checks, the lowest in-stock price per round by day */
export type HistoryFile = Record<string, [day: string, low: number | null][]>;

export const shortUrl = (url: string, homepage: string) => (url.startsWith(homepage) ? url.slice(homepage.length) : url);

/** Joins a caliber file's tuples with the stores they came from. */
export function offerRows(file: AmmoFile, stores: StoreInfo[]): OfferRow[] {
  const storeById = new Map(stores.map((s) => [s.id, s]));
  const products = new Map(file.products.map((p) => [p[0], p]));
  const rows: OfferRow[] = [];
  for (const [id, productId, storeId, url, title, price, rounds, inStock, limit, shipsFree] of file.listings) {
    const s = storeById.get(storeId);
    const p = products.get(productId);
    if (!s || !p) continue;
    rows.push({
      id,
      productId,
      retailerId: s.id,
      retailerName: s.name,
      url: url.startsWith('http') ? url : s.homepage + url,
      title,
      price,
      rounds,
      inStock: inStock === 1,
      purchaseLimit: limit,
      shipsFree: shipsFree === 1,
      brand: p[1],
      grain: p[2],
      bullet: p[3],
      casing: p[4],
      condition: p[5],
      shot: p[6],
      checkedAt: s.checkedAt,
      shipping: s.shipping,
      shippingNote: s.shippingNote,
      noShipStates: s.noShipStates,
    });
  }
  return rows;
}
