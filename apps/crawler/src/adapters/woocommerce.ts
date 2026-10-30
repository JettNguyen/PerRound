import { politeJson } from '../fetcher.ts';
import { decodeEntities, type Adapter } from './types.ts';

interface WooProduct {
  id: number;
  name: string;
  permalink: string;
  type: string;
  is_in_stock: boolean;
  prices: { price: string; currency_minor_unit: number };
  images: { src: string }[];
  categories: { name: string; slug: string }[];
  attributes?: { name: string; terms?: { name: string }[] }[];
  variations?: { id: number; attributes: { name: string; value: string }[] }[];
}

const money = (p: WooProduct['prices']) => Number(p.price) / 10 ** p.currency_minor_unit;

// Some stores fill in a "Number of Rounds" or "Quantity" attribute even when the title leaves it out.
function attributeRounds(p: WooProduct): number | undefined {
  for (const a of p.attributes ?? []) {
    if (!/\b(rounds?|quantity|count)\b/i.test(a.name) || a.terms?.length !== 1) continue;
    const n = Number(a.terms[0]!.name.replace(/[^\d]/g, ''));
    if (n > 1) return n;
  }
  return undefined;
}

// WooCommerce's public Store API: /wp-json/wc/store/v1/products, 100 products a page.
export const woocommerce: Adapter = async function* ({ homepage, maxPages = 200, onPage }) {
  const base = `${homepage}/wp-json/wc/store/v1/products`;
  let totalPages = 1;
  for (let page = 1; page <= Math.min(totalPages, maxPages); page++) {
    const { data, headers } = await politeJson<WooProduct[]>(`${base}?per_page=100&page=${page}`);
    onPage?.();
    totalPages = Number(headers.get('x-wp-totalpages')) || totalPages;
    for (const p of data) {
      const name = decodeEntities(p.name);
      const extra = p.categories.map((c) => c.name).join(' ');
      if (p.type === 'variable' && p.variations?.length) {
        // each box size is its own variation with its own price; only look them up for things that read as ammo
        if (!/\b(ammo|ammunition|rounds?|rds?|gauge|ga|grain|gr)\b/i.test(`${name} ${extra}`)) continue;
        for (const v of p.variations) {
          const { data: vd } = await politeJson<WooProduct>(`${base}/${v.id}`);
          const label = v.attributes.map((a) => a.value).join(' ');
          yield {
            externalId: String(v.id),
            url: vd.permalink || p.permalink,
            title: decodeEntities(`${name}${label ? ` - ${label}` : ''}`),
            extra,
            price: money(vd.prices),
            inStock: vd.is_in_stock,
            imageUrl: vd.images[0]?.src ?? p.images[0]?.src,
          };
        }
        continue;
      }
      yield {
        externalId: String(p.id),
        url: p.permalink,
        title: name,
        extra,
        price: money(p.prices),
        inStock: p.is_in_stock,
        imageUrl: p.images[0]?.src,
        roundsFallback: attributeRounds(p),
      };
    }
  }
};
