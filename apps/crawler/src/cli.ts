import { prisma } from '@perround/db';
import { crawlRetailer } from './ingest.ts';
import { RETAILERS } from './retailers.ts';

// npm run crawl                      every store, one after another
// npm run crawl -- sgammo fastammo   just these stores
// npm run crawl -- --pages 2 sgammo  only the first 2 catalog pages (for trying parser changes)
// npm run crawl -- --show-unparsed   list ammo-looking titles the parser couldn't read

const args = process.argv.slice(2);
const pagesAt = args.indexOf('--pages');
const maxPages = pagesAt >= 0 ? Number(args[pagesAt + 1]) : undefined;
const showUnparsed = args.includes('--show-unparsed');
const ids = args.filter((a, i) => !a.startsWith('--') && i !== pagesAt + 1);
const targets = ids.length ? RETAILERS.filter((r) => ids.includes(r.id)) : RETAILERS;

if (ids.length && targets.length !== ids.length) {
  const known = RETAILERS.map((r) => r.id).join(', ');
  console.error(`Unknown store in ${ids.join(', ')}. Known stores: ${known}`);
  process.exit(1);
}

// stores are crawled in parallel since each one has its own pace; requests to any one store stay one at a time
const results = await Promise.all(
  targets.map(async (r) => {
    const t0 = Date.now();
    const res = await crawlRetailer(r, { maxPages });
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(
      `${res.ok ? 'ok  ' : 'FAIL'} ${r.name.padEnd(22)} ${String(res.ammo).padStart(5)} ammo of ${String(res.seen).padStart(5)} items, ${res.pages} pages, ${res.gone} gone, ${secs}s${res.error ? `  (${res.error})` : ''}`,
    );
    return res;
  }),
);

if (showUnparsed) {
  for (const r of results) if (r.unparsed.length) console.log(`\n${r.retailer} titles that look like ammo but didn't parse:\n  ${r.unparsed.join('\n  ')}`);
}
await prisma.$disconnect();
process.exit(results.every((r) => r.ok) ? 0 : 1);
