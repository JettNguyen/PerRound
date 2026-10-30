import { useEffect } from 'react';
import type { Store } from '../api.ts';
import { useApi } from '../useApi.ts';
import { ago, count } from '../format.ts';

export function StoresPage() {
  const res = useApi<Store[]>('/api/stores');
  useEffect(() => {
    document.title = 'Stores we check | PerRound';
  }, []);

  return (
    <div className="page narrow">
      <h1 className="h1">Stores we check</h1>
      <p className="lede">
        Here is what each store says about shipping, in its own words where we could find them. When a store doesn't post
        its rates, we mark its prices "plus shipping" instead of guessing.
      </p>
      {res.status === 'error' && !res.data && (
        <div className="notice notice-bad">
          <p>{res.error}</p>
          <button type="button" className="btn btn-quiet" onClick={res.reload}>
            Try again
          </button>
        </div>
      )}
      <ul className="store-list">
        {res.data?.map((s) => (
          <li key={s.id}>
            <div className="store-row-head">
              <h2 className="h3">
                <a href={s.homepage} target="_blank" rel="noopener nofollow">
                  {s.name}
                </a>
              </h2>
              <span className="checked">
                {s.lastCheckOk === false ? 'Last check failed, ' : 'Checked '}
                {ago(s.lastChecked)}
              </span>
            </div>
            <p>
              <strong>{s.shipping}.</strong> {s.shippingNote}
            </p>
            {s.noShipStates.length > 0 && <p className="fhint">Won't ship ammo to {s.noShipStates.join(', ')}.</p>}
            <p className="fhint">
              {count(s.inStock)} listings in stock
              {s.shippingUrl && (
                <>
                  {' · '}
                  <a href={s.shippingUrl} target="_blank" rel="noopener nofollow">
                    Store's shipping page
                  </a>
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
