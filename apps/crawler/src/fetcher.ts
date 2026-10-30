// A deliberately slow, well-mannered HTTP client: one request at a time per store,
// at least MIN_GAP_MS apart (longer if robots.txt asks), honest User-Agent, and it
// gives up on a store that blocks us instead of trying to get around it.

export const USER_AGENT = 'PerRoundBot/0.1 (ammo price comparison; honors robots.txt)';
const MIN_GAP_MS = 1500;
const TIMEOUT_MS = 30_000;

export class Blocked extends Error {}

interface Rules {
  allow: string[];
  disallow: string[];
  delayMs: number;
}

const rulesByHost = new Map<string, Rules>();
const nextAtByHost = new Map<string, number>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseRobots(txt: string): Rules {
  // keep the group for our bot if there is one, otherwise the "*" group
  const groups: { agents: string[]; lines: [string, string][] }[] = [];
  let cur: (typeof groups)[number] | undefined;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1]!.toLowerCase();
    const val = m[2]!.trim();
    if (key === 'user-agent') {
      if (!cur || !lastWasAgent) groups.push((cur = { agents: [], lines: [] }));
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      cur?.lines.push([key, val]);
    }
  }
  const pick = groups.find((g) => g.agents.some((a) => a.startsWith('perroundbot'))) ?? groups.find((g) => g.agents.includes('*'));
  const rules: Rules = { allow: [], disallow: [], delayMs: 0 };
  for (const [k, v] of pick?.lines ?? []) {
    if (k === 'allow' && v) rules.allow.push(v);
    if (k === 'disallow' && v) rules.disallow.push(v);
    if (k === 'crawl-delay' && Number(v) > 0) rules.delayMs = Math.min(Number(v), 60) * 1000;
  }
  return rules;
}

function patternMatches(pattern: string, path: string): number {
  const re = new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
  return re.test(path) ? pattern.length : -1;
}

export function allowedBy(rules: Rules, pathAndQuery: string): boolean {
  const best = (list: string[]) => Math.max(-1, ...list.map((p) => patternMatches(p, pathAndQuery)));
  const allow = best(rules.allow);
  const disallow = best(rules.disallow);
  return disallow < 0 || allow >= disallow;
}

async function rawFetch(url: string, accept: string): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: accept }, signal: ctrl.signal, redirect: 'follow' });
  } finally {
    clearTimeout(t);
  }
}

async function rulesFor(origin: string): Promise<Rules> {
  const host = new URL(origin).host;
  const known = rulesByHost.get(host);
  if (known) return known;
  let rules: Rules = { allow: [], disallow: [], delayMs: 0 };
  try {
    const res = await rawFetch(`${origin}/robots.txt`, 'text/plain');
    if (res.status === 401 || res.status === 403) throw new Blocked(`${host} refused robots.txt (${res.status})`);
    if (res.ok) rules = parseRobots(await res.text());
  } catch (e) {
    if (e instanceof Blocked) throw e;
    // no robots.txt (or it timed out) means no stated limits; we still keep our own pace
  }
  rulesByHost.set(host, rules);
  nextAtByHost.set(host, Date.now() + MIN_GAP_MS);
  return rules;
}

export interface Fetched<T> {
  data: T;
  headers: Headers;
}

/** GET a JSON document from a store, waiting our turn and obeying robots.txt. */
export async function politeJson<T>(url: string): Promise<Fetched<T>> {
  const u = new URL(url);
  const rules = await rulesFor(u.origin);
  if (!allowedBy(rules, u.pathname + u.search)) throw new Blocked(`robots.txt disallows ${u.pathname}`);
  const gap = Math.max(MIN_GAP_MS, rules.delayMs);

  for (let attempt = 0; ; attempt++) {
    const wait = (nextAtByHost.get(u.host) ?? 0) - Date.now();
    if (wait > 0) await sleep(wait);
    nextAtByHost.set(u.host, Date.now() + gap);

    const res = await rawFetch(url, 'application/json');
    if (res.status === 401 || res.status === 403) throw new Blocked(`${u.host} refused us (${res.status})`);
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      const retryAfter = Number(res.headers.get('retry-after')) || 0;
      await sleep(Math.max(retryAfter * 1000, gap * 4 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} from ${u.host}${u.pathname}`);
    const text = await res.text();
    if (/^\s*</.test(text)) throw new Blocked(`${u.host} answered with a web page instead of data (likely a bot check)`);
    return { data: JSON.parse(text) as T, headers: res.headers };
  }
}
