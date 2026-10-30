import { politeJson } from '../fetcher.ts';
import { decodeEntities, type Adapter } from './types.ts';

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  product_type: string;
  tags: string[] | string;
  images: { src: string }[];
  variants: { id: number; title: string; price: string; available: boolean }[];
}

// Shopify publishes every store's catalog at /products.json, 250 products a page.
export const shopify: Adapter = async function* ({ homepage, maxPages = 200, onPage }) {
  for (let page = 1; page <= maxPages; page++) {
    const { data } = await politeJson<{ products: ShopifyProduct[] }>(`${homepage}/products.json?limit=250&page=${page}`);
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
        };
      }
    }
  }
};
