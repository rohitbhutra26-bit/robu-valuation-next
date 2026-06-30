// Tiny client-side GET memoizer: dedupes identical fetches across components within a
// short window and shares in-flight promises, so /quarterly & /announcements aren't
// re-fetched 3-4× per page by QuarterlyFlash, EarningsFlash, StoryPotentialCard, etc.
const _cache = new Map<string, { ts: number; data: unknown }>();
const _inflight = new Map<string, Promise<unknown>>();
const TTL = 60_000; // 1 min

export async function cachedJson<T = unknown>(url: string): Promise<T | null> {
  const hit = _cache.get(url);
  if (hit && Date.now() - hit.ts < TTL) return hit.data as T;
  const live = _inflight.get(url);
  if (live) return live as Promise<T>;
  const pr = fetch(url)
    .then(async (r) => {
      const data = r.ok ? await r.json() : null;
      _cache.set(url, { ts: Date.now(), data });
      _inflight.delete(url);
      return data;
    })
    .catch((e) => { _inflight.delete(url); throw e; });
  _inflight.set(url, pr);
  return pr as Promise<T>;
}
