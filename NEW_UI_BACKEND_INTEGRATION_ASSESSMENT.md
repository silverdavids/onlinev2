# New UI Backend Integration Assessment

Date: 2026-07-10

Path roots used in file references:

- New UI root: `C:\Users\hp\source\repos\SmartBetUI-v2`
- Older UI root: `C:\Users\hp\source\repos\thebet-online (2)\thebet-online`
- Unless an absolute path is shown, file references are relative to the relevant root above and include line numbers.

## Executive Summary

Confirmed: the new SmartBet UI is a Next.js 14 App Router application using React 18, TypeScript-enabled `.tsx` files, Sass, Bootstrap classes, Headless UI tabs, Swiper, Tabler icons, and Axios. Most sports screens are static templates driven by arrays in `public/data`; only login, logout, registration, dashboard transactions, profile update, deposit, and withdrawal currently call HTTP endpoints.

The older working UI was found at `C:\Users\hp\source\repos\thebet-online (2)\thebet-online`. It is a Create React App React 17 application with React Router, Redux, RxJS stores, a central Axios API module, cookie-based authentication, and Socket.IO/protobuf live odds. Its confirmed backend contract is materially different from the new UI's currently hard-coded `https://smart-bet/v1/*` bearer-token style.

Recommendation: do not integrate endpoint-by-endpoint inside the current presentation components. First add a central config and API layer, then port the older UI's backend contracts through typed adapters that convert ASP.NET MVC/Web API DTOs into the new visual component models.

## Application Architecture

### New UI

- Framework: Next.js `^14.2.35`, React `^18`, React DOM `^18`; see `package.json:13-17`.
- Router: Next.js App Router under `app/`; route files are `app/page.tsx` and `app/(common)/*/page.tsx`.
- State management: no Redux, Zustand, React Query, or Context store found. Components use local `useState` and `useEffect`; examples include `components/Pages/Home/HeroMatches.tsx:5-8`, `components/Pages/Dashboard/Dashboard.tsx:31-56`, and `components/Shared/HeaderMain.tsx:10-32`.
- Styling: global Sass imported in `app/layout.tsx:3`; styles live under `public/scss`. Bootstrap classes are used heavily; Sass package is present in `package.json:19`.
- UI libraries: `@headlessui/react` tabs, `@tabler/icons-react`, `react-select`, and `swiper`; see `package.json:11-20`.
- Root layout: `app/layout.tsx:13-22` renders children, then always renders `FooterCard` and `MainFooter`.
- Main desktop shell: sports pages use `HeaderMain`, `SideNav`, `NavItem`, `Language`, footer, and fixed betslip footer; examples: `app/page.tsx:1-16`, `components/Shared/HeaderMain.tsx:4-84`, `components/Shared/FooterCard.tsx:51-121`.
- Dashboard/account shell: `app/(common)/dashboard/page.tsx:1-9` uses `HeaderTwo` and `Dashboard`; `HeaderTwo` shows a hard-coded balance area at `components/Shared/HeaderTwo.tsx:65-68`.
- Login/register shell: `app/(common)/login/page.tsx:1-9` and `app/(common)/create-acount/page.tsx:1-8` use `LogRegHeader`.
- Mobile shell: there is responsive header/side-nav behavior and a fixed footer betslip, but no separate mobile routing shell comparable to the older UI's `MobileHome`.

### Important Folders

- `app/`: Next.js App Router pages.
- `components/Shared/`: headers, side nav, footer, language selector, fixed betslip footer.
- `components/Pages/`: feature and sport page components.
- `lib/`: currently one Axios client in `lib/api.js`.
- `public/data/`: static mock/navigation/sports/dashboard/promotion datasets.
- `public/scss/`: Sass theme and page styles.
- `public/images/`: static sports, payment, promotion, logo, and icon assets.

## Current Routes and Features

Confirmed route examples from `app/(common)/*/page.tsx`:

| Route | Main component(s) | Data source | Status |
|---|---|---|---|
| `/` | `HeaderMain`, `HeroSlider`, `HeroMatches`, `LiveMatches`, `MiddleSlider`, `UpComingEvents`; `app/page.tsx:1-16` | Static component markup plus `public/data/tabOne.ts`, `tabTwo.ts`, `tabThree.ts` | Mocked/static |
| `/soccer` | `TopSoccer`, `SoccerLive`, `UpCmingSoccer`; `app/(common)/soccer/page.tsx:1-12` | `soccerMatch`, `liveSoccerMatch`, `fifaVoltaLast`; `components/Pages/Soccer/*.tsx:2-19` | Mocked/static |
| `/basketball` | `TopBasketball`, `BasketballLive`, `UpCmingBasketball`; `app/(common)/basketball/page.tsx:1-12` | `basketballMatch`, `liveSoccerMatch`, `basketballUpCE` | Mocked/static |
| `/tennis` | `TopTennis`, `TennisLive`, `UpCmingTennis`; `app/(common)/tennis/page.tsx:1-12` | Static data | Mocked/static |
| `/cricket`, `/ecricket`, `/floorball`, `/futsal`, `/fifa-volta` | Sport-specific top/live/upcoming components | Static data | Mocked/static |
| `/promotions` | `Promotions`; `app/(common)/promotions/page.tsx:1-9` | `promotionData`; `components/Pages/Promotions/Promotions.tsx:1-28` | Mocked/static |
| `/login` | `Login`; `app/(common)/login/page.tsx:1-9` | Direct Axios POST to hard-coded URL | Partially implemented |
| `/create-acount` | `CreateAcount`; `app/(common)/create-acount/page.tsx:1-8` | Direct Axios POST to hard-coded URL | Partially implemented |
| `/dashboard` | `Dashboard`, `DepositCard`, `DepositAmount`, `WithdrawalAmount`; `app/(common)/dashboard/page.tsx:1-9` | Static tabs/amounts plus direct Axios calls | Partially implemented |

Feature status:

| Feature | Route | New UI location | Current model/interface | Data source | Status |
|---|---|---|---|---|---|
| Homepage | `/` | `app/page.tsx`, `components/Pages/Home/*` | Static sport tabs and match cards | `public/data/tabOne.ts`, `tabTwo.ts`, `tabThree.ts` | Mocked |
| Prematch soccer odds | `/soccer` | `components/Pages/Soccer/TopSoccer.tsx` | `id`, `titletwo`, `times`, `clubNameOne`, `clubNameTwo`, `point` | `public/data/tabOne.ts` | Mocked |
| Game categories/leagues | Header/side nav | `components/Shared/SideNav.tsx`, `NavItem.tsx` | `id`, `image`, `linkText`, `href` | `public/data/navData.ts:1-82` | Mocked |
| Match and market display | Sports components | Repeated card templates | `x2`, `douchance`, `ttl`, `draw`, `point` | Static data | Mocked |
| Live betting | `/soccer`, home live panels | `LiveMatches`, `SoccerLive`, etc. | Static live arrays | `public/data/tabTwo.ts` | Mocked |
| Upcoming games | Home/sport pages | `UpComingEvents`, `UpCming*` | Static arrays | `public/data/tabThree.ts`, `allPageData.ts` | Mocked |
| Top bets | Home/sport pages | `HeroMatches`, `Top*` | Static arrays | `public/data/tabOne.ts` | Mocked |
| Bet slip | Global footer | `components/Shared/FooterCard.tsx:51-121` | Hard-coded selections and bet amount input | Component markup | Static only |
| Booking a ticket | None found | None | None | None | Missing |
| Placing a bet | Fixed footer button only | `FooterCard.tsx:121` | No request model | None | Missing |
| Login | `/login` | `components/Pages/Login/Login.tsx` | `{ username, password, remember_me }`, stores `auth_token`, `user_profile` | `POST https://smart-bet/v1/login`; `Login.tsx:37-55` | Partial, not compatible with older UI |
| Registration | `/create-acount` | `components/Pages/CreateAcount/CreateAcount.tsx` | `first_name`, `last_name`, `username`, `phone_number`, `email`, `birth_date`, `national_nin` | `POST https://smart-bet/v1/register`; `CreateAcount.tsx:50-57` | Partial, not compatible with older UI |
| Account balance | `/dashboard` header | `components/Shared/HeaderTwo.tsx:65-68` | Display only | Hard-coded markup | Missing dynamic balance |
| Deposits | `/dashboard` | `DepositAmount.tsx` | `{ amount, phone_number }` | `POST https://smart-bet/v1/mobile-money/deposit`; `DepositAmount.tsx:85-87` | Partial, not compatible with older UI |
| Withdrawals | `/dashboard` | `WithdrawalAmount.tsx` | `{ amount, phone_number }` | `POST https://smart-bet/v1/mobile-money/withdraw`; `WithdrawalAmount.tsx:104-106` | Partial, not compatible with older UI |
| Bonuses/promo codes | `/promotions`, dashboard amount cards | `Promotions.tsx`, `dashBoard.ts` | `title`, `bonusvalue`, `bonus` | Static data | Mocked |
| Ticket history | None found | None | None | None | Missing |
| Ticket details | None found | None | None | None | Missing |
| Cash-out | None found | None | None | None | Missing |
| Search | Header icon only | `HeaderTwo.tsx:75` | None | None | Missing |
| Mobile navigation | Header/side nav/fixed footer | `HeaderMain`, `SideNav`, `FooterCard` | Local expand state | Static nav data | Partial |
| Theme switching | None found | None | None | None | Missing |

## Mock-Data Inventory

- `public/data/navData.ts`: sport/category navigation and links; imported by `SideNav.tsx:5` and `NavItem.tsx:1`.
- `public/data/tabOne.ts`: top/prematch tabs and match arrays with static odds-like labels.
- `public/data/tabTwo.ts`: live tabs and live match arrays.
- `public/data/tabThree.ts`: upcoming tabs and upcoming match arrays.
- `public/data/allPageData.ts`: assorted sport page and promotion arrays; promotion data starts at `allPageData.ts:730`.
- `public/data/dashBoard.ts`: payment method images and static amount/bonus tiles; imported by deposit/withdrawal components.
- `public/data/dashTabs.tsx`: dashboard tab labels/icons.

Screens using real HTTP calls today:

- Login: `components/Pages/Login/Login.tsx:37-55`.
- Logout: `components/Pages/Login/Logout.tsx:11-29`.
- Registration: `components/Pages/CreateAcount/CreateAcount.tsx:50-57`.
- Transactions: `components/Pages/Dashboard/Dashboard.tsx:55-83`.
- Profile update: `components/Pages/Dashboard/Dashboard.tsx:133-144`.
- Deposit: `components/Pages/Dashboard/DepositAmount.tsx:79-103`.
- Withdrawal: `components/Pages/Dashboard/WithdrawalAmount.tsx:98-122`.

## Configuration Findings

### New UI

- No `.env*` files were found in `C:\Users\hp\source\repos\SmartBetUI-v2`.
- `next.config.mjs:1-3` is empty; no rewrites, proxy, images config, headers, or runtime config.
- `lib/api.js:3-10` creates an Axios client with hard-coded `baseURL: 'https://smart-bet/v1'`.
- `lib/api.js:12-20` injects `Authorization: Bearer <localStorage auth_token>`.
- `lib/api.js:28-35` clears local storage and redirects to `/login` on 401.
- The central `lib/api.js` client is not used by the login/register/dashboard components; direct `axios` calls are used instead.
- Duplicated hard-coded API base strings are present in login, logout, registration, dashboard, deposit, and withdrawal components.
- No `withCredentials` usage was found in the new app.
- No Socket.IO, SignalR, WebSocket, live-update client, or proxy settings were found in the new app.

Safe environment variable names recommended for the new UI:

```text
NEXT_PUBLIC_API_BASE_URL=https://example.com
NEXT_PUBLIC_ODDS_SERVICE_URL=https://example.com
NEXT_PUBLIC_SOCKET_IO_URL=wss://example.com
NEXT_PUBLIC_COMPANY=SMARTBET
NEXT_PUBLIC_DOMAIN=smartbet.ug
NEXT_PUBLIC_API_DEBUG=false
```

### Older UI

- CRA proxy points to `http://localhost:49191`; see old `package.json:40`.
- Docker build envs include `REACT_APP_BACKEND_URL`, `REACT_APP_SERVICE_URL`, `REACT_APP_SOCKET_IO_URL`, and `REACT_APP_DOMAIN`; see old `Dockerfile:24-28`.
- Runtime environment wrapper reads `REACT_APP_*` or `window.__APP_CONFIG__`; see old `src/environment/index.js:1-16`.
- Old dev backend default is `http://localhost:49191`; production backend default is same-origin/empty string; see `src/environment/index.js:19-24`.
- Old service URL default is `https://api-games.smbet.info`; socket default is `wss://socket.smbet.info`; see `src/environment/index.js:47-48`.
- Old API client uses `withCredentials: true` and `/api` prefix; see `src/api/index.js:39-58`.

## New UI Data Models

Confirmed no formal TypeScript interfaces were found. The following are inferred from static arrays and component state.

- Sport/category nav: `{ id: number, image: string, linkText: string, href: string }`; `public/data/navData.ts:1-82`.
- Sport tab: `{ imgSrc: string, buttonName: string }`; `public/data/tabOne.ts:1-27`, `tabTwo.ts:1-34`, `tabThree.ts:1-34`.
- Prematch/upcoming match card: `{ id, basketball, titletwo, times, updown, tShart, x2, douchance, ttl, clubone, clubtwo, clubNameOne, clubNameTwo, chart, star, draw, point }`; sample in `public/data/tabOne.ts:29-59`.
- Some sport cards omit market labels/odds and use `{ id, basketball, titletwo, times, updown, tShart, clubone, clubtwo, clubNameOne, clubNameTwo, chart, star }`; sample in `public/data/allPageData.ts:1-25`.
- Promotion: `{ id, imgSrc, title, bonusvalue }`; `public/data/allPageData.ts:730-753`.
- Dashboard amount tile: `{ id, amount, bonus }`; `public/data/dashBoard.ts:21-40`.
- Login request: `{ username, password, remember_me }`; `components/Pages/Login/Login.tsx:37-41`.
- Login response expected: `{ token, user? }`; `Login.tsx:52-55`.
- Registration request: `{ first_name, last_name, username, phone_number, email, birth_date, national_nin }`; `CreateAcount.tsx:50-57`.
- Deposit request: `{ amount, phone_number }`; `DepositAmount.tsx:85-87`.
- Withdrawal request: `{ amount, phone_number }`; `WithdrawalAmount.tsx:104-106`.
- Transaction rows tolerate `{ id | transaction_id, reference, date | created_at, status, type | transaction_type, currency, amount }`; `Dashboard.tsx:258-268`.

Inconsistencies:

- New UI uses snake_case for account/payment DTOs, while the older UI uses ASP.NET-style PascalCase/camelCase mixes such as `phoneNumber`, `userName`, `NIN`, `PromoCode`, `amountpaid`, `altPhone`.
- Static sports data uses presentation names (`titletwo`, `clubNameOne`, `point`) rather than backend domain fields (`OriginalMatchId`, `MatchOdds`, `BetCategory`, `BetOption`, `BookMakerId`, `Line`).
- The generic field name `basketball` stores sport/icon image paths across multiple non-basketball sports.
- Odds are represented as strings in static data (`point: "3.5"`) while the older bet payload uses numeric odds in calculations.

## Older UI Endpoint Inventory

All URLs below are relative to old `API_BASEURL`, which resolves to `/api` in proxied dev or `{REACT_APP_BACKEND_URL}/api` in production; see `src/api/index.js:35-58`.

| Area | Method | Relative URL | Request / query | Important response fields | Auth | Older UI reference |
|---|---:|---|---|---|---|---|
| Odds service | GET | service `/` | none | games/odds feed from external service | No cookie required by frontend client | `src/api/index.js:153` |
| User info/balance | GET | `/Online/UserInfo` | none | `Balance` used to update balance store | Cookie | `src/api/index.js:158`; `src/async-actions/index.js:5-13` |
| Open bets count | GET | `/Online/OpenBetsCount` | none | count | Cookie | `src/api/index.js:157` |
| My bets | GET | `/Online/MyBets` | none | ticket list | Cookie | `src/api/index.js:156` |
| User exists | GET | `/Online/UserExists` | `userName` | boolean/availability | Cookie/default | `src/api/index.js:160-161` |
| Username available | GET | `/Account/CheckUsername` | `value` | availability | Cookie/default | `src/api/index.js:163-164` |
| Phone available | GET | `/Account/CheckPhone` | `value` | availability | Cookie/default | `src/api/index.js:166-167` |
| Email available | GET | `/Account/CheckEmail` | `value` | availability | Cookie/default | `src/api/index.js:169-170` |
| OTP | GET | `/Account/GetOTP` | `phoneNumber` | OTP/challenge result | Cookie/default | `src/api/index.js:172-173` |
| Online settings | GET | `/CompanySettings/OnlineSettings` | none | settings incl. bonus/currency | Cookie/default | `src/api/index.js:175`; `src/async-actions/index.js:16-22` |
| Countries/leagues | GET | `/Matches/GetCountriesWithLeagues` | none | country/league tree | Public/cookie default | `src/api/index.js:176` |
| Receipt bets | GET | `/Bet/Receipt/{receiptId}` | path `receiptId` | receipt bet rows | Cookie | `src/api/index.js:178` |
| Receipt details | GET | `/Receipt/GetById/{receiptId}` | path `receiptId` | receipt details | Cookie | `src/api/index.js:179` |
| Statements | GET | `/Statement/User` | `userid` | account statements | Cookie | `src/api/index.js:180` |
| Account bonuses | GET | `/Account/Bonuses` | none | bonus wallet/promos | Cookie | `src/api/index.js:181` |
| Login | POST | `/Account/Login` | `{ username, password, rememberMe }` | auth cookie/session | Cookie set by server | `src/api/index.js:183-184` |
| Logout | POST | `/Account/LogOff` | none | result | Cookie | `src/api/index.js:186` |
| Check login | GET | `/Account/CheckLogin` | none | `authenticated`, `isAuthenticated`, `loggedIn`, or boolean | Cookie | `src/api/index.js:188-203` |
| Reset password | POST | `/Account/SetNewPassWord` | `{ NewPassword, ConfirmPassword, username, Code: '' }` | result | Cookie/default | `src/api/index.js:206-207` |
| Redeem deposit code | POST | `/Online/redeem` | `{ code }` | updated accounts | Cookie | `src/api/index.js:209-210`; `src/async-actions/index.js:142-146` |
| Place ticket | POST | `/Ticket` | ticket payload below | stake/result/errors | Cookie | `src/api/index.js:212`; `src/async-actions/index.js:80-86` |
| Book ticket | POST | `/Ticket/Booking` | ticket payload below | booking response; `Succeeded`, `Message`, `Error` checked | Cookie | `src/api/index.js:213`; `src/async-actions/index.js:84-88` |
| Mobile money deposit | POST | `/Online/MobileMoneyDepositRequest` | `{ amount, phoneNumber, PromoCode }` | deposit request/status code | Cookie | `src/api/index.js:226-231`, `235-240` |
| Deposit status | GET | `/Online/DepositStatus/{code}` | path `code` | deposit status | Cookie | `src/api/index.js:242-243` |
| Branch withdrawal | POST | `/Online/WithdrawAtBranch` | `{ amount }` | result | Cookie | `src/api/index.js:244-245` |
| Mobile money withdrawal | POST | `/Online/WithdrawRequest` | `{ amountpaid: amount, altPhone: phone }` or arbitrary payload | result | Cookie | `src/api/index.js:247-250` |
| Alternate withdrawal start | POST | `/Online/WithdrawRequestAlt` | `{ amount, altPhone }` | challenge | Cookie | `src/api/index.js:252-253` |
| Alternate withdrawal confirm | POST | `/Online/ConfirmWithdrawAlt` | `{ challengeId, otpCode }` | result | Cookie | `src/api/index.js:255-256` |
| Register | POST | `/Account/Register` | `{ email, phoneNumber, userName, NIN, dob, FirstName, SurName, PromoCode }` | account/OTP result | Cookie/default | `src/api/index.js:259-269` |
| Verify OTP and set password | POST | `/Account/VerifyOtpAndSetPassword` | `{ phoneNumber, otpCode, newPassword, confirmPassword }` | result | Cookie/default | `src/api/index.js:271-272` |
| Validate OTP | POST | `/Account/validate-otp` | `{ phoneNumber, otpCode }` | result | Cookie/default | `src/api/index.js:274-275` |
| Top matches | GET | `/Matches/GetTopMatches` | `page`, `pagesize`; `withCredentials: false` | top matches without odds | Public | `src/api/index.js:282-286` |
| Set count | GET | `/Matches/GetSetCount` | none; `withCredentials: false` | count | Public | `src/api/index.js:289-292` |

Ticket payload confirmed in `src/async-actions/index.js:29-49`:

```js
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

Important bet rules confirmed:

- Booking rejects live selections client-side: `src/async-actions/index.js:52-68`.
- Stake must be positive for placement: `src/async-actions/index.js:58-61`.
- Empty betslip is rejected: `src/async-actions/index.js:63-64`.
- Changed odds and started matches are handled from backend error responses: `src/async-actions/index.js:103-132`.
- Duplicate detection uses `matchId`, `market`, `option`, and `line`: `src/rxjs-stores/bets-store.js:11-18`.
- Total odds multiply numeric `odd` values: `src/functions/index.js:203-204`.

Socket/live update inventory:

- Older UI uses Socket.IO and protobuf; dependencies in old `package.json:36`.
- Env-aware socket module reads `window.SOCKET_IO_URL`, `VITE_SOCKET_IO_URL`, or `REACT_APP_SOCKET_IO_URL`; `src/socket_module.js:125-130`.
- Socket uses websocket transport, `withCredentials: true`, reconnection, optional `accountId` and `token`; `src/socket_module.js:130-146`.
- Event names: `expired-key`, `buffers`, `buffer-diffs`, `deposit.updated`, `wallet.updated`; `src/socket_module.js:149-155`.
- Alternate socket module hard-codes `https://socket.smbet.info`; `src/socket-io/index.js:298-316`.

## New-to-Old Feature Mapping

| Feature | New UI location | Current data source | Older UI endpoint/service | Compatibility | Required work |
|---|---|---|---|---|---|
| Homepage | `app/page.tsx`, `Home/*` | Static arrays | `getGames`, `getTopMatches`, `getCountriesWithLeagues` | Reuse with adapter | Build events API and map older DTOs to cards/tabs |
| Prematch soccer odds | `components/Pages/Soccer/TopSoccer.tsx` | `soccerMatch` static | Odds service `/`; `/Matches/GetTopMatches`; possibly backend match/league endpoints | Reuse with adapter | Need model adapter for matches, markets, odds |
| Categories/leagues | `SideNav`, `NavItem` | `navData.ts` | `/Matches/GetCountriesWithLeagues` | Reuse with adapter | Replace static nav with sport/country/league tree |
| Match/market display | Sport card components | Static arrays | Older UI market mapping in `src/functions`, `src/markets` | Reuse with adapter | Preserve market IDs/options/line |
| Live betting | `LiveMatches`, `SoccerLive` | Static arrays | Socket.IO `buffers`, `buffer-diffs`; live RxJS storage | Reuse with adapter | Add live store, socket lifecycle, odds diff handling |
| Upcoming games | `UpComingEvents`, `UpCming*` | Static arrays | Odds service/backend matches | Needs investigation | Determine endpoint filter for upcoming by sport/date |
| Top bets | `HeroMatches`, `Top*` | Static arrays | `/Matches/GetTopMatches` | Direct reuse or adapter | Replace static cards with API result |
| Bet slip | `FooterCard.tsx` | Hard-coded UI | Older `betsStorage`, `saveBets`, `/Ticket` | Reuse with adapter | Implement selection store and payload creation |
| Booking ticket | Missing | None | `/Ticket/Booking` | Direct reuse after betslip exists | Add booking action, block live bookings |
| Place bet | Button only | None | `/Ticket` | Direct reuse after betslip exists | Add stake validation and error handling |
| Login | `Login.tsx` | `POST https://smart-bet/v1/login` bearer token | `/Account/Login` cookie | Backend change required or rewrite to old contract | Switch to cookie auth and `withCredentials` if reusing old backend |
| Registration | `CreateAcount.tsx` | `POST /v1/register` snake_case | `/Account/Register` | Reuse with adapter | Map field names and OTP/password flow |
| Balance | `HeaderTwo.tsx` hard-coded | None | `/Online/UserInfo` | Direct reuse | Fetch session and display `Balance` |
| Deposits | `DepositAmount.tsx` | `POST /v1/mobile-money/deposit` | `/Online/MobileMoneyDepositRequest`, `/Online/DepositStatus/{code}` | Reuse with adapter | Rename fields, support promo, poll/status/socket |
| Withdrawals | `WithdrawalAmount.tsx` | `POST /v1/mobile-money/withdraw` | `/Online/WithdrawRequest`, alt/branch endpoints | Reuse with adapter | Rename fields and support OTP/challenge variants |
| Bonuses/promos | `Promotions.tsx`, amount tiles | Static data | `/Account/Bonuses`, settings bonus | Reuse with adapter | Fetch/account bonus wallet and promo code state |
| Ticket history | Missing | None | `/Online/MyBets` | Direct reuse | Add route/components |
| Ticket details | Missing | None | `/Receipt/GetById/{id}`, `/Bet/Receipt/{id}` | Direct reuse | Add detail route/components |
| Cash-out | Missing | None found in older frontend API | Needs investigation | Search backend or confirm not supported |
| Search | Header icon only | None | Older `/search` route/components; local filtering | Reuse with adapter | Add route and searchable match store |
| Mobile navigation | Responsive shared shell | Static state/data | Older `MobileHome` routes | Reuse with adapter | Decide whether new app needs separate mobile data logic |
| Theme switching | Missing | None | Older `ThemeProvider` | Reuse with adapter | Port provider/tokens if required |

## Recommended Architecture

Create a backend integration layer before changing feature components:

```text
src/
  config/
    env.ts
  api/
    apiClient.ts
    authApi.ts
    eventsApi.ts
    liveApi.ts
    betsApi.ts
    bookingsApi.ts
    accountApi.ts
    paymentsApi.ts
    bonusesApi.ts
  adapters/
    eventAdapters.ts
    oddsAdapters.ts
    ticketAdapters.ts
    accountAdapters.ts
  hooks/
    useSession.ts
    useBalance.ts
    usePrematchEvents.ts
    useLiveEvents.ts
    useBetSlip.ts
  stores/
    betSlipStore.ts
    sessionStore.ts
    liveEventsStore.ts
  types/
    backendDtos.ts
    viewModels.ts
```

Recommendations:

- Use one central Axios client with `baseURL` from `NEXT_PUBLIC_API_BASE_URL`, automatic `/api` prefix if targeting the older ASP.NET backend, timeout, and normalized errors.
- Prefer cookie auth with `withCredentials: true` if reusing older endpoints. The current bearer-token/localStorage implementation is a different auth model.
- Keep server DTOs separate from UI view models. The new UI should not learn `BetCategory`, `BetOption`, `BookMakerId`, and `Line` directly except inside adapters and betslip payload construction.
- Use request cancellation for route-driven lists and search. React Query would be a good fit, but package installation was intentionally not performed in this assessment.
- Normalize errors to user-safe messages and structured codes. Preserve older special cases: `matchstarted`, `oddschanged`, 400 ModelState, 401 silent session expiration, and 417 response bodies.
- Introduce loading, empty, and stale states for every API-backed list.
- Use conservative retry: no automatic retry for betting, booking, deposit, withdrawal, login, or registration POSTs. Limited retry is acceptable for public read-only odds lists.
- Implement live updates in one socket module with explicit start/stop lifecycle and adapters for protobuf `buffers` and `buffer-diffs`.
- Avoid API calls directly inside presentation components. Feature components should receive view models from hooks or container components.
- Keep desktop and mobile components on the same data hooks/stores to avoid divergent betslip and odds behavior.

## Integration Risks and Unresolved Questions

Confirmed risks:

- Auth mismatch: new UI stores bearer token in `localStorage`; old UI relies on ASP.NET cookies with `withCredentials: true`.
- Endpoint mismatch: new calls use `https://smart-bet/v1/*`; old calls use `/api/Account/*`, `/api/Online/*`, `/api/Ticket`, `/api/Matches/*`.
- DTO naming mismatch: new snake_case request fields differ from old ASP.NET DTO names.
- Match/event identity risk: older betting payload requires `matchId`, `matchOddId`, `bookMakerId`, `market`, `option`, and `line`; new static data only has display `id` and labels.
- Odds type risk: new static odds are strings; old calculations multiply numeric `odd` values.
- Market compatibility risk: older UI has non-trivial market/option mapping in `src/functions/index.js`; new UI only displays labels like `1x2`, `Double chance`, `Total`.
- Live/prematch model differences: older live events come through protobuf/socket and use fields like `std`, `bt`, `bm`, `sc`, `seconds`, `minute`; prematch cards use different DTOs.
- Duplicate detection must include `line`, not only match ID.
- Stake and possible-win calculations must use numeric odds and server bonus/settings.
- Bonus calculations depend on `/CompanySettings/OnlineSettings`, account bonuses, and carried bonus rules; the new UI currently shows static bonus strings.
- CORS/cookie domain issues are likely if Next.js runs on a different origin than ASP.NET.
- New mobile and desktop data logic is not yet separated, which is good, but future mobile-only components should not fork betting rules.
- Next.js client/server boundary: any `localStorage`, `window`, socket, or `useState` code must remain in client components.
- Hard-coded sample match data is extensive and can hide incomplete integration.
- Live odds race conditions need handling for removed events, suspended odds, changed odds, and expired matches.

Unresolved questions:

- Which backend base URL should the new Next.js app target in dev/staging/prod?
- Should auth continue as legacy ASP.NET cookie auth, or is a newer bearer-token API actually intended?
- Is `https://smart-bet/v1` a real API, placeholder, or unrelated new backend?
- Which odds source should be authoritative for prematch: older external service root, `/Matches/GetTopMatches`, or another backend endpoint not used by the old UI?
- Is cash-out supported by backend but unused by the older frontend?
- What is the required mobile money withdrawal flow: simple request, alternate OTP challenge, branch withdrawal, or all three?

## Recommended Implementation Phases

### Phase 1: Configuration, API Client, Auth, Session, Balance

- Files likely to change: `lib/api.js` or new `src/api/apiClient.ts`, `src/config/env.ts`, `components/Pages/Login/Login.tsx`, `components/Pages/Login/Logout.tsx`, `components/Shared/HeaderTwo.tsx`, `components/Shared/HeaderMain.tsx`.
- Dependencies: confirmed backend base URL, auth model decision.
- Main risks: CORS/cookie domain, Next.js client-only code, logout/session refresh behavior.
- Verify: login sets legacy cookie, `CheckLogin` succeeds, `Online/UserInfo` returns balance, 401 redirects safely.

### Phase 2: Prematch Sports, Leagues, Events, Markets, Odds

- Files likely to change: new `eventsApi`, `eventAdapters`, sports page containers, `SideNav`, `HeroMatches`, `UpComingEvents`, sport-specific `Top*` components.
- Dependencies: source endpoint for prematch events and full market/odds DTOs.
- Main risks: market/option/line mapping, event IDs, odds formatting.
- Verify: soccer route renders real leagues/events, selecting an odd captures all backend-required keys.

### Phase 3: Bet Slip, Booking, Placement, Confirmation

- Files likely to change: `FooterCard.tsx`, new betslip store/hook, `betsApi`, `bookingsApi`, `ticketAdapters`.
- Dependencies: Phase 2 selections must include match/market/option/line/bookmaker/odd IDs.
- Main risks: duplicate detection, stake validation, odds-changed handling, live booking block.
- Verify: place a test ticket, book prematch ticket, reject live booking, handle changed odds and started matches.

### Phase 4: Live Events and Real-Time Updates

- Files likely to change: new `liveApi`, `liveEventsStore`, socket module, live components.
- Dependencies: Socket.IO URL, protobuf files or DTO contract.
- Main risks: race conditions, expired games, suspended odds, hydration/client-only socket code.
- Verify: live route updates without refresh, expired events disappear, selected live bet updates or is removed correctly.

### Phase 5: Account, Transactions, Bonuses, Ticket History

- Files likely to change: dashboard, promotions/account bonuses, new ticket history/detail routes, `accountApi`, `paymentsApi`, `bonusesApi`.
- Dependencies: account endpoints and promo/bonus business rules.
- Main risks: bonus wallet interpretation, transaction statuses, mobile money async state.
- Verify: deposit request and status, withdrawal request, transaction list, my bets, receipt details, bonus display.

### Phase 6: Cleanup, Testing, Production Configuration

- Files likely to change: remove or quarantine static mock data usage, add tests for adapters and betslip logic, Next config rewrites if needed.
- Dependencies: stable backend/staging environment.
- Main risks: silently broken static fallbacks, environment drift, production cookie settings.
- Verify: production build, smoke tests across main routes, adapter unit tests, manual betting sandbox flow.

## Suggested First Implementation Task

Build the new central API/config layer and migrate only login/session/balance first:

1. Add `NEXT_PUBLIC_API_BASE_URL` and a single Axios client with `/api` prefix, `withCredentials: true`, timeout, and old UI-compatible error normalization.
2. Add `authApi.login`, `authApi.logOff`, `authApi.checkLogin`, and `accountApi.getOnlineClientInformation`.
3. Replace the current hard-coded login/logout calls and display real balance.
4. Verify against the older backend before touching odds or betslip logic.

This is the smallest integration slice that proves the backend origin, CORS, cookie, and session assumptions before the riskier betting flows are changed.
