import type { ShippingRule } from '@perround/shared';
import type { Adapter } from './adapters/types.ts';
import { shopify } from './adapters/shopify.ts';
import { woocommerce } from './adapters/woocommerce.ts';

export interface RetailerConfig {
  id: string;
  name: string;
  homepage: string;
  platform: 'shopify' | 'woocommerce';
  shipping: ShippingRule;
  /** what the store says about shipping, in a sentence a shopper can use */
  shippingNote?: string;
  /** the store page the rule came from */
  shippingUrl?: string;
  noShipStates?: string[];
  /** listings this store ships free beyond its usual rule; titles saying "free shipping" always count */
  shipsFree?: (title: string) => boolean;
  /** Shopify stores whose full catalog is too big to read: the ammo collections to read instead */
  collections?: RegExp;
}

export const ADAPTERS: Record<RetailerConfig['platform'], Adapter> = { shopify, woocommerce };

export function listingShipsFree(r: RetailerConfig, title: string): boolean {
  return /\bfree\s+shipping\b/i.test(title) || (r.shipsFree?.(title) ?? false);
}

// Stores whose platform publishes their catalog openly. Shipping rules come from each store's
// own shipping or FAQ page as of 10/30/2026. Most don't post what they charge, and the site says
// "figured at checkout" for those instead of guessing.
export const RETAILERS: RetailerConfig[] = [
  {
    id: 'targetsports',
    name: 'Target Sports USA',
    homepage: 'https://www.targetsportsusa.com',
    platform: 'shopify',
    shipping: { kind: 'unknown' },
    shippingNote: 'Cases ship free.',
    shippingUrl: 'https://www.targetsportsusa.com/policies/shipping-policy',
    noShipStates: ['AK', 'HI', 'DC'],
    shipsFree: (title) => /\bcase of \d/i.test(title),
  },
  {
    id: 'fastammo',
    collections: /-ammo$/,
    name: 'Fast Ammo',
    homepage: 'https://fastammo.com',
    platform: 'shopify',
    shipping: { kind: 'unknown' },
    shippingNote: 'The store may add a hazmat fee.',
    shippingUrl: 'https://fastammo.com/policies/shipping-policy',
    noShipStates: ['AK', 'HI', 'DC'],
  },
  {
    id: 'freedom',
    name: 'Freedom Munitions',
    homepage: 'https://freedommunitions.com',
    platform: 'shopify',
    shipping: { kind: 'unknown' },
    shippingNote: 'Based on weight and where you live.',
    shippingUrl: 'https://freedommunitions.com/pages/faq',
    noShipStates: ['AK', 'CA', 'HI', 'DC', 'MA'],
  },
  {
    id: 'sentry',
    collections: /-ammo$/,
    name: 'Sentry Ammo',
    homepage: 'https://sentryammo.com',
    platform: 'shopify',
    shipping: { kind: 'unknown' },
    shippingNote: 'The store may add a hazmat fee.',
    shippingUrl: 'https://sentryammo.com/policies/shipping-policy',
    noShipStates: ['AK', 'HI', 'DC'],
  },
  {
    id: 'sgammo',
    name: 'SGAmmo',
    homepage: 'https://sgammo.com',
    platform: 'woocommerce',
    shipping: { kind: 'free_over', fee: null, over: 200 },
    shippingUrl: 'https://sgammo.com/shipping-returns/',
    noShipStates: ['NY', 'ME', 'CA', 'MA', 'AK', 'HI', 'DC'],
  },
  {
    id: 'velocity',
    name: 'Velocity Ammo Sales',
    homepage: 'https://www.velocityammosales.com',
    platform: 'woocommerce',
    shipping: { kind: 'free_over', fee: null, over: 200 },
    shippingNote: 'Only ammo counts toward the $200.',
    shippingUrl: 'https://www.velocityammosales.com/faqs/',
    noShipStates: ['AK', 'HI'],
  },
  {
    id: 'southern',
    name: 'Southern Munitions',
    homepage: 'https://southernmunitions.com',
    platform: 'woocommerce',
    shipping: { kind: 'unknown' },
    shippingNote: 'Listings marked free shipping ship free.',
    shippingUrl: 'https://southernmunitions.com/terms-and-conditions/',
    noShipStates: ['AK', 'HI', 'DC'],
  },
  {
    id: 'greencountry',
    name: 'Green Country Ammo',
    homepage: 'https://greencountryammo.com',
    platform: 'woocommerce',
    shipping: { kind: 'unknown' },
    shippingNote: 'Based on weight. The store says it averages about $15 a box.',
    shippingUrl: 'https://greencountryammo.com/faq/',
  },
  {
    id: 'sharkcoast',
    name: 'Shark Coast Tactical',
    homepage: 'https://sharkcoasttactical.com',
    platform: 'woocommerce',
    shipping: { kind: 'unknown' },
    shippingNote: 'A flat rate, but the store doesn\'t post the amount.',
    shippingUrl: 'https://sharkcoasttactical.com/terms-conditions-2/',
    noShipStates: ['AK', 'HI', 'MA', 'NY'],
  },
];
