# WebUI Prematch Sports & Fixtures Contracts

Date: 2026-07-20

## 1. Purpose and scope

This document audits the prematch sports, league, fixture, market, selection and odds contracts needed by `SmartBetUI-v2`.

**Confirmed:** This is documentation-only. The only file changed for this issue is this markdown file. No React, TypeScript, backend, mock, routing, styling, package or lockfile changes are part of this task.

## 2. Source-of-truth rules

**Confirmed:** Operational backend source is `C:\Users\hp\source\repos\Bet\Bet\WebUI\BetSoftware.Web.csproj`, solution project `BetSoftware.Web` at `BetSoftWare.sln:21`. `BetSoftware.WebCore` is not evidence for this audit.

**Confirmed:** Older online frontend source is `C:\Users\hp\source\repos\online\online\BET720.Web\app`.

**Confirmed:** New documentation output repository is `C:\Users\hp\source\repos\SmartBetUI-v2`.

**Confirmed:** The active matches base URL for the new frontend is `NEXT_PUBLIC_MATCHES_API_BASE_URL=https://api-games.smbet.net`; `src/config/env.ts:1-2` has the same value as the current default, and `src/config/env.ts:38-49` exposes it through `matchesApiConfig`.

## Active matches generated-file architecture

**Confirmed:** No inspected `BetSoftware.WebUI` source or config reference to `api-games.smbet.net` or `api-games` was found. Targeted searches covered `WebUI\Controllers`, `WebUI\App_Start`, `WebUI\Helpers`, `WebUI\Scripts\app\src`, `WebUI\Scripts\Online`, `BetSoftware.Services`, `BetSoftware.Repositories`, `BetSoftware.DataAccessLayer`, and `BetSoftware.Domain`.

**Confirmed:** WebUI does not call or proxy `https://api-games.smbet.net` in the inspected source. Its audited prematch endpoints read local WebUI data through Entity Framework/SQL over `Matches`, `MatchOdds`, `ShortMatchCodes`, `Leagues`, and related views/tables. Examples include `GetTopMatches` reading `_db.ShortMatchCodes` and `s.Match.MatchOdds` at `WebUI\Controllers\Api\ApiMatchesController.cs:123-150`, `GetMatchDetails` reading `_db.MatchOdds` at `ApiMatchesController.cs:261-270`, and receipt validation reading `_db.MatchOdds`, `_db.Matches`, and `_db.ShortMatchCodes` at `BetSoftware.Services\ICreateReceiptService.cs:113-150` and `ICreateReceiptService.cs:1348-1369`.

**Confirmed:** The located older frontend receives its odds-service URL from its own `/api/Config` endpoint: `BET720.Web\app\src\main.tsx:44-49` calls `get_config()` and `set_service_url(config.service_url)`. That config endpoint maps `config.ServiceUrl = _setUp.OddsUrl` at `BET720.Web\Controllers\ApiConfigController.cs:20-32`; local source currently sets `_setUp.OddsUrl = "https://api-games-dev.smbet.net"` at `BET720.Web\Program.cs:53-58`.

**Confirmed:** `SmartBetUI-v2` active browsing is configured separately via `NEXT_PUBLIC_MATCHES_API_BASE_URL=https://api-games.smbet.net`; `.env.example:6`, `src/config/env.ts:1-2`, and `src/config/env.ts:38-49`.

**Confirmed by system owner:** `api-games.smbet.net` is not an independent or competing source of match truth. Loading a large number of prematch games directly through `BetSoftware.WebUI` was slow and resource-heavy, so a separate generator/export service was created. That service obtains games from the same underlying authoritative BetSoftware data source used by WebUI, generates and stores the prematch games in a separate file, and `https://api-games.smbet.net` reads and serves that generated file as a read-optimized distribution/cache layer.

**Unresolved:** The generator/export service implementation and generated file schema were not available in the inspected repositories. They should be traced separately when local source is available. The HTTP delivery endpoint must not be described as implemented by a WebUI controller, but its payload fields must be reconciled with the same source entities and WebUI operational identifiers.

Architecture:

```text
Authoritative BetSoftware data/database
    -> WebUI operational endpoints
    -> prematch generator/export service
    -> generated games file
    -> api-games.smbet.net
    -> frontend
```

Authority boundaries:

| Boundary | Authoritative source | Evidence | Notes |
|---|---|---|---|
| Authoritative data source | Operational BetSoftware data/database used by WebUI and generator/export service | Owner clarification plus WebUI source references to `Matches`, `MatchOdds`, and `ShortMatchCodes` | Same underlying source feeds both paths |
| Contract authority | WebUI controller code, DTOs, and service validation | `ApiMatchesController` endpoints and `ICreateReceiptService` validation | Authoritative for identifiers, status, odds validation, and betting behavior |
| Bulk fixture delivery path | Generator/export service -> generated games file -> `api-games.smbet.net` | Owner clarification; frontend transport source references | Read-optimized cache/distribution layer, not a separate truth source |
| Frontend transport | Generated-file service `GET /` at `NEXT_PUBLIC_MATCHES_API_BASE_URL` | Old `get_games()` calls service root at `BET720.Web\app\src\api.ts:149-153`; new `activeMatchesApi.getActiveMatches()` calls `GET "/"` at `src/api/activeMatchesApi.ts:5-11` | Efficient fixture browsing payload |
| Operational match record | WebUI database `Matches` and `ShortMatchCodes` | `Match.BetServiceMatchNo` key at `BetSoftware.Domain\Models\Concrete\Match.cs:28-30`; validation query at `ICreateReceiptService.cs:1348-1369` | Used for availability/current-set checks |
| Authoritative betting match identifier | WebUI `BetServiceMatchNo` submitted as `BetViewModel.MatchId` | `MatchSetAndStatusValidator` compares posted `MatchId` to `match.BetServiceMatchNo` at `ICreateReceiptService.cs:1348-1353` | Active `OriginalMatchId` must align before betting is enabled |
| Authoritative odds validation source | WebUI database `MatchOdds` | Current odd lookup by `MatchOddId` and fallback by match/market/option/line at `ICreateReceiptService.cs:109-150` | Browse odds are display/selection inputs, not final authority |

## 3. Investigation methodology

**Confirmed:** Baseline repository state was captured before editing. All three repositories were dirty before this task. The existing untracked `docs/WEBUI_PREMATCH_SPORTS_CONTRACTS.md` was read first and then replaced because it cited a different older frontend path and stale file names. Valid conclusions from it were preserved where the located old app and WebUI code confirmed them.

Evidence was collected from:

- Older frontend API and UI flow: `src/api.ts`, `src/types.ts`, `src/main.tsx`, `src/store.ts`, `src/functions.ts`, `src/components/GamesList.tsx`, `src/components/LeagueGames.tsx`, `src/components/BetCell.tsx`.
- WebUI routes and projections: `WebUI\Controllers\Api\ApiMatchesController.cs`, `WebUI\Helpers\LinqSelectors.cs`, `BetSoftware.Domain\Models\ViewModels\GameViewModel.cs`, `BetSoftware.Domain\Models\Concrete\Match.cs`, `MatchOdd.cs`, `ShortMatchCode.cs`.
- New UI active-match foundation: `src/config/env.ts`, `src/api/activeMatchesApiClient.ts`, `src/api/activeMatchesApi.ts`, `src/types/activeMatchesDtos.ts`, `src/adapters/activeMatchesAdapters.ts`, `src/matches/ActiveMatchesProvider.tsx`.

## 4. Endpoint inventory

| Source | Method | Exact route | Controller/action | Parameters | Response type | Old frontend caller | Authentication | Source references | Status |
|---|---:|---|---|---|---|---|---|---|---|
| Active matches generated-file service | GET | `/` at old `service_url`; new base `https://api-games.smbet.net` | Separate generator/export + generated-file delivery service; not a WebUI controller | none found | Active match array with `MatchOdds` as consumed by frontend | **Confirmed used:** old `get_games()` and bootstrap load | No WebUI cookies; old service branch does not set credentials, new client sets `withCredentials: false` | Old `BET720.Web\app\src\api.ts:110-115`, `api.ts:149-153`, `main.tsx:17-22`; new `src/api/activeMatchesApiClient.ts:7-18`, `src/api/activeMatchesApi.ts:5-11`; owner clarification | **Confirmed optimized delivery endpoint; generator implementation/file schema unresolved locally** |
| WebUI | GET | `/api/Matches/GetSetCount` | `ApiMatchesController.GetMatchesCount()` | none | number | No caller found in located old app | No `[Authorize]` observed on controller/action | `ApiMatchesController.cs:43-49` | **Confirmed WebUI endpoint but no older frontend caller found** |
| WebUI | GET | `/api/Matches/GetHourMatches` | `ApiMatchesController.GetMatchesByHour()` | `int page = 1`, `int pagesize = 100`, `int hour = 0` | `GameViewModel[]` with projected `MatchOdds` | No caller found | No `[Authorize]` observed | `ApiMatchesController.cs:72-102`, `LinqSelectors.cs:35-64` | **Confirmed WebUI endpoint but no older frontend caller found** |
| WebUI | GET | `/api/Matches/GetTopMatches` | `ApiMatchesController.GetTopMatches()` | `int page = 1`, `int pagesize = 10`, `bool includeOdds = true`, `CancellationToken token = default` | `TopMatchCardDto[]` | No caller found in located old app | No `[Authorize]` observed | `ApiMatchesController.cs:107-190`, `GameViewModel.cs:118-132` | **Confirmed WebUI endpoint but no older frontend caller found** |
| WebUI | GET | `/api/Matches/GetSetMatches` | `ApiMatchesController.GetSetMatches()` | `int page = 1`, `int pagesize = 100`, `CancellationToken token = default` | `GameViewModel[]` without nested odds in this implementation | No caller found | No `[Authorize]` observed | `ApiMatchesController.cs:193-255`, `GameViewModel.cs:8-59` | **Confirmed WebUI endpoint but no older frontend caller found** |
| WebUI | GET | `/api/Matches/GetMatchDetails` | `ApiMatchesController.GetMatchDetails()` | `CancellationToken token`, `int matchId = 0` | `GameOddViewModel[]` | No caller found | No `[Authorize]` observed | `ApiMatchesController.cs:258-272`, `GameViewModel.cs:87-98` | **Confirmed WebUI endpoint but no older frontend caller found** |
| WebUI | GET | `/api/Matches/GetMatchByShortCode` | `ApiMatchesController.GetMatchByShortCode()` | `int id` | anonymous array, max 10 rows | No caller found | No `[Authorize]` observed | `ApiMatchesController.cs:275-300` | **Confirmed WebUI endpoint but no older frontend caller found** |
| WebUI | GET | `/api/Matches/GetLeagues` | `ApiMatchesController.GetLeagues()` | none | anonymous `{ LeagueName, LeagueId, Country }[]` | No caller found in located old app | No `[Authorize]` observed | `ApiMatchesController.cs:303-321` | **Confirmed WebUI endpoint but no older frontend caller found** |
| WebUI | GET | `/api/Matches/GetCountriesWithLeagues` | `ApiMatchesController.GetCountries()` | none | anonymous country/league hierarchy | No caller found in located old app | No `[Authorize]` observed | `ApiMatchesController.cs:324-350` | **Confirmed WebUI endpoint but no older frontend caller found** |
| WebUI | GET | `/api/Matches/GetUpdates` | `ApiMatchesController.GetUpdates()` | `CancellationToken token = default` | `GameOddViewModel[]` | No caller found | No `[Authorize]` observed | `ApiMatchesController.cs:353-374`, `GameViewModel.cs:87-98` | **Confirmed WebUI endpoint but no older frontend caller found** |

## 5. Sports/category contract

**Unresolved:** No WebUI prematch sport/category endpoint was confirmed. The audited WebUI contract exposes countries, leagues, matches and odds, but no sport id, sport code, sport icon, sport order or sport filter.

**Confirmed:** The old located frontend treats the browse feed as a match array and groups by league. It does not request a sports tree. See old `src/main.tsx:17-22`, `src/functions.ts:241-263`, and `src/components/GamesList.tsx:47-57`.

**Inferred:** Sports navigation in `SmartBetUI-v2` remains a UI/static-model concern until a real WebUI or active-service sport hierarchy is found.

## 6. Country/region contract

**Confirmed:** WebUI exposes countries with leagues at GET `/api/Matches/GetCountriesWithLeagues`, implemented by `ApiMatchesController.GetCountries()` at `WebUI\Controllers\Api\ApiMatchesController.cs:324-350`.

Usage classification: **Confirmed WebUI endpoint but no older frontend caller found.** The located older frontend searches showed no `GetCountriesWithLeagues` wrapper or request; it groups active-service matches by `League` client-side instead.

Request:

- Method: GET
- Route: `/api/Matches/GetCountriesWithLeagues`
- Parameters: none
- Authentication: no action-level or controller-level `[Authorize]` observed on `ApiMatchesController`.

Response JSON:

| Property name | JSON type | Nullable | Meaning | Source field | Notes |
|---|---:|---|---|---|---|
| `CountryName` | string | possible if DB permits | Country display name | `LeagueGame.Country.CountryName` | Group key |
| `CountryId` | number | possible if league country missing | Country id | `LeagueGame.CountryId` | Group key |
| `Leagues` | array | no | Leagues in country | projection | Built after in-memory group |
| `Leagues[].LeagueId` | number | no | League id | `LeagueGame.LeagueId` | |
| `Leagues[].LeagueName` | string | no | League name | `LeagueGame.LeagueName` | Filter excludes null names |

Filters and limits:

- `StartTime > DateTime.Now`
- `StartTime < now.Date.AddDays(2)`
- `Status == 1`
- `LeagueGame.LeagueName != null`
- `LeagueGame.Rating > 0`
- No explicit pagination.

Source: `ApiMatchesController.cs:327-350`, `GetDates()` at `ApiMatchesController.cs:397-401`.

## 7. League contract

**Confirmed:** WebUI exposes top rated leagues at GET `/api/Matches/GetLeagues`, implemented at `ApiMatchesController.cs:303-321`.

Usage classification: **Confirmed WebUI endpoint but no older frontend caller found.** The located older frontend searches showed no `GetLeagues` wrapper or request.

Request:

- Method: GET
- Route: `/api/Matches/GetLeagues`
- Parameters: none
- Authentication: no `[Authorize]` observed.

Response JSON:

| Property name | JSON type | Nullable | Meaning | Source field | Notes |
|---|---:|---|---|---|---|
| `LeagueName` | string | possible | League display name | `League.LeagueName` | |
| `LeagueId` | number | no | League id | `League.LeagueId` | |
| `Country` | string | possible | Country display name | `League.Country.CountryName` | |

Filters and limits:

- Match window uses `GetDates()` from now to local midnight + 2 days.
- Match filters: future, `Status == 1`, non-null league name, `LeagueGame.Rating > 1`.
- League ordering: `OrderByDescending(r => r.Rating)`.
- Hard limit: `Take(20)`.

## 8. Prematch fixture-list contract

### Generated-File Service Fixture List

**Confirmed:** The located old frontend's main fixture list comes from the generated-file service root, not a WebUI `/api/Matches/*` route. The payload originates from the same authoritative BetSoftware data source used by WebUI, but it is delivered through the generator/export file path. `makeRequest()` treats URLs starting with `service_url` as the odds API and does not set WebUI cookies; WebUI requests set `withCredentials: true`. See old `src/api.ts:102-121`.

Request:

- Method: GET
- Route: `/`
- Base URL: old `service_url`; new `NEXT_PUBLIC_MATCHES_API_BASE_URL=https://api-games.smbet.net`
- Query/body: none found
- Credentials: none in old service client; new `activeMatchesApiClient` sets `withCredentials: false` at `src/api/activeMatchesApiClient.ts:7-18`.

Confirmed consumed response fields from old `src/types.ts:50-64` and `src/types.ts:76-101`:

| Property name | JSON type | Nullable | Meaning | Notes |
|---|---:|---|---|---|
| `MatchNo` | number | no | Display/short match number in old store | Store keys games by `MatchNo` at `src/store.ts:88-100` |
| `League` | string | possible | League display/group label | Used if legacy `lg` is absent at `src/functions.ts:248-252` |
| `Teams` | string | possible | Combined team display | Rendered in `LeagueGames.tsx:75-81` |
| `MatchOdds` | array | no | Raw odds rows | Used for market count and lookup at `LeagueGames.tsx:66-67` |
| `mid` | number | possible | Legacy match id for route navigation | `LeagueGames.tsx:44-47`; store checks `games[game.mid]` but writes by `MatchNo` |

**Confirmed for new UI:** `ActiveMatchDto` expects `MatchNo`, `League`, `StartTime`, `GameStatus`, `OriginalMatchId`, `AwayTeamName`, `HomeTeamName`, and `MatchOdds` in `src/types/activeMatchesDtos.ts:12-21`; `activeMatchesApi.getActiveMatches()` calls `GET "/"` at `src/api/activeMatchesApi.ts:5-11`.

### WebUI Fixture Lists

**Confirmed:** `GET /api/Matches/GetSetMatches` returns `GameViewModel[]` from SQL view `vGames`, but this implementation does not populate nested `MatchOdds`. See `ApiMatchesController.cs:193-255`.

**Confirmed:** `GET /api/Matches/GetHourMatches` returns `GameViewModel[]` using `ShortMatchCodeWithOddsSelector()`, including `MatchOdds`, with parameters `page = 1`, `pagesize = 100`, `hour = 0`. See `ApiMatchesController.cs:72-102` and `LinqSelectors.cs:35-64`.

## 9. Fixture-details contract

**Confirmed:** The located old `GameDetails.tsx` is almost entirely commented out and no WebUI details request is made. Detail navigation in `LeagueGames.tsx:44-47` uses `game.mid`, while `useGame(match_id)` reads `games[match_id]` from the store at old `src/hooks.ts:59-62`.

**Confirmed:** WebUI detail endpoint is GET `/api/Matches/GetMatchDetails?matchId={number}`, implemented at `ApiMatchesController.cs:258-272`.

Response JSON:

| Property name | JSON type | Nullable | Meaning | Source field | Notes |
|---|---:|---|---|---|---|
| `OriginalMatchId` | number | no | Match/provider id | `MatchOdd.BetServiceMatchNo` | |
| `BetCategory` | string | possible | Market/category code | `MatchOdd.Market` | |
| `BetOption` | string | possible | Selection option code | `MatchOdd.Option` | |
| `Line` | string | yes | Line/handicap/specifier | `MatchOdd.Line` | |
| `Odd` | number | no | Decimal odds | `MatchOdd.Odd` decimal | |

**Confirmed limitation:** This endpoint does not project `MatchOddId`, `BookMakerId`, or `LastUpdateTime`, even though the `GameOddViewModel` type has those properties.

## 10. Market contract

**Confirmed:** WebUI does not expose a separate market-group entity for prematch browse. Each odd row stores market and option in `MatchOdd`: `Line`, `Market`, `Option`, plus `BookMakerId`. See `BetSoftware.Domain\Models\Concrete\MatchOdd.cs:24-40`.

Market row source fields:

| Field | Type | Meaning |
|---|---|---|
| `MatchOddId` | int identity key | Odd-row key |
| `BetServiceMatchNo` | int FK | Match key |
| `BookMakerId` | nullable int | Bookmaker/provider |
| `IsLocked` | nullable bool | Lock/suspend flag, not projected by audited browse endpoints |
| `IsUpdated` | nullable bool | Update flag, not projected by audited browse endpoints |
| `LastUpdateTime` | nullable DateTime | Projected by `GetUpdates` and `GetHourMatches` odds |
| `Odd` | decimal | Raw decimal odd |
| `Line` | string length 10 | Line/handicap/specifier |
| `Market` | string length 30 | Market/category |
| `Option` | string length 60 | Selection/option |

## 11. Selection and odds contract

**Confirmed:** Old `BetCell` accepts a `MatchOdds` row, ignores invalid rows where `odd` is undefined or `odd.v === 0.0`, formats display as `odd.Odd?.toFixed(2)`, and stores a selection by merging the odd row with a clone of the game minus `MatchOdds`. See old `src/components/BetCell.tsx:6-11` and `src/components/BetCell.tsx:33-70`.

**Confirmed:** Old `getOdd()` searches active `MatchOdds` by `BetOption` and `BetCategory`; when using the legacy `odds` array it also checks `line`. See old `src/functions.ts:295-326`.

**Confirmed:** Old total odds multiply `Selection.v`, not `Selection.Odd`, in `src/functions.ts:27-30`. The active `MatchOdds` class mirrors both `v` and `Odd` in old `src/types.ts:84-101`.

**Confirmed:** New active adapter preserves `BetCategory`, `BetOption`, `Line`, `BookMakerId`, `LastUpdateTime`, `MatchOddId`, `Odd`, and computes a `selectionKey` from `OriginalMatchId`, market, option, line, and bookmaker. See `src/adapters/activeMatchesAdapters.ts:67-86`.

Odds authority boundary:

| Concern | Authority | Evidence | Contract implication |
|---|---|---|---|
| Browse/feed odds | Active matches service response | Old `get_games()` returns service array at `BET720.Web\app\src\api.ts:149-153`; UI renders active `MatchOdds` through `LeagueGames.tsx:64-97` and `BetCell.tsx:33-70` | Used for display and selection modeling |
| WebUI endpoint odds | WebUI `MatchOdds` table projections | `GetMatchDetails` projects odds from `_db.MatchOdds` at `ApiMatchesController.cs:261-270`; `GetUpdates` projects recent `_db.MatchOdds` changes at `ApiMatchesController.cs:359-372` | Available but not used by located old browse flow |
| Betting odd identifier | `MatchOddId` plus match/market/option/line/bookmaker | WebUI validates by `MatchOddId` first at `ICreateReceiptService.cs:109-128`, then by `BetServiceMatchNo + Line + Market + Option` at `ICreateReceiptService.cs:131-150`; prematch rejects missing `MatchOddId` at `ICreateReceiptService.cs:1320-1324` | Preserve `MatchOddId`; do not enable betting until active/WebUI ID alignment is proven |
| Odds-change validation | WebUI `MatchOdds` table | `ChangedOddsQuery` updates posted bet data from current DB odds at `ICreateReceiptService.cs:73-91` | Active browse odds are not final authority for placement |

**Confirmed:** The located older frontend uses browse odds for display and local selection storage. WebUI final betting validation is outside this issue's implementation scope, but the contract boundary requires the active browse identifiers to align with WebUI `BetServiceMatchNo` and `MatchOddId` before betting can be enabled safely.

## 12. Identifier conventions

| Field | Source endpoint/source | Source type | Meaning | Stable/public/display-only | Usable for fixture details | Usable for operational betting calls | Transformation required |
|---|---|---|---|---|---|---|---|
| `Id` | No confirmed prematch browse endpoint uses generic `Id`; mock/UI data may have local `id` | unresolved / UI-local | Generic UI row id only when present in mocks | Display/UI-local only | No | No | Map to explicit `originalMatchId`, `matchNo`, or UI key before use |
| `MatchId` | WebUI betting/validation models; `GameOddViewModel.MatchId` in `GetUpdates` | int | Operational match id expected by WebUI services | Stable operational id when equal to `BetServiceMatchNo` | Yes, for WebUI routes expecting match id | Yes | Active `OriginalMatchId` must be reconciled to this field through generator/file schema tracing |
| `OriginalMatchId` | Generated feed DTO; WebUI `GameViewModel`; `TopMatchCardDto` | number / int | Browse fixture id intended to correspond to WebUI match key | Stable source identifier from shared BetSoftware data; exact generated-file mapping should be traced in generator source | Yes when reconciled with `BetServiceMatchNo` | Yes when reconciled and current-set validation passes | Preserve as `originalMatchId`; do not substitute `MatchNo` |
| `BetServiceMatchNo` | WebUI `Match` table and projections | int key | WebUI primary match key | Stable operational DB key | Yes | Yes | Expose as `OriginalMatchId` or `MatchId` depending DTO |
| `MatchNo` | Active feed DTO, old store; WebUI `GameViewModel.MatchNo` may be `ShortCode` in selectors | number / int | Display match number or short code depending source | Display-oriented; not safe as operational id | No, unless source explicitly maps it to `BetServiceMatchNo` | No | Keep separate from `OriginalMatchId` |
| `ShortCode` | WebUI `ShortMatchCode.ShortCode`; `TopMatchCardDto.ShortCode` | int | Public short/display code | Public/display code | Only for `/GetMatchByShortCode?id=` | No | Store as `shortCode`, not `matchId` |
| `LeagueId` | WebUI match/league/country endpoints | nullable int / int | League database id | Stable DB/reference id | No | No | Preserve for filtering/navigation; active feed may only have league name |
| `MarketId` | No confirmed browse DTO field; WebUI stores market as `MatchOdd.Market` string | unresolved | Numeric market id not exposed in audited prematch browse contracts | Unresolved | No | No | Use raw `BetCategory` string until a market-id source is confirmed |
| `OddId` / selection ID | WebUI `MatchOddId`; active `MatchOddId`; old `hash`/new `selectionKey` are frontend keys | int / string | Odd-row id or frontend synthetic selection key | `MatchOddId` operational if aligned; `selectionKey` UI-local | No | `MatchOddId` yes for prematch validation; synthetic keys no | Preserve `MatchOddId`; compute UI key from `OriginalMatchId|BetCategory|BetOption|Line|BookMakerId` |

**Confirmed fixture-list to detail key:** WebUI `GetMatchDetails` expects `matchId` equal to `MatchOdd.BetServiceMatchNo`. The WebUI list field that corresponds is `OriginalMatchId`, not display `ShortCode`.

## 13. Date and time conventions

**Confirmed:** WebUI filters use server-local `DateTime.Now`, not UTC. Examples: `GetHourMatches` at `ApiMatchesController.cs:75-87`, `GetTopMatches` at `ApiMatchesController.cs:119-128`, `GetUpdates` at `ApiMatchesController.cs:356-360`, and `GetDates()` at `ApiMatchesController.cs:397-401`.

**Confirmed:** WebUI `TopMatchCardDto.StartTime` is `DateTime`, `GameViewModel.OldDateTime` is `DateTime`, and `GameViewModel.StartTime` is a display-only formatted date string `dd/M/yyyy`. See `GameViewModel.cs:41`, `GameViewModel.cs:55`, and `GameViewModel.cs:131`.

**Confirmed:** Web API serializer keeps Newtonsoft default property casing; only `ReferenceLoopHandling.Ignore` is configured and XML formatter is removed. See `WebApiConfig.cs:23-31`. No custom timezone/date setting was found in `WebApiConfig`.

**Confirmed inspected evidence:** Searches covered `WebUI\App_Start`, `WebUI\Global.asax.cs`, `WebUI\Web.config`, `WebUI\Controllers\Api`, and `WebUI\Controllers` for `DateFormatHandling`, `DateTimeZoneHandling`, `DateParseHandling`, `IsoDateTimeConverter`, `JavaScriptDateTimeConverter`, `JsonConvert.DefaultSettings`, `JsonFormatter`, `SerializerSettings`, `ContractResolver`, and `CamelCase`. The only relevant Web API serializer setting found was `ReferenceLoopHandling.Ignore`; XML formatter removal was also found. See `WebUI\App_Start\WebApiConfig.cs:23-31`.

**Inferred:** ASP.NET Web API using Newtonsoft JSON.NET defaults generally serializes `DateTime` as ISO-style JSON strings unless settings override it. However, because no live WebUI response was captured and MVC `JsonResult` behavior can differ from Web API `Ok(...)`, exact wire timezone/offset behavior remains **Unresolved**.

**Unresolved:** No local evidence proves Microsoft `/Date(...)/` serialization for the audited Web API endpoints, and no local evidence proves explicit UTC or offset-aware serialization.

## 14. Fixture status conventions

**Confirmed:** WebUI active prematch endpoints consistently filter `Match.Status == 1`: `GetHourMatches` at `ApiMatchesController.cs:94-95`, `GetTopMatches` at `ApiMatchesController.cs:125-128`, `GetLeagues` at `ApiMatchesController.cs:307-309`, and `GetCountriesWithLeagues` at `ApiMatchesController.cs:329-331`.

**Confirmed:** `Match.Status` is an int FK to `MatchStatus`, and `Match.GameStatus` is a string. See `Match.cs:32-34`, `Match.cs:68-69`, and `MatchStatus` at `Match.cs:98-105`.

**Unresolved:** The full status value map is not defined in the audited code. Only `1` is confirmed as the active/open prematch status by endpoint filters.

## 15. Filtering, sorting, pagination and limits

| Endpoint/source | Filters | Sorting | Pagination/limits |
|---|---|---|---|
| Generated-file service `/` | Generator/export filters unresolved until generator source is traced | Generated-file order unresolved | No request pagination in old or new client |
| `GetSetCount` | Current set + `GetDates()` | none | Count only |
| `GetHourMatches` | current set, future within hour/day window, `Status == 1` | `ShortCode` asc | `page=1`, `pagesize=100`, `Skip(offset)`, `Take(pagesize)` |
| `GetTopMatches` | current set, `Status == 1`, `StartTime > now` | `ShortCode` asc | `page=1`, `pagesize=10`, `Skip(offset).Take(pagesize)` |
| `GetSetMatches` | current set, `StartTime > GETDATE()` | `StartTime DESC` | `OFFSET @offset FETCH NEXT @pagesize`, `pagesize` normalized by `GetItemsPerPage()` |
| `GetMatchByShortCode` | exact `ShortCode == id` | `StartTime DESC` | `Take(10)` |
| `GetLeagues` | two-day active/rated future matches | `League.Rating DESC` | `Take(20)` |
| `GetUpdates` | odds updated in last 45 seconds and future matches | match start asc | `Take(1000)` |

**Confirmed frontend-only filters:** The located old app groups by league client-side (`src/functions.ts:241-263`) and picks market odds client-side (`src/functions.ts:295-326`).

## 16. Authentication requirements

**Confirmed:** Generated-file service requests do not use WebUI credentials in old or new code. Old service requests are routed through the service branch of `makeRequest()` at `src/api.ts:110-115`; new `activeMatchesApiClient` sets `withCredentials: false` at `src/api/activeMatchesApiClient.ts:7-18`.

**Confirmed:** Old WebUI API requests use cookies via `withCredentials: true` at old `src/api.ts:117-121`.

**Confirmed:** WebUI API config supports cookie auth for authorized Web API controllers by adding `HostAuthenticationFilter(DefaultAuthenticationTypes.ApplicationCookie)`, but `ApiMatchesController` itself has no observed `[Authorize]`. See `WebApiConfig.cs:17-23`.

## 17. Older frontend endpoint usage

| Operation | Source reference | Request | Consumed fields | Transformation |
|---|---|---|---|---|
| Load prematch browse feed | old `src/api.ts:149-153`, `src/main.tsx:17-22` | GET service root | array of `Game` | Upsert into zustand game store |
| Store games | old `src/store.ts:88-105` | none | `game.mid`, `game.MatchNo`, `game.is_live` | Checks `games[game.mid]`, writes `games[game.MatchNo]` |
| Group list by league | old `src/hooks.ts:66-74`, `src/functions.ts:241-263` | none | `game.lg` or `game.League` | Client-side grouping |
| Render league fixtures | old `src/components/GamesList.tsx:47-57`, `LeagueGames.tsx:64-97` | none | `Teams`, `MatchOdds`, selected market odds | Shows `+{MatchOdds.length - shownOdds.length}` |
| Find market selection | old `src/functions.ts:295-326` | none | `BetOption`, `BetCategory`, optional `Line` | Returns matching odd row |
| Select an odd | old `src/components/BetCell.tsx:33-70` | none | odd row + game clone | Stores selection, formats `Odd.toFixed(2)` |
| Submit ticket/booking | old `src/api.ts:179-183` | POST `/api/Receipt`, POST `/api/Receipt/Booking` | `TicketModel` / `BookingModel` | Out of scope for this prematch docs issue |

## 18. Older frontend transformations

| Endpoint field | Old frontend transformation | Display/use | New adapter requirement |
|---|---|---|---|
| `MatchOdds[]` | Scanned for market/option in `getOdd()` | 1X2 grid and market count | Group by `BetCategory`, preserve raw rows |
| `Odd` / `v` | Display `Odd.toFixed(2)`; total odds uses `v` | Odd cell and total odds | Keep raw numeric `odd`; derive formatted display |
| `League` / `lg` | `lg` fallback to `League` | Group headings | Normalize to one `league` string |
| `MatchNo` | Store key and selection replacement key | Display/selection uniqueness in old app | Do not use as WebUI detail `matchId` unless proven |
| `mid` | Detail route param in located old app | Navigation | Treat as legacy; new active DTO should prefer `OriginalMatchId` |
| `BetCategory` | Market code | Market lookup | Preserve exact case; do not label-normalize in transport DTO |
| `BetOption` | Selection code | Selection lookup | Preserve exact raw option |
| `Line` | Optional line/specifier | Line markets | Normalize `null` and empty string only in view keys, not raw DTO |
| `BookMakerId` | Carried by `MatchOdds` class | Selection identity | Preserve in selection key |
| `MatchOddId` | Expected by new active DTO | Traceability/future betting | Preserve even for read-only browsing |

## 19. New UI mock-model comparison

| New UI field/model | Current source | WebUI/active source | Compatibility | Required conversion |
|---|---|---|---|---|
| `NEXT_PUBLIC_MATCHES_API_BASE_URL` | `src/config/env.ts:38-49` | generated-file service root | Direct match | Use `https://api-games.smbet.net` |
| `ActiveMatchDto.MatchNo` | `src/types/activeMatchesDtos.ts:13` | active `MatchNo`; WebUI `ShortCode` in top/hour projections | Rename/semantic check | Keep separate from `OriginalMatchId` |
| `ActiveMatchDto.OriginalMatchId` | `src/types/activeMatchesDtos.ts:18` | WebUI `BetServiceMatchNo` in WebUI projections | Direct/inferred runtime | Use as fixture id for WebUI details |
| `ActiveMatchDto.MatchOdds` | `src/types/activeMatchesDtos.ts:21` | generated feed odds rows from shared source | Direct transport shape; source mapping should be traced in generator | Market adapter groups rows |
| `ActiveOddDto.MatchOddId` | `src/types/activeMatchesDtos.ts:7` | WebUI `MatchOdd.MatchOddId` | Direct source concept; generated-file mapping should be verified from generator source | Preserve |
| Mock sports/nav icons | `public/data/navData.ts` and page data | no WebUI sport fields | Missing from backend | Keep UI-owned |
| Mock `titletwo` / league labels | `public/data/allPageData.ts` | active `League`, WebUI `Champ`/`LeagueName` | Rename | Normalize to league/competition label |
| Mock odds `point`/static cells | page data/components | `Odd` decimal | Type conversion | raw number plus formatted text |

## 20. Required adapters

1. **Active fixture adapter:** input `ActiveMatchDto`, output fixture summary view model; preserve `OriginalMatchId`, `MatchNo`, `League`, teams, `StartTime`, `GameStatus`.
2. **Market adapter:** input `ActiveOddDto[]`, output market groups keyed by `BetCategory`.
3. **Selection/odds adapter:** input odd row, output selection candidate preserving `MatchOddId`, `BookMakerId`, `BetCategory`, `BetOption`, `Line`, numeric `Odd`, and formatted display.
4. **League adapter:** input WebUI country/league DTO or active match list, output navigable league groups.
5. **Date parser:** input WebUI/active `StartTime`, output raw string plus parsed/display values; do not assume UTC.
6. **Status mapper:** input `Status`/`GameStatus`, output prematch UI status; only `Status == 1` is confirmed active/open.
7. **ID normalization helper:** separate `originalMatchId`, `matchNo`/short code, `matchOddId`, and legacy `mid`.

## 21. Risks and unresolved questions

- **Unresolved:** Exact generator/export implementation and generated-file schema mapping for `OriginalMatchId`, `MatchOddId`, filters, order, limits and timezone.
- **Unresolved:** Full WebUI fixture status value map beyond active `Status == 1`.
- **Unresolved:** Generated-file service filters, sort order, limits and timezone until generator source is available.
- **Unresolved:** Whether a richer operational WebUI endpoint exists that returns current-set odds with `MatchOddId`.
- **Unresolved:** Whether non-football sport hierarchy data exists outside static UI mocks.
- **Confirmed risk:** `GetMatchDetails` omits `MatchOddId`, so it is not sufficient for future betting without another identifier source.
- **Confirmed risk:** `GetSetMatches` returns fixtures without nested odds in this implementation.

## 22. Recommended implementation sequence

1. Keep active matches browsing on `NEXT_PUBLIC_MATCHES_API_BASE_URL=https://api-games.smbet.net`.
2. Treat WebUI `/api/Matches/*` endpoints as supporting/reference contracts until runtime ID alignment is proven.
3. Build read-only adapters for active fixture, market, odds display, date parsing, and status mapping.
4. Add league navigation from active feed first; optionally enrich with WebUI `GetCountriesWithLeagues`.
5. Do not enable booking or bet placement from prematch browse until `OriginalMatchId` and `MatchOddId` are verified against the same WebUI environment.

## 23. Source-file index

| Repository | File | Relevance |
|---|---|---|
| older frontend | `BET720.Web\app\src\api.ts:102-153` | Generated-file service vs WebUI request split and `get_games()` |
| older frontend | `BET720.Web\app\src\main.tsx:44-49` | Loads `service_url` from `/api/Config` |
| older frontend | `BET720.Web\Controllers\ApiConfigController.cs:20-32` | Exposes `_setUp.OddsUrl` as `config.ServiceUrl` |
| older frontend | `BET720.Web\Program.cs:53-58` | Local `OddsUrl` source value |
| older frontend | `BET720.Web\app\src\types.ts:50-101` | Game, odd and `MatchOdds` shapes |
| older frontend | `BET720.Web\app\src\main.tsx:17-22` | Bootstrap active feed load |
| older frontend | `BET720.Web\app\src\store.ts:88-105`, `127-193` | Game storage and selection replacement |
| older frontend | `BET720.Web\app\src\functions.ts:27-30`, `241-263`, `295-326` | Total odds, grouping, market lookup |
| older frontend | `BET720.Web\app\src\components\BetCell.tsx:33-70` | Selection creation and odds formatting |
| WebUI | `WebUI\Controllers\Api\ApiMatchesController.cs:43-350` | Match endpoints |
| WebUI | `WebUI\Controllers\Api\ApiMatchesController.cs:353-401` | Updates and date window |
| WebUI | `WebUI\Helpers\LinqSelectors.cs:35-64` | Hour-match projection |
| WebUI | `BetSoftware.Domain\Models\ViewModels\GameViewModel.cs:8-132` | DTO fields |
| WebUI | `BetSoftware.Domain\Models\Concrete\Match.cs:28-91` | Match ids/status/time |
| WebUI | `BetSoftware.Domain\Models\Concrete\MatchOdd.cs:8-40` | Odd-row contract |
| WebUI | `BetSoftware.Domain\Models\Concrete\ShortMatchCode.cs:6-24` | Short-code identifiers |
| new UI | `src/config/env.ts:1-2`, `38-49` | Active matches base URL |
| new UI | `src/api/activeMatchesApiClient.ts:7-18` | No-credentials active client |
| new UI | `src/api/activeMatchesApi.ts:5-11` | Active `GET "/"` wrapper |
| new UI | `src/types/activeMatchesDtos.ts:1-22` | Active DTO contract |
| new UI | `src/adapters/activeMatchesAdapters.ts:67-115` | Active adapter |

## 24. Acceptance checklist

| Acceptance criterion | Status | Reason |
|---|---|---|
| Locate and use correct repositories | Satisfied | Document references `SmartBetUI-v2`, `Bet\Bet\WebUI`, and `online\online\BET720.Web\app`. |
| Active matches generated-file service ownership searched across repos | Satisfied | Targeted searches found `api-games.smbet.net` in SmartBetUI-v2 config/docs, service URL plumbing in the old app, and no WebUI `api-games` controller/proxy references. Owner clarification confirms it is a generated-file cache over the same authoritative data source. |
| Determine whether WebUI calls/proxies/imports `api-games.smbet.net` | Satisfied | Source proves no WebUI call/proxy reference in inspected code. Owner clarification says the generator/export service reads the same underlying data and `api-games.smbet.net` serves the generated file. |
| Distinguish authoritative data source, contract authority, bulk delivery path, frontend transport | Satisfied | See "Active matches generated-file architecture" and "Odds authority boundary". |
| Do not present generated-file endpoint as traced to WebUI | Satisfied | Endpoint inventory marks the bulk browse endpoint as separate generator/export delivery, not a WebUI controller. |
| Endpoint inventory includes method, route, controller/action, params, response, caller, auth, references | Satisfied for WebUI endpoints; partially applicable for bulk browse endpoint | WebUI endpoints are traced to controller code. The bulk browse endpoint is deliberately optimized generated-file delivery, so its fields must be mapped back to shared source entities/contracts and reconciled with WebUI identifiers when generator source is available. |
| Classify `GetCountriesWithLeagues` usage | Satisfied | Classified as confirmed WebUI endpoint but no older frontend caller found. |
| Classify `GetLeagues` usage | Satisfied | Classified as confirmed WebUI endpoint but no older frontend caller found. |
| Clarify odds returned in browse feed vs WebUI odds vs validation | Satisfied | See Selection and odds contract. |
| Explain betting identifier boundary without implementing betting | Satisfied | Boundary documented; implementation kept out of scope. |
| Explicit identifier table for requested fields | Satisfied | Section 12 covers `Id`, `MatchId`, `OriginalMatchId`, `BetServiceMatchNo`, `MatchNo`, `ShortCode`, `LeagueId`, `MarketId`, and `OddId`/selection ID. |
| Determine DateTime wire format | Partially satisfied | Serializer config was inspected; no custom date settings found. ISO-style JSON.NET default is inferred, but exact production wire timezone/offset remains unresolved without captured response. |
| State architectural clarification | Satisfied | Conclusion states the authoritative data source is shared, WebUI is contract/operational authority, and bulk browse transport is the generated-file service. |
| Avoid application code changes | Satisfied | Only this document was edited. |

## 25. Contract-audit conclusion

**Confirmed architectural finding:** The authoritative prematch data source is the operational BetSoftware data/database used by WebUI. The fixture browse/discovery payload is not delivered through a WebUI controller because that path was slow and resource-heavy for large prematch sets. Instead, a separate generator/export service reads the same authoritative data, writes a generated games file, and `api-games.smbet.net` serves that file as a read-optimized distribution/cache layer. WebUI remains the contract authority for operational identifiers, DTO behavior, current-set/status checks, odds validation, and betting-related behavior.

**Confirmed:** The located old frontend loads the main prematch browse feed from the generated-file service root, and the new frontend should use `NEXT_PUBLIC_MATCHES_API_BASE_URL=https://api-games.smbet.net` for that transport role.

**Confirmed:** Operational WebUI exposes prematch support endpoints for counts, top matches, hour matches, set matches, details, shortcode lookup, leagues, countries/leagues and updates. These endpoints are confirmed by source, but the located old app does not call them for its main prematch browse list.

**Confirmed:** WebUI's reliable identifier for fixture details is `OriginalMatchId` / `BetServiceMatchNo`; visible short codes and `MatchNo` must remain separate. Raw odds are decimals serialized as JSON numbers and displayed by frontend formatting, usually two decimal places.

**Unresolved:** Full sport hierarchy, complete status mapping, generator/file schema mapping, and exact production date serialization/timezone behavior require generator-source and runtime confirmation before betting flows are wired.
