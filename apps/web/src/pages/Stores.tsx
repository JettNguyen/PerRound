import { useEffect } from 'react';
import { describeShipping, type StoreInfo } from '@perround/shared';
import { useData } from '../data.ts';
import { ago, count } from '../format.ts';

export function StoresPage() {
  const res = useData<StoreInfo[]>('stores.json');
  useEffect(() => {
    document.title = 'Stores we check | PerRound';
  }, []);

  return (
    <div className="wrap page narrow">
      <h1 className="h1">Stores we check</h1>
      <p className="lede">
        What each store says about shipping. When a store doesn't post its rates, its prices say "+ shipping" instead of a guess.
      </p>
      {res.status === 'error' && (
        <div className="notice notice-bad">
          <p>{res.error}</p>
          <button type="button" className="btn btn-quiet" onClick={res.reload}>
            Try again
          </button>
        </div>
      )}
      <ul className="store-list">
        {res.data?.map((s) => (
          <li key={s.id} className="card store">
            <div className="store-head">
              <h2 className="h3">
                <a href={s.homepage} target="_blank" rel="noopener nofollow">
                  {s.name}
                </a>
              </h2>
              <span className="hint">
                {count(s.inStock)} in stock · {s.checkOk === false ? 'last check failed' : 'checked'} {ago(s.checkedAt)}
              </span>
            </div>
            <p className="store-rule">{describeShipping(s.shipping)}</p>
            {s.shippingNote && <p>{s.shippingNote}</p>}
            <p className="hint">
              {s.noShipStates.length > 0 ? `Won't ship ammo to ${s.noShipStates.join(', ')}.` : "Doesn't list states it won't ship to."}
              {s.shippingUrl && (
                <>
                  {' '}
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
