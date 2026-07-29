# Active Matches Runtime Verification

Date: 2026-07-14

Service verified:

```text
https://api-games.smbet.net/
```

Scope:

- Runtime verification and documentation only.
- No UI, API-client, backend, package, migration, service, or database writes.
- WebUI remains authoritative for booking, bet placement, account rules, and validation.

## Commands Used

Browser-like GET header check:

```powershell
Invoke-WebRequest `
  -Uri 'https://api-games.smbet.net/' `
  -Headers @{
    Origin='http://localhost:3000'
    Accept='application/json,text/plain,*/*'
    'User-Agent'='Mozilla/5.0 SmartBetUI-runtime-verification'
  } `
  -UseBasicParsing `
  -TimeoutSec 60
```

CORS preflight-style OPTIONS check:

```powershell
Invoke-WebRequest `
  -Uri 'https://api-games.smbet.net/' `
  -Method Options `
  -Headers @{
    Origin='http://localhost:3000'
    'Access-Control-Request-Method'='GET'
    'Access-Control-Request-Headers'='content-type'
    'User-Agent'='Mozilla/5.0 SmartBetUI-runtime-verification'
  } `
  -UseBasicParsing `
  -TimeoutSec 30
```

Raw compressed transfer-size check:

```powershell
curl.exe --raw -sS `
  -D <temp-headers-file> `
  -o <temp-body-file> `
  -H "Origin: http://localhost:3000" `
  -H "Accept: application/json,text/plain,*/*" `
  -H "Accept-Encoding: gzip" `
  -H "User-Agent: Mozilla/5.0 SmartBetUI-runtime-verification" `
  https://api-games.smbet.net/
```

Payload analysis used Node 20 built-in `fetch`; no packages were installed. WebUI database checks used the existing WebUI `BetConnection` connection string in memory only and executed read-only `SELECT` statements. Secret connection-string values are intentionally not reproduced here.

## CORS Result

Confirmed GET response with `Origin: http://localhost:3000`:

| Header / property | Runtime value |
|---|---|
| HTTP status | `200` |
| `Access-Control-Allow-Origin` | `*` |
| `Access-Control-Allow-Credentials` | absent |
| `Access-Control-Allow-Methods` | absent on GET |
| `Cache-Control` | `public, max-age=300` |
| `Content-Encoding` | `gzip` |
| `Content-Type` | absent in captured PowerShell/Node headers |
| `Vary` | absent |
| `ETag` | absent |
| `Last-Modified` | absent |

Confirmed OPTIONS response:

| Header / property | Runtime value |
|---|---|
| HTTP status | `200` |
| `Access-Control-Allow-Origin` | `*` |
| `Access-Control-Allow-Credentials` | absent |
| `Access-Control-Allow-Methods` | `GET,HEAD,OPTIONS` |
| `Access-Control-Allow-Headers` | `content-type` |
| `Cache-Control` | `no-store` |
| Body | `GET,HEAD` |

Conclusion:

- A browser frontend at `localhost:3000` can call `GET https://api-games.smbet.net/` directly without credentials.
- Credentialed browser calls are not supported by this CORS shape because `Access-Control-Allow-Origin: *` is not valid with credentials and `Access-Control-Allow-Credentials` is absent.
- This matches the older frontend's service client, which does not configure `withCredentials`.

## Response Metrics

Runtime snapshot checked at `2026-07-14T12:22:35.848Z`.

| Metric | Value |
|---|---:|
| HTTP status | `200` |
| GET elapsed time | `2613 ms` |
| Decompressed JSON size | `4,697,827 bytes` |
| Raw gzip transfer size | `322,921 bytes` |
| Match count | `126` |
| Total odds count | `31,096` |
| Largest `MatchOdds` array | `304` |
| Largest `MatchOdds` match | `OriginalMatchId = 9641015` |
| Duplicate `MatchNo` values | `0` |
| Duplicate `OriginalMatchId` values | `0` |
| Duplicate `MatchOddId` values | `0` |
| Malformed required match fields | `0` |
| Malformed required odd fields | `0` |
| Matches with parsed `StartTime` before current time | `0` |
| `LastUpdateTime` values parsed | `31,096` |
| Average `LastUpdateTime` age | `25.23 minutes` |
| Minimum `LastUpdateTime` age | `24.58 minutes` |
| Maximum `LastUpdateTime` age | `35.58 minutes` |
| Odds older than 15 minutes | `31,096` |
| Odds older than 60 minutes | `0` |
| Odds older than 24 hours | `0` |
| Earliest parsed `StartTime` | `2026-07-14T13:00:00.000Z` |
| Latest parsed `StartTime` | `2026-07-15T00:00:00.000Z` |

The service returns timestamp strings without an explicit timezone offset, for example `StartTime: "2026-07-14T17:00:00"` and `LastUpdateTime: "2026-07-14T14:57:01"`. Freshness calculations were made using JavaScript's local-time parsing in the runtime environment, matching the older frontend's browser-style parsing approach.

## Response Shape Confirmation

The runtime response confirms the active match DTO shape used by the older frontend:

```ts
type ActiveMatchDto = {
  MatchNo: number;
  IsJackPot: boolean;
  League: string;
  StartTime: string;
  GameStatus: string;
  OriginalMatchId: number;
  AwayTeamName: string;
  HomeTeamName: string;
  MatchOdds: ActiveOddDto[];
};

type ActiveOddDto = {
  BetCategory: string;
  BetOption: string;
  Line: string | null;
  BookMakerId: number;
  LastUpdateTime: string;
  MatchOddId: number;
  Odd: number;
  row: number;
};
```

Observed sample values included:

- `GameStatus: "Not Started"`
- `BookMakerId` values such as `105` and `17`
- `BetCategory` values such as `1x2`, `1x2_H1`, `BTS`, `CS`, `OU`, `OU_H1`, `OU_H2`, and `RTG`
- `Line` as `null` for non-line markets and strings such as `"2.5"` for totals

## Identifier Compatibility

Source-code contract evidence:

- WebUI `Match.BetServiceMatchNo` is the match key used by controllers/services.
- WebUI `MatchOdd.MatchOddId` is the odd-row key.
- Active feed `OriginalMatchId` is sent by the older frontend as WebUI `BetViewModel.MatchId`.
- Active feed `MatchOddId` is sent by the older frontend as WebUI `BetViewModel.MatchOddId`.
- Older source preserved `MatchOddId` for ticket payloads; the new read-only foundation preserves it only for traceability until betting contracts are revisited.
- WebUI validates prematch `MatchId` against `Matches.BetServiceMatchNo` and current `ShortMatchCodes` set membership.

Runtime DB check:

| Check | Result |
|---|---:|
| Active snapshot distinct `OriginalMatchId` values checked | `126` |
| Matching rows found in configured WebUI `dbo.Matches.BetServiceMatchNo` | `0` |
| Active snapshot distinct `MatchOddId` values checked | `31,091` |
| Matching rows found in configured WebUI `dbo.MatchOdds.MatchOddId` | `0` |

Conclusion:

- The source-code contract requires `OriginalMatchId == Matches.BetServiceMatchNo`.
- `MatchOddId` remains useful diagnostic/traceability data, but the current read-only foundation does not treat it as the critical frontend betting identifier.
- In this environment, the accessible WebUI database did not contain the live active-service IDs.
- Therefore runtime `OriginalMatchId` compatibility is not confirmed against the configured WebUI database.
- The most likely explanations are environment mismatch, stale/non-operational database configuration for this checkout, or the active service pointing at a different operational database.

Mapping table:

| Active feed field | WebUI field | Confirmed same? | Evidence | Risk |
|---|---|---|---|---|
| `OriginalMatchId` | `Matches.BetServiceMatchNo` / `BetViewModel.MatchId` | Source yes; runtime DB no | Older frontend sends `OriginalMatchId` as `matchId`; WebUI validates `BetServiceMatchNo`; DB found `0/126` live ids | Prematch booking/placement will fail if environments are mismatched |
| `MatchOddId` | `MatchOdds.MatchOddId` / older `BetViewModel.MatchOddId` | Diagnostic only for the new foundation; runtime DB no | Older frontend sends `MatchOddId`; DB found `0/31,091` live ids | Preserve for traceability, but absence in checked DB does not block read-only browsing or betslip modeling |
| `MatchNo` | `ShortMatchCodes.ShortCode` or display number depending endpoint | No | Older frontend carries it as `matchNo`; WebUI validation does not use it as `MatchId` | Must not be substituted for `OriginalMatchId` |
| `BookMakerId` | `MatchOdds.BookMakerId` / `BetViewModel.BookMakerId` | Source yes; runtime not confirmed | Active feed supplies it; WebUI current-odd cache key uses bookmaker | Preserve it, but do not rely on it to fix mismatched odd ids |
| `BetCategory` | `MatchOdds.Market` / `BetViewModel.BetCategory` | Source yes; runtime not confirmed | WebUI fallback lookup uses market/category | Required for fallback and validation |
| `BetOption` | `MatchOdds.Option` / `BetViewModel.BetOption` | Source yes; runtime not confirmed | WebUI fallback lookup uses option | Required |
| `Line` | `MatchOdds.Line` / `BetViewModel.Line` | Source yes; runtime not confirmed | WebUI fallback lookup uses line | Required for line markets |
| `Odd` | `MatchOdds.Odd` / `BetViewModel.Odd` | Source yes; runtime not confirmed | WebUI changed-odds query compares posted odd to current odd | Revalidated server-side |

## Booking Compatibility

Older frontend path:

1. Active service returns match and odd.
2. UI selection builds a betslip event:
   - `matchId: OriginalMatchId`
   - `matchOddId: MatchOddId`
   - `bookMakerId: BookMakerId`
   - `market: BetCategory`
   - `option: BetOption`
   - `line: Line`
   - `odd: Odd`
   - `matchNo: MatchNo`
   - team names for display
3. `createTicketPayload()` maps betslip events to `betData`.
4. Booking posts to `POST /api/Ticket/Booking`.

Booking payload fields sent:

```ts
{
  betData: [{
    betCategory,
    betOption,
    bookMakerId,
    line,
    matchId,
    matchOddId,
    MatchOddId,
    odd,
    IsLive
  }],
  totalBonus,
  totalOdds,
  totalStake,
  isLive
}
```

WebUI fields validating them:

- `BetViewModel.MatchId`
- `BetViewModel.MatchOddId`
- `BetViewModel.BetCategory`
- `BetViewModel.BetOption`
- `BetViewModel.BookMakerId`
- `BetViewModel.Line`
- `BetViewModel.Odd`
- `CreateReceiptViewModel.TotalStake`
- `CreateReceiptViewModel.IsLive`

Runtime conclusion:

- Payload shape is compatible with WebUI source contracts.
- Runtime ID compatibility is not confirmed because the configured WebUI database did not contain the active-service IDs.

## Bet Placement Compatibility

Older frontend path:

1. Active feed selection creates the same betslip event described above.
2. `saveBets()` validates stake and selected bets client-side.
3. `createTicketPayload()` maps to WebUI `CreateReceiptViewModel`.
4. Placement posts to `POST /api/Ticket`.
5. WebUI revalidates account/branch/stake, current set/status, started matches, and changed odds.

Source of each field:

| WebUI request field | Source |
|---|---|
| `matchId` | active `OriginalMatchId` |
| `matchOddId` / `MatchOddId` | active odd `MatchOddId` |
| `odd` | active odd `Odd` |
| `betCategory` | active odd `BetCategory` |
| `betOption` | active odd `BetOption` |
| `line` | active odd `Line` |
| `bookMakerId` | active odd `BookMakerId` |
| `IsLive` | frontend prematch default `false` |

WebUI-side revalidation:

- Checks `MatchId` in `Matches.BetServiceMatchNo`.
- Checks current set membership via `ShortMatchCodes.MatchNo`.
- Checks match `Status == 1`.
- Looks up current odd by `MatchOddId`.
- Falls back to `BetServiceMatchNo + Line + Market + Option` if current-odd lookup by `MatchOddId` returns null.
- Returns changed-odds and started-match errors that the older frontend handles.

Runtime conclusion:

- Placement payload shape is source-compatible.
- Placement cannot be considered runtime-safe until active-service IDs are confirmed against the same WebUI database used by the target environment.

## Freshness Evaluation

Confirmed runtime cache/freshness facts:

- Service response advertises `Cache-Control: public, max-age=300`.
- Runtime `LastUpdateTime` age was roughly 25 to 36 minutes across all odds in the captured snapshot.
- All parsed `StartTime` values were in the future at capture time.
- The older frontend refetches every 15 minutes.
- WebUI revalidates odds and match availability at booking/placement time.

Implications:

- The old 15-minute polling interval is acceptable only because WebUI catches stale selections during booking/placement.
- For browsing UX, 15 minutes is likely too slow if odds are expected to move frequently.
- Because HTTP cache permits 5 minutes of freshness, polling more often than 5 minutes may still return cached data unless the client/server cache path is adjusted.

Recommended initial new UI polling interval:

```text
5 minutes for the active matches feed, respecting Cache-Control: max-age=300.
```

Do not implement polling yet. When UI integration begins, use request cancellation, stale/refresh indicators, and server-validation handling for changed odds and started matches.

## Remaining Risks

- Runtime `OriginalMatchId` compatibility failed against the accessible configured WebUI database.
- The active service may be pointed at a different database than the WebUI checkout available in this environment.
- `Content-Type` was absent in captured headers even though the body is JSON.
- Service timestamps do not include timezone offsets.
- The payload is large: about 4.7 MB decoded for 126 matches.
- Correct-score and broad market arrays can be large; adapters should avoid rendering every market by default.
- Browser calls must be non-credentialed.

## Go / No-Go

Prematch UI Integration should not begin for booking or bet placement until the target WebUI environment is confirmed to contain the same `BetServiceMatchNo` values as `https://api-games.smbet.net/`.

Read-only browsing integration can begin only if product accepts the active service as the display feed and keeps betslip/booking disabled or guarded until ID compatibility is resolved.
