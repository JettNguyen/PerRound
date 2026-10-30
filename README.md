# PerRound

Ammo prices from online stores, ranked by what each round costs. Shipping is counted wherever the
store posts its rates, and the same load from different stores shows up once.

## Run it

Needs Node 20+ and Postgres 16 (Homebrew's `postgresql@16`, or Docker with `infra/docker-compose.yml`).

```sh
cp .env.example .env
npm install
npm run db:start      # private Postgres in .pgdata on port 5433
npm run db:migrate
npm run crawl         # reads every store, about 5 minutes (Southern Munitions asks for 10s between requests)
npm run dev           # API on :4100, site on http://localhost:5180
```

## How it fits together

- `packages/shared`: reads a store's listing title into caliber, brand, grain, bullet, casing, condition
  and round count, groups the same load across stores, and works out what an order costs delivered.
- `packages/db`: Prisma schema. A `Listing` is one store's product (or size option); listings with the
  same load share a `Product`. A `PriceSnapshot` is written whenever a price or stock status changes.
- `apps/crawler`: reads each store's public catalog (Shopify `/products.json`, WooCommerce Store API).
  It names itself `PerRoundBot`, follows robots.txt and any crawl delay, waits at least 1.5s between
  requests to a store, and stops if a store blocks it. Store list and shipping rules are in
  `src/retailers.ts`.
- `apps/api`: Express. `/api/calibers`, `/api/search`, `/api/products/:id`, `/api/stores`.
- `apps/web`: Vite and React.

## Crawler options

```sh
npm run crawl -- sgammo fastammo     # just these stores
npm run crawl -- --pages 2 sgammo    # first 2 catalog pages only, for trying parser changes
npm run crawl -- --show-unparsed     # list titles that look like ammo but didn't parse
npm run crawl -- --stores-only       # update store names and shipping notes without crawling
```

## Prices that look wrong

Some listings put a case count on a box price, or sell components under an ammo title. The parser drops
what it can recognize. The API also sets aside any listing priced under half of what the cheapest tenth
of its caliber costs per round (`FLOOR` in `apps/api/src/search.ts`), since real deals rarely go that low.
