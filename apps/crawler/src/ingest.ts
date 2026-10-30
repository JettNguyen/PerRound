import { prisma, Prisma } from '@perround/db';
import { groupKey, isNotLoadedAmmo, parseListing } from '@perround/shared';
import { ADAPTERS, listingShipsFree, type RetailerConfig } from './retailers.ts';
import { Blocked } from './fetcher.ts';

export interface CrawlResult {
  retailer: string;
  ok: boolean;
  pages: number;
  seen: number;
  ammo: number;
  skipped: number;
  gone: number;
  error?: string;
  unparsed: string[];
}

export async function crawlRetailer(r: RetailerConfig, opts: { maxPages?: number } = {}): Promise<CrawlResult> {
  const info = {
    name: r.name, homepage: r.homepage, platform: r.platform, shipping: r.shipping,
    shippingNote: r.shippingNote ?? null, shippingUrl: r.shippingUrl ?? null, noShipStates: r.noShipStates ?? [],
  };
  await prisma.retailer.upsert({ where: { id: r.id }, create: { id: r.id, ...info }, update: info });
  const run = await prisma.crawlRun.create({ data: { retailerId: r.id } });
  const startedAt = run.startedAt;
  const res: CrawlResult = { retailer: r.id, ok: false, pages: 0, seen: 0, ammo: 0, skipped: 0, gone: 0, unparsed: [] };

  try {
    const items = ADAPTERS[r.platform]({ homepage: r.homepage, maxPages: opts.maxPages, onPage: () => res.pages++ });
    for await (const item of items) {
      res.seen++;
      if (!Number.isFinite(item.price) || item.price <= 0 || isNotLoadedAmmo(item.title, item.extra)) {
        res.skipped++;
        continue;
      }
      const parsed = parseListing(item.title, item.extra);
      if (!parsed) {
        res.skipped++;
        if (/\b(ammo|ammunition|rounds?|rds)\b/i.test(item.title + ' ' + item.extra) && res.unparsed.length < 40) res.unparsed.push(item.title);
        continue;
      }
      res.ammo++;
      const now = new Date();
      const product = await prisma.product.upsert({
        where: { groupKey: groupKey(parsed, r.id) },
        create: {
          groupKey: groupKey(parsed, r.id), category: parsed.category, caliber: parsed.caliber, brand: parsed.brand,
          grain: parsed.grain, bullet: parsed.bullet, casing: parsed.casing, condition: parsed.condition, shot: parsed.shot,
        },
        update: {},
      });
      const price = new Prisma.Decimal(item.price.toFixed(2));
      const existing = await prisma.listing.findUnique({ where: { retailerId_externalId: { retailerId: r.id, externalId: item.externalId } } });
      const changed = !existing || !existing.price.equals(price) || existing.inStock !== item.inStock;
      const fields = {
        url: item.url, title: item.title, imageUrl: item.imageUrl, price, rounds: parsed.rounds ?? null, inStock: item.inStock,
        purchaseLimit: parsed.limit ?? null, shipsFree: listingShipsFree(r, item.title), upc: parsed.upc ?? null, caliber: parsed.caliber, category: parsed.category,
        brand: parsed.brand ?? null, grain: parsed.grain ?? null, bullet: parsed.bullet ?? null, casing: parsed.casing ?? null,
        condition: parsed.condition, shot: parsed.shot ?? null, productId: product.id, lastSeenAt: now,
        lastChangedAt: changed ? now : existing!.lastChangedAt,
      };
      const listing = existing
        ? await prisma.listing.update({ where: { id: existing.id }, data: fields })
        : await prisma.listing.create({ data: { retailerId: r.id, externalId: item.externalId, ...fields } });
      if (changed) await prisma.priceSnapshot.create({ data: { listingId: listing.id, price, inStock: item.inStock } });
    }

    // anything the store stopped showing is treated as gone (out of stock), not deleted, so history survives
    if (!opts.maxPages) {
      const gone = await prisma.listing.findMany({ where: { retailerId: r.id, lastSeenAt: { lt: startedAt }, inStock: true }, select: { id: true, price: true } });
      for (const g of gone) {
        await prisma.listing.update({ where: { id: g.id }, data: { inStock: false, lastChangedAt: new Date() } });
        await prisma.priceSnapshot.create({ data: { listingId: g.id, price: g.price, inStock: false } });
      }
      res.gone = gone.length;
    }
    res.ok = true;
  } catch (e) {
    res.error = e instanceof Blocked ? `blocked: ${e.message}` : (e as Error).message;
  }

  await prisma.crawlRun.update({
    where: { id: run.id },
    data: { finishedAt: new Date(), ok: res.ok, pages: res.pages, seen: res.seen, ammo: res.ammo, skipped: res.skipped, error: res.error },
  });
  await prisma.retailer.update({ where: { id: r.id }, data: { lastCrawlAt: new Date(), lastCrawlOk: res.ok } });
  return res;
}
