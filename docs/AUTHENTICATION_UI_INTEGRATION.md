# Authentication UI Integration

Issue: GitHub Issue #13

Created: 2026-07-11

## Architecture

The Next.js app now uses a single client-side authentication provider:

- `src/auth/AuthProvider.tsx`
- `src/auth/useAuth.ts`
- `src/auth/authTypes.ts`
- `src/auth/ProtectedRoute.tsx`

`AuthProvider` is mounted in `app/layout.tsx`, so the app performs one session check during initialization instead of each component calling `CheckLogin`.

The provider uses the Issue #11 API foundation and the confirmed WebUI cookie contracts from `docs/WEBUI_AUTHENTICATION_CONTRACTS.md`. It does not store cookies, bearer tokens, or user profiles in browser storage.

## Provider Behavior

On initialization, the provider calls `authApi.checkLogin()`.

Session outcomes:

- `204` means unauthenticated.
- `401` means unauthenticated.
- `200` with `authenticated: false` means unauthenticated.
- `200` with `authenticated: true` and a user object populates local auth state.

Provider state includes:

- `user`
- `roles`
- `isAuthenticated`
- `isLoadingSession`
- `sessionChecked`
- `error`
- `login`
- `logout`
- `refreshSession`

## Login Flow

`components/Pages/Login/Login.tsx` keeps the existing layout, image, classes, labels, button styling, and local form state.

The form now calls `useAuth().login`, which:

1. Posts to `POST /api/Account/Login`.
2. Sends `UserName`, `Password`, and `RememberMe`.
3. Calls `GET /api/Account/CheckLogin`.
4. Redirects only after the session is confirmed.

The login page no longer expects a bearer token and no longer writes `auth_token` or `user_profile` to localStorage.

The registration link now points to the actual route, `/create-acount`.

## Session Restoration

Session restoration is cookie-based. Browser cookies are issued by WebUI and sent by Axios through `withCredentials`.

The frontend only stores temporary in-memory auth state derived from `CheckLogin`.

## Logout Flow

Logout now calls `POST /api/Account/LogOff` through the provider.

Frontend auth state is cleared even when backend logout fails, so stale UI state is not retained.

Legacy localStorage token cleanup was removed because the new flow must not create or depend on bearer-token state.

## Registration And OTP Flow

`components/Pages/CreateAcount/CreateAcount.tsx` keeps the existing registration details layout and maps the current fields to WebUI DTO fields:

- `first_name` -> `FirstName`
- `last_name` -> `SurName`
- `username` -> `UserName`
- `phone_number` -> `PhoneNumber`
- `email` -> `Email`
- `birth_date` -> `DOB`
- `national_nin` -> `NIN`

Registration flow:

1. `POST /api/Account/Register`
2. Show minimal OTP/password UI in the same page shell.
3. `POST /api/Account/VerifyOtpAndSetPassword`
4. Login with phone number and newly set password.
5. Redirect to `/dashboard` after `CheckLogin` confirms the session.

`PromoCode` is not sent because it is not supported by the confirmed WebUI registration DTO.

Terms acceptance remains frontend-only validation.

## Protected Routes

`/dashboard` is wrapped with `ProtectedRoute`.

Behavior:

- Waits for the initial session check.
- Shows a small status message instead of a blank screen.
- Redirects unauthenticated users to `/login?returnUrl=/dashboard`.
- Does not fetch dashboard/account data.

Dashboard data integration remains deferred.

## Headers

Existing headers now read provider auth state:

- Unauthenticated users see Login/Sign Up.
- Authenticated users see Dashboard/Logout where those actions already existed.
- Logout uses the provider, not localStorage or bearer tokens.

Balance/profile data is not integrated.

## SessionVersion Risk

The authentication contract audit found that MVC login initializes missing `SessionVersion`, but API login may not.

Frontend handling:

- The UI does not fake authentication from the login response.
- Login is treated as successful only after `CheckLogin` confirms the cookie session.
- If WebUI issues a cookie that fails `sid`/`SessionVersion` validation, the login page shows a runtime error.

Backend risk remains: WebUI API login should initialize or rotate `SessionVersion` the same way MVC login does, or all online users must already have a valid `SessionVersion`.

## Local Testing Procedure

1. Configure `.env.local` with the WebUI backend origin and API path prefix from `.env.example`.
2. Start WebUI with CORS allowing the Next.js origin.
3. Run `npm run dev`.
4. Open `/login`.
5. Test valid login, invalid login, logout, refresh restore, and dashboard redirect.
6. Open `/create-acount` and test registration through OTP/password setup.

## Browser Cookie Inspection

Use browser devtools Application/Storage tab:

- Confirm WebUI application cookie is set after login.
- Confirm it is sent on `CheckLogin`.
- Confirm it is removed or invalidated after logout.
- Confirm `SameSite=None; Secure` behavior works only over HTTPS in non-development WebUI environments.

## Required Backend/CORS Setup

WebUI must allow the Next.js origin in `OnlineCorsOrigins`.

Requests must support:

- `Access-Control-Allow-Credentials: true`
- credentialed `GET` and `POST`
- HTTPS for production cross-origin cookies

## Deferred Work

- Dashboard/account data integration
- Balance display from `/api/Online/UserInfo`
- Profile/account APIs
- Sports, odds, bets, booking, payments, and live betting
- Registration promo code support unless WebUI exposes a confirmed registration promo contract
- Backend fix or deployment verification for API login `SessionVersion`
