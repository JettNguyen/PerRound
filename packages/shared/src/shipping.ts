/** How a store charges to ship an ammo order to the lower 48. */
export type ShippingRule =
  | { kind: 'free' }
  | { kind: 'flat'; fee: number }
  /** fee is null when the store doesn't post what it charges under the threshold */
  | { kind: 'free_over'; fee: number | null; over: number }
  | { kind: 'tiered'; tiers: { upTo: number | null; fee: number }[] }
  | { kind: 'unknown' };

/** Shipping for an order of this size, or null when we don't know the store's rule. */
export function shippingFor(rule: ShippingRule, orderTotal: number): number | null {
  switch (rule.kind) {
    case 'free':
      return 0;
    case 'flat':
      return rule.fee;
    case 'free_over':
      // stores say "over $200"; treating exactly $200 as not free is the safe reading
      return orderTotal > rule.over ? 0 : rule.fee;
    case 'tiered': {
      const tier = rule.tiers.find((t) => t.upTo === null || orderTotal <= t.upTo);
      return tier ? tier.fee : null;
    }
    default:
      return null;
  }
}

export function describeShipping(rule: ShippingRule): string {
  const $ = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);
  switch (rule.kind) {
    case 'free':
      return 'Free shipping';
    case 'flat':
      return `${$(rule.fee)} shipping`;
    case 'free_over':
      return rule.fee === null
        ? `Free shipping over ${$(rule.over)}. Under that, figured at checkout`
        : `${$(rule.fee)} shipping, free over ${$(rule.over)}`;
    case 'tiered':
      return 'Shipping depends on order size';
    default:
      return 'Shipping figured at checkout';
  }
}

export interface OrderPlan {
  /** packs you'd buy to reach the round count you asked for */
  packs: number;
  rounds: number;
  subtotal: number;
  shipping: number | null;
  total: number;
  /** cost per round in dollars, with shipping when we know it (see `shipping`) */
  perRound: number;
  /** true when a purchase limit stopped us short of the rounds asked for */
  limited: boolean;
}

/**
 * What it costs to get about `wantRounds` rounds of this listing delivered.
 * Buying several boxes is how people actually shop, and it's what makes "free over $X" fair to compare.
 */
export function planOrder(
  price: number,
  rounds: number,
  rule: ShippingRule,
  wantRounds: number,
  opts: { limit?: number | null; shipsFree?: boolean } = {},
): OrderPlan {
  const { limit, shipsFree } = opts;
  let packs = Math.max(1, Math.ceil(wantRounds / rounds));
  let limited = false;
  if (limit && packs > limit) {
    packs = limit;
    limited = true;
  }
  const subtotal = round2(packs * price);
  const shipping = shipsFree ? 0 : shippingFor(rule, subtotal);
  const total = round2(subtotal + (shipping ?? 0));
  return { packs, rounds: packs * rounds, subtotal, shipping, total, perRound: total / (packs * rounds), limited };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
