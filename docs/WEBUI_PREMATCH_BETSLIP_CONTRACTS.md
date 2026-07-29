# WebUI Prematch Betslip & Ticket Placement Contracts

Date: 2026-07-20

## 1. Purpose and scope

This is a contract-audit-only document for the prematch betslip and ticket-placement flow needed before `SmartBetUI-v2` Phase 4. It does not wire bet placement, booking, live betting, payments, or account changes.

Allowed output for this task: this file only.

## 2. Source-of-truth rules

**Confirmed:** The operational contract authority is `Bet\Bet\WebUI\BetSoftware.Web.csproj`. WebUI controller code, DTOs and services are authoritative for placement, booking, validation, errors and receipt output.

**Confirmed by system owner:** `MatchOddId` is not a required betting constraint and does not need to be included when placing a bet. This document treats `MatchOddId` as feed/display identity and an optional lookup aid, not as the mandatory operational placement identifier.

**Code/document mismatch to resolve before Phase 4:** The inspected WebUI service currently contains a prematch guard in `CreateReceiptValidator` that returns "Prematch odd could not be selected. Missing MatchOddId." when a non-live bet has no positive `MatchOddId`. That guard conflicts with the owner-confirmed placement contract and should not be used as the Phase 4 frontend contract without backend clarification or correction.

**Confirmed:** The active-games feed is a browse/read model. It is not sufficient authority for placing a bet.

**Confirmed:** WebCore was not used as contract evidence. Search results that included WebCore were ignored.

**Confirmed:** The located older online frontend is `online\online\BET720.Web\app`.

**Confirmed:** Phase 3 SmartBetUI currently has only a client-side selection shell. It does not submit bets.

## 3. Investigation methodology

Baseline state was captured before editing:

| Repository | Baseline |
|---|---|
| `SmartBetUI-v2` | Dirty before this task, including Phase 1-3 prematch changes and untracked docs/source files |
| `Bet\Bet` | Dirty before this task: `BetSoftWare.sln` modified |
| `online\online\BET720.Web\app` | Dirty before this task with many modified app/backend/assets files |

Files inspected:

| Area | Source files |
|---|---|
| Prior prematch contract | `docs/WEBUI_PREMATCH_SPORTS_CONTRACTS.md` |
| Phase 3 foundation | `src/betslip/PrematchBetslipProvider.tsx`, `usePrematchBetslip.ts`, `src/domain/prematch.ts`, `src/domain/prematchMarkets.ts`, `FooterCard.tsx`, `PrematchBrowser.tsx`, `PrematchFixtureDetails.tsx` |
| Located older online app | `app/src/api.ts`, `store.ts`, `types.ts`, `functions.ts`, `components/Receipt.tsx`, `ReceiptBottomSummary.tsx`, `ReceiptSelections.tsx`, `Stake.tsx`, `BetCell.tsx` |
| WebUI placement contracts | `ApiTicketController.cs`, `ApiReceiptController.cs`, `ApiBetPaymentController.cs`, `CreateReceiptViewModel.cs`, `ICreateReceiptService.cs`, `ITicketService.cs`, `Receipt.cs`, `Bet.cs`, `Branch.cs`, `ReceiptBookingCode.cs` |
| WebUI bundled frontend evidence | `WebUI/Scripts/app/src/api/index.js`, `factory/receipt-factory.js`, `factory/bet-factory.js`, `actions.js`, `functions.js`, `components/Receipt.js` |

Finding labels:

- **Confirmed:** Proven directly by inspected source.
- **Inferred:** Strongly indicated by connected source, but not fully proven at runtime.
- **Unresolved:** Not proven locally.

## 4. Endpoint inventory

| Operation | Method | Route | Controller/action | Request model | Auth | Response | Caller evidence | Status |
|---|---|---|---|---|---|---|---|---|
| Create ticket | POST | `/api/Ticket` | `ApiTicketController.Create` | `CreateReceiptViewModel` | `[Authorize(Roles = "Manager,OnlineClient,Teller")]` | `CreateReceiptResult`; OnlineClient gets `200 OK` empty on success or `417` result on failure; teller/manager gets JSON result | WebUI bundled frontend `api.postTicket()` posts `/api/Ticket`; `actions.printReceipt()` builds receipt and posts it | **Confirmed WebUI endpoint** |
| Create booking | POST | `/api/Ticket/Booking` | `ApiTicketController.CreateTicketBooking` | `CreateReceiptViewModel` | No action-level `[Authorize]`; controller has no class-level `[Authorize]` | `200 OK CreateReceiptResult` on success; `417 CreateReceiptResult` on failure | No located online-app caller; WebUI service exists | **Confirmed WebUI endpoint, usage unresolved in located online app** |
| Load booking | GET | `/api/Ticket/GetBooking?id={Id}` | `ApiTicketController.GetTicketBooking` | query `int Id` | No action-level `[Authorize]` | receipt with `GameBets`, or `417` message | WebUI bundled frontend `getBookedTicket()` and `loadBookedTicket()` | **Confirmed WebUI endpoint** |
| List receipts | GET | `/api/Receipt` | `ApiReceiptController.GetAll` | `TicketFilter` query | `[Authorize]` controller | paged `ReceiptListItem[]` | Located online app `get_receipts()` calls `/api/Receipt` | **Confirmed usage, read-only receipt history** |
| Receipt details | GET | `/api/Receipt/GetById/{id}` | `ApiReceiptController.GetById` | route `int id` | `[Authorize]` controller | `TicketByIdJson` anonymous object | WebUI manager/ticket detail paths; located app instead calls `/api/Receipt/{id}`, not confirmed in WebUI | **Confirmed WebUI endpoint; located app route mismatch unresolved** |
| Cancel ticket | POST | `/api/Ticket/Cancel/{id}` | `ApiTicketController.Cancel` | route `int id` | `[Authorize(Roles = "Cancelling")]` | `200 true` or `417` message | Not used by located online app | **Confirmed WebUI endpoint** |
| Confirm printed ticket | GET | `/api/Ticket/Confirm/{id}` | `ApiTicketController.ConfirmBet` | route `int id` | none observed | `(bool, string)` result | No caller found | **Confirmed WebUI endpoint, usage unresolved** |
| Start mobile-money ticket payment | POST | `/api/BetPayment/ValidateAndStartMobileMoney` | `ApiBetPaymentController.ValidateAndStartMobileMoney` | `{ ticket: CreateReceiptViewModel, phoneNumber, promoCode }` | `[Authorize(Roles = "Manager,Teller,OnlineClient")]` | status/session DTO or validation errors | WebUI bundled frontend `startMobileMoneyBetPayment()` | **Confirmed WebUI payment path** |
| Poll mobile-money payment | GET | `/api/BetPayment/Status/{sessionId}` | `ApiBetPaymentController.Status` | route `sessionId` | `[Authorize(Roles = "Manager,Teller,OnlineClient")]` | status, paymentStatus, ticketStatus, ticketData, updatedSelections, errors, odds totals | WebUI bundled frontend `getBetPaymentStatus()` | **Confirmed WebUI payment path** |
| Accept changed odds after payment | POST | `/api/BetPayment/AcceptNewOdds/{sessionId}` | `ApiBetPaymentController.AcceptNewOdds` | route `sessionId` | `[Authorize(Roles = "Manager,Teller,OnlineClient")]` | payment status response | WebUI bundled frontend `acceptMobileMoneyBetPayment()` | **Confirmed WebUI payment path** |
| Cancel mobile-money payment/ticket | POST | `/api/BetPayment/Cancel/{sessionId}` | `ApiBetPaymentController.Cancel` | route `sessionId` | `[Authorize(Roles = "Manager,Teller,OnlineClient")]` | status message and wallet fields | WebUI bundled frontend `cancelMobileMoneyBetPayment()` | **Confirmed WebUI payment path** |
| Located online app create ticket | POST | `/api/Receipt` | No matching WebUI placement action found | `{ amt, bets[] }` `TicketModel` | WebUI `ApiReceiptController` is `[Authorize]` but has no POST create at route root | unresolved | Located online app `save_receipt()` and `Receipt.tsx` | **Unresolved route mismatch** |
| Located online app booking | POST | `/api/Receipt/Booking` | No matching WebUI action found | empty `BookingModel` type | unresolved | unresolved | Located online app `save_receipt_booking()` only | **Unresolved route mismatch** |

## 5. Older frontend betslip state and flow

**Confirmed:** The located older online app uses Zustand `useReceiptStore` with `selections`, `stake`, `total_odds`, `saving`, `upsert_selection`, `remove_selection`, `update_odd`, `update_stake`, and `reset` in `app/src/store.ts:110-197`.

**Confirmed:** Selection add/update is local only. `BetCell.tsx:33-70` merges the selected odd row with a game clone and calls `upsert_selection`. `store.ts:173-190` replaces an existing selection by `MatchNo`, meaning one selected leg per match in that client.

**Confirmed:** Removal is local only. `ReceiptSelections.tsx:29` removes by `bet.MatchNo`, and `store.ts:130-137` filters selections where `x.MatchNo != mid`.

**Confirmed:** Stake entry is local only before submit. `Stake.tsx` parses the input as a number and updates `receipt.stake`; the old app only checks greater-than-zero locally.

**Confirmed:** Located old app placement posts `TicketModel` to `/api/Receipt`, with shape `{ amt, bets }`, in `app/src/api.ts:179-183` and `components/Receipt.tsx:43-49`.

**Confirmed:** Located old app error handling expects:

- `400`: flatten `ModelState` messages.
- `401`: dispatch `ClearSignIn`, show "You need to sign in".
- `417`: return raw response body.
- `500`: use `detail` or "internal server error".

Source: `app/src/api.ts:17-73`.

**Unresolved:** The located old app's `/api/Receipt` create route and `{ amt, bets }` payload were not traced to the inspected WebUI placement controller. WebUI placement is implemented at `/api/Ticket` with `CreateReceiptViewModel`.

## 6. Selection identity contract

**Confirmed:** WebUI `CreateReceiptViewModel.BetData[]` uses `BetViewModel`. Prematch `BetViewModel` contains:

| Field | Type | Role |
|---|---|---|
| `MatchId` | `int` | Operational match id; for prematch this is `Match.BetServiceMatchNo` / active `OriginalMatchId` |
| `MatchOddId` | nullable `int` | Optional odd-row lookup aid in inspected code; feed/display identity for SmartBetUI |
| `BetCategory` | `string` | Market code |
| `BetOption` | `string` | Selection code |
| `Line` | `string` | Handicap/line/specifier |
| `BookMakerId` | `int` | Provider/bookmaker id |
| `Odd` | `decimal` | Client-posted odd, revalidated by server |
| `OptionId` | nullable `int` | Legacy/live option id; not required for confirmed prematch validation |
| `ShortCode` | `int` | Display/short code |
| `IsLive` | `bool` | Determines live vs prematch validation path |

Sources: `CreateReceiptViewModel.cs:43-106`, `BetViewModel` at `CreateReceiptViewModel.cs:117-146`.

**Confirmed by system owner:** `MatchOddId` is not required for bet placement. It may identify an odds row in the generated browse feed and can be used by SmartBetUI for local selected state, refresh reconciliation, React keys and odds movement tracking.

**Confirmed from inspected source:** WebUI's changed-odds query tries `MatchOddId` only when it is supplied and positive. If no usable `MatchOddId` is supplied, or if no row is found, it falls back to `MatchId + Line + BetCategory + BetOption`. The fallback query does not filter by `BookMakerId`; it returns a current odd row and projects that row's `BookMakerId`. Source: `ChangedOddsQuery.GetCurrentOddByMatchOddId` and `GetCurrentOddByMarket` at `ICreateReceiptService.cs:73-150`.

**Confirmed from inspected source, but conflicting with owner clarification:** `CreateReceiptValidator` still contains a guard that rejects any non-live bet without a positive `MatchOddId` at `ICreateReceiptService.cs:1319-1324`. This appears to be stale or stricter than the owner-confirmed contract. Phase 4 should not make `MatchOddId` mandatory in the frontend contract solely because this guard exists; the mismatch must be resolved with backend code/owner before real placement is enabled.

**Operational bet identity:** The proven operational fields used by the prematch validation path are `MatchId` for match availability/set validation, `BetCategory`, `BetOption`, and `Line` for current-odd fallback lookup, and `Odd` as the posted price compared against the current database odd. `BookMakerId` is part of the in-memory odd cache key and response metadata, but the inspected fallback database lookup does not require it to locate the current odd.

## 7. Add/remove/update selection behavior

**Confirmed:** Add/update/remove is client-side until placement:

| Client | Add/update key | Remove key | Notes |
|---|---|---|---|
| Located online app | `MatchNo` | `MatchNo` | one leg per match; posts legacy `{ amt, bets }` to unresolved `/api/Receipt` create route |
| WebUI bundled frontend | bet game `MatchNo`; option carries `MatchOddId` | `MatchNo` | `extractBet()` converts to `BetViewModel` before posting `/api/Ticket` |
| SmartBetUI Phase 3 | `MatchOddId` | `MatchOddId` | local feed/display identity only; no API submission yet |

**Confirmed:** WebUI server does not have an "add selection" endpoint. The whole betslip is posted when booking or placing.

## 8. Stake contract

**Confirmed:** WebUI request field is `TotalStake` (`int`) on `CreateReceiptViewModel`, not the located online app's `amt`.

**Confirmed:** Server stake validation:

- `Branch.PermitsStake()` rejects `<= 0` with "Stake is too low".
- Branch `MinStake` rejects below-minimum stake.
- Branch `MaxStake` rejects above-maximum stake.
- `AbstractCreator.BaseHandle()` additionally reads branch limits, defaulting to min `1000` and max `50000` when branch values are missing.
- `CompanySettings.StakeMultiples` can require stake multiples.

Sources: `Branch.cs:100-112`, `ICreateReceiptService.cs:542-555`, `ICreateReceiptService.cs:827-852`.

**Confirmed:** Located/WebUI frontends perform local display validation, but server recomputes and enforces the final stake rules.

## 9. Total odds and potential win

**Confirmed:** WebUI server recomputes total odds as `Math.Round(BetData.Aggregate(1m, acc * next.Odd), 2)` in `CreateReceiptViewModel.GetTotalOdds()`.

**Confirmed:** `CreateReceipt()` stores `TotalOdds = context.ReceiptViewModel.GetTotalOdds()` and `Stake = TotalStake`; client `TotalOdd` is not trusted as final.

**Confirmed:** WebUI bundled frontend computes display total odds by multiplying selected `option.Odd`, and display net pay as stake times total odds minus tax plus bonus, capped by `MaxPayout`. Source: `functions.js:31-33`, `ReceiptBottomSummary.js:18-29`.

**Confirmed:** Receipt payout output uses server `Receipt.GetPayoutOrWinAmount(maxPayout, bonusType)`, applying tax/bonus and maximum payout cap; `RefundBonus` uses a different formula. Source: `Receipt.cs:198-234`.

**Unresolved:** Exact rounding policy for every displayed amount before payment is partly split between JS `Math.round`, `toFixed`, server `Math.Round`, and receipt payout rounding. Phase 4 should consume server-returned totals after validation rather than duplicating all behavior as authority.

## 10. Odds validation and change handling

**Confirmed:** Prematch validation path:

1. Validate user/account/branch/current set/basic slip.
2. Validate prematch `MatchId` is in current set and `Match.Status == 1`.
3. Detect started matches.
4. Query changed odds by supplied positive `MatchOddId` if present; otherwise fallback to `MatchId + Line + BetCategory + BetOption`.
5. If rounded posted odd differs from current odd, return `Message = "OddsChanged"` and `ChangedOdds`.

Sources: `ICreateReceiptService.cs:538-590`, `ChangedOddsQuery` at `ICreateReceiptService.cs:41-168`, `MatchSetAndStatusValidator` at `ICreateReceiptService.cs:1330-1371`.

**Confirmed:** The server compares `Math.Round(posted Odd, 2)` against `Math.Round(current database Odd, 2)`. If different, the changed-odds response includes updated `BetViewModel` rows with `PostedOdd`, current `Odd`, `MatchOddId` if found, `MatchId`, `BetCategory`, `BetOption`, `BookMakerId`, `Line`, and `UpdatedAtUtc`.

**Confirmed by system owner:** `MatchOddId` should not be treated as the primary mandatory current-odds validation key. In Phase 4, current-odds validation must rely on the operational match/market/selection fields, with `MatchOddId` used only as an optional acceleration/reconciliation field where accepted by the backend.

**Confirmed:** Started/removed/unavailable selections return result messages such as `MatchStarted`, "not in the current set", "not available for betting", or "The game with the Match ID ... was not found".

**Confirmed:** For direct `/api/Ticket`, teller/manager receives a JSON `CreateReceiptResult` even on validation failure; OnlineClient receives HTTP `417` with the result body. For booking, failure is HTTP `417`.

**Confirmed:** WebUI bundled frontend handles `ChangedOdds` by updating odds in the slip and requiring user action to resubmit/continue. Mobile-money path can require explicit `AcceptNewOdds`.

## 11. Booking contract

**Confirmed:** Booking creation endpoint is `POST /api/Ticket/Booking` with `CreateReceiptViewModel`.

**Confirmed:** It loads a synthetic/user account where `UserName == "Booking"`, uses `RequestType.BookingClient`, creates a `Receipt`, generates booking code as `MAX(BookingCode)+1` with table lock, stores `ReceiptBookingCode`, and returns `CreateReceiptResult` with `JsonData.BookingCode`.

Sources: `ApiTicketController.cs:221-239`, `CreateReceiptBookingService` at `ICreateReceiptService.cs:1082-1150`, `GetBookingCode()` at `ICreateReceiptService.cs:854-861`.

**Confirmed:** Booking codes expire after 30 minutes. `ReceiptBookingCode` has `BookingCode`, `ReceiptId`, `BookingTime`, `UsedFrequency`; `BookingStatus()` checks elapsed minutes less than `BookingExpiryMinutes = 30`.

**Confirmed:** Booking redemption/loading uses `GET /api/Ticket/GetBooking?id={Id}`. `ITicketService.GetBookingAsync()` rejects missing, used, expired, or missing receipt; when valid, it reloads `GameBets` and attempts to recover `MatchOddId` by `MatchId + Market + Option + normalized Line`.

**Confirmed:** Placement with a booking code calls `MarkBookingRedeemedAsync()`, which atomically increments `UsedFrequency` only if unused and not expired. It rejects invalid, already-used, and expired booking codes.

**Unresolved:** No caller from the located older online app was found for WebUI `/api/Ticket/Booking`. The located app has `save_receipt_booking()` for `/api/Receipt/Booking`, but no matching WebUI route was found.

## 12. Ticket placement contract

**Confirmed:** Direct placement endpoint is `POST /api/Ticket`.

**Confirmed request shape:**

```json
{
  "SetNo": 123,
  "TotalBonus": 0,
  "TotalStake": 1000,
  "BookingCode": 0,
  "IsLive": false,
  "PaymentSource": null,
  "PaymentReference": null,
  "BetData": [
    {
      "MatchId": 9619994,
      "BetCategory": "1x2",
      "BetOption": "1",
      "Line": null,
      "BookMakerId": 0,
      "Odd": 1.83,
      "OptionId": null,
      "ShortCode": 61,
      "IsLive": false
    }
  ]
}
```

This JSON is reconstructed from `CreateReceiptViewModel` and `BetViewModel`, not captured from production.

**Mandatory placement fields, from inspected source and owner clarification:** The request must include `CreateReceiptViewModel.BetData[]`, `TotalStake`, `SetNo` for the current-set validation path, and `IsLive=false` for prematch. Each prematch `BetData` row must carry `MatchId`, `BetCategory`, `BetOption`, `Line` where applicable, and posted `Odd`. `BookMakerId` is accepted by the DTO and used in odd-cache metadata, but the inspected fallback database lookup locates the current odd without filtering by `BookMakerId`.

**Optional placement field:** `MatchOddId` is present on `BetViewModel` and can be used by inspected code as a first lookup attempt when supplied, but it is not owner-confirmed as a required betting constraint and should not be required by Phase 4. Current source still contains a mismatch guard requiring it for non-live bets; that must be reconciled before submitting without `MatchOddId`.

**Confirmed:** Server creates `Receipt` and `Bet` rows from `CreateReceiptViewModel.GetBets()`. Stored `Bet` rows persist `MatchId`, `Market`, `Option`, `Line`, `BetOdd`, live flags/scores, and timestamp. `Bet.MatchOddId` is `[NotMapped]`, so `MatchOddId` is not persisted on the `Bet` entity and is not the durable ticket identity.

**Confirmed:** Authenticated placement is required. The controller requires roles `Manager`, `OnlineClient`, or `Teller`.

**Unresolved:** Anonymous final placement is not supported by `POST /api/Ticket`; no anonymous placement endpoint was proven. Booking creation appears callable without action-level authorization, but it uses the `Booking` account and is not final placement.

## 13. Authentication and authorization

| Endpoint | Auth evidence | Behavior |
|---|---|---|
| `POST /api/Ticket` | `[Authorize(Roles = "Manager,OnlineClient,Teller")]` | Requires authenticated cookie identity with one of the roles |
| `POST /api/Ticket/Booking` | no action/class authorize found on `ApiTicketController` for this route | Appears anonymous-callable, but creates receipt under `UserName == "Booking"` |
| `GET /api/Ticket/GetBooking` | no action/class authorize found | Appears anonymous-callable for booking lookup |
| `GET /api/Receipt*` | `[Authorize]` on `ApiReceiptController` | Authenticated receipt access |
| `api/BetPayment/*` | `[Authorize(Roles = "Manager,Teller,OnlineClient")]` | Authenticated payment/session operations |

**Confirmed:** Web API uses cookie auth via WebApiConfig host authentication setup from the prior sports audit.

## 14. Receipt/ticket response contract

**Confirmed:** `CreateReceiptResult` fields:

| Field | Meaning |
|---|---|
| `Succeeded` | true/false |
| `Message` | validation or status message |
| `ChangedOdds` | updated `BetViewModel[]` |
| `StartedMatches` | invalid started/finished match list |
| `Errors` | structured `SlipValidationErrorVm[]` |
| `JsonData` | `SuccessfulReceiptData` on success |

**Confirmed:** `SuccessfulReceiptData` fields include `FormattedSerial`, `SetSize`, `Stake`, `TotalOdds`, `ReceiptNumber`, `ReceiptTime`, `Serial`, `TellerName`, `TicketCount`, `BookingCode`, `Balance`, `Base64QrImage`, `Base64Image`, `BranchName`, and `LiveBets`.

**Confirmed:** `ReceiptTime` is formatted with `:s`, e.g. ISO-like sortable local timestamp, in `ResultFactory.Success`.

**Confirmed:** Receipt details endpoint returns `ReceiptId`, `ReceiptDate`, `ReceiptStatus`, `StatusName`, `Serial`, `TokenizedSerial`, `Stake`, `SetSize`, `TotalOdds`, `WonAmount`, branch/user/payment/cancel fields.

## 15. Error and status catalogue

| Source | Raw status/code | Meaning | Retryable | User action | Old/frontend handling | Recommended new UI handling |
|---|---|---|---|---|---|---|
| WebUI direct ticket | `OddsChanged` | Posted odd differs from current DB odd | Yes after user accepts | Review new odds, resubmit | WebUI updates slip and rejects promise with messages | Show changed odds, update by returned `MatchOddId` when present, otherwise match/market composite; require explicit confirmation |
| WebUI direct ticket | `MatchStarted` | Prematch fixture started | No for that leg | Remove leg | WebUI removes affected bets | Remove/highlight affected leg, block submit |
| WebUI direct ticket | `MatchFinished` | Live path, match finished/stopped | No | Remove leg | WebUI removes/highlights | Same, out of prematch scope |
| WebUI direct ticket | "Prematch odd could not be selected. Missing MatchOddId." | Current source-code guard, but conflicts with owner-confirmed contract | No until backend reconciled | Treat as backend contract mismatch | Not supported in Phase 3 | Do not encode this as intended frontend validation; confirm/fix backend before Phase 4 |
| WebUI direct ticket | "not in the current set" | Fixture not in current set | No | Remove/reload | WebUI removes affected matches | Reload feed and remove selection |
| WebUI direct ticket | "not available for betting" | Match status not open | No | Remove/reload | WebUI shows/remove | Remove selection and message |
| WebUI direct ticket | "Minimum stake is..." | Below configured minimum | Yes | Increase stake | WebUI displays error | Use server min message; local hint only |
| WebUI direct ticket | "Maximum stake is..." | Above configured maximum | Yes | Reduce stake | WebUI displays error | Use server max message |
| WebUI direct ticket | "We accept figures in multiples of..." | Stake multiple violation | Yes | Adjust stake | WebUI displays error | Show exact multiple |
| WebUI direct ticket | "You have insufficient funds / less balance" | Online balance too low | Yes after funding/reducing stake | Login/fund/reduce | WebUI displays error | Auth/account action |
| WebUI direct ticket | HTTP `401` | Unauthenticated | Yes after login | Login | Located online app dispatches `ClearSignIn` | Require login, preserve slip |
| Booking load/redeem | "Booking code is invalid" | Unknown code | No | Re-enter code | WebUI bundled frontend shows booking error | Show invalid booking |
| Booking load/redeem | "Booking already used" | Used booking | No | New booking | WebUI bundled frontend shows error | Show used/expired |
| Booking load/redeem | "Booking code has expired" | Older than 30 min | No | New booking | WebUI bundled frontend shows error | Show expired and allow rebuild |
| Mobile payment | `WaitingForPayment` | Pending approval | Yes poll | Wait/cancel | WebUI polls | Poll with timeout |
| Mobile payment | `OddsChanged` | Payment received but odds changed | Yes via accept endpoint | Accept or cancel | WebUI shows Accept New Odds | Keep separate from direct betslip |
| Mobile payment | `Expired`, `Cancelled`, `Failed` | Payment/session failed | Depends | Retry/new payment | WebUI shows status | Show final status and recovery |
| Network | timeout/network error | No response | Yes | Retry | Located app maps network error | Keep slip, retry safely |
| Server | HTTP `500` | Unhandled server error | Maybe | Retry/contact support | Located app shows detail/default | Show generic error with safe retry |

## 16. Identifier conventions

| Field | Source | Type | Meaning | Display-only | Required for booking | Required for placement | Validation role | Adapter requirement |
|---|---|---|---|---|---|---|---|---|
| `MatchOddId` | active feed `MatchOdds`; WebUI `MatchOdd.MatchOddId` | int/string in UI, nullable int for WebUI | Generated-feed odds-row identity | No for local feed state; not durable ticket identity | No, per owner clarification | No, per owner clarification | Optional first lookup when supplied; fallback exists | Preserve for UI/reconciliation; do not synthesize; do not require for submit |
| `OriginalMatchId` | active feed fixture; WebUI `BetServiceMatchNo` | int/string in UI, int for WebUI | Operational match id | No | Yes as `MatchId` | Yes as `MatchId` | Current set/status validation | Preserve separately from `MatchNo`; convert to int |
| `MatchId` | WebUI `BetViewModel.MatchId` | int | Posted operational match id | No | Yes | Yes | Match availability validation | Map from active `OriginalMatchId` only if proven numeric/aligned |
| `BetServiceMatchNo` | WebUI `Match.BetServiceMatchNo` | int | Backend match key | No | Yes via `MatchId` | Yes via `MatchId` | DB match lookup | Treat as same semantic target as `OriginalMatchId` when reconciled |
| `MatchNo` | active/display and WebUI short code contexts | int/string | Display/short code | Mostly yes | No | No | Not used for placement validation | Display only; may become `ShortCode` |
| `ShortCode` | WebUI short-code tables | int | Public match code | Yes | Optional | Optional | Helps print/display | Use `BetViewModel.ShortCode` if known |
| `League` | feed/WebUI display | string | Competition display | Yes | No | No | none | Display only |
| `MarketId` | not confirmed for WebUI prematch placement | unresolved | possible external market id | unresolved | No | No | none proven | Do not require until source exists |
| `BetCategory` | feed/WebUI `Market` | string | Market code | No | Yes | Yes | Fallback odd lookup | Preserve raw |
| `BetOption` | feed/WebUI `Option` | string | Selection code | No | Yes | Yes | Fallback odd lookup | Preserve raw |
| `Line` | feed/WebUI `Line` | string/null | Line/specifier | No | Yes for line markets | Yes for line markets | Fallback odd lookup | Normalize null/empty consistently |
| `BookMakerId` | feed/WebUI odd row | int | Provider/bookmaker | No | Recommended if available | Recommended if available | Cache key/current odd metadata; not used by inspected DB fallback filter | Convert to int; allow 0 only if WebUI does |
| `Odd` | feed/client display | decimal/number | Posted odds value | No | Yes | Yes | Compared against current DB odds | Submit unrounded numeric decimal |

## 17. Date, expiry and timing behavior

**Confirmed:** Booking expiry is 30 minutes from `BookingTime`.

**Confirmed:** Direct receipt timestamps use `DateTime.Now` in `Receipt` constructor and server `ReceiptTime = $"{receipt.ReceiptDate:s}"`.

**Confirmed:** Mobile-money sessions expire after 2 minutes from `DateTime.UtcNow.AddMinutes(2)`.

**Confirmed:** Cancellation window is 10 minutes in receipt/ticket cancellation helpers.

**Unresolved:** Exact JSON timezone behavior for WebUI remains as in the sports contract: no custom JSON.NET date settings were found, but no live response was captured.

## 18. Limits, rounding and currency

**Confirmed:** Currency/locale are settings from `GET /api/CompanySettings/Locale`; WebUI frontend uses them for formatting, not validation authority.

**Confirmed:** Online limits can be read from `GET /api/CompanySettings/OnlineSettings`, which returns Online branch `MaxPayOut`, `MinStake`, and `MaxStake`.

**Confirmed:** Final direct ticket stake limits are branch/account enforced server-side. Default fallback in `GetStakeLimits()` is min `1000`, max `50000`.

**Confirmed:** Maximum payout for receipt detail/payment is company-level `Company.MaximumPayOut`; frontend display may use settings `MaxPayout`, but final receipt payout applies server cap.

**Confirmed:** Total odds are rounded to 2 decimals server-side. Receipt payout is rounded to 2 decimals after tax/bonus/status logic.

## 19. Older frontend transformations

| Source | Transformation | Compatibility |
|---|---|---|
| Located online `Receipt.tsx` | `Selection` -> `BetModel` with `bm_id`, `code`, `hash`, `lg`, `line`, `mid`, `mkt`, `opt`, `teams`, `time`, `v` | Not directly compatible with WebUI `CreateReceiptViewModel` |
| Located online `store.ts` | one selection per `MatchNo`; total odds multiply `Selection.v` | Display/local only |
| Located online `api.ts` | POST `/api/Receipt` with `{ amt, bets }` | Route/payload mismatch against WebUI placement |
| WebUI bundled `extractBet()` | option/game -> `Bet` factory using `OriginalMatchId`, `MatchOddId`, market, option, line, bookmaker, odd | Mostly compatible with WebUI placement, but `MatchOddId` is now owner-confirmed optional rather than mandatory |
| WebUI bundled `ReceiptFactory` | builds `CreateReceiptViewModel` JSON: `BetData`, `SetNo`, `TotalBonus`, `TotalStake`, `IsLive`, `BookingCode` | Contract to follow for Phase 4 |

## 20. Phase 3 model comparison

| Phase 3 field | WebUI field | Compatibility | Required conversion | Missing server data | Safe to submit now? |
|---|---|---|---|---|---|
| `matchOddId` | `BetViewModel.MatchOddId` | Optional lookup/display aid | optional string -> int if backend accepts it | none for mandatory placement; mapping proof only needed if used as lookup aid | Not required for submit |
| `fixtureOriginalMatchId` / `originalMatchId` | `BetViewModel.MatchId` | Strong candidate | string -> int | current `SetNo`; runtime alignment proof | No, until mapping verified |
| `matchNo` | `ShortCode` or display code | Display only | optional int | exact short-code mapping | No |
| `league` | none for placement | Display only | none | none | No |
| `homeTeamName` / `awayTeamName` | optional display only | Display only | none | none | No |
| `marketKey` | none | UI key only | none | none | No |
| `marketName` | none | Display only | none | none | No |
| `betCategory` | `BetViewModel.BetCategory` | Required | preserve raw | none | Not alone |
| `betOption` | `BetViewModel.BetOption` | Required | preserve raw | none | Not alone |
| `line` | `BetViewModel.Line` | Required for line markets | normalize null/empty | none | Not alone |
| `currentOdd` | `BetViewModel.Odd` | Required as posted odd | number -> decimal; do not round | server revalidation | Only with full payload |
| previous/current price | `PostedOdd` is server-populated | Client display only | none | server changed-odds response | No |
| selectedAt | no WebUI field | Client audit/display | none | none | No |
| `BookMakerId` | `BetViewModel.BookMakerId` | Recommended if available | Phase 3 store does not currently expose it | bookmaker id in selected store | No |
| `SetNo` | `CreateReceiptViewModel.SetNo` | Required for teller/manager validation | must fetch from WebUI settings/state | current active set | No |
| `TotalStake` | `CreateReceiptViewModel.TotalStake` | Required | add stake entry | server branch limits | No |
| `TotalBonus` / `BonusId` | `CreateReceiptViewModel` | Conditional | derive through WebUI settings/bonus flow | bonus settings/state | No |
| `BookingCode` | `CreateReceiptViewModel.BookingCode` | Conditional | store loaded booking code | booking state | No |

## 21. Required adapters and services

Recommended Phase 4 pieces, without implementing them here:

| Component | Input | Output | Validation | Unresolved assumptions |
|---|---|---|---|---|
| Betslip request adapter | Phase 3 selections, stake, WebUI settings | `CreateReceiptViewModel` | positive `MatchId`, complete market/selection fields, posted odd, stake/current set | current set/settings source |
| Selection identity mapper | active fixture/selection | `MatchId`, market tuple, optional `MatchOddId` | no generated operational ids | `OriginalMatchId`/`BetServiceMatchNo` alignment |
| Stake validator | stake input plus online/branch settings | local warnings | integer, min/max/multiple hints | server remains final |
| Server totals adapter | `CreateReceiptResult`, settings | total odds/net pay display | prefer server values | receipt detail vs create response differences |
| Odds-change reconciler | `ChangedOdds` / `Errors` | updated selections and review UI | match by returned `MatchOddId` when present, otherwise `MatchId + BetCategory + BetOption + Line` | server response variants |
| Booking adapter | slip request | booking create/load/redeem state | booking code expiry/used | whether public booking create is intended |
| Placement adapter | slip request | authenticated ticket response | auth roles, 417 result body | new SmartBet auth role mapping |
| Receipt adapter | `SuccessfulReceiptData` / receipt detail | UI receipt model | serial/receipt id/timestamps | barcode/print support |
| Error/status mapper | HTTP and `CreateReceiptResult` | actionable UI state | all known codes | production message variants |
| Auth gate | current user/session | login-required state | preserve slip | WebUI cookie/session integration |
| Duplicate-submission guard | submit lifecycle | one in-flight request | disable, idempotency UX | no server idempotency token proven |

## 22. Risks and unresolved questions

- **Unresolved:** Does production `api-games.smbet.net.MatchOddId` map directly to the same WebUI `MatchOdd.MatchOddId` in the target betting environment?
- **Unresolved:** Does production active `OriginalMatchId` always equal WebUI `BetServiceMatchNo` expected as `BetViewModel.MatchId`?
- **Unresolved:** Located older online app posts `/api/Receipt` with `{ amt, bets }`; no inspected WebUI placement action matches this route/payload.
- **Unresolved:** Whether anonymous booking creation is intentionally public, because `/api/Ticket/Booking` has no observed `[Authorize]` but uses a `Booking` user.
- **Unresolved:** How Phase 4 obtains current `SetNo` in SmartBetUI without relying on browse feed.
- **Unresolved:** Full duplicate-event/incompatible-market business rules beyond one-selection-per-match behavior in clients and max 25 games server rule.
- **Confirmed risk:** Phase 3 store lacks `BookMakerId`, `SetNo`, `TotalStake`, bonus fields, payment fields, and booking code.
- **Confirmed risk:** `MatchOddId` is `[NotMapped]` on stored `Bet`; receipts later recover it by composite lookup, so Phase 4 must keep market/option/line as operational identity.
- **Confirmed by system owner:** `MatchOddId` is not a required betting constraint. The inspected validator guard requiring it is a code/contract mismatch to resolve before submitting tickets without it.

## 23. Recommended Phase 4 implementation sequence

1. Add a WebUI contract client for settings needed before submission: current set, online limits, locale/currency, bonus settings if used.
2. Add a Phase 4 request adapter from selected prematch store to `CreateReceiptViewModel`.
3. Require `OriginalMatchId -> MatchId` numeric validation, market/selection tuple completeness, posted odd, stake and current set before enabling submit.
4. Extend Phase 3 selected store to retain `BookMakerId`, raw market tuple, optional `ShortCode`, and selected timestamp.
5. Add stake entry with local hints, but treat server as final authority.
6. Implement booking first using `POST /api/Ticket/Booking` only after confirming intended anonymous behavior.
7. Implement authenticated placement using `POST /api/Ticket`.
8. Handle `ChangedOdds`, `StartedMatches`, `Errors`, `Message`, and HTTP `417` before success UI.
9. Build receipt display from `SuccessfulReceiptData`.
10. Add duplicate-submit guard and preserve slip on every failure.

## 24. Source-file index

| File | Evidence |
|---|---|
| `online/.../app/src/api.ts:17-73` | error handling and `/api/Receipt` wrappers |
| `online/.../app/src/components/Receipt.tsx:17-80` | located online app maps selection to `{ amt, bets }` and handles `co`/`sm` |
| `online/.../app/src/store.ts:110-197` | local receipt store shape and update/remove behavior |
| `online/.../app/src/types.ts:23-101`, `168-171` | `Selection`, `MatchOdds`, `TicketModel` |
| `WebUI/Controllers/Api/ApiTicketController.cs:175-239` | create ticket, booking and booking load endpoints |
| `WebUI/Controllers/Api/ApiReceiptController.cs:20-164` | authorized receipt list/details/payment endpoints |
| `WebUI/Controllers/Api/ApiBetPaymentController.cs:27-242`, `667-746`, `950-955` | mobile-money validation/status/accept/cancel and request shape |
| `BetSoftware.Domain/Models/ViewModels/CreateReceiptViewModel.cs:21-146`, `165-282` | request/result/receipt DTO contracts |
| `BetSoftware.Services/ICreateReceiptService.cs:41-168`, `538-861`, `1018-1150`, `1275-1371` | changed odds, validation, receipt creation, booking |
| `BetSoftware.Services/ITicketService.cs:29-151` | cancel, confirm, booking lookup |
| `BetSoftware.Domain/Models/Concrete/Receipt.cs:10-234` | receipt fields and payout calculation |
| `BetSoftware.Domain/Models/Concrete/Bet.cs:7-44` | persisted bet fields |
| `BetSoftware.Domain/Models/Concrete/Branch.cs:100-112` | branch stake validation |
| `BetSoftware.Basics/Extensions/ReceiptExtensions.cs:5-20` | booking and cancel expiry windows |
| `WebUI/Scripts/app/src/api/index.js:10-43` | WebUI frontend endpoint callers |
| `WebUI/Scripts/app/src/factory/receipt-factory.js:1-31` | WebUI frontend request JSON builder |
| `WebUI/Scripts/app/src/factory/bet-factory.js:1-49` | WebUI frontend bet DTO builder |
| `WebUI/Scripts/app/src/functions.js:31-33`, `567-604`, `771-788`, `1231-1262` | total odds, extract bet, find by `MatchOddId`, local validation |
| `WebUI/Scripts/app/src/actions.js:218-305`, `307-590` | booking load and ticket submit/change handling |
| `SmartBetUI-v2/src/betslip/PrematchBetslipProvider.tsx` | Phase 3 selected-state shell |
| `SmartBetUI-v2/src/domain/prematch.ts` | Phase 3 prematch fixture/market/selection model |

## 25. Acceptance checklist

| Criterion | Status | Reason |
|---|---|---|
| Trace adding selections | Satisfied | Client-side only in old/WebUI/Phase 3; no server add endpoint |
| Trace removing/updating selections | Satisfied | Client-side remove/update by `MatchNo` in old/WebUI; Phase 3 by `MatchOddId` |
| Trace stake entry and validation | Satisfied | Local input plus server branch/min/max/multiple validation |
| Trace total-odds calculation | Satisfied | Client display multiplication; server recomputes rounded total odds |
| Trace potential-win calculation | Partially satisfied | Client display and receipt payout traced; exact Phase 4 display should use server response |
| Trace odds revalidation | Satisfied | `ChangedOddsQuery` tries optional `MatchOddId` first when supplied, then falls back to `MatchId + Line + BetCategory + BetOption` |
| Suspended/changed/removed invalid selections | Partially satisfied | Changed/started/unavailable traced; explicit `IsLocked` suspension behavior is not separately enforced in shown prematch code |
| Trace booking | Satisfied | `/api/Ticket/Booking`, `/api/Ticket/GetBooking`, expiry/redeem traced |
| Authenticated placement | Satisfied | `/api/Ticket` requires roles `Manager,OnlineClient,Teller` |
| Anonymous placement | Satisfied | No anonymous final placement proven; booking appears unauthenticated but is not final placement |
| Receipt/ticket response | Satisfied | `CreateReceiptResult` and `SuccessfulReceiptData` traced |
| Ticket identifiers | Satisfied | `ReceiptNumber`, `Serial`, `FormattedSerial`, `BookingCode` traced |
| Error/status handling | Satisfied | Core codes/messages/statuses catalogued |
| Duplicate/incompatible rules | Partially satisfied | Client one-selection-per-match and server max 25 traced; deeper incompatible-market rules unresolved |
| Min/max stake and payout rules | Partially satisfied | Stake/payout sources traced; exact runtime branch/company values environment-specific |
| Bonus handling | Partially satisfied | TotalBonus and payout formula traced; campaign/source of bonus values needs Phase 4 settings integration |
| Accepted-bet confirmation | Partially satisfied | Success response and `/api/Ticket/Confirm/{id}` traced; caller for confirm not found |
| Exact identifier submitted | Satisfied | Mandatory operational fields are `MatchId`, market/selection tuple, line where applicable, posted odd, plus slip-level `SetNo`/`TotalStake`; `MatchOddId` is optional per owner clarification |
| Does active `MatchOddId` map directly? | Partially applicable | Useful for feed/display/reconciliation only unless backend accepts it as optional lookup; not required for owner-confirmed placement |
| What does server recompute? | Satisfied | Total odds, receipt, stake validation, odds validation traced |
| Changed odds handling | Satisfied | Direct and mobile-money paths traced |
| Is booking anonymous? | Partially satisfied | No authorize observed, but intention unresolved |
| Is placement authenticated? | Satisfied | WebUI role requirement confirmed |
| Final receipt response | Satisfied | `SuccessfulReceiptData` fields documented |
| What must Phase 4 never trust? | Satisfied | IDs, odds, totals, stake limits, auth, booking state must be server-validated |

## 26. Contract-audit conclusion

**Confirmed:** Phase 4 must target WebUI's operational ticket contract, not the active-games browse feed and not the located online app's unresolved `/api/Receipt` legacy shape.

**Confirmed:** The WebUI placement request is `POST /api/Ticket` with `CreateReceiptViewModel`. For prematch selections, owner-confirmed operational identity is not `MatchOddId`; it is the submitted `MatchId` that maps to `BetServiceMatchNo`, plus the market/selection tuple `BetCategory`, `BetOption`, and `Line` where applicable. The submitted `Odd` is compared against the current database odd rounded to two decimals. `BookMakerId` is accepted by the DTO and used in cache/response metadata, but the inspected database fallback lookup does not filter by it.

**Confirmed by system owner:** `MatchOddId` can remain useful as display/feed identity for local selected state, refresh reconciliation, React keys and odds movement tracking. It is optional for placement and Phase 4 must not require it as the authoritative betting identifier.

**Code/document mismatch:** The inspected `CreateReceiptValidator` currently rejects missing prematch `MatchOddId`, while the owner-confirmed contract says it is not required. That backend mismatch must be resolved before Phase 4 submits tickets without `MatchOddId`.

**Confirmed:** Booking is a separate `/api/Ticket/Booking` path that creates a receipt plus `ReceiptBookingCode`, expires after 30 minutes, and is redeemed by `BookingCode` during placement.

**Confirmed:** Final ticket placement is authenticated. Anonymous final placement was not proven.

**Unresolved:** The active feed's `OriginalMatchId` must be runtime-verified against the target WebUI `BetServiceMatchNo` before any real bet submission is enabled. Phase 4 should not submit the Phase 3 store directly without an adapter and validation layer.
