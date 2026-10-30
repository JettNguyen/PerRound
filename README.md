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
npm run export        # writes the price files the site reads, into apps/web/public/data
npm run dev           # site on http://localhost:5180
```

The site is static. After a crawl, `npm run export` turns the database into one JSON file per caliber, and
the browser does the searching. Run it again after each crawl to see new prices.

## Put it on GitHub Pages

```sh
npm run crawl         # fresh prices
npm run deploy        # export, build for /PerRound/, and push the result to the gh-pages branch
```

The built site goes on its own `gh-pages` branch, checked out in `.pages/`, so the code branch never holds
price data. In the repo's settings, Pages should serve the `gh-pages` branch from its root. For a custom
domain or a different repo name, set `BASE_PATH` (for example `BASE_PATH=/ npm run deploy`).

## How it fits together

- `packages/shared`: reads a store's listing title into caliber, brand, grain, bullet, casing, condition
  and round count, groups the same load across stores (`search.ts`), works out what an order costs
  delivered, and defines the price files (`data.ts`).
- `packages/db`: Prisma schema. A `Listing` is one store's product (or size option); listings with the
  same load share a `Product`. A `PriceSnapshot` is written whenever a price or stock status changes.
- `apps/crawler`: reads each store's public catalog (Shopify `/products.json`, WooCommerce Store API).
  It names itself `PerRoundBot`, follows robots.txt and any crawl delay, waits at least 1.5s between
  requests to a store, and stops if a store blocks it. Store list and shipping rules are in
  `src/retailers.ts`. `src/export.ts` writes the price files.
- `apps/web`: Vite and React. Loads a caliber's file and runs the search in the browser.

## Crawler options

```sh
npm run crawl -- sgammo fastammo     # just these stores
npm run crawl -- --pages 2 sgammo    # first 2 catalog pages only, for trying parser changes
npm run crawl -- --show-unparsed     # list titles that look like ammo but didn't parse
npm run crawl -- --stores-only       # update store names and shipping notes without crawling
```

## Prices that look wrong

Some listings put a case count on a box price, or sell components under an ammo title. The parser drops
what it can recognize. The search also sets aside any listing priced under half of what the cheapest tenth
of its caliber costs per round (`FLOOR` in `packages/shared/src/search.ts`), since real deals rarely go that low.
