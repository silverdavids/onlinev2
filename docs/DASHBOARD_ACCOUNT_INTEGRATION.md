# Dashboard & Account Integration

Implemented on 2026-07-11 against the operational ASP.NET MVC5 backend:

```text
C:\Users\hp\source\repos\Bet\Bet\WebUI
```

`BetSoftware.WebCore` was not used.

## Confirmed Endpoints

| Purpose | Method | Route passed by new UI | Effective WebUI route | Auth | Confirmed source |
|---|---:|---|---|---|---|
| Account information and balance | GET | `/Online/UserInfo` | `/api/Online/UserInfo` | `OnlineClient`, `Teller`, or `Manager` cookie | `WebUI\Controllers\Api\ApiOnlineController.cs:28`, `WebUI\Controllers\Api\ApiOnlineController.cs:106` |
| Online betting limits | GET | `/CompanySettings/OnlineSettings` | `/api/CompanySettings/OnlineSettings` | Anonymous | `WebUI\Controllers\Api\ApiCompanySettingsController.cs:53`, `WebUI\Controllers\Api\ApiCompanySettingsController.cs:55` |

`GET /api/Online/UserInfo` returns:

```ts
{
  AccountId: number;
  Balance: number | null;
  UserId: string;
  PhoneNumber: string | null;
}
```

The backend builds this response from `OnlineUserInformation` in `ApiOnlineController.UserInfo`; the controller selects balance, account id, user id, and phone number before returning `Ok(model)` at `WebUI\Controllers\Api\ApiOnlineController.cs:107-149`.

`GET /api/CompanySettings/OnlineSettings` returns:

```ts
{
  MinStake: number | null;
  MaxStake: number | null;
  MaxPayOut: number | null;
}
```

The WebUI controller calls `GetOnlineLimitsAsync` at `WebUI\Controllers\Api\ApiCompanySettingsController.cs:58`. The repository projects the `Online` branch into `MinStake`, `MaxStake`, and `MaxPayOut` at `BetSoftware.Repositories\ICompanySettingsRepository.cs:80-88`; the domain type is `OnlineSettings` at `BetSoftware.Domain\CompanySettingsViewModel.cs:25-29`.

## Architecture

`AuthProvider` remains the source for cookie-session state. The root provider order is:

```text
AuthProvider
  AccountProvider
    OnlineSettingsProvider
      app
```

`AccountProvider` calls `accountApi.getOnlineClientInformation()` only after auth has completed and a session is authenticated. It clears account state when the user logs out or session restore determines that the user is unauthenticated. It also reuses an in-flight account request to avoid duplicate simultaneous calls.

`OnlineSettingsProvider` loads the confirmed anonymous online settings endpoint once and exposes `refreshSettings()` for later betting UI issues. It does not provide hardcoded fallback limits.

## UI Changes

`HeaderTwo` no longer displays the fake `UGX 1,000` balance. It shows the authenticated user's real balance from `AccountProvider`, formatted with:

```ts
Intl.NumberFormat("en-UG", {
  style: "currency",
  currency: "UGX",
  maximumFractionDigits: 0,
})
```

While account data is loading, the balance area shows `Loading...`. If account data is unavailable, it shows `Unavailable`. The balance area is hidden when unauthenticated.

`Dashboard` now shows an account overview panel with username, phone number, account ID, balance, loading, unavailable, and refresh states. Deposit, withdrawal, transaction history, profile update, sports, odds, betslip, booking, and live betting remain unchanged.

## Betting Limits

The online settings provider exposes:

```ts
settings
minStake
maxStake
maxPayout
isLoadingSettings
settingsLoaded
settingsError
refreshSettings
```

No current SmartBetUI-v2 component displays betting `MinStake`, `MaxStake`, or `MaxPayOut` as betting limits. Existing min/max amount text in dashboard deposit and withdrawal components is payment-specific and was intentionally not replaced with betting settings.

## Deferred Work

- Transactions and ticket history.
- Deposits and withdrawals.
- Sports, odds, betslip, booking, and live betting.
- Wiring betting-limit settings into betslip validation once the betslip issue begins.
- Backend changes, migrations, or WebUI modifications.

## Manual Test Checklist

1. Start the app with `NEXT_PUBLIC_API_BASE_URL` pointing at WebUI and credentials enabled.
2. Visit `/dashboard` while signed out and confirm route protection still redirects to login.
3. Sign in with a WebUI online user.
4. Confirm the dashboard account overview displays phone, account ID, and balance from `/api/Online/UserInfo`.
5. Confirm `HeaderTwo` displays the same balance and never shows the old fake `UGX 1,000`.
6. Log out and confirm the header balance is hidden and account state clears.
7. Confirm the app still builds and lints.
