import { matchBrand } from './brands.ts';
import { matchCaliber, type Category } from './calibers.ts';

export type Casing = 'brass' | 'nickel' | 'steel' | 'aluminum' | 'polymer';
export type Condition = 'new' | 'reman' | 'seconds' | 'surplus';
export type Bullet =
  | 'fmj' | 'tmj' | 'hp' | 'otm' | 'sp' | 'tip' | 'copper' | 'lead' | 'frangible'
  | 'buck' | 'slug' | 'bird';

export const BULLET_NAMES: Record<Bullet, string> = {
  fmj: 'FMJ',
  tmj: 'Total metal jacket',
  hp: 'Hollow point',
  otm: 'Match (open tip)',
  sp: 'Soft point',
  tip: 'Polymer tip',
  copper: 'Solid copper',
  lead: 'Lead',
  frangible: 'Frangible',
  buck: 'Buckshot',
  slug: 'Slug',
  bird: 'Birdshot',
};
export const CASING_NAMES: Record<Casing, string> = {
  brass: 'Brass',
  nickel: 'Nickel-plated brass',
  steel: 'Steel',
  aluminum: 'Aluminum',
  polymer: 'Polymer',
};
export const CONDITION_NAMES: Record<Condition, string> = {
  new: 'New',
  reman: 'Remanufactured',
  seconds: 'Factory seconds',
  surplus: 'Surplus',
};

export interface ParsedListing {
  caliber: string;
  category: Category;
  brand?: string;
  grain?: number;
  rounds?: number;
  casing?: Casing;
  condition: Condition;
  bullet?: Bullet;
  /** shotgun only, e.g. `2-3/4" 1 oz #8` */
  shot?: string;
  limit?: number;
  upc?: string;
}

const FRACTIONS: Record<string, string> = { '½': '1/2', '¼': '1/4', '¾': '3/4', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8' };

export function normalizeTitle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/&#8243;|&quot;|[“”″]/g, '"')
    .replace(/&#8217;|[‘’]/g, "'")
    .replace(/[–—\u2010-\u2012\u2212]/g, '-')
    .replace(/[\u00a0\u2000-\u200b\u202f]/g, ' ')
    .replace(/×/g, 'x')
    .replace(/[½¼¾⅛⅜⅝⅞]/g, (f) => ` ${FRACTIONS[f]}`)
    // some stores' text arrives with "?" where a dash or space was ("30?30", "338?lapua")
    .replace(/(\w)\?(?=\w)/g, '$1 ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const num = (s: string) => Number(s.replace(/,/g, ''));

export function parseRounds(t: string): number | undefined {
  // "(3x 1000ct loose pack)", "2 x 500 rounds"
  const mult = t.match(/\b(\d{1,2})\s*x\s*(\d[\d,]*)\s*-?\s*(?:ct|rds?|rounds?|count)\b/);
  if (mult) return num(mult[1]!) * num(mult[2]!);

  const candidates: number[] = [];
  // "box of 50", "case of 1,000"
  for (const m of t.matchAll(/\b(?:box|case|pack|bag|can|tin|bucket|brick|carton|crate|tray)\s+of\s+(\d[\d,]*)/g)) candidates.push(num(m[1]!));
  // "500 rounds", "50rd", "1000 round case", "20 shells" (but not "20 rounds per box")
  for (const m of t.matchAll(/\b(\d[\d,]*)\s*-?\s*(?:rounds?|rds?|rnds?|ct|count|shells?|shotshells?|cartridges?)\b(?!\s*(?:per|\/|a)\s*(?:box|bx|pack))/g)) candidates.push(num(m[1]!));
  if (!candidates.length) {
    // distributor style "50 bx/ 20 cs" means the price is for one 50-round box
    const bx = t.match(/\b(\d{1,4})\s*(?:rds?|rounds?)?\s*\/\s*(?:bx|box)\b|\b(\d{1,4})\s*bx\b/);
    if (bx) candidates.push(num(bx[1] ?? bx[2]!));
  }
  const ok = candidates.filter((n) => n >= 1 && n <= 50000);
  if (!ok.length) return undefined;
  // a stated case count is what the price is for when both a box and a case are mentioned
  if (/\bcase\b/.test(t) && ok.length > 1) return Math.max(...ok);
  return ok[0];
}

export function parseGrain(t: string): number | undefined {
  const m = t.match(/\b(\d{1,3}(?:\.\d+)?)\s*-?\s*(?:gr|grs|grain|grains|grn|gn)\b/);
  if (!m) return undefined;
  const g = Number(m[1]);
  return g >= 10 && g <= 1000 ? g : undefined;
}

export function parseCasing(t: string): Casing | undefined {
  if (/\bnickel(?:[-\s]plated)?\b/.test(t)) return 'nickel';
  if (/\bsteel\s*(?:case|cased|casing)\b|\bzinc[-\s]plated steel\b|\bbi-?metal\b|\bpolymer coated steel\b|\blacquered steel\b/.test(t)) return 'steel';
  if (/\baluminum\b|\baluminium\b/.test(t)) return 'aluminum';
  if (/\bpolymer\s*(?:case|cased|casing)\b/.test(t)) return 'polymer';
  if (/\bbrass\b/.test(t)) return 'brass';
  if (/\bsteel\b(?!\s*(?:shot|core|penetrator|tip|bb|#|match))/.test(t)) return 'steel';
  return undefined;
}

export function parseCondition(t: string): Condition {
  if (/\b(?:remanufactured|reman|reloads?|reloaded)\b/.test(t)) return 'reman';
  if (/\b(?:factory\s*)?seconds\b/.test(t)) return 'seconds';
  if (/\b(?:military\s*surplus|surplus|mil[-\s]?surp)\b/.test(t)) return 'surplus';
  return 'new';
}

export function parseBullet(t: string, category: Category): Bullet | undefined {
  if (category === 'shotgun') {
    if (/\bslugs?\b|\bsabot\b/.test(t)) return 'slug';
    if (/\b(?:0{1,3}|[1-4])\s*-?\s*buck(?:shot)?\b|\bbuckshot\b/.test(t)) return 'buck';
    if (/#\s?\d|\bshot\b|\btarget\b|\bdove\b|\bgame\b|\btrap\b|\bskeet\b|\bwaterfowl\b|\bupland\b|\bturkey\b|\bpheasant\b/.test(t)) return 'bird';
    return undefined;
  }
  if (/\bfrangible\b|\bsinterfire\b/.test(t)) return 'frangible';
  if (/\bsolid copper\b|\bmonolithic\b|\bt?tsx\b|\blrx\b|\bcx\b|\bvor-?tx\b|\bcopper hollow ?point\b/.test(t)) return 'copper';
  if (/\bv-?max\b|\bsst\b|\beld-?x\b|\bballistic tip\b|\bpolymer tip(?:ped)?\b|\bftx\b|\btipped\b|\baccubond\b|\bvarmint grenade\b/.test(t)) return 'tip';
  if (/\botm\b|\bopen tip\b|\bbthp\b|\bhpbt\b|\bmatchking\b|\bsmk\b|\beld-?m\b|\bmatch\b/.test(t)) return 'otm';
  if (/\bjhp\b|\bhollow ?points?\b|\bhst\b|\bgold dot\b|\bcritical (?:defense|duty)\b|\bxtp\b|\bhydra-?shok\b|\branger\b|\bhp\b|\bdefender\b|\bguard dog\b|\bgolden saber\b|\bpdx1\b|\bv-crown\b/.test(t)) return 'hp';
  if (/\bjsp\b|\bpsp\b|\bsoft ?points?\b|\bsp\b|\binterlock\b|\bpower-?point\b|\bcore-?lokt\b|\bfusion\b/.test(t)) return 'sp';
  if (/\btmj\b|\bcmj\b|\btotal metal jacket\b|\bcomplete metal jacket\b|\btsj\b|\btotal synthetic jacket\b|\bsyntech\b|\bencapsulated\b/.test(t)) return 'tmj';
  if (/\blrn\b|\blead round nose\b|\bswc\b|\bwadcutter\b|\bsemi-wadcutter\b|\bcast lead\b|\blfn\b|\blead flat nose\b|\bcprn\b|\bround nose\b|\blead\b(?!\s*free)/.test(t)) return 'lead';
  if (/\bfmj\b|\bfull metal jacket\b|\bball\b|\bm193\b|\bm855\b|\bm80\b|\bfmjbt\b|\bfmj-?bt\b/.test(t)) return 'fmj';
  return undefined;
}

function parseShot(raw: string): string | undefined {
  // "2 3/4" and "1 1/8 oz" are written with a space as often as a dash; "#7 1/2" means #7.5
  const t = raw.replace(/\b(\d) (\d\/\d)\b/g, '$1-$2').replace(/#\s?(\d)-1\/2\b/g, '#$1.5');
  const len = t.match(/\b(2-?3\/4|2\.75|3-?1\/2|3\.5|3|2-?1\/2|2\.5)\s*(?:"|in\b|inch)/)?.[1];
  const oz = t.match(/\b(\d(?:-\d)?\/\d|\d(?:\.\d+)?|1-1\/8|1-1\/4)\s*oz\b/)?.[1];
  const size = t.match(/#\s?(\d(?:\.\d)?|bbb?|t)\b/)?.[1] ?? t.match(/\b(0{1,3}|[1-4])\s*-?\s*buck/)?.[1];
  const parts = [len && `${len.replace('2.75', '2-3/4').replace('3.5', '3-1/2')}"`, oz && `${oz} oz`, size && (/buck/.test(t) ? `${size} buck` : `#${size}`)];
  const s = parts.filter(Boolean).join(' ');
  return s || undefined;
}

export function parseLimit(t: string): number | undefined {
  const m = t.match(/\blimit(?:ed)?\s*(?:to|of)?\s*(\d{1,3})\b|\b(?:max|maximum)\s*(\d{1,3})\s*(?:per|\/)\s*(?:order|customer|household|purchase)\b|\bonly\s*(\d{1,3})\s*(?:boxes|cases|per)\b/);
  const n = m && Number(m[1] ?? m[2] ?? m[3]);
  return n && n > 0 ? n : undefined;
}

export function parseUpc(raw: string): string | undefined {
  return raw.match(/\b(\d{12,13})\b/)?.[1];
}

/** Returns undefined when the title isn't recognizably ammunition for a caliber we track. */
export function parseListing(title: string, extra = ''): ParsedListing | undefined {
  const t = normalizeTitle(`${title} ${extra}`);
  const cal = matchCaliber(t);
  if (!cal) return undefined;
  const category = cal.category;
  return {
    caliber: cal.slug,
    category,
    brand: matchBrand(t),
    grain: category === 'shotgun' ? undefined : parseGrain(t),
    rounds: parseRounds(normalizeTitle(title)) ?? parseRounds(t),
    casing: category === 'shotgun' ? undefined : parseCasing(t),
    condition: parseCondition(t),
    bullet: parseBullet(t, category),
    shot: category === 'shotgun' ? parseShot(t) : undefined,
    limit: parseLimit(t),
    upc: parseUpc(title),
  };
}

/**
 * Store categories mix loaded ammo with things that name a caliber but aren't ammo:
 * guns, magazines, reloading parts, blanks and dummy rounds. An item has to show some
 * sign of being ammo (a grain weight, the word ammo, shot or slug details) and no sign
 * of being a gun or a part.
 */
export function isNotLoadedAmmo(title: string, extra = ''): boolean {
  const t = normalizeTitle(title);
  const hints = normalizeTitle(extra);
  const hintsSayAmmo = /\b(ammo|ammunition|shotshells?|cartridges?)\b/.test(hints);
  if (/\b(firearms?|handguns?|pistols?|rifles?|shotguns?|magazines?|optics?|gift cards?|holsters?|apparel|accessories|reloading|components?)\b/.test(hints) && !hintsSayAmmo) return true;
  // never part of a loaded-ammo title
  if (/\b\d{1,3}\+\d\b|\b(optic[- ](?:ready|cut)|slide|receiver|handguard|threaded|bullpup|brace|cerakote|nitride|backstrap|snap caps?|dummy|blanks?|choke tube|dry fire|gift card|cleaning|bore ?snake|die set|shell holder|smokeless powder|gunpowder|holster|speed ?loader|mag pouch)\b/.test(t)) return true;
  // component bullets: a grain weight but no sign they come loaded
  if (/\b(bullets?|projectiles?)\b/.test(t) && !hintsSayAmmo && !/\b(ammo|ammunition|rounds?|rds?|cartridges?)\b/.test(t)) return true;
  const grain = /\b\d{1,3}(?:\.\d)? ?(?:gr|grains?)\b/.test(t);
  const shotSpecs = /\b(?:\d{2}|410) ?(?:ga|gauge|bore)\b/.test(t) && /\b(buck|buckshot|slugs?|#\d|\d+(?:[-/]\d+)* ?(?:oz|ounces?)|shot|dram|shells?)\b/.test(t);
  // these turn up in ammo titles too ("Swift A-Frame", "FliteControl Wad", "400 Rounds Ammo Can"), so they
  // only count against an item that shows no load details
  if (!grain && !shotSpecs && /\b(semi-auto|bolt action|lever action|pump action|revolver|rifle kit|synthetic stock|frame|grips?|barrel|magazines?|drum|ammo can|reloading|primers?|unprimed|once[-\s]fired|brass cases|brass casings|empty (?:brass|cases|hulls)|wads?)\b/.test(t)) return true;
  const titleSaysAmmo =
    grain || shotSpecs ||
    /\b(ammo|ammunition|cartridges?|shotshells?)\b/.test(t) ||
    /\b\d+ ?(?:round|rd|count|ct) (?:box|case|pack|brick)\b|\b(?:box|case|brick|pack) of \d+\b/.test(t);
  return !(titleSaysAmmo || hintsSayAmmo);
}

/** Same load from any store, in any box size, lands in one group. */
export function groupKey(p: ParsedListing, retailerId: string): string {
  const brand = p.brand ?? `?${retailerId}`;
  const load = p.category === 'shotgun' ? p.shot ?? '?' : `${p.grain ?? '?'}|${p.casing ?? '?'}`;
  return [p.caliber, brand.toLowerCase(), load, p.bullet ?? '?', p.condition].join('|');
}
