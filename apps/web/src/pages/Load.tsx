import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { caliberBySlug } from '@perround/shared';
import type { HistoryPoint, LoadResponse } from '../api.ts';
import { useApi } from '../useApi.ts';
import { usePrefs } from '../prefs.ts';
import { ago, casingName, conditionName, loadName, perRound } from '../format.ts';
import { OrderLine, Price, StoreLink } from '../components/GroupCard.tsx';
import { WantControl } from '../components/WantControl.tsx';

/** Lowest in-stock box price per round, day by day. */
function History({ points }: { points: HistoryPoint[] }) {
  const known = points.filter((p) => p.low !== null) as { day: string; low: number }[];
  if (known.length < 2) {
    return <p className="fhint">We started tracking this load recently. A price chart shows up here after a few days of checks.</p>;
  }
  const W = 600;
  const H = 160;
  const pad = { l: 44, r: 12, t: 12, b: 24 };
  const lows = known.map((p) => p.low);
  const min = Math.min(...lows) * 0.95;
  const max = Math.max(...lows) * 1.05;
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (H - pad.t - pad.b);
  let d = '';
  points.forEach((p, i) => {
    if (p.low === null) return;
    const prev = points[i - 1];
    d += `${!prev || prev.low === null ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.low).toFixed(1)} `;
  });
  const last = known[known.length - 1]!;
  return (
    <figure className="history">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Lowest price per round over ${points.length} days`}>
        {[min, (min + max) / 2, max].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="grid" />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" className="axis">
              {perRound(v)}
            </text>
          </g>
        ))}
        <path d={d} className="line" fill="none" />
        <circle cx={x(points.length - 1)} cy={y(last.low)} r="4" className="dot" />
        <text x={pad.l} y={H - 6} className="axis">
          {points[0]!.day.slice(5).replace('-', '/')}
        </text>
        <text x={W - pad.r} y={H - 6} textAnchor="end" className="axis">
          Today
        </text>
      </svg>
      <figcaption>Lowest box price per round in stock anywhere, before shipping</figcaption>
    </figure>
  );
}

export function LoadPage() {
  const { id = '' } = useParams();
  const [sp] = useSearchParams();
  const [prefs, setPrefs] = usePrefs();
  const want = Number(sp.get('want')) || prefs.want;
  const res = useApi<LoadResponse>(`/api/products/${encodeURIComponent(id)}?want=${prefs.want}`);
  const data = res.data;
  const cal = data ? caliberBySlug(data.product.caliber) : undefined;
  const name = data ? loadName(data.product, data.offers[0]?.title ?? 'This load') : '';

  useEffect(() => {
    // a results link carries the amount the shopper was looking at; adopt it once on arrival
    if (want !== prefs.want && sp.get('want')) setPrefs({ want });
  }, []);
  useEffect(() => {
    if (data && cal) document.title = `${name} ${cal.name} | PerRound`;
  }, [data, cal, name]);

  if (res.status === 'error' && !data) {
    return (
      <section className="page narrow">
        <h1 className="h1">Can't show this load</h1>
        <p>{res.error}</p>
        <Link className="btn btn-go" to="/">
          Back to calibers
        </Link>
      </section>
    );
  }
  if (!data) return <section className="page narrow" aria-busy="true"><p>Loading prices</p></section>;

  const p = data.product;
  const inStock = data.offers.filter((o) => o.inStock);
  const out = data.offers.filter((o) => !o.inStock);

  return (
    <div className="page narrow">
      <p className="crumbs">
        <Link to={`/ammo/${p.caliber}`}>{cal?.name ?? p.caliber}</Link>
      </p>
      <h1 className="h1">{name}</h1>
      <p className="card-sub">
        {cal?.name}
        {p.casing && <span className="tag">{casingName(p.casing)}</span>}
        {p.condition !== 'new' && <span className="tag tag-warn">{conditionName(p.condition)}</span>}
      </p>

      <WantControl want={prefs.want} onChange={(n) => setPrefs({ want: n })} />

      <h2 className="h2">{inStock.length ? `In stock at ${new Set(inStock.map((o) => o.retailerId)).size} ${inStock.length === 1 ? 'store' : 'stores'}` : 'Out of stock everywhere we check'}</h2>
      <ul className="offer-rows">
        {inStock.map((o) => (
          <li key={o.id}>
            <div>
              <p className="store-name">
                {o.retailerName}
                <span className="checked">Checked {ago(o.lastSeenAt)}</span>
              </p>
              <p className="offer-title">{o.title}</p>
              <OrderLine offer={o} want={prefs.want} />
              {o.shippingNote && <p className="fhint">{o.shippingNote}</p>}
            </div>
            <div className="others-right">
              <Price offer={o} size="sm" />
              <StoreLink offer={o}>Go to store</StoreLink>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="h2">Price over time</h2>
      <History points={data.history} />

      {out.length > 0 && (
        <>
          <h2 className="h2">Sold out at</h2>
          <ul className="offer-rows offer-rows-out">
            {out.map((o) => (
              <li key={o.id}>
                <div>
                  <p className="store-name">{o.retailerName}</p>
                  <p className="offer-title">{o.title}</p>
                  <p className="fhint">Last in stock at {perRound(o.boxPerRound)} a round. Checked {ago(o.lastSeenAt)}.</p>
                </div>
                <StoreLink offer={o} className="btn btn-quiet">
                  See listing
                </StoreLink>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
