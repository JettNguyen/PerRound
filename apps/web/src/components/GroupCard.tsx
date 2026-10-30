import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Group, Offer } from '../api.ts';
import { ago, casingName, conditionName, loadName, money, packsText, perRound, shippingLine } from '../format.ts';

export function StoreLink({ offer, children, className = 'btn btn-go' }: { offer: Offer; children: React.ReactNode; className?: string }) {
  return (
    <a className={className} href={offer.url} target="_blank" rel="noopener nofollow">
      {children}
    </a>
  );
}

/** The price that matters, and whether shipping is in it. */
export function Price({ offer, size = 'lg' }: { offer: Offer; size?: 'lg' | 'sm' }) {
  return (
    <div className={`price price-${size}`}>
      <span className="price-num">{perRound(offer.plan.perRound)}</span>
      <span className={`price-tag ${offer.shippingKnown ? 'is-in' : 'is-out'}`}>
        {offer.shippingKnown ? 'a round, shipped' : 'a round, plus shipping'}
      </span>
    </div>
  );
}

export function OrderLine({ offer, want }: { offer: Offer; want: number }) {
  const p = offer.plan;
  return (
    <p className="order">
      <span>
        {packsText(p.packs, offer.rounds)} for <strong>{money(p.total)}</strong>
        {offer.shippingKnown ? ' delivered' : ''}
      </span>
      <span className="order-ship">{shippingLine(offer)}</span>
      {!offer.fits && <span className="order-warn">More than the {want.toLocaleString('en-US')} you're buying</span>}
      {p.limited && (
        <span className="order-warn">
          Limit {offer.purchaseLimit} per order, so {p.rounds.toLocaleString('en-US')} of your {want.toLocaleString('en-US')}
        </span>
      )}
    </p>
  );
}

export function GroupCard({ group, want, caliberName }: { group: Group; want: number; caliberName: string }) {
  const [open, setOpen] = useState(false);
  const best = group.best;
  const others = group.offers.slice(1);
  const name = loadName(group, best.title);
  const tags = [
    casingName(group.casing),
    group.condition !== 'new' ? conditionName(group.condition) : null,
  ].filter(Boolean) as string[];

  return (
    <article className={`card${best.inStock ? '' : ' card-out'}`}>
      <div className="card-main">
        <div className="card-head">
          <h3 className="card-title">
            <Link to={`/load/${group.productId}?want=${want}`}>{name}</Link>
          </h3>
          <p className="card-sub">
            {caliberName}
            {tags.map((t) => (
              <span key={t} className={`tag${t === 'Remanufactured' || t === 'Factory seconds' ? ' tag-warn' : ''}`}>
                {t}
              </span>
            ))}
            {!best.inStock && <span className="tag tag-out">Out of stock</span>}
          </p>
        </div>
        <Price offer={best} />
      </div>

      <div className="card-store">
        <div className="card-store-text">
          <p className="store-name">
            {best.retailerName}
            <span className="checked">Checked {ago(best.lastSeenAt)}</span>
          </p>
          <OrderLine offer={best} want={want} />
        </div>
        <StoreLink offer={best}>Go to store</StoreLink>
      </div>

      {others.length > 0 && (
        <div className="card-more">
          <button type="button" className="more-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide' : 'See'} {others.length} more {others.length === 1 ? 'store' : 'stores'}
            <span className="more-from">from {perRound(others[0]!.plan.perRound)}</span>
          </button>
          {open && (
            <ul className="others">
              {others.map((o) => (
                <li key={o.id}>
                  <div>
                    <p className="store-name">
                      {o.retailerName}
                      <span className="checked">Checked {ago(o.lastSeenAt)}</span>
                    </p>
                    <OrderLine offer={o} want={want} />
                  </div>
                  <div className="others-right">
                    <Price offer={o} size="sm" />
                    <StoreLink offer={o} className="btn btn-quiet">
                      Go
                    </StoreLink>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}
