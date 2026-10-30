import { describe, expect, it } from 'vitest';
import { groupKey, parseListing, planOrder } from '../src/index.ts';

// Real listing titles copied from store pages, with what a shopper would read off them.
const cases: [string, Partial<ReturnType<typeof parseListing>>][] = [
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
    const p = planOrder(3.25, 50, { kind: 'flat', fee: 12 }, 500, 1);
    expect(p.packs).toBe(1);
    expect(p.limited).toBe(true);
  });
});
