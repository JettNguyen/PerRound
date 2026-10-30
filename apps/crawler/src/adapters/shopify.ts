import { normalizeTitle, parseRounds } from '@perround/shared';
import { politeJson } from '../fetcher.ts';
import { decodeEntities, type Adapter, type RawItem } from './types.ts';

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  product_type: string;
  tags: string[] | string;
  images: { src: string }[];
  variants: { id: number; title: string; price: string; available: boolean }[];
}

interface ShopifyCollection {
  handle: string;
  products_count?: number;
}

// Shopify publishes every store's catalog at /products.json, 250 products a page. It stops serving
// past page 100, so stores with bigger catalogs (guns and gear alongside ammo) are read one ammo
// collection at a time instead.
export const shopify: Adapter = async function* ({ homepage, maxPages, onPage, collections }) {
  if (!collections) {
    yield* readProducts(`${homepage}/products.json`, homepage, maxPages ?? 100, onPage);
    return;
  }
  const handles: string[] = [];
  for (let page = 1; ; page++) {
    const { data } = await politeJson<{ collections: ShopifyCollection[] }>(`${homepage}/collections.json?limit=250&page=${page}`);
    onPage?.();
    if (!data.collections.length) break;
    for (const c of data.collections) if (collections.test(c.handle) && c.products_count !== 0) handles.push(c.handle);
  }
  // a product can sit in more than one collection
  const seen = new Set<string>();
  let pagesLeft = maxPages ?? 2000;
  for (const handle of handles) {
    if (pagesLeft <= 0) return;
    for await (const item of readProducts(`${homepage}/collections/${handle}/products.json`, homepage, pagesLeft, () => {
      pagesLeft--;
      onPage?.();
    })) {
      if (seen.has(item.externalId)) continue;
      seen.add(item.externalId);
      yield item;
    }
  }
};

async function* readProducts(base: string, homepage: string, maxPages: number, onPage?: () => void): AsyncGenerator<RawItem> {
  for (let page = 1; page <= maxPages; page++) {
    const { data } = await politeJson<{ products: ShopifyProduct[] }>(`${base}?limit=250&page=${page}`);
    onPage?.();
    if (!data.products.length) return;
    for (const p of data.products) {
      const tags = Array.isArray(p.tags) ? p.tags.join(' ') : p.tags;
      const extra = `${p.product_type} ${tags}`;
      for (const v of p.variants) {
        const variantName = v.title && v.title !== 'Default Title' ? ` - ${v.title}` : '';
        yield {
          externalId: String(v.id),
          url: `${homepage}/products/${p.handle}${p.variants.length > 1 ? `?variant=${v.id}` : ''}`,
          title: decodeEntities(p.title + variantName),
          extra,
          price: Number(v.price),
          inStock: v.available,
          imageUrl: p.images[0]?.src,
          roundsHint: variantRounds(v.title),
        };
      }
    }
    if (data.products.length < 250) return;
  }
}

// Size options look like "Box of 25", "Case of 500 (10 Boxes of 50)" or just "25" (some stores name
// the option by round count). "1" is a single item, not a round count.
function variantRounds(title: string): number | undefined {
  if (!title || title === 'Default Title') return undefined;
  if (/^\d+$/.test(title.trim())) {
    const n = Number(title);
    return n > 1 ? n : undefined;
  }
  return parseRounds(normalizeTitle(title));
}
