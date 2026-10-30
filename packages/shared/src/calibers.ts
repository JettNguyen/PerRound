export type Category = 'handgun' | 'rifle' | 'rimfire' | 'shotgun';

export interface Caliber {
  slug: string;
  name: string;
  category: Category;
  /** Matched against a lowercased listing title. Order in CALIBERS matters: more specific first. */
  pattern: RegExp;
  popular?: boolean;
  /** Calibers people often shop together, shown as a "see also" link. */
  related?: string[];
}

// Patterns assume the title has been through normalizeTitle(): lowercase, single spaces, plain quotes.
export const CALIBERS: Caliber[] = [
  // handgun, specific variants before their shorter cousins
  { slug: '9mm-makarov', name: '9mm Makarov', category: 'handgun', pattern: /\b9\s?mm\s*mak(arov)?\b|\b9\s?x\s?18\s?(mm)?\b(?!\s*ultra)/ },
  { slug: '380-acp', name: '.380 ACP', category: 'handgun', pattern: /\b380\s*(acp|auto|automatic)\b|\.380\b|\b9\s?mm\s*(kurz|short)\b/, popular: true },
  { slug: '9mm-luger', name: '9mm Luger', category: 'handgun', pattern: /\b9\s?mm\b(?!\s*(mak|kurz|short|major|win|largo|steyr|browning))|\b9\s?x\s?19(?!\d)|\bparabellum\b/, popular: true },
  { slug: '357-sig', name: '.357 SIG', category: 'handgun', pattern: /\b357\s*sig\b/ },
  { slug: '357-magnum', name: '.357 Magnum', category: 'handgun', pattern: /\b357\s*(rem(ington)?\s*)?(mag|magnum)\b|\.357\b(?!\s*(sig|max))/, popular: true, related: ['38-special'] },
  { slug: '38-super', name: '.38 Super', category: 'handgun', pattern: /\b38\s*super\b/ },
  { slug: '38-special', name: '.38 Special', category: 'handgun', pattern: /\b38\s*(spl|special|spcl|sp)\b/, popular: true, related: ['357-magnum'] },
  { slug: '40-sw', name: '.40 S&W', category: 'handgun', pattern: /\b40\s*(s\s?&\s?w|s\s?and\s?w|sw|smith\s*(&|and)\s*wesson)\b|\.40\s*cal\b/, popular: true },
  { slug: '10mm-auto', name: '10mm Auto', category: 'handgun', pattern: /\b10\s?mm\b(?!\s*mag)/, popular: true },
  { slug: '45-gap', name: '.45 GAP', category: 'handgun', pattern: /\b45\s*g\.?a\.?p\b/ },
  { slug: '45-acp', name: '.45 ACP', category: 'handgun', pattern: /\b45\s*(acp|auto|automatic)\b/, popular: true },
  { slug: '45-colt', name: '.45 Colt', category: 'handgun', pattern: /\b45\s*(long\s*)?colt\b|\b45\s*lc\b/ },
  { slug: '44-special', name: '.44 Special', category: 'handgun', pattern: /\b44\s*(s&w\s*)?(spl|special)\b/ },
  { slug: '44-magnum', name: '.44 Magnum', category: 'handgun', pattern: /\b44\s*(rem(ington)?\s*)?(mag|magnum)\b/ },
  { slug: '5-7x28', name: '5.7x28mm', category: 'handgun', pattern: /\b5\.7\s?x\s?28(?!\d)|\b5\.7\s?mm\b/, popular: true },
  { slug: '30-super-carry', name: '.30 Super Carry', category: 'handgun', pattern: /\b30\s*super\s*carry\b/ },
  { slug: '32-acp', name: '.32 ACP', category: 'handgun', pattern: /\b32\s*(acp|auto)\b|\b7\.65\s?(mm)?\s*browning\b/ },
  { slug: '25-acp', name: '.25 ACP', category: 'handgun', pattern: /\b25\s*(acp|auto)\b/ },
  { slug: '7-62x25', name: '7.62x25mm Tokarev', category: 'handgun', pattern: /\b7\.62\s?x\s?25(?!\d)|\btokarev\b/ },
  { slug: '327-federal', name: '.327 Federal Magnum', category: 'handgun', pattern: /\b327\s*fed(eral)?\b/ },
  { slug: '454-casull', name: '.454 Casull', category: 'handgun', pattern: /\b454\s*casull\b/ },
  { slug: '460-sw', name: '.460 S&W Magnum', category: 'handgun', pattern: /\b460\s*(s\s?&\s?w|sw)\b/ },
  { slug: '500-sw', name: '.500 S&W Magnum', category: 'handgun', pattern: /\b500\s*(s\s?&\s?w|sw)\b/ },

  // rifle
  { slug: '5-56-nato', name: '5.56 NATO', category: 'rifle', pattern: /\b5\.56(?!\d)/, popular: true, related: ['223-rem'] },
  { slug: '22-250', name: '.22-250 Remington', category: 'rifle', pattern: /\b22[-\s]250\b/ },
  { slug: '223-rem', name: '.223 Remington', category: 'rifle', pattern: /\b223\b(?!\s*wylde)/, popular: true, related: ['5-56-nato'] },
  { slug: '224-valkyrie', name: '.224 Valkyrie', category: 'rifle', pattern: /\b224\s*valk(yrie)?\b/ },
  { slug: '300-blackout', name: '.300 Blackout', category: 'rifle', pattern: /\b300\s*(aac\s*)?(blackout|blk|bo)\b|\b7\.62\s?x\s?35(?!\d)/, popular: true },
  { slug: '300-win-mag', name: '.300 Win Mag', category: 'rifle', pattern: /\b300\s*win(chester)?\s*(mag|magnum)\b|\b300\s*wm\b/ },
  { slug: '300-prc', name: '.300 PRC', category: 'rifle', pattern: /\b300\s*prc\b/ },
  { slug: '300-wsm', name: '.300 WSM', category: 'rifle', pattern: /\b300\s*wsm\b/ },
  { slug: '7-62x39', name: '7.62x39mm', category: 'rifle', pattern: /\b7\.62\s?x\s?39(?!\d)/, popular: true },
  { slug: '7-62x54r', name: '7.62x54R', category: 'rifle', pattern: /\b7\.62\s?x\s?54(?!\d)/ },
  { slug: '7-62x51', name: '7.62x51 NATO', category: 'rifle', pattern: /\b7\.62\s?x\s?51(?!\d)|\b7\.62\s*nato\b/, related: ['308-win'] },
  { slug: '308-win', name: '.308 Winchester', category: 'rifle', pattern: /\b308\b/, popular: true, related: ['7-62x51'] },
  { slug: '5-45x39', name: '5.45x39mm', category: 'rifle', pattern: /\b5\.45\s?x\s?39(?!\d)/ },
  { slug: '6-5-creedmoor', name: '6.5 Creedmoor', category: 'rifle', pattern: /\b6\.5\s*(mm\s*)?(creedmoor|creed|cm)\b/, popular: true },
  { slug: '6-5-grendel', name: '6.5 Grendel', category: 'rifle', pattern: /\b6\.5\s*(mm\s*)?grendel\b/ },
  { slug: '6-5-prc', name: '6.5 PRC', category: 'rifle', pattern: /\b6\.5\s*prc\b/ },
  { slug: '6mm-arc', name: '6mm ARC', category: 'rifle', pattern: /\b6\s?mm\s*arc\b/ },
  { slug: '6-8-spc', name: '6.8 SPC', category: 'rifle', pattern: /\b6\.8\s*(mm\s*)?(spc|rem)\b/ },
  { slug: '30-06', name: '.30-06 Springfield', category: 'rifle', pattern: /\b30[-.\s]?06\b/, popular: true },
  { slug: '30-30-win', name: '.30-30 Winchester', category: 'rifle', pattern: /\b30[-\s]30\b/ },
  { slug: '30-carbine', name: '.30 Carbine', category: 'rifle', pattern: /\b30\s*(m1\s*)?carbine\b/ },
  { slug: '270-win', name: '.270 Winchester', category: 'rifle', pattern: /\b270\s*win(chester)?\b(?!\s*short)/ },
  { slug: '243-win', name: '.243 Winchester', category: 'rifle', pattern: /\b243\s*(win(chester)?)?\b/ },
  { slug: '25-06', name: '.25-06 Remington', category: 'rifle', pattern: /\b25[-\s]06\b/ },
  { slug: '7mm-08', name: '7mm-08 Remington', category: 'rifle', pattern: /\b7\s?mm[-\s]08\b/ },
  { slug: '7mm-rem-mag', name: '7mm Rem Mag', category: 'rifle', pattern: /\b7\s?mm\s*rem(ington)?\s*(mag|magnum)\b/ },
  { slug: '7mm-prc', name: '7mm PRC', category: 'rifle', pattern: /\b7\s?mm\s*prc\b/ },
  { slug: '350-legend', name: '.350 Legend', category: 'rifle', pattern: /\b350\s*legend\b/ },
  { slug: '360-buckhammer', name: '.360 Buckhammer', category: 'rifle', pattern: /\b360\s*buckhammer\b/ },
  { slug: '450-bushmaster', name: '.450 Bushmaster', category: 'rifle', pattern: /\b450\s*bushmaster\b/ },
  { slug: '458-socom', name: '.458 SOCOM', category: 'rifle', pattern: /\b458\s*socom\b/ },
  { slug: '45-70', name: '.45-70 Government', category: 'rifle', pattern: /\b45[-\s]?70\b/ },
  { slug: '303-british', name: '.303 British', category: 'rifle', pattern: /\b303\s*(brit|british)\b/ },
  { slug: '8mm-mauser', name: '8mm Mauser', category: 'rifle', pattern: /\b8\s?mm\s*mauser\b|\b7\.92\s?x\s?57(?!\d)|\b8\s?x\s?57(?!\d)/ },
  { slug: '338-lapua', name: '.338 Lapua Magnum', category: 'rifle', pattern: /\b338\s*(lapua|lap|lm)\b/ },
  { slug: '50-bmg', name: '.50 BMG', category: 'rifle', pattern: /\b50\s*bmg\b|\b12\.7\s?x\s?99(?!\d)/ },
  { slug: '204-ruger', name: '.204 Ruger', category: 'rifle', pattern: /\b204\s*ruger\b/ },
  { slug: '17-hornet', name: '.17 Hornet', category: 'rifle', pattern: /\b17\s*hornet\b/ },

  // rimfire
  { slug: '17-hmr', name: '.17 HMR', category: 'rimfire', pattern: /\b17\s*hmr\b/, popular: true },
  { slug: '17-wsm', name: '.17 WSM', category: 'rimfire', pattern: /\b17\s*wsm\b/ },
  { slug: '22-wmr', name: '.22 WMR', category: 'rimfire', pattern: /\b22\s*(wmr|win(chester)?\s*mag(num)?|mag(num)?)\b/, popular: true },
  { slug: '22-lr', name: '.22 LR', category: 'rimfire', pattern: /\b22\s*(lr|long\s*rifle)\b/, popular: true },
  { slug: '22-short', name: '.22 Short', category: 'rimfire', pattern: /\b22\s*short\b/ },

  // shotgun
  { slug: '12-gauge', name: '12 Gauge', category: 'shotgun', pattern: /\b12\s*(ga|gauge|g)\b/, popular: true },
  { slug: '20-gauge', name: '20 Gauge', category: 'shotgun', pattern: /\b20\s*(ga|gauge|g)\b/, popular: true },
  { slug: '16-gauge', name: '16 Gauge', category: 'shotgun', pattern: /\b16\s*(ga|gauge|g)\b/ },
  { slug: '28-gauge', name: '28 Gauge', category: 'shotgun', pattern: /\b28\s*(ga|gauge|g)\b/ },
  { slug: '10-gauge', name: '10 Gauge', category: 'shotgun', pattern: /\b10\s*(ga|gauge|g)\b/ },
  { slug: '410-bore', name: '.410 Bore', category: 'shotgun', pattern: /\b410\s*(bore|ga|gauge)?\b/, popular: true },
];

export const CATEGORY_NAMES: Record<Category, string> = {
  handgun: 'Handgun',
  rifle: 'Rifle',
  rimfire: 'Rimfire',
  shotgun: 'Shotgun',
};

const bySlug = new Map(CALIBERS.map((c) => [c.slug, c]));
export const caliberBySlug = (slug: string) => bySlug.get(slug);

export function matchCaliber(normalizedTitle: string): Caliber | undefined {
  return CALIBERS.find((c) => c.pattern.test(normalizedTitle));
}
