import compression from 'compression';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma, type Prisma } from '@perround/db';
import { CALIBERS, CATEGORY_NAMES, caliberBySlug, describeShipping, type ShippingRule } from '@perround/shared';
import { FLOOR, search, type OfferRow } from './search.ts';
import { dailyLow } from './history.ts';

const list = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? undefined : (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter(Boolean)));
const flag = z
  .enum(['1', '0', 'true', 'false'])
  .optional()
  .transform((v) => v === '1' || v === 'true');

const SearchQuery = z.object({
  caliber: z.string().min(1),
  want: z.coerce.number().int().min(1).max(100_000).default(500),
  stock: z.enum(['in', 'all']).default('in'),
  state: z
    .string()
    .regex(/^[A-Za-z]{2}$/)
    .optional(),
  shippingKnown: flag,
  brand: list,
  casing: list,
  condition: list,
  bullet: list,
  store: list,
  grain: list.transform((v) => v?.map(Number).filter((n) => Number.isFinite(n) && n > 0)),
  grainMin: z.coerce.number().int().positive().optional(),
  grainMax: z.coerce.number().int().positive().optional(),
  match: z.string().max(100).optional(),
  exclude: z.string().max(100).optional(),
  sort: z.enum(['perRound', 'price', 'total', 'newest']).default('perRound'),
  limit: z.coerce.number().int().min(1).max(200).default(40),
  offset: z.coerce.number().int().min(0).default(0),
});

const listingWithRetailer = { retailer: true } satisfies Prisma.ListingInclude;
type ListingRow = Prisma.ListingGetPayload<{ include: typeof listingWithRetailer }>;

function toOfferRow(l: ListingRow): OfferRow {
  return {
    id: l.id,
    // the crawler always files a listing under a product; 0 would only show up for a hand-made row
    productId: l.productId ?? 0,
    retailerId: l.retailerId,
    retailerName: l.retailer.name,
    url: l.url,
    title: l.title,
    imageUrl: l.imageUrl,
    price: Number(l.price),
    rounds: l.rounds,
    inStock: l.inStock,
    purchaseLimit: l.purchaseLimit,
    shipsFree: l.shipsFree,
    brand: l.brand,
    grain: l.grain,
    bullet: l.bullet,
    casing: l.casing,
    condition: l.condition,
    shot: l.shot,
    lastSeenAt: l.lastSeenAt,
    lastChangedAt: l.lastChangedAt,
    shipping: l.retailer.shipping as ShippingRule,
    shippingNote: l.retailer.shippingNote,
    noShipStates: l.retailer.noShipStates,
  };
}

// the lowest believable box price per round for each caliber (see FLOOR), refreshed every few minutes
let floors: { at: number; byCaliber: Map<string, number> } | null = null;
async function floorFor(caliber: string): Promise<number | undefined> {
  if (!floors || Date.now() - floors.at > 5 * 60_000) {
    const rows = await prisma.$queryRaw<{ caliber: string; floor: number }[]>`
      SELECT caliber, (percentile_cont(${FLOOR.percentile}) WITHIN GROUP (ORDER BY price / rounds) * ${FLOOR.share})::float AS floor
      FROM "Listing" WHERE "inStock" AND rounds > 0
      GROUP BY caliber`;
    floors = { at: Date.now(), byCaliber: new Map(rows.map((r) => [r.caliber, r.floor])) };
  }
  return floors.byCaliber.get(caliber);
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(compression());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // every caliber we track, with how many listings are in stock and the cheapest box price per round
  app.get(
    '/api/calibers',
    async (_req, res) => {
      const rows = await prisma.$queryRaw<{ caliber: string; offers: bigint; low: number | null }[]>`
        WITH floors AS (
          SELECT caliber, percentile_cont(${FLOOR.percentile}) WITHIN GROUP (ORDER BY price / rounds) * ${FLOOR.share} AS floor
          FROM "Listing" WHERE "inStock" AND rounds > 0 GROUP BY caliber
        )
        SELECT l.caliber, count(*) AS offers, min(l.price / l.rounds)::float AS low
        FROM "Listing" l JOIN floors f ON f.caliber = l.caliber
        WHERE l."inStock" AND l.rounds > 0 AND l.price / l.rounds >= f.floor
        GROUP BY l.caliber`;
      const stats = new Map(rows.map((r) => [r.caliber, r]));
      res.set('Cache-Control', 'public, max-age=300');
      res.json({
        categories: CATEGORY_NAMES,
        calibers: CALIBERS.map((c) => ({
          slug: c.slug,
          name: c.name,
          category: c.category,
          popular: c.popular ?? false,
          related: c.related ?? [],
          offers: Number(stats.get(c.slug)?.offers ?? 0),
          lowPerRound: stats.get(c.slug)?.low ?? null,
        })),
      });
    },
  );

  app.get(
    '/api/search',
    async (req, res) => {
      const parsed = SearchQuery.safeParse(req.query);
      if (!parsed.success) return res.status(400).json({ error: 'Some search settings were not understood.', issues: parsed.error.issues });
      const q = parsed.data;
      const caliber = caliberBySlug(q.caliber);
      if (!caliber) return res.status(404).json({ error: `We don't track a caliber called "${q.caliber}".` });

      const listings = await prisma.listing.findMany({
        where: { caliber: caliber.slug, ...(q.stock === 'in' ? { inStock: true } : {}) },
        include: listingWithRetailer,
      });
      const result = search(listings.map(toOfferRow), {
        want: q.want,
        includeOutOfStock: q.stock === 'all',
        state: q.state,
        shippingKnownOnly: q.shippingKnown,
        brands: q.brand,
        casings: q.casing,
        conditions: q.condition,
        bullets: q.bullet,
        retailers: q.store,
        grains: q.grain,
        grainMin: q.grainMin,
        grainMax: q.grainMax,
        match: q.match,
        exclude: q.exclude,
        sort: q.sort,
        floor: await floorFor(caliber.slug),
      });
      const checked = listings.reduce((m, l) => (l.lastSeenAt > m ? l.lastSeenAt : m), new Date(0));
      res.set('Cache-Control', 'public, max-age=60');
      res.json({
        caliber: { slug: caliber.slug, name: caliber.name, category: caliber.category, related: caliber.related ?? [] },
        want: q.want,
        total: result.total,
        offerCount: result.offerCount,
        lastChecked: listings.length ? checked.toISOString() : null,
        facets: result.facets,
        groups: result.groups.slice(q.offset, q.offset + q.limit),
      });
    },
  );

  // one load across every store that sells it, with its price history
  app.get(
    '/api/products/:id',
    async (req, res) => {
      const id = Number(req.params.id);
      const want = z.coerce.number().int().min(1).max(100_000).default(500).parse(req.query.want ?? undefined);
      const product = Number.isInteger(id)
        ? await prisma.product.findUnique({
            where: { id },
            include: { listings: { include: { ...listingWithRetailer, snapshots: { orderBy: { at: 'asc' } } } } },
          })
        : null;
      if (!product) return res.status(404).json({ error: 'That listing is gone. Go back to the caliber page to see what is in stock now.' });
      const rows = product.listings.map(toOfferRow);
      const result = search(rows, { want, includeOutOfStock: true, sort: 'perRound', floor: await floorFor(product.caliber) });
      res.json({
        product: {
          id: product.id,
          caliber: product.caliber,
          category: product.category,
          brand: product.brand,
          grain: product.grain,
          bullet: product.bullet,
          casing: product.casing,
          condition: product.condition,
          shot: product.shot,
        },
        want,
        offers: result.groups[0]?.offers ?? [],
        history: dailyLow(
          product.listings.map((l) => ({
            rounds: l.rounds,
            snapshots: l.snapshots.map((s) => ({ at: s.at, price: Number(s.price), inStock: s.inStock })),
          })),
        ),
      });
    },
  );

  app.get(
    '/api/stores',
    async (_req, res) => {
      const [stores, counts] = await Promise.all([
        prisma.retailer.findMany({ orderBy: { name: 'asc' } }),
        prisma.listing.groupBy({ by: ['retailerId'], where: { inStock: true }, _count: true }),
      ]);
      const inStock = new Map(counts.map((c) => [c.retailerId, c._count]));
      res.set('Cache-Control', 'public, max-age=300');
      res.json(
        stores.map((s) => ({
          id: s.id,
          name: s.name,
          homepage: s.homepage,
          shipping: describeShipping(s.shipping as ShippingRule),
          shippingNote: s.shippingNote,
          shippingUrl: s.shippingUrl,
          noShipStates: s.noShipStates,
          inStock: inStock.get(s.id) ?? 0,
          lastChecked: s.lastCrawlAt?.toISOString() ?? null,
          lastCheckOk: s.lastCrawlOk,
        })),
      );
    },
  );

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Something broke on our end. Try again in a minute.' });
  });

  return app;
}
