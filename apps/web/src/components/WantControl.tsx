import { useEffect, useState } from 'react';

const PRESETS = [50, 250, 500, 1000, 2000];

/** "Buying about N rounds": prices, box counts and free shipping are all worked out for this amount. */
export function WantControl({ want, onChange }: { want: number; onChange: (n: number) => void }) {
  const [custom, setCustom] = useState(PRESETS.includes(want) ? '' : String(want));
  useEffect(() => {
    if (PRESETS.includes(want)) setCustom('');
  }, [want]);

  return (
    <fieldset className="want">
      <legend>Buying about</legend>
      <div className="want-row">
        {PRESETS.map((n) => (
          <button key={n} type="button" className="chip" aria-pressed={want === n} onClick={() => onChange(n)}>
            {n.toLocaleString('en-US')}
          </button>
        ))}
        <label className="want-custom">
          <span className="visually-hidden">Other amount</span>
          <input
            id="want-custom"
            inputMode="numeric"
            placeholder="Other"
            value={custom}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCustom(v);
              const n = Number(v);
              if (n > 0) onChange(n);
            }}
          />
        </label>
        <span className="want-unit">rounds</span>
      </div>
    </fieldset>
  );
}
