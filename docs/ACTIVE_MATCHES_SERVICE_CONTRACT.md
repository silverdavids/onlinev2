# Active Matches Service Contract

Date: 2026-07-14

Source roots:

- New UI: `C:\Users\hp\source\repos\SmartBetUI-v2`
- Operational backend: `C:\Users\hp\source\repos\Bet\Bet\WebUI`
- Older working frontend: `C:\Users\hp\source\repos\thebet-online (2)\thebet-online`

This audit is documentation-only. `BetSoftware.WebUI` remains authoritative for authentication, accounts, settings, booking, bet placement, validation, payments, receipts, and operational rules. The active matches service is only the current prematch match/odds feed used by the older online frontend.

## Purpose

The older frontend combines two data sources:

- Active matches service: `SERVICE_URL` / `serviceUrl`, used for the current active prematch match array with full `MatchOdds`.
- WebUI API: `/api/...`, used for authentication, account/session data, countries/leagues support data, top-match widgets, booking, bet placement, settings, payments, receipts, and server validation.

Important correction: the active matches service is not a complete replacement for WebUI match endpoints. The old app uses it to populate the main prematch odds UI, then posts selected identifiers back to WebUI for booking or ticket placement.

## Endpoint

Confirmed older frontend endpoint:

```text
GET {SERVICE_URL}/
```

Source references:

- `src/environment/index.js:47` defines `serviceUrl` fallback as `https://api-games.smbet.info`.
- The user-provided known environment says the deployed `serviceUrl` is `https://api-games.smbet.net`.
- `src/api/index.js:50` strips trailing slash from `SERVICE_URL`.
- `src/api/index.js:72-75` creates the `service` Axios client with `baseURL: SERVICE_BASE || '/'`, JSON content headers, and a 20s timeout.
- `src/api/index.js:153` defines `getGames = () => service.get('/')`.
- No other active-matches service route was found in the older frontend.

Confirmed request behavior:

| Property | Confirmed value |
|---|---|
| Method | `GET` |
| Path appended to `SERVICE_URL` | `/` |
| Query parameters | none |
| Request body | none |
| Credentials | not configured on the service Axios instance |
| Headers | `Content-Type: application/json` |
| Timeout | 20 seconds |
| Error normalization | same response interceptor as WebUI API |
| CORS | inferred required because the browser calls the absolute service URL directly; exact response headers were not present in source |

Do not assume `/games`, `/matches`, `/sports`, update, detail, or paging routes for this service unless they are confirmed separately. The older frontend uses only `GET /`.

## Runtime Verification Summary

Runtime verification on 2026-07-14 is documented in `docs/ACTIVE_MATCHES_RUNTIME_VERIFICATION.md`.

Confirmed CORS/runtime behavior for `https://api-games.smbet.net/`:

| Property | Runtime result |
|---|---|
| Direct browser-like GET from `Origin: http://localhost:3000` | succeeds |
| `Access-Control-Allow-Origin` | `*` |
| `Access-Control-Allow-Credentials` | absent |
| Credentialed requests | not supported by CORS shape |
| OPTIONS allowed methods | `GET,HEAD,OPTIONS` |
| OPTIONS allowed headers | `content-type` |
| Cache | `public, max-age=300` |
| Compression | `gzip` |
| Captured content type | absent |

Runtime response metrics from the captured snapshot:

| Metric | Value |
|---|---:|
| Match count | `126` |
| Total odds count | `31,096` |
| Decompressed JSON size | `4,697,827 bytes` |
| Raw gzip transfer size | `322,921 bytes` |
| Largest `MatchOdds` array | `304` |
| Duplicate `MatchNo` values | `0` |
| Duplicate `OriginalMatchId` values | `0` |
| Duplicate `MatchOddId` values | `0` |
| Malformed required match fields | `0` |
| Malformed required odd fields | `0` |
| Matches already past parsed `StartTime` | `0` |
| Average `LastUpdateTime` age | about `25 minutes` |
| Oldest `LastUpdateTime` age | about `36 minutes` |

Runtime identifier check against the accessible configured WebUI database:

| Check | Result |
|---|---:|
| Active snapshot distinct `OriginalMatchId` values checked | `126` |
| Matching `dbo.Matches.BetServiceMatchNo` rows found | `0` |
| Active snapshot distinct `MatchOddId` values checked | `31,091` |
| Matching `dbo.MatchOdds.MatchOddId` rows found | `0` |

Conclusion:

- Source code confirms the intended match contract: active `OriginalMatchId` is posted as WebUI `MatchId`.
- Runtime compatibility is not confirmed in this environment because the accessible WebUI database did not contain the active service IDs.
- For the read-only prematch feed foundation, `MatchOddId` is retained as traceability data but is not part of the frontend selection identity. Current selection identity is `OriginalMatchId|BetCategory|BetOption|Line|BookMakerId`.
- Treat unresolved `OriginalMatchId` alignment as the blocker before enabling booking or bet placement from active-service selections.

## Loading And Polling

The active feed is loaded from the app bootstrap refresh stream:

- `src/index.js:80` creates `timer(0, minutes(15))`.
- `src/index.js:97-104` imports and calls `getGames()`.
- `src/index.js:105-109` pushes a non-empty array into `games$`, otherwise pushes `[]`.
- `src/index.js:110-112` logs `getGames` failure and clears `games$`.
- `src/index.js:115-121` loads WebUI countries/leagues during the same refresh tick.

Confirmed frequency:

```text
Immediately on startup, then every 15 minutes.
```

Stale-data behavior:

- A successful empty/non-array response clears the prematch store.
- A failed request also clears the prematch store.
- Within a refresh payload, league grouping replaces duplicate matches by `OriginalMatchId`; see `src/rxjs-stores/observables.js:55-83`.
- There is no confirmed prematch socket merge. Prematch odds changes are handled at ticket submission time through WebUI validation responses.

Expected response size is unconfirmed in source. The older frontend treats the response as the full active prematch array and then filters client-side.

## Active Match DTO

Known active-match response shape from the issue and older frontend usage:

```ts
type ActiveMatchDto = {
  MatchNo: number;
  IsJackPot?: boolean | null;
  League: string;
  StartTime: string;
  GameStatus?: string | number | null;
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
  LastUpdateTime?: string | null;
  MatchOddId: number;
  Odd: number;
  row?: number;
};
```

Confirmed usage:

- `MatchOdds` is accessed throughout market renderers, for example `GameDetails.js:86-89`, `MobileSoccer1x2Odds.js:196-205`, and `functions/index.js:498-502`.
- `OriginalMatchId` is used as the fixture identity for grouping, navigation, selection keys, and WebUI `matchId`; see `observables.js:67`, `MobileSoccer1x2Odds.js:133`, `MobileSoccer1x2Odds.js:149`, and `async-actions/index.js:41`.
- `MatchNo` is displayed and carried as `matchNo`; see `GameDetails.js:66-78` and `MobileGameDetails.js:656-664`.
- `MatchOddId` is carried into the betslip and WebUI payload; see `GameDetails.js:67-78`, `MobileSoccer1x2Odds.js:141-151`, and `async-actions/index.js:42-43`.
- `BookMakerId`, `BetCategory`, `BetOption`, `Line`, and `Odd` are carried into the selected bet event; see `GameDetails.js:65-81` and `MobileSoccer1x2Odds.js:138-162`.

Types and nullability:

- `Odd` is treated as numeric for total odds; see `functions/index.js:203-204`.
- Display formatting converts odds through `Number(odd)` and returns `-` for invalid values; see `functions/index.js:456-472`.
- `Line` is explicitly nullable in selection keys and line matching; see `bets-store.js:12-18`, `GameDetails.js:73`, and `MobileSoccer1x2Odds.js:160`.
- `StartTime` is parsed by JavaScript `Date` / `Date.parse`; see `TopGames.js:41-48`, `GameDetails.js:638-649`, `hooks/index.js:175-207`, and `functions/index.js:516-590`.
- Source does not confirm timezone metadata. Treat the service date string as provider/service-local until verified from a live response.
- No `BetServiceMatchNo` field is added by the older frontend. The value submitted as WebUI `MatchId` comes from `OriginalMatchId`.

Validity/filtering:

- The active service appears to return already-active/current matches and odds, but the exact provider-side filters are unconfirmed.
- The frontend still guards invalid/missing odds by only rendering found odds or disabled placeholders. It does not locally validate against WebUI current set/status before submission.

## Store And Consumers

Receiving store:

- `games$` is a `BehaviorSubject([])` at `src/rxjs-stores/observables.js:20-22`.
- `leagueGames$` groups `games$` by `game.League` and replaces duplicate `OriginalMatchId` entries; see `observables.js:55-83`.
- `leagues$` is `Object.keys(leagueGames)`; see `observables.js:87-89`.

Consumers:

- Main prematch list: `MobileSoccer1x2Odds` calls `useLeagueGames()` and renders grouped active matches; see `MobileSoccer1x2Odds.js:75`, `MobileSoccer1x2Odds.js:127-130`, and `MobileSoccer1x2Odds.js:426-520`.
- Desktop list/container: `GamesList.js:4-9` and `MatchesContainer.js:53` consume `useLeagueGames()`.
- Event detail routes: `GameDetails.js:608-623`, `MobileGameDetails.js:625-631`, and `MobileEventDetails.js:34-37` subscribe to `games$` and find by route `OriginalMatchId`.
- Sidebar/search/navigation filters: `Sidebar.js:105-171`, `Leagues.js:14-36`, `SearchBar.js:3-16`, and `hooks/index.js:209-253`.
- Top games widget does not use the active service; it calls WebUI `GetTopMatches` and `GetSetCount`.

## WebUI Supplement And Responsibility Split

| Feature | serviceUrl | WebUI | Older frontend usage | Recommended new UI source |
|---|---|---|---|---|
| Active matches | `GET /` returns full active prematch array with `MatchOdds` | Validates selected match/odd later | Main prematch list/detail feed via `getGames()` | active matches client |
| Top matches | not used | `GET /api/Matches/GetTopMatches`, `GET /api/Matches/GetSetCount` | Mobile/home top games widget | WebUI client |
| Leagues | active match rows include `League` string | `GET /api/Matches/GetCountriesWithLeagues`, `GET /api/Matches/GetLeagues` | WebUI tree loaded for navigation/support; active feed grouped by `League` | WebUI for country/league tree, active feed for counts/results until reconciled |
| Countries | no confirmed country data in active DTO | `GET /api/Matches/GetCountriesWithLeagues` | Redux country tree | WebUI client |
| Fixture details | active feed includes all odds in `MatchOdds` | `GetMatchDetails` exists but older online route uses in-memory active feed | Detail route finds `games$` by `OriginalMatchId` | active feed initially; WebUI detail only if richer confirmed endpoint is needed |
| Market expansion | `MatchOdds` used for all market rendering | WebUI validates posted market/option/line | Client groups/filter odds locally | active feed DTO/adapters |
| Shortcode lookup | active feed has `MatchNo` | `GET /api/Matches/GetMatchByShortCode` exists | No active online frontend call found for prematch browse | WebUI only for explicit shortcode/admin-style lookup |
| Odds updates | refreshed by 15-minute service refetch; changed odds returned by ticket validation | `ChangedOddsQuery` validates against `MatchOdds` table and returns changed odds | On `OddsChanged`, updates betslip and mutates `games$` selected odd | WebUI validation response for submission; decide later if active service refetch is enough for browsing |
| Removed/suspended matches | empty/failure refresh clears store; next full refresh drops missing matches | WebUI rejects started/not-current/unavailable matches | Started match errors remove selected bets | WebUI validation plus active feed refresh |
| Search | client-side over active feed | none for prematch search | Search over league/home/away | client-side active feed initially |
| Booking | none | `POST /api/Ticket/Booking` | `postTicketBooking(ticket)` | WebUI client |
| Bet placement | none | `POST /api/Ticket` | `postTicket(ticket)` | WebUI client |

## Identifier Mapping To WebUI Betting

| Active feed field | Older frontend betslip field | WebUI request field | Required? | Conversion |
|---|---|---|---|---|
| `MatchNo` | `matchNo` | optional/display; WebUI DTO has `ShortCode` but old payload does not send it | not for validation | copied as display number |
| `OriginalMatchId` | `matchId` | `betData[].matchId` / `BetViewModel.MatchId` | yes | copied as number |
| `MatchOddId` | `matchOddId` and `MatchOddId` in older frontend | traceability for new foundation; older payload included `MatchOddId` | not part of new selection identity | preserve when present, but do not use as the frontend selection key |
| `BookMakerId` | `bookMakerId` | `betData[].bookMakerId` / `BetViewModel.BookMakerId` | used for odd lookup/cache | copied; mobile defaults to `1` if absent |
| `BetCategory` | `market` | `betData[].betCategory` / `BetViewModel.BetCategory` | yes | copied |
| `BetOption` | `option` | `betData[].betOption` / `BetViewModel.BetOption` | yes | copied |
| `Line` | `line` | `betData[].line` / `BetViewModel.Line` | required for line markets, nullable otherwise | copied, preserving `null` |
| `Odd` | `odd` | `betData[].odd` / `BetViewModel.Odd` | yes | copied as number |
| `League` | not posted | not posted | no | display/filter only |
| `StartTime` | not posted | not posted | no | display/filter only |
| `HomeTeamName` | `homeTeam` | not posted by old ticket payload; DTO has `HomeTeamName` but payload omits it | no | display/error messages |
| `AwayTeamName` | `awayTeam` | not posted by old ticket payload; DTO has `AwayTeamName` but payload omits it | no | display/error messages |

Frontend selection construction:

- Desktop detail selection: `GameDetails.js:65-82`.
- Mobile list selection: `MobileSoccer1x2Odds.js:138-162`.
- Ticket payload mapping: `async-actions/index.js:29-51`.
- Bet duplicate/toggle key: `matchId + market + option + line`; see `bets-store.js:12-18`.

WebUI validation confirmation:

- `POST /api/Ticket` requires roles `Manager,OnlineClient,Teller`; see `ApiTicketController.cs:174-176`.
- `POST /api/Ticket/Booking` uses booking user and service; see `ApiTicketController.cs:221-238`.
- `CreateReceiptViewModel.BetData` binds to `BetViewModel`; see `CreateReceiptViewModel.cs:43-52` and `CreateReceiptViewModel.cs:117-143`.
- `BetViewModel.MatchId` and `MatchOddId` are server DTO fields; see `CreateReceiptViewModel.cs:123-124`.
- WebUI validates `MatchId` as `Match.BetServiceMatchNo` and current set membership through `ShortMatchCodes.MatchNo`; see `ICreateReceiptService.cs:1348-1370`.
- WebUI first looks up current odds by `MatchOddId`; if absent it falls back to `BetServiceMatchNo + Line + Market + Option`; see `ICreateReceiptService.cs:109-150`.
- Changed odds are returned with current `MatchOddId`, `MatchId`, market, option, bookmaker, line, and odd; see `ICreateReceiptService.cs:82-93`.

Conclusion: for prematch browsing and selection modeling, `OriginalMatchId` must correspond to WebUI `Match.BetServiceMatchNo`, and the frontend selection key is `OriginalMatchId|BetCategory|BetOption|Line|BookMakerId`. `MatchOddId` should be preserved for diagnostics/traceability when present, but the current operational contract should not make it the critical frontend betting identifier. `MatchNo` is not interchangeable with `OriginalMatchId`.

## Market Handling

Market constants:

- `src/markets/index.js:2-30` defines `1x2`, `1x2_H1`, `1x2_H2`, `BTS`, `BTS_H1`, `BTS_H2`, `DC`, `DC_H1`, `DC_H2`, `OU`, `OU_H1`, `OU_H2`, `OE`, `EH`, `DNB`, `HTFT`, `HSH`, `RTG`, `RBTS`, `TGBTS`, and `Next_Goal`.
- `src/markets/index.js:32-50` maps active online market labels.
- `src/markets/index.js:52-70` defines expected option order for headline markets.

Headline/mobile list:

- Most Popular renders fixed six chips: `1x2` options `1`, `X`, `2` plus `DC` options `1X`, `12`, `X2`; see `MobileSoccer1x2Odds.js:263-295`.
- Line markets `OU`, `OU_H1`, and `OU_H2` iterate `0.5`, `1.5`, `2.5`, `3.5`; see `MobileSoccer1x2Odds.js:298-311`.
- Regular markets iterate configured `MARKETS_OPTIONS`; see `MobileSoccer1x2Odds.js:314-320`.
- More-markets count compares total `MatchOdds.length` to rendered chips; see `MobileSoccer1x2Odds.js:509-519`.

Odd matching:

- Generic exact matching is `BetOption`, `Line`, and `BetCategory`; see `functions/index.js:498-502`.
- Mobile matching normalizes market/category/option casing and handles variants for `1x2`, `DC`, `BTS`, `OE`, and `OU`; see `MobileSoccer1x2Odds.js:196-256`.
- `1x2` accepts numeric/textual aliases: target `1` can match `HOME`, `2` can match `AWAY`, and `X` can match `DRAW`; see `MobileSoccer1x2Odds.js:213-223`.
- `Line` compares as strings in mobile matching and exact value in generic matching; see `MobileSoccer1x2Odds.js:207-211` and `functions/index.js:498-502`.

Detail page markets:

- Detail renders BTS, DC, DNB, EH, HTFT, HSH, OE, OU, and 1x2 first/second-half variants; see `GameDetails.js:653-670`.
- European handicap iterates lines `-5` through `5`; see `GameDetails.js:183-215`.
- HTFT options are `1/1`, `1/X`, `1/2`, `X/1`, `X/X`, `X/2`, `2/1`, `2/X`, `2/2`; see `GameDetails.js:232-248`.
- Correct score and combined market components exist separately; future integration should inspect them before rendering those markets.

Shortcut handling:

- `evaluateBetOptionShortCut()` maps local shortcuts to bet options; see `functions/index.js:223-230`.
- `findBetOption()` maps shortcuts into `MatchOdds` for line and handicap markets; see `functions/index.js:392-440`.

Bookmaker handling:

- Active odds carry `BookMakerId`.
- Desktop copies `BookMakerId` as-is; see `GameDetails.js:65-81`.
- Mobile defaults missing `BookMakerId` to `1`; see `MobileSoccer1x2Odds.js:143-146`.
- WebUI changed-odds cache key includes bookmaker, but fallback DB query by market does not filter bookmaker and orders by bookmaker priority; see `ICreateReceiptService.cs:64-80` and `ICreateReceiptService.cs:131-150`.

Suspended/stale odds:

- Prematch browsing does not merge a live prematch update stream.
- Disabled/missing odd handling is UI-local through placeholders or missing chips.
- Server-side started-match and changed-odd responses are handled on booking/place; see `async-actions/index.js:102-133`.

## Odds Update Behavior

Prematch:

- Browsing refreshes the active service every 15 minutes.
- There is no confirmed active-service incremental update endpoint in the older frontend.
- `GET /api/Matches/GetUpdates` exists in WebUI, but no older online frontend call was found for prematch browsing.
- On WebUI `OddsChanged`, the old frontend updates the selected bet and mutates the corresponding active-feed odd in `games$`; see `async-actions/index.js:115-128` and `functions/index.js:637-653`.
- On WebUI `MatchStarted`, the old frontend removes selected bets by match id; see `async-actions/index.js:102-112`.

Live:

- Live updates use Socket.IO, not the active prematch service.
- Socket URL defaults to `wss://socket.smbet.info`; see `environment/index.js:48` and `socket_module.js:124-141`.
- Events include `expired-key`, `buffers`, `buffer-diffs`, `deposit.updated`, and `wallet.updated`; see `socket_module.js:148-155`.
- The alternate socket module also listens for `expired-key`, `buffers`, and `buffer-diffs`; see `socket-io/index.js:313-316`.
- `buffers` decode protobuf event payloads and upsert `liveGamesStorage`; see `socket_module.js:47-87` and `socket-io/index.js:210-274`.
- `expired-key` removes live events; see `socket_module.js:89-99` and `socket-io/index.js:281-289`.
- `buffer-diffs` parsing exists but the main `socket_module.js` does not currently apply diffs; see `socket_module.js:38-44`.

## New UI Implications

Screens that should use active-feed matches:

- Home prematch/top-style match cards that need full active odds.
- `/soccer` prematch sections currently rendered by `components/Pages/Soccer/TopSoccer.tsx`.
- Upcoming/prematch event lists currently driven by `public/data/tabOne.ts` and `public/data/tabThree.ts`, after confirming whether the active feed includes enough upcoming horizon.
- Fixture detail/market expansion views, once implemented.

Headline markets to show first:

- Most Popular: `1x2` (`1`, `X`, `2`) and `DC` (`1X`, `12`, `X2`).
- Then line markets like `OU` with `0.5`, `1.5`, `2.5`, `3.5`.
- Then BTS/OE and first-half/second-half variants after adapters are tested.

Fields requiring adapters:

- `OriginalMatchId` -> stable `fixtureId` and WebUI `matchId`.
- `MatchNo` -> display `matchNo` / shortcode.
- `League` -> competition/league display and grouping.
- `StartTime` -> parsed kickoff plus display label.
- `HomeTeamName` / `AwayTeamName` -> team labels.
- `MatchOdds[]` -> market groups and selectable odds.
- `MatchOddId`, `BookMakerId`, `BetCategory`, `BetOption`, `Line`, `Odd` -> preserved selection payload fields.

Data that should not come from the active service:

- Login/session/current user.
- Balance/account settings.
- Company settings/limits/bonus rules.
- Booking and bet placement.
- Payment/deposit/withdrawal flows.
- Receipt/ticket history.
- Server validation of current set, status, changed odds, started matches, stake limits, account limits, and authorization.

Recommended client split:

```text
webUiApiClient
  base: NEXT_PUBLIC_API_BASE_URL
  credentials: include
  path behavior: WebUI /api routes
  owns: auth, account, settings, booking, bet placement, payments, receipts, WebUI support match endpoints

activeMatchesApiClient
  base: NEXT_PUBLIC_MATCHES_API_BASE_URL
  default: https://api-games.smbet.net if confirmed by deployment config
  credentials: omit unless live service response proves otherwise
  owns: GET / active prematch matches and full prematch odds
```

Do not route booking or bet placement through the active service. Do not use WebUI-only top matches as a replacement for the active feed unless the missing `MatchOddId` and full market contract are resolved.

Recommended initial polling interval after UI integration begins:

```text
5 minutes, matching Cache-Control: public, max-age=300.
```

The older frontend's 15-minute polling should be treated as safe for submission only because WebUI revalidates odds and match availability during booking/placement. It is likely too stale for a polished browsing experience.

## Risks

- The active service response was audited through older frontend usage and the user-provided DTO, not a live network capture.
- Source fallback uses `api-games.smbet.info`, while runtime verification used the known service `api-games.smbet.net`; deployment configuration must decide the new UI default.
- CORS works for non-credentialed browser GET from localhost, but credentialed calls are not supported by the captured CORS headers.
- The active service appears to be full-feed and client-filtered; performance must be measured before rendering all sports/routes.
- Runtime DB verification did not find active-service `OriginalMatchId` or `MatchOddId` values in the accessible configured WebUI database. Booking/placement must not be enabled until the target WebUI environment is confirmed to share the active service's `OriginalMatchId` values.
- `MatchNo` and `OriginalMatchId` are distinct. Using display match number as WebUI `MatchId` is unsafe.
- `StartTime` timezone is unconfirmed.
- Prematch incremental updates are not confirmed. A 15-minute refetch may be stale for browsing, while server-side validation catches stale selections only at submit time.
- Mobile code defaults absent `BookMakerId` to `1`, but backend current-odd fallback can choose by bookmaker priority. Preserve actual bookmaker IDs whenever available.

## Unresolved Questions

- Is `https://api-games.smbet.net` the final production active matches URL for the Next.js app, or should it be environment-only with no default?
- What are the active service CORS, cache, compression, and response size characteristics?
- Does the active service return only football/soccer or multiple sports?
- Is there an active service field for sport ID/code/icon, or should sport navigation remain static/WebUI-derived?
- Which deployed WebUI database is paired with `https://api-games.smbet.net/`?
- Does the paired target WebUI environment contain `OriginalMatchId == WebUI Match.BetServiceMatchNo` for every row?
- Are `MatchOddId` values always present in the paired target WebUI `MatchOdds.MatchOddId` table?
- Is there a separate active service update/removal endpoint not used by the older frontend?
- Should new UI browse odds refresh more frequently than 5 minutes, or should it respect the captured `max-age=300` cache header?
