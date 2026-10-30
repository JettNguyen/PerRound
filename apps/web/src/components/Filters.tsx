import { useState } from 'react';
import type { FacetValue, SearchResponse } from '../api.ts';
import { bulletName, casingName, conditionName } from '../format.ts';
import { STATES } from '../prefs.ts';

export interface FilterState {
  brand: string[];
  bullet: string[];
  casing: string[];
  condition: string[];
  grain: string[];
  store: string[];
  match: string;
  exclude: string;
  stock: 'in' | 'all';
  shippingKnown: boolean;
}

export const LIST_KEYS = ['brand', 'bullet', 'casing', 'condition', 'grain', 'store'] as const;
type ListKey = (typeof LIST_KEYS)[number];

export function activeCount(f: FilterState): number {
  return LIST_KEYS.reduce((n, k) => n + f[k].length, 0) + (f.match ? 1 : 0) + (f.exclude ? 1 : 0) + (f.stock === 'all' ? 1 : 0) + (f.shippingKnown ? 1 : 0);
}

interface Props {
  facets: SearchResponse['facets'];
  storeNames: Record<string, string>;
  value: FilterState;
  onChange: (next: Partial<FilterState>) => void;
  onClear: () => void;
  state: string;
  onState: (s: string) => void;
}

function Checklist({
  title,
  values,
  picked,
  label,
  onToggle,
  show = 6,
  numeric = false,
}: {
  title: string;
  values: FacetValue[];
  picked: string[];
  label: (v: string) => string;
  onToggle: (v: string) => void;
  show?: number;
  /** values arrive most common first; list them in number order instead (grain weights) */
  numeric?: boolean;
}) {
  const [all, setAll] = useState(false);
  if (!values.length) return null;
  // keep picked values visible even when the list is collapsed
  let shown = all ? values : values.filter((v, i) => i < show || picked.includes(v.value));
  if (numeric) shown = [...shown].sort((a, b) => Number(a.value) - Number(b.value));
  return (
    <fieldset className="fgroup">
      <legend>{title}</legend>
      <ul className="checks">
        {shown.map((v) => (
          <li key={v.value}>
            <label>
              <input type="checkbox" checked={picked.includes(v.value)} onChange={() => onToggle(v.value)} />
              <span className="check-label">{label(v.value)}</span>
              <span className="check-count">{v.count}</span>
            </label>
          </li>
        ))}
      </ul>
      {values.length > show && (
        <button type="button" className="link-btn" onClick={() => setAll((a) => !a)}>
          {all ? 'Show fewer' : `Show all ${values.length}`}
        </button>
      )}
    </fieldset>
  );
}

export function Filters({ facets, storeNames, value, onChange, onClear, state, onState }: Props) {
  const toggle = (key: ListKey) => (v: string) => {
    const cur = value[key];
    onChange({ [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } as Partial<FilterState>);
  };

  return (
    <div className="filters">
      <fieldset className="fgroup">
        <legend>Ship to</legend>
        <select id="ship-state" value={state} onChange={(e) => onState(e.target.value)} aria-label="State to ship to">
          <option value="">Any state</option>
          {STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <p className="fhint">Stores that won't ship ammo to your state drop out.</p>
      </fieldset>

      <fieldset className="fgroup">
        <legend>Show</legend>
        <label className="switch">
          <input type="checkbox" checked={value.shippingKnown} onChange={(e) => onChange({ shippingKnown: e.target.checked })} />
          Only prices with shipping counted
        </label>
        <label className="switch">
          <input type="checkbox" checked={value.stock === 'all'} onChange={(e) => onChange({ stock: e.target.checked ? 'all' : 'in' })} />
          Include out of stock
        </label>
      </fieldset>

      <Checklist title="Brand" values={facets.brand} picked={value.brand} label={(v) => v} onToggle={toggle('brand')} />
      <Checklist title="Bullet" values={facets.bullet} picked={value.bullet} label={(v) => bulletName(v) ?? v} onToggle={toggle('bullet')} />
      <Checklist
        title="Grain"
        values={facets.grain}
        picked={value.grain}
        label={(v) => `${v} gr`}
        onToggle={toggle('grain')}
        show={8}
        numeric
      />
      <Checklist title="Casing" values={facets.casing} picked={value.casing} label={(v) => casingName(v) ?? v} onToggle={toggle('casing')} />
      <Checklist
        title="Condition"
        values={facets.condition}
        picked={value.condition}
        label={conditionName}
        onToggle={toggle('condition')}
      />
      <Checklist title="Store" values={facets.retailer} picked={value.store} label={(v) => storeNames[v] ?? v} onToggle={toggle('store')} />

      <fieldset className="fgroup">
        <legend>Words in the listing</legend>
        <label className="field">
          <span>Must include</span>
          <input id="f-match" type="text" value={value.match} placeholder="like subsonic" onChange={(e) => onChange({ match: e.target.value })} />
        </label>
        <label className="field">
          <span>Leave out</span>
          <input id="f-exclude" type="text" value={value.exclude} placeholder="like steel" onChange={(e) => onChange({ exclude: e.target.value })} />
        </label>
      </fieldset>

      {activeCount(value) > 0 && (
        <button type="button" className="btn btn-quiet btn-block" onClick={onClear}>
          Clear filters
        </button>
      )}
    </div>
  );
}
