# Prematch Feed Foundation

Date: 2026-07-14

## Scope

This issue adds the read-only foundation for the active prematch feed. It does not replace any sport UI, wire betslip selections, book tickets, place bets, or begin live betting.

## Source Split

| Area | Source |
|---|---|
| Active prematch matches and odds | `GET https://api-games.smbet.net/` |
| Authentication, account, booking, placement, validation, payments | BetSoftware.WebUI |

The active feed client is intentionally separate from the WebUI API client. It does not apply the WebUI `/api` prefix and does not send cookies or credentials.

## Environment

```text
NEXT_PUBLIC_MATCHES_API_BASE_URL=https://api-games.smbet.net
```

If the variable is omitted, the app defaults to `https://api-games.smbet.net`.

## Implemented Modules

| File | Purpose |
|---|---|
| `src/api/activeMatchesApiClient.ts` | Non-credentialed Axios client for the active feed |
| `src/api/activeMatchesApi.ts` | `getActiveMatches(signal?)` wrapper |
| `src/types/activeMatchesDtos.ts` | Backend DTOs matching the active service casing |
| `src/types/activeMatchesViewModels.ts` | UI-safe active match and odd view models |
| `src/adapters/activeMatchesAdapters.ts` | DTO validation and mapping into view models |
| `src/matches/ActiveMatchesProvider.tsx` | Client provider for loading and refreshing the feed |
| `src/matches/useActiveMatches.ts` | Hook for future consumers |
| `src/matches/activeMatchesTypes.ts` | Provider context type |
| `src/matches/activeMatchesSelectors.ts` | League, headline-odds, lookup, and market grouping selectors |

## Provider Behavior

- Loads once on mount.
- Refreshes every 5 minutes, matching `Cache-Control: public, max-age=300`.
- Does not refresh more frequently than once per minute.
- Skips background refresh while the document is hidden.
- Refreshes on visibility if the last successful fetch is older than 5 minutes.
- Avoids overlapping requests.
- Cancels the active request on unmount.
- Preserves existing data during background refresh.
- Uses initial loading only when no feed data exists yet.
- Does not use local storage, Redux, Zustand, React Query, or new packages.

## Selection Identity

The foundation preserves `MatchOddId` for diagnostics and traceability, but it is not the frontend selection key.

Current selection identity:

```text
OriginalMatchId|BetCategory|BetOption|Line|BookMakerId
```

`OriginalMatchId` remains the critical identifier that must later align with WebUI `Matches.BetServiceMatchNo` before booking or placement can be enabled.

## Selectors

- `groupMatchesByLeague(matches)` groups the feed by active feed `League`.
- `getUniqueLeagues(matches)` returns first-seen unique league names.
- `getHeadlineOdds(match)` returns full-time `1x2` odds in `1`, `X`, `2` order.
- `findMatchByOriginalMatchId(matches, originalMatchId)` finds a fixture by active feed source id.
- `getMarketsForMatch(match)` groups odds by `BetCategory` and `Line`, so line markets such as `OU 2.5` and `OU 3.5` stay separate.

## Runtime Contract

Runtime verification confirmed direct browser-like GET works without credentials:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Credentials` absent
- allowed methods from OPTIONS: `GET,HEAD,OPTIONS`
- gzip compression
- `Cache-Control: public, max-age=300`
- last measured payload: 126 matches, 31,096 odds, about 4.7 MB decoded and 323 KB gzip

Full evidence is in `docs/ACTIVE_MATCHES_RUNTIME_VERIFICATION.md`.

## Deferred

- Replacing static sport pages with active-feed data.
- Sports navigation reconciliation.
- Betslip selection store.
- Booking and bet placement.
- WebUI validation handling for changed odds and started matches.
- Live betting and socket integration.
- Any session, account, payment, or ticket-history work.
