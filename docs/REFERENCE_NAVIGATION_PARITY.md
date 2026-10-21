# Reference navigation parity

Inspected `thebet-online (2)/thebet-online/src/routes`, `DesktopShell`, `NavigationBar`, the desktop sidebar, `MobileHome`, and the mobile account menu. New pages share the current SmartBet shell, colors, typography, cards, and responsive forms.

| Reference destination | Current destination |
| --- | --- |
| Soccer, mobile odds, sports tiles | `/soccer` |
| Live | `/live-betting` |
| Game / event details | `/fixture/[originalMatchId]` |
| Live game details | `/live-betting/[matchId]` |
| My Bets / BetHistory | `/tickets` |
| Receipt details / MobileBetDetails | `/tickets/[receiptId]` |
| Receipt / MobileBetSlip | `/betslip` |
| Booking-code dialog | `/booking-code` |
| Finance | `/finance` |
| Deposit / MobileDeposit | `/deposit` (branch codes), `/deposit/mobile-money` |
| Withdraw / MobileWithdraw | `/withdraw` (method selection) |
| Branch withdrawal | `/withdraw/branch` |
| WithdrawMM / mobile MTN and Airtel | `/withdraw/mobile-money?method=mtn` or `airtel` |
| Transactions / Statements | `/transactions` |
| Account/Bonuses | `/bonuses` |
| Profile | `/profile` |
| Messages / notifications | `/notifications` |
| Registration / MobileRegistration | `/create-acount` |
| MobileLogin | `/login` |
| ForgotPassWordForm / MobileForgotPassWord | `/forgot-password` |
| OtpForm / MobileOtpVerification | `/verify-otp` |
| ResetPassWord | `/reset-password` |
| ChangePassWord | `/change-password` |
| Responsible gaming | `/responsible-gaming` |
| Gaming rules | `/gaming-rules` |
| Mobile privacy / terms | `/privacy-policy`, `/terms` |
| Search | `/search` |
| Aviator / slots | `/aviator`, `/slots` |

Legacy paths resolve through `src/navigation/legacyRoutes.ts` and middleware, before page rendering. Unknown paths remain 404s. Query parameters are preserved, including fixture context and provider choice. Account pages retain the cookie-backed authentication guard.

## Data and behavior

- Statements, bonuses, account details, deposits, withdrawals, and password forms use the existing authenticated API client. OTP password recovery uses the anonymous `VerifyOtpAndSetPassword` endpoint: the older `SetNewPassWord` endpoint requires an existing login. This was checked against the local backend controller.
- Mobile deposits distinguish a submitted request from a completed deposit, check its status for up to two minutes, and allow manual status checks. Alternate-number withdrawals retain OTP verification. No transaction is submitted during verification of this change.
- Notification history records real ticket responses in session storage scoped to the signed-in user. The reference notification page used sample data; no sample financial activity was copied.
- Gaming rules and responsible-gaming text come from the reference pages. Existing contact, terms, privacy, and deposit-guide pages remain available.
- Aviator, crash, and casino use the shared game lobby and sample catalogue from `smartbetonline-main.zip`, with search, filters, sorting, gradient cards, and provider-launch notices. Slots and virtuals retain their coming-soon pages. No provider session token from the reference was copied.
- Profile displays current account details and links to password change and support. No unsupported profile-update API is implied.

## Checks

`node --test tests/navigation.test.cjs tests/betslip-notification.test.cjs` checks route coverage, legacy redirects and filters, notification isolation, and ticket-response behavior. TypeScript, targeted lint, Sass compilation, and a production build validate page integration.

Local HTTP checks confirmed canonical pages, 307 redirects for legacy links, and 404 responses for unknown paths. Headless Chrome checks confirmed desktop and mobile page layouts, menu destinations, and no uncaught browser errors using mocked read-only account responses. No payment, password-change, or betting submissions were made.
