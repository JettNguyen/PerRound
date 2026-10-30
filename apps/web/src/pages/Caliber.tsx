import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { caliberBySlug } from '@perround/shared';
import type { SearchResponse, SortKey, Store } from '../api.ts';
import { useApi } from '../useApi.ts';
import { usePrefs } from '../prefs.ts';
import { ago, count } from '../format.ts';
import { GroupCard } from '../components/GroupCard.tsx';
import { WantControl } from '../components/WantControl.tsx';
import { Filters, LIST_KEYS, activeCount, type FilterState } from '../components/Filters.tsx';

const PAGE = 40;
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'perRound', label: 'Lowest per round' },
  { key: 'total', label: 'Lowest total' },
  { key: 'price', label: 'Lowest box price' },
  { key: 'newest', label: 'Price changed lately' },
];

function readFilters(sp: URLSearchParams): FilterState {
  const listOf = (k: string) => sp.get(k)?.split(',').filter(Boolean) ?? [];
  return {
    brand: listOf('brand'),
    bullet: listOf('bullet'),
    casing: listOf('casing'),
    condition: listOf('condition'),
    grain: listOf('grain'),
    store: listOf('store'),
    match: sp.get('match') ?? '',
    exclude: sp.get('exclude') ?? '',
    stock: sp.get('stock') === 'all' ? 'all' : 'in',
    shippingKnown: sp.get('shippingKnown') === '1',
  };
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function CaliberPage() {
  const { slug = '' } = useParams();
  const caliber = caliberBySlug(slug);
  const [sp, setSp] = useSearchParams();
  const [prefs, setPrefs] = usePrefs();
  const [pages, setPages] = useState(1);
  const [sheet, setSheet] = useState(false);
  const sheetRef = useRef<HTMLDialogElement>(null);

  const filters = readFilters(sp);
  const sort = (SORTS.find((s) => s.key === sp.get('sort'))?.key ?? 'perRound') as SortKey;
  const words = useDebounced({ match: filters.match, exclude: filters.exclude }, 400);

  const path = useMemo(() => {
    const q = new URLSearchParams({ caliber: slug, want: String(prefs.want), sort, limit: String(PAGE * pages) });
    if (prefs.state) q.set('state', prefs.state);
    for (const k of LIST_KEYS) if (filters[k].length) q.set(k, filters[k].join(','));
    if (words.match) q.set('match', words.match);
    if (words.exclude) q.set('exclude', words.exclude);
    if (filters.stock === 'all') q.set('stock', 'all');
    if (filters.shippingKnown) q.set('shippingKnown', '1');
    return `/api/search?${q}`;
    // filters is rebuilt from sp on every render, so sp stands in for it here
  }, [slug, prefs.want, prefs.state, sort, pages, sp, words.match, words.exclude]);

  const res = useApi<SearchResponse>(caliber ? path : null);
  const stores = useApi<Store[]>('/api/stores');
  const storeNames = useMemo(() => Object.fromEntries((stores.data ?? []).map((s) => [s.id, s.name])), [stores.data]);

  useEffect(() => {
    setPages(1);
  }, [slug, sp, prefs.want, prefs.state]);
  useEffect(() => {
    if (caliber) document.title = `${caliber.name} ammo prices | PerRound`;
  }, [caliber]);
  useEffect(() => {
    const d = sheetRef.current;
    if (!d) return;
    if (sheet && !d.open) d.showModal();
    if (!sheet && d.open) d.close();
  }, [sheet]);

  const update = (next: Partial<FilterState> & { sort?: SortKey }) => {
    const merged = { ...filters, sort, ...next };
    const q = new URLSearchParams();
    for (const k of LIST_KEYS) if (merged[k].length) q.set(k, merged[k].join(','));
    if (merged.match) q.set('match', merged.match);
    if (merged.exclude) q.set('exclude', merged.exclude);
    if (merged.stock === 'all') q.set('stock', 'all');
    if (merged.shippingKnown) q.set('shippingKnown', '1');
    if (merged.sort !== 'perRound') q.set('sort', merged.sort);
    setSp(q, { replace: true });
  };
  const clear = () => setSp(sort !== 'perRound' ? { sort } : {}, { replace: true });

  if (!caliber) {
    return (
      <section className="page narrow">
        <h1 className="h1">We don't track that caliber</h1>
        <p>Pick one from the list on the home page, or search for it at the top.</p>
        <Link className="btn btn-go" to="/">
          See all calibers
        </Link>
      </section>
    );
  }

  const data = res.data;
  const nActive = activeCount(filters);
  const filterPanel = data && (
    <Filters
      facets={data.facets}
      storeNames={storeNames}
      value={filters}
      onChange={update}
      onClear={clear}
      state={prefs.state}
      onState={(state) => setPrefs({ state })}
    />
  );

  return (
    <div className="page results-page">
      <header className="results-head">
        <p className="eyebrow">{data ? `${data.caliber.category[0]!.toUpperCase()}${data.caliber.category.slice(1)} ammo` : ' '}</p>
        <h1 className="h1">{caliber.name}</h1>
        <p className="results-meta" aria-live="polite">
          {data ? (
            <>
              {count(data.total)} {data.total === 1 ? 'load' : 'loads'} in {count(data.offerCount)} listings
              {data.lastChecked && <> · checked {ago(data.lastChecked)}</>}
            </>
          ) : res.status === 'loading' ? (
            'Loading prices'
          ) : null}
        </p>
        {!!caliber.related?.length && (
          <p className="related">
            Also look at{' '}
            {caliber.related.map((r) => (
              <Link key={r} to={`/ammo/${r}`} className="chip chip-link">
                {caliberBySlug(r)?.name ?? r}
              </Link>
            ))}
          </p>
        )}
      </header>

      <div className="results-bar">
        <WantControl want={prefs.want} onChange={(want) => setPrefs({ want })} />
        <div className="bar-right">
          <label className="sort">
            <span>Sort</span>
            <select id="sort" value={sort} onChange={(e) => update({ sort: e.target.value as SortKey })}>
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-quiet filters-open" onClick={() => setSheet(true)}>
            Filters{nActive ? ` (${nActive})` : ''}
          </button>
        </div>
      </div>

      <details className="how">
        <summary>How we figure the price per round</summary>
        <p>
          For each listing we work out how many boxes you'd buy to get about {count(prefs.want)} rounds, add the store's
          shipping when the store posts its rates, and divide by the rounds you'd get. That way a cheap box with costly
          shipping doesn't beat a bulk case that ships free. When a store only shows shipping at checkout, the price says
          "plus shipping" so you know it will go up.
        </p>
      </details>

      <div className="results-body">
        <aside className="filters-side" aria-label="Filters">
          {filterPanel}
        </aside>

        <section className="results-list" aria-busy={res.status === 'loading'}>
          {res.status === 'error' && (
            <div className="notice notice-bad">
              <p>{res.error}</p>
              <button type="button" className="btn btn-quiet" onClick={res.reload}>
                Try again
              </button>
            </div>
          )}
          {data && data.groups.length === 0 && (
            <div className="notice">
              {nActive ? (
                <>
                  <p>Nothing matches these filters.</p>
                  <button type="button" className="btn btn-quiet" onClick={clear}>
                    Clear filters
                  </button>
                </>
              ) : (
                <p>No store we check has {caliber.name} in stock right now. Check back later, or turn on "Include out of stock" in Filters to see what they usually carry.</p>
              )}
            </div>
          )}
          {data?.groups.map((g) => <GroupCard key={g.productId} group={g} want={prefs.want} caliberName={caliber.name} />)}
          {data && data.groups.length < data.total && (
            <button type="button" className="btn btn-quiet btn-block" disabled={res.status === 'loading'} onClick={() => setPages((p) => p + 1)}>
              {res.status === 'loading' ? 'Loading' : `Show more (${count(data.total - data.groups.length)} left)`}
            </button>
          )}
        </section>
      </div>

      <dialog ref={sheetRef} className="sheet" onClose={() => setSheet(false)} aria-label="Filters">
        <div className="sheet-head">
          <h2>Filters</h2>
          <button type="button" className="btn btn-go" onClick={() => setSheet(false)}>
            Show {data ? count(data.total) : ''} loads
          </button>
        </div>
        {filterPanel}
      </dialog>
    </div>
  );
}
