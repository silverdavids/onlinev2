# Read-Only Prematch Integration

Date: 2026-07-29

## Scope

This phase wires SmartBetUI-v2 to the active prematch browse feed for read-only fixture discovery, fixture details, and local betslip selections. It does not book tickets, submit tickets, place bets, start bet payments, load booking codes, or fabricate successful ticket responses.

## Routes And Components

| Route/component | Purpose |
|---|---|
| `/` via `app/page.tsx` | Home shell with featured live-feed fixtures, categories, and upcoming fixtures |
| `/soccer` and other sport routes under `app/(common)/*/page.tsx` | Sport pages rendered through `PrematchSportPage` |
| `/fixture/[originalMatchId]` | Fixture detail page for all markets in the active feed |
| `components/Prematch/PrematchBrowser.tsx` | Loads, filters, groups, searches, and renders feed fixtures |
| `components/Prematch/PrematchFixtureDetails.tsx` | Displays fixture identity plus expanded market selections |
| `components/Shared/SideNav.tsx` | Shows active-feed football leagues and fixture counts |
| `components/Shared/FooterCard.tsx` | Non-submittable local prematch betslip |
| `src/matches/ActiveMatchesProvider.tsx` | Shared active-feed loader, refresh, error, and odds-movement state |
| `src/betslip/PrematchBetslipProvider.tsx` | Local selection, stake, validation, persistence, and disabled submission guard |

## API Endpoints Consumed

| Endpoint | Client | Credentials | Use |
|---|---|---|---|
| `GET {NEXT_PUBLIC_MATCHES_API_BASE_URL}/` | `activeMatchesApiClient` | No cookies or credentials | Active prematch fixture and odds browse feed |
| `GET /api/CompanySettings/OnlineSettings` | existing `OnlineSettingsProvider` | Anonymous WebUI client | Min/max stake and max payout display validation |

No `/api/Ticket`, `/api/Ticket/Booking`, `/api/Ticket/GetBooking`, `/api/Receipt`, or `/api/BetPayment/*` request is sent by the read-only prematch flow.

## Feed To UI Mapping

| Active feed field | SmartBetUI model | Notes |
|---|---|---|
| `OriginalMatchId` | `PrematchFixture.originalMatchId` and provisional `operational.matchId` | Must later be proven to equal WebUI `BetServiceMatchNo` before submission |
| `MatchNo` | `PrematchFixture.matchNo` and display/debug data | Display and trace field only |
| `BetServiceMatchNo` | `PrematchFixture.betServiceMatchNo` | Preserved when present, not trusted yet |
| `ShortCode` | `PrematchFixture.shortCode` and selected display metadata | Used only as local metadata in this phase |
| `League`, `LeagueId` | fixture/league grouping and sidebar navigation | Sidebar currently exposes live football leagues |
| `HomeTeamName`, `AwayTeamName` | fixture card and details display | Required for a record to render |
| `StartTime` | `startTime`, `startDate`, `displayStartTime` | Used for upcoming filtering |
| `GameStatus` | `status` | Finished fixtures are hidden by the upcoming filter |
| `MatchOdds[].MatchOddId` | `PrematchSelection.matchOddId` and local selection key | Useful for UI reconciliation; not treated as required betting authority |
| `MatchOdds[].BetCategory`, `BetOption`, `Line`, `BookMakerId`, `Odd` | market grouping, selection labels, odds display, and local selected-state metadata | Server must revalidate all values before any future ticket flow |

## Betslip State Model

The betslip stores selections in `localStorage` under `smartbet.prematchBetslip.v1`. Each selected item keeps:

- display fields: league, teams, kickoff, market name, selection name, `MatchNo`, `MatchOddId`
- operational fields for future adapter work: `matchId`, `betCategory`, `betOption`, `line`, `odd`, `bookmakerId`, `shortCode`
- lifecycle fields: selected timestamp, previous odd, active/suspended status

Selections are refreshed against the latest active feed. Missing selections become suspended and must be removed before the slip can be used later. The UI shows total odds and potential win locally, but those values are not authoritative.

## Submission Guard

`PrematchBetslipProvider` exposes `placeTicket` and `bookTicket` as guarded no-op functions in this phase. The footer labels both controls as unavailable and keeps them disabled. The guard exists so accidental click wiring cannot call a backend placement endpoint while the blocker remains unresolved.

## Known Submission Blockers

1. Active-feed `OriginalMatchId` has not been proven to match the WebUI `Matches.BetServiceMatchNo` value required by receipt creation and current-set validation.
2. The agreed product/backend contract says prematch `MatchOddId` should not be required, but inspected WebUI validation still rejects non-live bets without a positive `MatchOddId`.
3. Current-set/`SetNo`, bonus, payment source, booking-code, and server-side receipt total handling have not been adapted in SmartBetUI-v2.
4. Active browse odds are display inputs only. WebUI remains the authority for availability, odds changes, started-match rejection, and receipt creation.

## Backend Questions Before Phase 4

1. Which target WebUI environment/database should be used to verify active-feed `OriginalMatchId` against `Matches.BetServiceMatchNo`?
2. Should WebUI validation be changed to allow prematch submission without `MatchOddId`, matching the agreed contract?
3. If `MatchOddId` is supplied when present, should WebUI treat it only as an optional lookup acceleration and always fall back to match/market/option/line?
4. How should SmartBetUI-v2 obtain the current `SetNo` for prematch receipt creation?
5. Is anonymous booking creation through `/api/Ticket/Booking` intended to remain public?

See `docs/PREMATCH_TICKET_SUBMISSION_CONTRACT.md` for the follow-up contract verification. The release-target runtime sample proves `OriginalMatchId` maps to WebUI `BetServiceMatchNo`; real submission remains disabled until the Phase 4 adapter is implemented and tested against the release-aligned API, including the remaining `MatchOddId` validator inconsistency.
