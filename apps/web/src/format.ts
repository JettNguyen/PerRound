import { BULLET_NAMES, CASING_NAMES, CONDITION_NAMES, type Bullet, type Casing, type Condition, type Offer } from '@perround/shared';

/** 0.235 -> "23.5¢", 1.42 -> "$1.42" */
export function perRound(dollars: number): string {
  const cents = dollars * 100;
  if (cents >= 100) return `$${dollars.toFixed(2)}`;
  return `${cents < 10 ? cents.toFixed(2) : cents.toFixed(1)}¢`;
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export const money = (n: number) => usd.format(n);

export const count = (n: number) => n.toLocaleString('en-US');

export function ago(iso: string | null, now = Date.now()): string {
  if (!iso) return 'not checked yet';
  const mins = Math.round((now - Date.parse(iso)) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

export const bulletName = (b: string | null) => (b ? (BULLET_NAMES[b as Bullet] ?? b) : null);
export const casingName = (c: string | null) => (c ? (CASING_NAMES[c as Casing] ?? c) : null);
export const conditionName = (c: string) => CONDITION_NAMES[c as Condition] ?? c;

/** "Federal 115 gr FMJ", "Rio #7.5 Birdshot", or the store's own title when we know little */
export function loadName(g: { brand: string | null; grain: number | null; bullet: string | null; shot: string | null }, fallback: string): string {
  const parts = [g.brand, g.grain ? `${g.grain} gr` : null, g.shot, bulletName(g.bullet)].filter(Boolean);
  return parts.length >= 2 ? parts.join(' ') : fallback;
}

/** Brass is what people expect, so only other casings and anything not new get a label. */
export function loadTags(g: { casing: string | null; condition: string }): string[] {
  const tags: string[] = [];
  if (g.casing && g.casing !== 'brass' && g.casing !== 'nickel') tags.push(`${casingName(g.casing)} case`);
  if (g.condition !== 'new') tags.push(conditionName(g.condition));
  return tags;
}

/** "10 boxes of 50", "2 cases of 1,000", or "1,000 rounds" */
export function packsText(packs: number, roundsEach: number): string {
  if (packs === 1) return `${count(roundsEach)} rounds`;
  return `${packs} ${roundsEach >= 200 ? 'cases' : 'boxes'} of ${count(roundsEach)}`;
}

/** What the order costs and whether shipping is in it. */
export function orderText(o: Offer): { total: string; ship: string; known: boolean } {
  const s = o.plan.shipping;
  if (o.shipsFree || s === 0) return { total: money(o.plan.total), ship: 'ships free', known: true };
  if (s !== null) return { total: money(o.plan.total), ship: `with ${money(s)} shipping`, known: true };
  return { total: money(o.plan.total), ship: '+ shipping', known: false };
}
