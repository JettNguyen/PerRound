import { describe, expect, it } from 'vitest';
import { groupKey, isNotLoadedAmmo, parseListing, planOrder } from '../src/index.ts';

// Real listing titles copied from store pages, with what a shopper would read off them.
const cases: [string, Partial<NonNullable<ReturnType<typeof parseListing>>>][] = [
  ['9mm Luger 124gr FMJ Remanufactured (Limited to 1 per purchase)', { caliber: '9mm-luger', grain: 124, bullet: 'fmj', condition: 'reman', limit: 1 }],
  ['[No need CA FFL] Sellier & Bellot SB9A Handgun 9mm Luger 115 gr Full Metal Jacket (FMJ) 50 Bx/ 20 Cs 754908500086', { caliber: '9mm-luger', brand: 'Sellier & Bellot', grain: 115, bullet: 'fmj', rounds: 50, upc: '754908500086' }],
  ['CCI 3509 Blazer 9mm Luger 115 gr (FMJ) 50 Bx/ 20 Cs 076683035097', { brand: 'Blazer', grain: 115, rounds: 50 }],
  ['Southern Munitions 9mm 124gr Remanufactured Ammunition 500 round case ONLINE ONLY PRICE', { caliber: '9mm-luger', brand: 'Southern Munitions', rounds: 500, condition: 'reman' }],
  ['K7 9mm Luger 115 Grain Complete Metal Jacket (CMJ) Range Ammo (3x 1000ct loose pack) - MADE IN THE USA', { brand: 'K7', grain: 115, bullet: 'tmj', rounds: 3000 }],
  ['Magtech 9mm Luger 115 Grain Full Metal Jacket(FMJ) - Zinc plated Steel Case.', { brand: 'Magtech', casing: 'steel', bullet: 'fmj' }],
  ['Winchester USA Forged 9mm Luger 115gr FMJ Steel Ammo', { brand: 'Winchester', casing: 'steel' }],
  ['9mm Luger, 115gr TMJ, Remanufactured Brass, Seconds, 500 Rounds', { bullet: 'tmj', casing: 'brass', condition: 'reman', rounds: 500 }],
  ['Kaiser 9mm Ammunition Steel Case KSR9MM115 115 Grain Full Metal Jacket PACK 500 Rounds', { brand: 'Kaiser', casing: 'steel', rounds: 500 }],
  ['Rio Top Target 20 Gauge Ammo 2-3/4" 7/8 oz #7.5 Lead Shot - TT2075 - Box of 250', { caliber: '20-gauge', bullet: 'bird', rounds: 250, shot: '2-3/4" 7/8 oz #7.5' }],
  ['Federal Premium 12 Gauge 2-3/4" 00 Buck 9 Pellets - 5 Rounds', { caliber: '12-gauge', brand: 'Federal', bullet: 'buck', rounds: 5 }],
  ['Hornady Critical Defense .380 ACP 90gr FTX - 25 Rounds', { caliber: '380-acp', brand: 'Hornady', grain: 90, rounds: 25 }],
  ['PMC Bronze 5.56x45mm NATO 55 Grain FMJ M193 - 1000 Round Case', { caliber: '5-56-nato', brand: 'PMC', grain: 55, bullet: 'fmj', rounds: 1000 }],
  ['Wolf Polyformance .223 Rem 55gr FMJ Steel Case - 500 Rounds', { caliber: '223-rem', brand: 'Wolf', casing: 'steel', rounds: 500 }],
  ['CCI Mini-Mag 22 LR 40gr Copper Plated Round Nose - Box of 100', { caliber: '22-lr', brand: 'CCI', grain: 40, rounds: 100, bullet: 'lead' }],
  ['Hornady 17 HMR 17gr V-MAX - 50 Rounds', { caliber: '17-hmr', brand: 'Hornady', grain: 17, bullet: 'tip' }],
  ['Federal American Eagle .45 ACP 230gr FMJ - Box of 50', { caliber: '45-acp', brand: 'Federal', grain: 230 }],
  ['Tula 7.62x39mm 122gr FMJ Steel Case 1000rds', { caliber: '7-62x39', brand: 'Tula', rounds: 1000, casing: 'steel' }],
  ['Hornady 6.5 Creedmoor 140gr ELD Match - 20 Rounds', { caliber: '6-5-creedmoor', bullet: 'otm', grain: 140 }],
  ['Speer Gold Dot .40 S&W 180gr GDHP - 50rd', { caliber: '40-sw', brand: 'Speer', bullet: 'hp', rounds: 50 }],
  ['Remington UMC .38 Special 130gr MC 50/bx', { caliber: '38-special', brand: 'Remington' }],
  ['Sig Sauer Elite V-Crown 10mm Auto 180gr JHP 20/Box', { caliber: '10mm-auto', brand: 'Sig Sauer', bullet: 'hp' }],
  ['Federal, Premium, 6.5 CREEDMOOR, 120 Grain, Trophy Copper, Lead Free, 20 Round Box, 200 Round Per Case', { caliber: '6-5-creedmoor', grain: 120, rounds: 20 }],
  ['Barnes VOR-TX .300 AAC Blackout 110gr TAC-TX', { caliber: '300-blackout', brand: 'Barnes', bullet: 'copper' }],
];

describe('parseListing', () => {
  for (const [title, want] of cases) {
    it(title, () => {
      const got = parseListing(title);
      expect(got).toBeDefined();
      expect(got).toMatchObject(want);
    });
  }

  it('skips things that are not ammo for a tracked caliber', () => {
    expect(parseListing('$50.00 Dollars E-Gift Card')).toBeUndefined();
    expect(parseListing('Range bag, large, coyote tan')).toBeUndefined();
  });

  it('groups the same load across stores and box sizes', () => {
    const a = parseListing('Magtech 9mm Luger 115 Grain Full Metal Jacket Steel Case 50 Rounds')!;
    const b = parseListing('MAGTECH 9MM 115GR FMJ STEEL CASE 1000 ROUND CASE')!;
    expect(groupKey(a, 'x')).toBe(groupKey(b, 'y'));
  });
});

describe('planOrder', () => {
  it('counts shipping into the price per round', () => {
    const p = planOrder(15, 50, { kind: 'flat', fee: 10 }, 500);
    expect(p.packs).toBe(10);
    expect(p.total).toBe(160);
    expect(p.perRound).toBeCloseTo(0.32);
  });
  it('drops shipping once the order clears a free shipping line', () => {
    const p = planOrder(105, 500, { kind: 'free_over', fee: 15, over: 99 }, 500);
    expect(p.shipping).toBe(0);
    expect(p.perRound).toBeCloseTo(0.21);
  });
  it('respects purchase limits', () => {
    const p = planOrder(3.25, 50, { kind: 'flat', fee: 12 }, 500, { limit: 1 });
    expect(p.packs).toBe(1);
    expect(p.limited).toBe(true);
  });
  it('says shipping is unknown under a free shipping line with no posted fee', () => {
    const under = planOrder(19, 50, { kind: 'free_over', fee: null, over: 200 }, 500);
    expect(under.subtotal).toBe(190);
    expect(under.shipping).toBeNull();
    expect(planOrder(19, 50, { kind: 'free_over', fee: null, over: 200 }, 600).shipping).toBe(0);
  });
  it('treats exactly the free shipping amount as not free', () => {
    expect(planOrder(200, 1000, { kind: 'free_over', fee: 12, over: 200 }, 1000).shipping).toBe(12);
  });
  it('lets a listing that ships free override the store rule', () => {
    expect(planOrder(400, 1000, { kind: 'unknown' }, 1000, { shipsFree: true }).shipping).toBe(0);
  });
});

describe('isNotLoadedAmmo', () => {
  it('keeps every real ammo title above', () => {
    for (const [title] of cases) expect(isNotLoadedAmmo(title), title).toBe(false);
  });

  it('keeps loads named after their wad or casing', () => {
    expect(isNotLoadedAmmo('Federal FliteControl Wad 12 Gauge Ammo 2 3/4" 00 Buckshot 9 Pellets - Box of 5')).toBe(false);
    expect(isNotLoadedAmmo('Federal Swift A-Frame 44 Magnum Ammo 280 Grain Jacketed Hollow Point - Box of 20')).toBe(false);
  });

  it('keeps ammo that only the store category marks as ammo', () => {
    expect(isNotLoadedAmmo('Winchester Super-X 30-30 Win', 'Rifle Ammo')).toBe(false);
  });

  // titles from a store that sells guns and ammo in one catalog
  it('drops guns, magazines and parts', () => {
    const guns = [
      'Derya Firearms DY9GUS DY9 9mm Luger 15+1 4.02" Gold TiN Steel Barrel, Black Nitride Optics Ready/Serrated Alloy Steel Slide',
      'SHADOW SS-1211 MR920P 9MM BRZ/BLK - 1',
      'Weatherby MCC01N308NR2B Mark V Carbon Compact 308 Win 20" Synthetic Stock - 1',
      'WTHBY 3WRX2306SR4B 307 RANGE XP 2.0 3006 22+2 - 1',
      'Derya Firearms 10LDY9US DY9 9mm 10rd - 1',
      'LIFECARD 22LR TEXAS FLAG - 1',
      'Hornady 9mm .355 115gr XTP Bullets 100ct',
      'Starline 45 ACP Brass Cases 100ct',
      'Claybuster 12 Gauge Shotshell Wads 1-1/8 oz Pink 500 Count - 1',
      'Federal Podium Wad 12ga 1oz 500-Count - 1',
      'X-Treme 45 (.452) 230 Gr RN Cast Lead Bullet (not ammo)',
      'Lightning Ammo .380 .355" 95gr Round Nose Component Bullets Box of 100 - 1',
    ];
    for (const g of guns) expect(isNotLoadedAmmo(g), g).toBe(true);
    expect(isNotLoadedAmmo('Remington 870 Express 12 ga', 'Handgun Magazine Capacity > 10')).toBe(true);
  });
});
