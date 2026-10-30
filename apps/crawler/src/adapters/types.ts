export interface RawItem {
  externalId: string;
  url: string;
  title: string;
  /** store-side hints the parser can use: product type, categories, tags */
  extra: string;
  price: number;
  inStock: boolean;
  imageUrl?: string;
  /** round count from the size option the shopper picks; beats whatever the product title says */
  roundsHint?: number;
  /** round count from store data that may describe the box rather than this listing; used only when the title has none */
  roundsFallback?: number;
}

export interface AdapterContext {
  homepage: string;
  maxPages?: number;
  onPage?: () => void;
  /** Shopify only: read these collections (matched on handle) instead of the whole catalog */
  collections?: RegExp;
}

export type Adapter = (ctx: AdapterContext) => AsyncGenerator<RawItem>;

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}
