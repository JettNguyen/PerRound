import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { prisma } from '@perround/db';
import {
  CALIBERS,
  dailyLow,
  floorOf,
  shortUrl,
  type AmmoFile,
  type CaliberSummary,
  type CalibersFile,
  type HistoryFile,
  type ListingTuple,
  type ProductTuple,
  type ShippingRule,
  type StoreInfo,
} from '@perround/shared';

// npm run export   writes the site's price files to apps/web/public/data from the database

const OUT = fileURLToPath(new URL('../../web/public/data/', import.meta.url));

async function write(file: string, data: unknown) {
  await writeFile(OUT + file, JSON.stringify(data));
}

const t0 = Date.now();
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT + 'ammo', { recursive: true });
await mkdir(OUT + 'history', { recursive: true });

const [retailers, counts] = await Promise.all([
  prisma.retailer.findMany({ orderBy: { name: 'asc' } }),
  prisma.listing.groupBy({ by: ['retailerId'], where: { inStock: true, rounds: { gt: 0 } }, _count: true }),
]);
const inStock = new Map(counts.map((c) => [c.retailerId, c._count]));
const stores: StoreInfo[] = retailers.map((s) => ({
  id: s.id,
  name: s.name,
  homepage: s.homepage,
  shipping: s.shipping as ShippingRule,
  shippingNote: s.shippingNote,
  shippingUrl: s.shippingUrl,
  noShipStates: s.noShipStates,
  inStock: inStock.get(s.id) ?? 0,
  checkedAt: s.lastCrawlAt?.toISOString() ?? null,
  checkOk: s.lastCrawlOk,
}));
const homepage = new Map(stores.map((s) => [s.id, s.homepage]));
await write('stores.json', stores);

const summaries: CaliberSummary[] = [];
let listingCount = 0;
let bytes = 0;
for (const c of CALIBERS) {
  const [products, listings, snapshots] = await Promise.all([
    prisma.product.findMany({ where: { caliber: c.slug } }),
    prisma.listing.findMany({ where: { caliber: c.slug, rounds: { gt: 0 }, productId: { not: null } }, orderBy: { id: 'asc' } }),
    prisma.priceSnapshot.findMany({
      where: { listing: { caliber: c.slug, rounds: { gt: 0 } } },
      orderBy: { at: 'asc' },
      select: { listingId: true, price: true, inStock: true, at: true },
    }),
  ]);

  const perRound = (l: (typeof listings)[number]) => Number(l.price) / l.rounds!;
  const floor = floorOf(listings.filter((l) => l.inStock).map(perRound));
  const real = listings.filter((l) => l.inStock && (floor === null || perRound(l) >= floor));
  summaries.push({
    slug: c.slug,
    name: c.name,
    category: c.category,
    popular: c.popular ?? false,
    offers: real.length,
    lowPerRound: real.length ? Math.min(...real.map(perRound)) : null,
  });

  const used = new Set(listings.map((l) => l.productId));
  const ammo: AmmoFile = {
    caliber: c.slug,
    floor,
    products: products
      .filter((p) => used.has(p.id))
      .map((p): ProductTuple => [p.id, p.brand, p.grain, p.bullet, p.casing, p.condition, p.shot]),
    listings: listings.map((l): ListingTuple => [
      l.id,
      l.productId!,
      l.retailerId,
      shortUrl(l.url, homepage.get(l.retailerId) ?? ''),
      l.title,
      Number(l.price),
      l.rounds!,
      l.inStock ? 1 : 0,
      l.purchaseLimit,
      l.shipsFree ? 1 : 0,
    ]),
  };
  const json = JSON.stringify(ammo);
  bytes += json.length;
  listingCount += listings.length;
  await writeFile(`${OUT}ammo/${c.slug}.json`, json);

  const snapsByListing = new Map<number, { at: Date; price: number; inStock: boolean }[]>();
  for (const s of snapshots) {
    const list = snapsByListing.get(s.listingId) ?? [];
    list.push({ at: s.at, price: Number(s.price), inStock: s.inStock });
    snapsByListing.set(s.listingId, list);
  }
  const byProduct = new Map<number, typeof listings>();
  for (const l of listings) byProduct.set(l.productId!, [...(byProduct.get(l.productId!) ?? []), l]);
  const history: HistoryFile = {};
  for (const [productId, ls] of byProduct) {
    const points = dailyLow(ls.map((l) => ({ rounds: l.rounds, snapshots: snapsByListing.get(l.id) ?? [] })));
    if (points.length > 1) history[productId] = points.map((p) => [p.day, p.low]);
  }
  await write(`history/${c.slug}.json`, history);
}

await write('calibers.json', { builtAt: new Date().toISOString(), calibers: summaries } satisfies CalibersFile);
console.log(
  `Wrote ${listingCount.toLocaleString('en-US')} listings for ${CALIBERS.length} calibers and ${stores.length} stores ` +
    `(${(bytes / 1e6).toFixed(1)} MB) in ${((Date.now() - t0) / 1000).toFixed(0)}s.`,
);
await prisma.$disconnect();
