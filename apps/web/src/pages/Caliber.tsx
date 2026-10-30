import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CATEGORY_NAMES, caliberBySlug, offerRows, search, type AmmoFile, type StoreInfo } from '@perround/shared';
import { useData } from '../data.ts';
import { usePrefs } from '../prefs.ts';
import { ago, count } from '../format.ts';
import { GroupCard } from '../components/GroupCard.tsx';
import { WantSelect } from '../components/WantSelect.tsx';
import { FilterSheet, LIST_KEYS, filterLabel, pickedCount, readFilters, writeFilters, type FilterState } from '../components/FilterSheet.tsx';

const PAGE = 30;

export function CaliberPage() {
  const { slug = '' } = useParams();
  const caliber = caliberBySlug(slug);
  const [sp, setSp] = useSearchParams();
  const [prefs, setPrefs] = usePrefs();
  const [shown, setShown] = useState(PAGE);
  const [sheet, setSheet] = useState(false);

  const ammo = useData<AmmoFile>(caliber ? `ammo/${caliber.slug}.json` : null);
  const stores = useData<StoreInfo[]>('stores.json');
  const filters = readFilters(sp);
  const filterKey = sp.toString();

  const rows = useMemo(() => (ammo.data && stores.data ? offerRows(ammo.data, stores.data) : null), [ammo.data, stores.data]);
  const result = useMemo(
    () =>
      rows &&
      search(rows, {
        want: prefs.want,
        state: prefs.state || undefined,
        includeOutOfStock: filters.soldOut,
        bullets: filters.bullet,
        casings: filters.casing,
        grains: filters.grain.map(Number),
        brands: filters.brand,
        conditions: filters.condition,
        retailers: filters.store,
        floor: ammo.data?.floor,
      }),
    // filters is rebuilt from the URL on every render, so its string form stands in for it here
    [rows, prefs.want, prefs.state, filterKey],
  );
  const storeNames = useMemo(() => Object.fromEntries((stores.data ?? []).map((s) => [s.id, s.name])), [stores.data]);
  const checked = stores.data?.map((s) => s.checkedAt ?? '').sort().at(-1) || null;

  useEffect(() => {
    setShown(PAGE);
  }, [slug, filterKey, prefs.want, prefs.state]);
  useEffect(() => {
    if (caliber) document.title = `${caliber.name} ammo prices | PerRound`;
  }, [caliber]);

  if (!caliber) {
    return (
      <section className="wrap page narrow">
        <h1 className="h1">We don't track that caliber</h1>
        <p>Search for it at the top, or pick one from the home page.</p>
        <Link className="btn btn-go" to="/">
          See all calibers
        </Link>
      </section>
    );
  }

  const update = (next: FilterState) => setSp(writeFilters(next), { replace: true });
  const clearAll = () => {
    update({ ...filters, ...Object.fromEntries(LIST_KEYS.map((k) => [k, []])) });
    setPrefs({ state: '' });
  };
  const failed = ammo.status === 'error' ? ammo : stores.status === 'error' ? stores : null;
  const nPicked = pickedCount(filters) + (prefs.state ? 1 : 0);

  return (
    <>
      <header className="wrap results-head">
        <p className="eyebrow">{CATEGORY_NAMES[caliber.category]} ammo</p>
        <h1 className="h1">{caliber.name}</h1>
        <p className="meta" aria-live="polite">
          {result ? (
            <>
              {count(result.total)} {result.total === 1 ? 'load' : 'loads'} at {result.stores} {result.stores === 1 ? 'store' : 'stores'}
              {checked && <> · checked {ago(checked)}</>}
            </>
          ) : (
            ' '
          )}
        </p>
      </header>

      <div className="toolbar">
        <div className="wrap toolbar-in">
          <WantSelect want={prefs.want} onChange={(want) => setPrefs({ want })} />
          <button type="button" className="btn btn-quiet filter-btn" onClick={() => setSheet(true)} disabled={!result}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2 4h12M4.5 8h7M7 12h2" />
            </svg>
            Filters
            {nPicked > 0 && <span className="badge">{nPicked}</span>}
          </button>
        </div>
        {nPicked > 0 && (
          <div className="wrap picked">
            {prefs.state && (
              <button type="button" className="chip chip-on" onClick={() => setPrefs({ state: '' })} aria-label={`Remove ships to ${prefs.state}`}>
                Ships to {prefs.state}
                <span aria-hidden="true">×</span>
              </button>
            )}
            {LIST_KEYS.flatMap((k) =>
              filters[k].map((v) => {
                const text = filterLabel(k, v, storeNames);
                return (
                  <button
                    key={`${k}:${v}`}
                    type="button"
                    className="chip chip-on"
                    aria-label={`Remove ${text}`}
                    onClick={() => update({ ...filters, [k]: filters[k].filter((x) => x !== v) })}
                  >
                    {text}
                    <span aria-hidden="true">×</span>
                  </button>
                );
              }),
            )}
            <button type="button" className="link-btn" onClick={clearAll}>
              Clear all
            </button>
          </div>
        )}
      </div>

      <section className="wrap results" aria-busy={!result && !failed}>
        {failed && (
          <div className="notice notice-bad">
            <p>{failed.error}</p>
            <button type="button" className="btn btn-quiet" onClick={failed.reload}>
              Try again
            </button>
          </div>
        )}
        {!result && !failed && [0, 1, 2, 3].map((i) => <div key={i} className="card skeleton" aria-hidden="true" />)}
        {result && result.total === 0 && (
          <div className="notice">
            {nPicked ? (
              <>
                <p>Nothing matches these filters.</p>
                <button type="button" className="btn btn-quiet" onClick={clearAll}>
                  Clear filters
                </button>
              </>
            ) : (
              <p>No store we check has {caliber.name} in stock right now. Check back in a few hours.</p>
            )}
          </div>
        )}
        {result?.groups.slice(0, shown).map((g) => <GroupCard key={g.productId} group={g} want={prefs.want} slug={caliber.slug} />)}
        {result && result.total > shown && (
          <button type="button" className="btn btn-quiet btn-block" onClick={() => setShown((n) => n + PAGE)}>
            Show more ({count(result.total - shown)} left)
          </button>
        )}
        {result && result.soldOut > 0 && (
          <p className="soldout-note">
            {filters.soldOut ? (
              <button type="button" className="link-btn" onClick={() => update({ ...filters, soldOut: false })}>
                Hide loads that are sold out
              </button>
            ) : (
              <>
                {count(result.soldOut)} more {result.soldOut === 1 ? 'load is' : 'loads are'} sold out everywhere.{' '}
                <button type="button" className="link-btn" onClick={() => update({ ...filters, soldOut: true })}>
                  Show them
                </button>
              </>
            )}
          </p>
        )}

        <div className="aside">
          {!!caliber.related?.length && (
            <p>
              Also look at{' '}
              {caliber.related.map((r, i) => (
                <span key={r}>
                  {i > 0 && ', '}
                  <Link to={`/ammo/${r}`}>{caliberBySlug(r)?.name ?? r}</Link>
                </span>
              ))}
              .
            </p>
          )}
          <p>
            Each price is per round for about {count(prefs.want)} rounds, using as few boxes as it takes. Shipping is extra unless
            the price says shipped. Most stores only show shipping at checkout.
          </p>
        </div>
      </section>

      {result && (
        <FilterSheet
          open={sheet}
          onClose={() => setSheet(false)}
          facets={result.facets}
          storeNames={storeNames}
          value={filters}
          onChange={update}
          state={prefs.state}
          onState={(state) => setPrefs({ state })}
          total={result.total}
          shotgun={caliber.category === 'shotgun'}
        />
      )}
    </>
  );
}
