import { useEffect, useRef, useState } from 'react';
import type { FacetValue, SearchResult } from '@perround/shared';
import { bulletName, casingName, conditionName, count } from '../format.ts';
import { STATES } from '../prefs.ts';

export const LIST_KEYS = ['bullet', 'casing', 'grain', 'brand', 'condition', 'store'] as const;
type ListKey = (typeof LIST_KEYS)[number];

export type FilterState = Record<ListKey, string[]> & { soldOut: boolean };

export function readFilters(sp: URLSearchParams): FilterState {
  const f = { soldOut: sp.get('soldout') === '1' } as FilterState;
  for (const k of LIST_KEYS) f[k] = sp.get(k)?.split(',').filter(Boolean) ?? [];
  return f;
}

export function writeFilters(f: FilterState): URLSearchParams {
  const q = new URLSearchParams();
  for (const k of LIST_KEYS) if (f[k].length) q.set(k, f[k].join(','));
  if (f.soldOut) q.set('soldout', '1');
  return q;
}

export const pickedCount = (f: FilterState) => LIST_KEYS.reduce((n, k) => n + f[k].length, 0);

/** How each picked value reads on a chip. */
export function filterLabel(key: ListKey, v: string, storeNames: Record<string, string>): string {
  if (key === 'bullet') return bulletName(v) ?? v;
  if (key === 'casing') return `${casingName(v)} case`;
  if (key === 'grain') return `${v} gr`;
  if (key === 'condition') return conditionName(v);
  if (key === 'store') return storeNames[v] ?? v;
  return v;
}

function ChipGroup({
  title,
  values,
  picked,
  label,
  onToggle,
  show = 99,
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
  // one choice isn't a choice
  if (values.length < 2 && !picked.length) return null;
  let shown = all ? values : values.filter((v, i) => i < show || picked.includes(v.value));
  if (numeric) shown = [...shown].sort((a, b) => Number(a.value) - Number(b.value));
  return (
    <section className="fgroup">
      <h3 className="fgroup-title">{title}</h3>
      <div className="chips">
        {shown.map((v) => (
          <button key={v.value} type="button" className="chip" aria-pressed={picked.includes(v.value)} onClick={() => onToggle(v.value)}>
            {label(v.value)}
          </button>
        ))}
        {values.length > show && (
          <button type="button" className="chip chip-more" onClick={() => setAll((a) => !a)}>
            {all ? 'Fewer' : `All ${values.length}`}
          </button>
        )}
      </div>
    </section>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  facets: SearchResult['facets'];
  storeNames: Record<string, string>;
  value: FilterState;
  onChange: (next: FilterState) => void;
  state: string;
  onState: (s: string) => void;
  total: number;
  shotgun: boolean;
}

export function FilterSheet({ open, onClose, facets, storeNames, value, onChange, state, onState, total, shotgun }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const toggle = (key: ListKey) => (v: string) => {
    const cur = value[key];
    onChange({ ...value, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };
  const label = (key: ListKey) => (v: string) => filterLabel(key, v, storeNames);
  const clear = () => {
    onChange({ ...value, ...Object.fromEntries(LIST_KEYS.map((k) => [k, []])) });
    onState('');
  };

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="sheet-title"
      onClose={onClose}
      onClick={(e) => {
        // a tap on the dimmed backdrop lands on the dialog itself
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet-in">
        <header className="sheet-head">
          <h2 id="sheet-title">Filters</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="m4 4 8 8M12 4l-8 8" />
            </svg>
          </button>
        </header>

        <div className="sheet-body">
          <section className="fgroup">
            <h3 className="fgroup-title">Ship to</h3>
            <select id="ship-state" value={state} onChange={(e) => onState(e.target.value)} aria-label="State to ship to">
              <option value="">Any state</option>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <p className="hint">Stores that won't ship ammo to your state drop out.</p>
          </section>
          <ChipGroup title={shotgun ? 'Type' : 'Bullet'} values={facets.bullet} picked={value.bullet} label={label('bullet')} onToggle={toggle('bullet')} />
          <ChipGroup title="Case" values={facets.casing} picked={value.casing} label={label('casing')} onToggle={toggle('casing')} />
          <ChipGroup title="Grain" values={facets.grain} picked={value.grain} label={label('grain')} onToggle={toggle('grain')} show={10} numeric />
          <ChipGroup title="Brand" values={facets.brand} picked={value.brand} label={label('brand')} onToggle={toggle('brand')} show={12} />
          <ChipGroup title="Condition" values={facets.condition} picked={value.condition} label={label('condition')} onToggle={toggle('condition')} />
          <ChipGroup title="Store" values={facets.retailer} picked={value.store} label={label('store')} onToggle={toggle('store')} />
        </div>

        <footer className="sheet-foot">
          <button type="button" className="btn btn-quiet" onClick={clear} disabled={!pickedCount(value) && !state}>
            Clear all
          </button>
          <button type="button" className="btn btn-go" onClick={onClose}>
            Show {count(total)} {total === 1 ? 'load' : 'loads'}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
