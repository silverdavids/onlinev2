# API Foundation

This foundation is audited against the operational ASP.NET MVC5 backend:

```text
C:\Users\hp\source\repos\Bet\Bet\WebUI
```

`BetSoftware.WebCore` is not authoritative for this project. Do not use WebCore routes, DTOs, authentication, or behavior to extend this foundation.

The foundation is intentionally not wired into login, registration, dashboard, sports, odds, betslip, booking, or live betting screens yet.

## Environment

Configuration lives in `src/config/env.ts`.

Supported variables:

```text
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_API_PATH_PREFIX=api
NEXT_PUBLIC_API_TIMEOUT_MS=20000
NEXT_PUBLIC_API_WITH_CREDENTIALS=true
NEXT_PUBLIC_API_DEBUG=false
```

`NEXT_PUBLIC_API_BASE_URL` is the backend origin only. It should not include `/api`.

`NEXT_PUBLIC_API_PATH_PREFIX` defaults to `api`. The API client applies this prefix only to relative paths such as `/Account/Login`. Paths that already start with `/api/` are not double-prefixed. This is deliberate because WebUI has API routes under `/api/...` and MVC routes outside `/api/...`; future wrappers can pass either style safely.

## Client

The single reusable client is `src/api/apiClient.ts`.

Defaults:

- `baseURL`: `NEXT_PUBLIC_API_BASE_URL` or same-origin when empty
- `withCredentials`: enabled unless `NEXT_PUBLIC_API_WITH_CREDENTIALS=false`
- `timeout`: `NEXT_PUBLIC_API_TIMEOUT_MS` or 20000 ms
- JSON `Accept` and `Content-Type` headers

`lib/api.js` is a compatibility export for this same client. Do not add hardcoded hosts or separate interceptors there.

## Authentication

WebUI uses ASP.NET cookie authentication.

- Requests that need authenticated WebUI state must send cookies.
- The API client sets `withCredentials: true` by default.
- The foundation does not store bearer tokens and does not read `localStorage`.
- UI session restoration is deferred to Issue #12.

## Error Normalization

`src/api/apiError.ts` normalizes thrown request failures into `ApiError`.

Handled WebUI/older-frontend patterns:

- 400 `ModelState` dictionaries
- 400 `{ errors: [...] }`
- 400 `{ errors: { field: [...] } }`
- string and string-array error bodies
- `Message`, `message`, `Error`, `error`, and `detail` fields
- 401 as `UNAUTHORIZED` with `silent401`
- 417 as `EXPECTATION_FAILED`
- network failures as `NETWORK_ERROR`

## Confirmed Endpoint Table

| API wrapper | Method | Route passed to client | WebUI route | Request fields | Response shape | Auth |
|---|---:|---|---|---|---|---|
| `authApi.login` | POST | `/Account/Login` | `/api/Account/Login` | `UserName`, `Password`, `RememberMe` | `{ success, message, user: { Id, UserName, Email } }` | Anonymous; sets auth cookie |
| `authApi.logOff` | POST | `/Account/LogOff` | `/api/Account/LogOff` | none | empty OK | OnlineClient cookie |
| `authApi.checkLogin` | GET | `/Account/CheckLogin` | `/api/Account/CheckLogin` | optional `strict401` query supported by backend but not set by wrapper | 204 unauthenticated, or `{ authenticated, reason?, user?, roles? }` | Anonymous; reads cookie |
| `authApi.register` | POST | `/Account/Register` | `/api/Account/Register` | `Email`, `PhoneNumber`, `UserName`, `FirstName`, `SurName`, `NIN`, `DOB` | `{ success, message, expiresAt? }` or 417 `{ success, message }` | Anonymous |
| `authApi.changePassword` | POST | `/Account/ChangePassWord` | `/api/Account/ChangePassWord` | `UserName`, `OldPassword`, `NewPassword`, `ConfirmPassword` | boolean | OnlineClient cookie |
| `authApi.setNewPassword` | POST | `/Account/SetNewPassWord` | `/api/Account/SetNewPassWord` | `UserName?`, `NewPassword`, `ConfirmPassword`, `Code?`, `PhoneNumber?` | `{ Item1, Item2 }` from tuple serialization | OnlineClient cookie |
| `accountApi.getOnlineClientInformation` | GET | `/Online/UserInfo` | `/api/Online/UserInfo` | none | `{ AccountId, Balance, UserId, PhoneNumber }` | OnlineClient/Teller/Manager cookie |
| `accountApi.getAccountBonuses` | GET | `/Account/Bonuses` | `/api/Account/Bonuses` | none | `{ wallets, transactions }` | OnlineClient cookie |
| `accountApi.getOnlineSettings` | GET | `/CompanySettings/OnlineSettings` | `/api/CompanySettings/OnlineSettings` | none | `{ MinStake, MaxStake, MaxPayOut }` | Anonymous |
| `accountApi.getLocaleSettings` | GET | `/CompanySettings/Locale` | `/api/CompanySettings/Locale` | none | locale settings object, exact fields owned by repository | Auth cookie |
| `accountApi.getBonusSettings` | GET | `/CompanySettings/Bonus` | `/api/CompanySettings/Bonus` | none | bonus settings object, exact fields owned by repository | Auth cookie |
| `accountApi.getLiveSettings` | GET | `/CompanySettings/Live` | `/api/CompanySettings/Live` | none | live settings object, exact fields owned by repository | Auth cookie |

Confirmed WebUI files:

- `WebUI\Controllers\Api\ApiAccountController.cs`
- `WebUI\Controllers\Api\ApiOnlineController.cs`
- `WebUI\Controllers\Api\ApiCompanySettingsController.cs`
- `WebUI\Controllers\Api\ApiMatchesController.cs`

Confirmed older UI reference:

```text
C:\Users\hp\source\repos\thebet-online (2)\thebet-online\src\api\index.js
```

## Unconfirmed or Deferred

- `Account/Bonuses` is confirmed in WebUI, but the exact wallet/transaction entity field set should still be treated as backend-owned.
- `CompanySettings/OnlineSettings` is confirmed as `{ MinStake, MaxStake, MaxPayOut }`. Other `CompanySettings/*` DTO field names come from repository projections not fully enumerated in this foundation.
- Match, odds, ticket, booking, payment, and live-update wrappers are deferred. They belong to later issues.
- Dashboard/account data now uses `GET /api/Online/UserInfo` after authentication is confirmed. Sports, odds, ticket, booking, payment, and live-update wrappers are deferred.

## Adapters and DTOs

Server DTOs live in `src/types/backendDtos.ts`.

View models live in `src/types/viewModels.ts`.

Adapters live in:

- `src/adapters/authAdapters.ts`
- `src/adapters/accountAdapters.ts`

The adapters keep WebUI DTO casing separate from UI-facing models. Screens should consume view models once future issues start integration work.

## Deferred to Issue #12

- Replace current login component networking.
- Restore/check session on app load.
- Fetch and render account balance.
- Add user-facing auth state.
- Remove old component-local hardcoded auth calls.
