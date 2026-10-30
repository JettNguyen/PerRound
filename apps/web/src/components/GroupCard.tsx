import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Group, Offer } from '@perround/shared';
import { count, loadName, loadTags, orderText, packsText, perRound } from '../format.ts';

export function StoreLink({
  offer,
  children = (
    <span>
      Go<span className="go-rest"> to store</span>
    </span>
  ),
  quiet = false,
}: {
  offer: Offer;
  children?: React.ReactNode;
  quiet?: boolean;
}) {
  return (
    <a className={`btn ${quiet ? 'btn-quiet' : 'btn-go'}`} href={offer.url} target="_blank" rel="noopener nofollow">
      {children}
      <svg viewBox="0 0 16 16" aria-hidden="true" className="btn-arrow">
        <path d="M5 11 11 5M6 5h5v5" />
      </svg>
    </a>
  );
}

/** The price that matters. "Shipped" only shows when shipping is really in it. */
export function Price({ offer, size = 'lg' }: { offer: Offer; size?: 'lg' | 'sm' }) {
  return (
    <div className={`price price-${size}${offer.inStock ? '' : ' is-out'}`}>
      <span className="price-num">{perRound(offer.plan.perRound)}</span>
      <span className="price-unit">{offer.shippingKnown ? <span className="shipped">shipped</span> : 'a round'}</span>
    </div>
  );
}

/** "Fast Ammo · 10 boxes of 50 for $99.20 + shipping", and anything that keeps the order from matching what you're buying. */
export function OrderLine({ offer, want, store = true }: { offer: Offer; want: number; store?: boolean }) {
  const p = offer.plan;
  const o = orderText(offer);
  return (
    <>
      <p className="order">
        {store && <strong className="order-store">{offer.retailerName}</strong>}
        <span>
          {packsText(p.packs, offer.rounds)} for {o.total} <span className={o.known ? 'ship-in' : 'ship-out'}>{o.ship}</span>
        </span>
      </p>
      {!offer.fits && <p className="order-warn">Comes in {count(offer.rounds)}, more than the {count(want)} you're buying</p>}
      {p.limited && (
        <p className="order-warn">
          Limit {offer.purchaseLimit} per order, so {count(p.rounds)} of your {count(want)}
        </p>
      )}
    </>
  );
}

export function GroupCard({ group, want, slug }: { group: Group; want: number; slug: string }) {
  const [open, setOpen] = useState(false);
  const best = group.best;
  const others = group.offers.slice(1);
  const tags = loadTags(group);

  return (
    <article className={`card deal-card${best.inStock ? '' : ' is-out'}`}>
      <div className="deal">
        <Price offer={best} />
        <div className="deal-info">
          <h3 className="deal-name">
            <Link to={`/ammo/${slug}/${group.productId}`}>{loadName(group, best.title)}</Link>
          </h3>
          {(tags.length > 0 || !best.inStock) && (
            <p className="tags">
              {!best.inStock && <span className="tag tag-out">Sold out</span>}
              {tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </p>
          )}
          <OrderLine offer={best} want={want} />
        </div>
        <div className="deal-go">
          <StoreLink offer={best} />
        </div>
      </div>

      {others.length > 0 && (
        <>
          <button type="button" className="more" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <span>
              {open ? 'Hide' : others.length} other {others.length === 1 ? 'store' : 'stores'}
              {!open && <span className="more-from"> from {perRound(others[0]!.plan.perRound)}</span>}
            </span>
            <svg viewBox="0 0 16 16" aria-hidden="true" className="chev">
              <path d="m4 6 4 4 4-4" />
            </svg>
          </button>
          {open && (
            <ul className="others">
              {others.map((o) => (
                <li key={o.id} className="other">
                  <div className="other-info">
                    <OrderLine offer={o} want={want} />
                  </div>
                  <Price offer={o} size="sm" />
                  <StoreLink offer={o} quiet>
                    Go
                  </StoreLink>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </article>
  );
}
