const AMOUNTS = [50, 100, 250, 500, 1000, 2000];

/** How many rounds the shopper is buying. Box counts, shipping and price per round are all worked out for it. */
export function WantSelect({ want, onChange }: { want: number; onChange: (n: number) => void }) {
  const amounts = AMOUNTS.includes(want) ? AMOUNTS : [...AMOUNTS, want].sort((a, b) => a - b);
  return (
    <label className="want">
      <span className="want-label">Buying</span>
      <select id="want" value={want} onChange={(e) => onChange(Number(e.target.value))}>
        {amounts.map((n) => (
          <option key={n} value={n}>
            {n.toLocaleString('en-US')} rounds
          </option>
        ))}
      </select>
    </label>
  );
}
