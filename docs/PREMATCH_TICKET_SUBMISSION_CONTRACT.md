# Prematch Ticket Submission Contract

Date: 2026-07-29

## Scope

This document verifies the backend contracts needed before the Phase 4 SmartBetUI prematch ticket adapter. It does not enable booking, ticket submission, payment, or bet placement.

## Authoritative Outcome

| Contract | Outcome |
|---|---|
| Match identifier | Active-feed `OriginalMatchId` is the WebUI `Matches.BetServiceMatchNo` for the verified release target. SmartBetUI should send it as `BetData[].MatchId`; do not guess from `MatchNo` or `ShortCode`. |
| Display match number | Active-feed `MatchNo` is the short match code for the current set. It is display/entry metadata, not the durable match id. |
| Selection identity | Stable selection identity is `MatchId + BetCategory + BetOption + Line`, with `BookMakerId` and posted `Odd` included for server revalidation/context. |
| `MatchOddId` | The active feed can carry the real `MatchOdds.MatchOddId` for the release target, but WebUI should not require it as the only prematch authority. It is an optional row lookup/reconciliation aid for direct tickets and can be resolved server-side for booking. |
| Phase 4 readiness | Adapter implementation can begin behind the existing disabled submission guard for the release-aligned OnlineClient/API target. Real booking or placement must remain disabled until backend validation behavior is tested and the stale teller/live `CreateReceiptValidator` guard is reconciled. |

## Source Evidence

| Area | File | Evidence |
|---|---|---|
| Feed query source | `BetSoftware.WebCore/Controllers/Api/ApiMatchesController.cs` | The set-feed SQL aliases `vG.BetServiceMatchNo` as `OriginalMatchId` and `vG.MatchShortCode` as `MatchNo`. |
| Feed source view | `BetSoftware.DataAccessLayerCore/SQL Queries/vGames.sql` | `vGames.BetServiceMatchNo` is `ShortMatchCodes.MatchNo`, joined to `Matches.BetServiceMatchNo`; `MatchShortCode` is `ShortMatchCodes.ShortCode`. |
| Odds source view | `BetSoftware.DataAccessLayerCore/SQL Queries/vGameOdds.sql` | Odds rows expose `MO.BetServiceMatchNo`, `MO.MatchOddId`, `MO.Line`, `MO.Odd`, market, and option. |
| WebUI request DTO | `BetSoftware.Domain/Models/ViewModels/CreateReceiptViewModel.cs` | `BetViewModel` includes `MatchId`, nullable `MatchOddId`, `BetCategory`, `BetOption`, `Line`, `BookMakerId`, `Odd`, `ShortCode`, and `IsLive`. |
| Bet persistence | `BetSoftware.Domain/Models/ViewModels/CreateReceiptViewModel.cs`, `BetSoftware.Domain/Models/Concrete/Bet.cs` | `GetBets()` persists `MatchId`, `Market`, `Option`, `Line`, and `BetOdd`; `Bet.MatchOddId` is `[NotMapped]`. |
| Match validation | `BetSoftware.Services/ICreateReceiptService.cs` | `MatchSetAndStatusValidator` checks `match.BetServiceMatchNo == BetData[].MatchId` and requires `ShortMatchCodes.MatchNo == MatchId` for the active `SetNo`. |
| Direct OnlineClient revalidation | `BetSoftware.Services/ICreateReceiptService.cs` | `CreateOnlineReceiptService` sets the active `SetNo` and calls `BaseHandle`; `ChangedOddsQuery` first tries positive `MatchOddId`, then falls back to `BetServiceMatchNo + Line + Market + Option`. |
| Teller/live validator mismatch | `BetSoftware.Services/ICreateReceiptService.cs` | `CreateReceiptValidator` is used by teller/manager and live services and rejects every non-live bet without positive `MatchOddId` before fallback odds lookup can run. |
| Booking validation | `BetSoftware.Services/ITicketBookingService.cs` | `ValidateAndNormalizeAsync` resolves candidate odds by `BetServiceMatchNo + Market + Option + BookMakerId + normalized Line` and assigns `MatchOddId` server-side. |
| Endpoint | `WebUI/Controllers/Api/ApiTicketController.cs` | Direct placement is `POST /api/Ticket` with `CreateReceiptViewModel` and roles `Manager,OnlineClient,Teller`; booking is `POST /api/Ticket/Booking`. |

WebCore is not the placement authority, but its feed code and SQL views are useful provenance for `OriginalMatchId`. The WebUI MVC controller, DTOs, domain models, and `BetSoftware.Services` remain the placement authority.

## Runtime Evidence

Read-only active-feed request:

| Field | Value |
|---|---|
| Feed URL | `GET https://api-games.smbet.net/` |
| `OriginalMatchId` | `9659987` |
| `MatchNo` | `52` |
| Teams | `Defensa Y Justicia` vs `Deportivo Riestra` |
| League | `Argentina Primera Division` |
| Start time | `2026-07-29T23:00:00` |
| First selection | market `1x2`, option `1`, line `null`, bookmaker `43`, odd `2.30`, `MatchOddId` `904997251` |

Read-only WebUI release database checks for the same fixture:

| Field | Value |
|---|---|
| `Matches.BetServiceMatchNo` | `9659987` |
| Teams | `Defensa Y Justicia` vs `Deportivo Riestra` |
| League | `Argentina Primera Division` |
| `Matches.Status` | `1` |
| Active `Sets.SetNo` | `20260729` |
| `ShortMatchCodes.MatchNo` | `9659987` |
| `ShortMatchCodes.ShortCode` | `52` |
| `MatchOdds.MatchOddId` | `904997251` |
| `MatchOdds.BetServiceMatchNo` | `9659987` |
| `MatchOdds.Market` | `1x2` |
| `MatchOdds.Option` | `1` |
| `MatchOdds.Line` | `null` |
| `MatchOdds.BookMakerId` | `43` |
| `MatchOdds.Odd` | `2.30` |

The non-release configured WebUI database also contained `Matches.BetServiceMatchNo = 9659987`, but lacked a `ShortMatchCodes` row for the sample and did not contain the exact feed `MatchOddId`. Phase 4 must target the release-aligned WebUI database/API environment or another verified environment with the same set and odds data.

## Validation Path

For authenticated OnlineClient placement through `POST /api/Ticket`:

1. Controller binds `CreateReceiptViewModel`.
2. Online service resolves the active `SetNo`.
3. Online balance and stake checks run.
4. Prematch match validation checks `BetData[].MatchId` against `Matches.BetServiceMatchNo` and active `ShortMatchCodes.MatchNo`.
5. Started-match validation rejects fixtures already in progress.
6. Odds validation checks the posted odds against `MatchOdds`.
7. If rounded posted odds differ from current odds, WebUI returns `OddsChanged` with updated selections; the frontend must require user confirmation before retry.
8. If validation passes, WebUI creates a `Receipt` and `Bet` rows from server-validated data.

The current inconsistency is outside the OnlineClient path: `CreateReceiptValidator` still rejects missing prematch `MatchOddId` for teller/manager and live services before fallback odds lookup can run. A universal frontend/backend contract should not depend on OnlineClient bypassing that stale guard.

For booking through `POST /api/Ticket/Booking`, `ITicketBookingService.ValidateAndNormalizeAsync` already follows the stable-field pattern more closely: it verifies current set membership, loads `MatchOdds`, matches by `MatchId`, `BetCategory`, `BetOption`, `BookMakerId`, and normalized `Line`, assigns the database `MatchOddId`, and returns `OddsChanged` if the posted odd is stale.

## Required Backend Correction

Recommended MatchOddId outcome: separate live/teller legacy validation from prematch OnlineClient/booking validation, or remove the unconditional prematch `MatchOddId` requirement from the shared validator. Keep server odds validation authoritative by stable identifiers.

The corrected backend behavior should be:

- Accept prematch selections with `MatchOddId` omitted or `null` when `MatchId`, `BetCategory`, `BetOption`, `BookMakerId`, and `Line` are present.
- Treat positive `MatchOddId` as an optional exact-row lookup.
- If the exact-row lookup fails, fall back to `MatchId + BetCategory + BetOption + BookMakerId + Line`, or document why bookmaker priority is intentionally used instead.
- Reject unavailable/suspended markets when no current odds row exists.
- Return `OddsChanged` when the current server odd differs from the posted odd.
- Do not accept any client-generated or placeholder `MatchOddId`.

The direct OnlineClient fallback query should be reviewed for bookmaker handling. Existing `ChangedOddsQuery.GetCurrentOddByMarket` does not filter by `BookMakerId`, while booking validation does. If bookmaker identity is material, direct ticket validation should include it or define a server-side bookmaker-priority rule.

## Phase 4 Payload Example

This is a proposed adapter payload only. It must not be wired to UI submission until the backend guard is fixed and verified.

```json
{
  "TotalBonus": 0,
  "TotalStake": 1000,
  "BookingCode": 0,
  "IsLive": false,
  "PaymentSource": null,
  "PaymentReference": null,
  "BetData": [
    {
      "MatchId": 9659987,
      "MatchOddId": 904997251,
      "BetCategory": "1x2",
      "BetOption": "1",
      "Line": null,
      "BookMakerId": 43,
      "Odd": 2.3,
      "ShortCode": 52,
      "IsLive": false
    }
  ]
}
```

If `MatchOddId` is absent in a future feed item, the adapter should omit it or send `null`; it must not send `0`, an array index, `MatchNo`, `OriginalMatchId`, or any generated placeholder.

## Backend Tests To Add

No new backend tests were committed from SmartBetUI-v2 because the authoritative backend project is a separate repository. The WebUI backend should add tests covering:

- valid prematch selection with real `MatchOddId`
- valid OnlineClient prematch selection with missing `MatchOddId`
- valid booking selection with missing `MatchOddId` resolved server-side
- teller/manager behavior for missing prematch `MatchOddId`
- invalid `MatchId`
- match missing from current set
- invalid market/option/line
- changed odds
- suspended/locked market behavior
- duplicate selections
- invalid stake
- insufficient online balance
- duplicate request/idempotency behavior, if supported by backend

## Remaining Blockers

1. Reconcile and test WebUI `CreateReceiptValidator` so non-live/teller validation does not contradict the OnlineClient and booking stable-field paths.
2. Confirm the deployed WebUI API used by SmartBetUI points at the release-aligned database/API environment where active feed IDs match current set and odds data.
3. Decide whether direct ticket fallback odds lookup must include `BookMakerId` or a documented server-side bookmaker-priority rule.
4. Keep SmartBetUI placement and booking controls disabled until the Phase 4 adapter is implemented, tested against the release-aligned API, and explicitly approved for enablement.
