import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORY_NAMES, type CaliberSummary, type CalibersFile, type Category, type StoreInfo } from '@perround/shared';
import { useData } from '../data.ts';
import { count, perRound } from '../format.ts';
import { CaliberSearch } from '../components/CaliberSearch.tsx';

const ORDER: Category[] = ['handgun', 'rifle', 'rimfire', 'shotgun'];

function Tile({ c }: { c: CaliberSummary }) {
  return (
    <Link to={`/ammo/${c.slug}`} className="tile">
      <span className="tile-name">{c.name}</span>
      {c.lowPerRound !== null ? (
        <span className="tile-low">
          <span className="tile-from">from</span> {perRound(c.lowPerRound)}
        </span>
      ) : (
        <span className="tile-low tile-none">Sold out</span>
      )}
    </Link>
  );
}

export function Home() {
  const res = useData<CalibersFile>('calibers.json');
  const stores = useData<StoreInfo[]>('stores.json');
  useEffect(() => {
    document.title = 'PerRound | Ammo prices per round';
  }, []);
  const cals = res.data?.calibers ?? [];
  const inStock = cals.reduce((n, c) => n + c.offers, 0);

  return (
    <>
      <section className="hero">
        <div className="wrap hero-in">
          <h1 className="display">Ammo prices, per round.</h1>
          <p className="lede">
            {stores.data ? `${stores.data.length} online stores` : 'Online stores'} in one list, cheapest first. Each load
            shows up once, with every store that has it.
          </p>
          <CaliberSearch />
          {inStock > 0 && <p className="hero-note">{count(inStock)} listings in stock right now</p>}
        </div>
      </section>

      <div className="wrap page">
        {res.status === 'error' && (
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
              <h2 className="h2">{CATEGORY_NAMES[cat]}</h2>
              <div className="tiles">
                {popular.map((c) => (
                  <Tile key={c.slug} c={c} />
                ))}
              </div>
              {rest.length > 0 && (
                <details className="more-cals">
                  <summary>
                    {rest.length} more {CATEGORY_NAMES[cat].toLowerCase()} calibers
                  </summary>
                  <ul className="cal-list">
                    {rest.map((c) => (
                      <li key={c.slug}>
                        <Link to={`/ammo/${c.slug}`}>{c.name}</Link>
                        <span>{c.lowPerRound !== null && `from ${perRound(c.lowPerRound)}`}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
