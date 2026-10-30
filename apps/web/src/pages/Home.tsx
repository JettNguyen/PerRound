import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Category } from '@perround/shared';
import type { CaliberSummary, CalibersResponse } from '../api.ts';
import { useApi } from '../useApi.ts';
import { count, perRound } from '../format.ts';
import { CaliberSearch } from '../components/CaliberSearch.tsx';

const ORDER: Category[] = ['handgun', 'rifle', 'rimfire', 'shotgun'];

function Tile({ c }: { c: CaliberSummary }) {
  return (
    <Link to={`/ammo/${c.slug}`} className="tile">
      <span className="tile-name">{c.name}</span>
      {c.lowPerRound !== null ? (
        <span className="tile-low">
          from <strong>{perRound(c.lowPerRound)}</strong>
        </span>
      ) : (
        <span className="tile-low tile-none">none in stock</span>
      )}
      <span className="tile-count">{c.offers ? `${count(c.offers)} in stock` : ' '}</span>
    </Link>
  );
}

export function Home() {
  const res = useApi<CalibersResponse>('/api/calibers');
  useEffect(() => {
    document.title = 'PerRound | Ammo prices per round, shipping counted';
  }, []);
  const cals = res.data?.calibers ?? [];

  return (
    <div className="page">
      <section className="hero">
        <h1 className="display">What a round really costs.</h1>
        <p className="lede">
          Ammo prices from online stores, ranked per round with shipping counted wherever the store posts it. The same load
          from different stores shows up once, cheapest first.
        </p>
        <CaliberSearch autoFocus={false} />
      </section>

      {res.status === 'error' && !res.data && (
        <div className="notice notice-bad">
          <p>{res.error}</p>
          <button type="button" className="btn btn-quiet" onClick={res.reload}>
            Try again
          </button>
        </div>
      )}

      {ORDER.map((cat) => {
        const inCat = cals.filter((c) => c.category === cat);
        const popular = inCat.filter((c) => c.popular);
        const rest = inCat.filter((c) => !c.popular && c.offers > 0).sort((a, b) => b.offers - a.offers);
        if (!inCat.length) return null;
        return (
          <section key={cat} className="cat">
            <h2 className="h2">{res.data?.categories[cat] ?? cat}</h2>
            <div className="tiles">
              {popular.map((c) => (
                <Tile key={c.slug} c={c} />
              ))}
            </div>
            {rest.length > 0 && (
              <details className="more-cals">
                <summary>
                  {rest.length} more {res.data?.categories[cat].toLowerCase()} calibers
                </summary>
                <ul className="cal-list">
                  {rest.map((c) => (
                    <li key={c.slug}>
                      <Link to={`/ammo/${c.slug}`}>{c.name}</Link>
                      <span>
                        {c.lowPerRound !== null && <>from {perRound(c.lowPerRound)} · </>}
                        {count(c.offers)}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        );
      })}
    </div>
  );
}
