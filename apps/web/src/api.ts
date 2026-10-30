import type { FacetValue, Group, Offer, SortKey } from '@perround/api/search';
import type { HistoryPoint } from '@perround/api/history';
import type { Category } from '@perround/shared';

export type { FacetValue, Group, HistoryPoint, Offer, SortKey };

export interface CaliberSummary {
  slug: string;
  name: string;
  category: Category;
  popular: boolean;
  related: string[];
  offers: number;
  lowPerRound: number | null;
}

export interface CalibersResponse {
  categories: Record<Category, string>;
  calibers: CaliberSummary[];
}

export interface SearchResponse {
  caliber: { slug: string; name: string; category: Category; related: string[] };
  want: number;
  total: number;
  offerCount: number;
  lastChecked: string | null;
  facets: Record<'brand' | 'casing' | 'condition' | 'bullet' | 'grain' | 'retailer', FacetValue[]>;
  groups: Group[];
}

export interface LoadResponse {
  product: {
    id: number;
    caliber: string;
    category: Category;
    brand: string | null;
    grain: number | null;
    bullet: string | null;
    casing: string | null;
    condition: string;
    shot: string | null;
  };
  want: number;
  offers: Offer[];
  history: HistoryPoint[];
}

export interface Store {
  id: string;
  name: string;
  homepage: string;
  shipping: string;
  shippingNote: string | null;
  shippingUrl: string | null;
  noShipStates: string[];
  inStock: number;
  lastChecked: string | null;
  lastCheckOk: boolean | null;
}

export class ApiError extends Error {}

export async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError("We couldn't reach PerRound. Check your connection and try again.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(body?.error ?? 'Something broke on our end. Try again in a minute.');
  return body as T;
}
