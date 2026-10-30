import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { caliberBySlug, offerRows, search, type AmmoFile, type HistoryFile, type StoreInfo } from '@perround/shared';
import { useData } from '../data.ts';
import { usePrefs } from '../prefs.ts';
import { ago, loadName, loadTags, perRound } from '../format.ts';
import { OrderLine, Price, StoreLink } from '../components/GroupCard.tsx';
import { WantSelect } from '../components/WantSelect.tsx';

/** Lowest in-stock box price per round, day by day. */
function History({ points }: { points: [day: string, low: number | null][] }) {
  const known = points.filter((p): p is [string, number] => p[1] !== null);
  if (known.length < 2) {
    return <p className="hint">We started tracking this load recently. A price chart shows up here after a few days of checks.</p>;
  }
  const W = 600;
  const H = 180;
  const pad = { l: 48, r: 14, t: 14, b: 26 };
  const lows = known.map((p) => p[1]);
  const min = Math.min(...lows) * 0.95;
  const max = Math.max(...lows) * 1.05;
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (H - pad.t - pad.b);
  let line = '';
  points.forEach(([, low], i) => {
    if (low === null) return;
    const prev = points[i - 1];
    line += `${!prev || prev[1] === null ? 'M' : 'L'}${x(i).toFixed(1)},${y(low).toFixed(1)} `;
  });
  const last = points.at(-1)!;
  return (
    <figure className="history">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Lowest price per round over ${points.length} days`}>
        {[min, (min + max) / 2, max].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="grid" />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" className="axis">
              {perRound(v)}
            </text>
          </g>
        ))}
        <path d={line} className="line" fill="none" />
        {last[1] !== null && <circle cx={x(points.length - 1)} cy={y(last[1])} r="4.5" className="dot" />}
        <text x={pad.l} y={H - 6} className="axis">
          {Number(points[0]![0].slice(5, 7))}/{Number(points[0]![0].slice(8))}
        </text>
        <text x={W - pad.r} y={H - 6} textAnchor="end" className="axis">
          Today
        </text>
      </svg>
      <figcaption className="hint">Lowest box price per round in stock at any store, before shipping</figcaption>
    </figure>
  );
}

export function LoadPage() {
  const { slug = '', id = '' } = useParams();
  const caliber = caliberBySlug(slug);
  const [prefs, setPrefs] = usePrefs();
  const ammo = useData<AmmoFile>(caliber ? `ammo/${caliber.slug}.json` : null);
  const stores = useData<StoreInfo[]>('stores.json');
  const history = useData<HistoryFile>(caliber ? `history/${caliber.slug}.json` : null);
  const productId = Number(id);

  const group = useMemo(() => {
    if (!ammo.data || !stores.data) return undefined;
    const listings = ammo.data.listings.filter((l) => l[1] === productId);
    const rows = offerRows({ ...ammo.data, listings }, stores.data);
    return search(rows, { want: prefs.want, includeOutOfStock: true, floor: ammo.data.floor }).groups[0] ?? null;
  }, [ammo.data, stores.data, productId, prefs.want]);
  const name = group ? loadName(group, group.best.title) : '';

  useEffect(() => {
    if (group && caliber) document.title = `${name} ${caliber.name} | PerRound`;
  }, [group, caliber, name]);

  const failed = ammo.status === 'error' ? ammo : stores.status === 'error' ? stores : null;
  if (failed) {
    return (
      <section className="wrap page narrow">
        <div className="notice notice-bad">
          <p>{failed.error}</p>
          <button type="button" className="btn btn-quiet" onClick={failed.reload}>
            Try again
          </button>
        </div>
      </section>
    );
  }
  if (!caliber || group === null) {
    return (
      <section className="wrap page narrow">
        <h1 className="h1">That load is gone</h1>
        <p>No store we check lists it anymore. See what's in stock for the caliber instead.</p>
        <Link className="btn btn-go" to={caliber ? `/ammo/${caliber.slug}` : '/'}>
          {caliber ? `See ${caliber.name} prices` : 'See all calibers'}
        </Link>
      </section>
    );
  }
  if (!group) {
    return (
      <section className="wrap page narrow" aria-busy="true">
        <div className="card skeleton" aria-hidden="true" />
      </section>
    );
  }

  const inStock = group.offers.filter((o) => o.inStock);
  const out = group.offers.filter((o) => !o.inStock);
  const tags = loadTags(group);

  return (
    <div className="wrap page narrow">
      <p className="crumbs">
        <Link to={`/ammo/${caliber.slug}`}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M10 4 6 8l4 4" />
          </svg>
          {caliber.name}
        </Link>
      </p>
      <h1 className="h1">{name}</h1>
      <p className="tags">
        <span className="tag">{caliber.name}</span>
        {tags.map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
      </p>

      <div className="load-bar">
        <WantSelect want={prefs.want} onChange={(want) => setPrefs({ want })} />
      </div>

      <section className="card panel">
        <h2 className="panel-title">{inStock.length ? `In stock at ${inStock.length} ${inStock.length === 1 ? 'store' : 'stores'}` : 'Sold out everywhere we check'}</h2>
        {inStock.length > 0 && (
          <ul className="offers">
            {inStock.map((o) => (
              <li key={o.id} className="other">
                <div className="other-info">
                  <OrderLine offer={o} want={prefs.want} />
                  <p className="hint">
                    {(o.shippingNote ?? o.shippingRule).replace(/\.$/, '')}. Checked {ago(o.checkedAt)}.
                  </p>
                </div>
                <Price offer={o} size="sm" />
                <StoreLink offer={o} quiet>
                  Go
                </StoreLink>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card panel">
        <h2 className="panel-title">Price over time</h2>
        <History points={history.data?.[productId] ?? []} />
      </section>

      {out.length > 0 && (
        <section className="card panel">
          <h2 className="panel-title">Sold out at</h2>
          <ul className="offers">
            {out.map((o) => (
              <li key={o.id} className="other is-out">
                <div className="other-info">
                  <p className="order">
                    <strong className="order-store">{o.retailerName}</strong>
                    <span>Was {perRound(o.boxPerRound)} a round</span>
                  </p>
                </div>
                <StoreLink offer={o} quiet>
                  See listing
                </StoreLink>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
