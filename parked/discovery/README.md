# Discovery — PARKED (do not ship)

**Status:** Parked on 2026-06-14. Removed from the live app, kept here for later.
**Do not wire this back into the build until explicitly asked.**

## Why it's parked
The feature shipped too early. Before reviving it we want to:
1. Get better underlying **data** (the screener feed has placeholder prices, and
   `patGrowth5Y` / `promoterHolding` come back as 0 for most names).
2. Strengthen the **valuation** logic so the ideas are trustworthy.
3. Make the output **easier for a non-expert user to understand** (plain-English,
   less analyst jargon, clearer "why this matters to me").

## What was removed from the live app
All references were stripped from `src/app/page.tsx`:
- `DiscoveryView` import
- `'discovery'` member of the `ActiveView` type
- the `discovery` entry in `NAV_ITEMS`
- the header "Discovery" pill button
- the home-screen "Discovery" hero card
- the `activeView === 'discovery'` render branch
- `'discovery'` in the `['watchlist','portfolio',...]` guard near the search-empty state
- the now-unused `Radar` icon import

`parked/` is added to `tsconfig.json` `exclude`, so nothing in this folder is
compiled or linted by the production build.

## What lives here
| File | Original location |
|------|-------------------|
| `DiscoveryView.tsx` | `src/components/DiscoveryView.tsx` |
| `api-discovery/route.ts` | `src/app/api/discovery/route.ts` |
| `api-discovery/discovery_data.json` | `src/app/api/discovery/discovery_data.json` |

## How to restore later
1. `git mv parked/discovery/DiscoveryView.tsx src/components/DiscoveryView.tsx`
2. `git mv parked/discovery/api-discovery src/app/api/discovery`
3. Re-add the references in `src/app/page.tsx` listed above (re-import `Radar`).
4. Remove `"parked"` from `tsconfig.json` `exclude`.
5. Re-enable the daily research scheduled task (it was turned off when parking).

## Related
The `robu-discovery-daily-research` scheduled task fed `discovery_data.json`.
It was disabled when this feature was parked — re-enable it only when the
feature comes back.
