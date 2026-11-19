import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { buildDevelopTicket } from "../src/lib/backend-contracts.ts";

// Compile actual client modules with isolated configuration and a fetch stub.
// No fallback to real fetch is available, including on an unexpected route.
function client(responses = []) {
  const calls = [];
  const events = [];
  const cache = new Map();
  const context = vm.createContext({
    URL,
    URLSearchParams,
    AbortController,
    setTimeout,
    clearTimeout,
    window: { dispatchEvent: (event) => events.push(event.type) },
    Event,
    fetch: async (url, options) => {
      calls.push({ url, ...options });
      const next = responses.shift();
      if (!next) throw new Error("Unexpected mocked request; real network is disabled.");
      if (next instanceof Error) throw next;
      return new Response(next.body === undefined ? null : JSON.stringify(next.body), {
        status: next.status ?? 200,
        headers: { "content-type": "application/json", ...next.headers },
      });
    },
  });
  function load(file) {
    if (file.endsWith("api-config.ts"))
      return {
        API_CONFIG: {
          backendUrl: "",
          gamesBaseUrl: "https://feed.test",
          defaultTimeoutMs: 100,
          paymentTimeoutMs: 100,
        },
      };
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const wrapper = vm.runInContext(`(function(require,module,exports){${code}\n})`, context);
    wrapper(
      (specifier) => {
        assert.ok(specifier.startsWith("./"), `Unexpected import: ${specifier}`);
        return load(path.resolve(path.dirname(file), specifier + ".ts"));
      },
      module,
      module.exports,
    );
    return module.exports;
  }
  return { ...load(path.resolve("src/lib/api-smartbet.ts")), calls, events };
}
const payload = {
  betData: [
    {
      betCategory: "OU",
      betOption: "Over",
      line: "2.5",
      matchId: 123,
      matchOddId: 456,
      bookMakerId: 1,
      odd: 1.9,
      IsLive: false,
    },
  ],
  totalBonus: 0,
  totalOdds: 1.9,
  totalStake: 1000,
  isLive: false,
};
const historyRow = {
  ReceiptId: 123,
  SerialCode: "TEST-RECEIPT",
  BookingCode: null,
  ReceiptStatus: 1,
  Stake: 1000,
  TotalOdds: 1.9,
  ReceiptDate: "2026-11-17T12:00:00",
  AmountPaid: 0,
};

test("develop Login exact body and cookie credentials; follow with authoritative CheckLogin", async () => {
  const c = client([
    {
      body: {
        success: true,
        message: "Login successful",
        user: { Id: "u1", UserName: "customer", Email: "user@example.test" },
      },
    },
    {
      body: {
        authenticated: true,
        user: { id: "u1", username: "customer", phone: "+256700000001" },
        roles: ["OnlineClient"],
      },
    },
  ]);
  await c.smartBetApi.login(" customer ", "synthetic-password", false);
  const user = await c.smartBetApi.checkLogin();
  assert.equal(user.UserId, "u1");
  assert.equal(c.calls[0].url, "/api/Account/Login");
  assert.deepEqual(JSON.parse(c.calls[0].body), {
    UserName: "customer",
    Password: "synthetic-password",
    RememberMe: false,
  });
  assert.ok(c.calls.every((call) => call.credentials === "include"));
  assert.equal(c.calls[0].headers["Content-Type"], "application/json");
});
test("semantic login failure and malformed 2xx cannot authenticate", async () => {
  for (const body of [
    { success: false, message: "Invalid login credentials." },
    { success: "true" },
    {},
  ]) {
    const c = client([{ body }]);
    await assert.rejects(c.smartBetApi.login("customer", "synthetic-password"));
  }
});
test("CheckLogin 204 and strict 401 are anonymous; 401 invalidates mounted session", async () => {
  const c = client([{ status: 204 }, { status: 401 }]);
  assert.equal(await c.smartBetApi.checkLogin(), null);
  assert.equal(await c.smartBetApi.checkLogin(true), null);
  assert.equal(c.calls[1].url, "/api/Account/CheckLogin?strict401=true");
  assert.deepEqual(c.events, ["smartbet:session-expired"]);
});
test("LogOff accepts empty 200 and preserves 503 revocation failure", async () => {
  const c = client([{}, { status: 503 }]);
  await c.smartBetApi.logOff();
  await assert.rejects(c.smartBetApi.logOff(), (e) => e.status === 503);
  assert.equal(c.calls[0].method, "POST");
  assert.equal(c.calls[0].body, undefined);
});
test("login global model validation and wrong-role statuses survive the client", async () => {
  for (const status of [400, 403]) {
    const c = client([
      {
        status,
        body: {
          Message: "The request is invalid.",
          ModelState: { "model.UserName": ["Username is required"] },
        },
      },
    ]);
    await assert.rejects(
      c.smartBetApi.login("customer", "synthetic-password"),
      (e) => e.status === status,
    );
  }
});
test("registration and legacy recovery helpers remain blocked before HTTP", async () => {
  const c = client();
  for (const operation of [
    () => c.smartBetApi.register({}),
    () => c.smartBetApi.validateOtp("0700000001", "123456"),
    () => c.smartBetApi.setNewPassword({}),
  ])
    await assert.rejects(operation(), /security/);
  assert.equal(c.calls.length, 0);
});

test("approved recovery requests use POST, explicit purpose and JSON-only proof/passwords", async () => {
  const c = client([{ body: true }, { body: { success: true } }]);
  await c.smartBetApi.getOtp("0772 000 000");
  await c.smartBetApi.verifyOtpAndSetPassword({
    phoneNumber: "0772000000",
    otpCode: "012345",
    newPassword: "SyntheticPass1!",
    confirmPassword: "SyntheticPass1!",
  });
  const request = new URL(c.calls[0].url, "http://frontend.test");
  assert.equal(c.calls[0].method, "POST");
  assert.equal(request.pathname, "/api/Account/GetOTP");
  assert.equal(request.searchParams.get("purpose"), "password-reset");
  assert.equal(request.searchParams.get("phoneNumber"), "+256772000000");
  assert.equal(c.calls[1].url, "/api/Account/VerifyOtpAndSetPassword");
  assert.equal(c.calls[1].method, "POST");
  assert.deepEqual(JSON.parse(c.calls[1].body), {
    PhoneNumber: "+256772000000",
    OtpCode: "012345",
    NewPassword: "SyntheticPass1!",
    ConfirmPassword: "SyntheticPass1!",
    Purpose: "password-reset",
  });
  assert.equal(c.calls[1].credentials, "include");
  assert.ok(
    c.calls.every((call) => !call.url.includes("012345") && !call.url.includes("SyntheticPass")),
  );
});

test("recovery adapter rejects invalid phone and mismatched passwords before fetch", async () => {
  const c = client();
  await assert.rejects(c.smartBetApi.getOtp("customer-name"), (e) => e.status === 400);
  await assert.rejects(
    c.smartBetApi.verifyOtpAndSetPassword({
      phoneNumber: "0772000000",
      otpCode: "012345",
      newPassword: "SyntheticPass1!",
      confirmPassword: "DifferentPass1!",
    }),
    (e) => e.status === 400,
  );
  assert.equal(c.calls.length, 0);
});

for (const status of [400, 417, 429, 503]) {
  test(`recovery preserves HTTP ${status} for UI handling`, async () => {
    const c = client(
      [
        { status, body: { message: "Synthetic failure" } },
        { status, body: { message: "Synthetic failure" } },
      ],
    );
    await assert.rejects(c.smartBetApi.getOtp("0772000000"), (e) => e.status === status);
    await assert.rejects(
      c.smartBetApi.verifyOtpAndSetPassword({
        phoneNumber: "0772000000",
        otpCode: "012345",
        newPassword: "SyntheticPass1!",
        confirmPassword: "SyntheticPass1!",
      }),
      (e) => e.status === status,
    );
  });
}

test("recovery never treats truthy/missing success as accepted", async () => {
  const c = client([{ body: { success: true } }, { body: { success: "true" } }]);
  await assert.rejects(c.smartBetApi.getOtp("0772000000"), (e) => e.status === 503);
  await assert.rejects(
    c.smartBetApi.verifyOtpAndSetPassword({
      phoneNumber: "0772000000",
      otpCode: "012345",
      newPassword: "SyntheticPass1!",
      confirmPassword: "SyntheticPass1!",
    }),
    (e) => e.status === 503,
  );
});

test("recovery exposes a retry duration only when a valid Retry-After is returned", async () => {
  const c = client([
    { status: 429, headers: { "Retry-After": "12" } },
    { status: 429 },
    { status: 403, headers: { "Retry-After": "invalid" } },
  ]);
  await assert.rejects(c.smartBetApi.getOtp("0772000000"), (e) => e.status === 429 && e.retryAfterMs === 12_000);
  await assert.rejects(c.smartBetApi.getOtp("0772000000"), (e) => e.status === 429 && e.retryAfterMs === undefined);
  await assert.rejects(c.smartBetApi.getOtp("0772000000"), (e) => e.status === 403 && e.retryAfterMs === undefined);
});

test("UserInfo PascalCase account and authoritative balance map without identity fabrication", async () => {
  const c = client([
    { body: { AccountId: 10001, UserId: "u1", Balance: 12000, PhoneNumber: "+256700000001" } },
  ]);
  const result = await c.smartBetApi.getUserInfo();
  assert.equal(result.Balance, 12000);
  assert.equal(result.AccountId, 10001);
  assert.equal(c.calls[0].url, "/api/Online/UserInfo");
});
test("Bonuses reuses develop wallet/transaction envelope", async () => {
  const body = { wallets: [{ walletId: 1, bonusBalance: 100 }], transactions: [] };
  const c = client([{ body }]);
  assert.equal((await c.smartBetApi.getBonuses()).wallets[0].bonusBalance, 100);
  assert.equal(c.calls[0].url, "/api/Account/Bonuses");
});
test("Statement/Me paginates without userId and represents positive Debit amounts as debits", async () => {
  const c = client([
    {
      body: [
        {
          StatementId: 1,
          Amount: 1000,
          BalBefore: 5000,
          BalAfter: 4000,
          StatetmentDate: "2026-11-17T12:00:00",
          TransactionType: "Debit",
          Transcation: "Stake",
          Comment: "Bet stake",
        },
      ],
    },
  ]);
  const rows = await c.smartBetApi.getStatement(2, 20);
  assert.equal(rows[0].Amount, -1000);
  assert.equal(rows[0].Type, "Stake");
  assert.equal(c.calls[0].url, "/api/Statement/Me?Page=2&ItemsPerPage=20");
});
test("booking maps Succeeded/JsonData.BookingCode, keeps exact selection identifiers and line", async () => {
  const c = client([{ body: { Succeeded: true, JsonData: { BookingCode: 123456, Stake: 1000 } } }]);
  assert.equal((await c.smartBetApi.createBooking(payload)).bookingCode, "123456");
  assert.equal(c.calls[0].url, "/api/Ticket/Booking");
  assert.deepEqual(JSON.parse(c.calls[0].body), payload);
});
test("booking failure and missing reference never produce a shareable code", async () => {
  for (const body of [
    { Succeeded: false, Message: "Odds changed" },
    { Succeeded: true, JsonData: {} },
  ]) {
    const c = client([{ body }]);
    await assert.rejects(c.smartBetApi.createBooking(payload));
  }
});
test("booking lookup uses GetBooking Id and maps GameBets without treating code as receipt ID", async () => {
  const c = client([
    {
      body: {
        BookingCode: 123456,
        GameBets: [
          {
            MatchId: 123,
            MatchOddId: 456,
            BookMakerId: 1,
            Market: "OU",
            Option: "Over",
            Line: "2.5",
            Odd: 1.9,
            IsLive: false,
          },
        ],
      },
    },
  ]);
  const rows = await c.smartBetApi.getBookingSelections("123456");
  assert.equal(c.calls[0].url, "/api/Ticket/GetBooking?Id=123456");
  assert.equal(rows[0].line, "2.5");
  assert.equal(rows[0].betOption, "Over");
  await assert.rejects(c.smartBetApi.getBookingSelections("SB7HQ21"));
  assert.equal(c.calls.length, 1);
});
test("empty OnlineClient ticket 200 means accepted without invented receipt or retry", async () => {
  const c = client([{}]);
  const result = await c.smartBetApi.submitTicket(payload);
  assert.equal(result.success, true);
  assert.equal(result.receiptId, undefined);
  assert.equal(result.bookingCode, undefined);
  assert.equal(c.calls.length, 1);
});
test("ticket 417 errors and ambiguous network outcomes are not retried", async () => {
  for (const response of [
    { status: 417, body: { Succeeded: false, Message: "Odds changed" } },
    new TypeError("connection lost"),
  ]) {
    const c = client([response]);
    await assert.rejects(c.smartBetApi.submitTicket(payload));
    assert.equal(c.calls.length, 1);
  }
});
test("bet history uses develop numeric receipt states and paginated current-user route", async () => {
  const c = client([
    {
      body: [
        historyRow,
        { ...historyRow, ReceiptId: 124, ReceiptStatus: 4 },
        { ...historyRow, ReceiptId: 125, ReceiptStatus: -1 },
      ],
    },
  ]);
  const rows = await c.smartBetApi.getMyBets();
  assert.deepEqual(
    Array.from(rows, (row) => row.status),
    ["open", "won", "cancelled"],
  );
  assert.equal(rows[0].potential, 1900);
  assert.equal(c.calls[0].url, "/api/Online/MyBets?Page=1&ItemsPerPage=100");
});
test("owned receipt detail reuses Online/MyBets/id and its embedded Bets", async () => {
  const c = client([
    {
      body: {
        ...historyRow,
        PossibleReturn: 1900,
        Bets: [
          {
            BetId: 1,
            MatchId: 123,
            HomeTeam: "Home",
            AwayTeam: "Away",
            Market: "1x2",
            Option: "1",
            Odd: 1.9,
          },
        ],
      },
    },
  ]);
  const receipt = await c.smartBetApi.getReceiptById(123);
  assert.equal(c.calls[0].url, "/api/Online/MyBets/123");
  assert.equal(receipt.selections[0].match, "Home v Away");
  assert.equal(c.calls.length, 1);
});
test("deposit 202 without invented status starts pending tracking using backend code", async () => {
  const c = client([
    {
      status: 202,
      body: {
        message: "Deposit request submitted.",
        code: "TEST-DEPOSIT",
        transactionId: "provider-ref",
        amount: 1000,
      },
    },
  ]);
  const result = await c.smartBetApi.requestMobileMoneyDeposit(1000, "0700000001");
  assert.equal(result.code, "TEST-DEPOSIT");
  assert.equal(result.status, "PENDING");
  assert.deepEqual(JSON.parse(c.calls[0].body), {
    phoneNumber: "256700000001",
    amount: 1000,
    PromoCode: null,
  });
});
test("deposit numeric status is authoritative; misleading labels cannot imply payment success", async () => {
  const c = client(
    [0, 2, -1, 999].map((Status) => ({
      body: {
        Code: "TEST-DEPOSIT",
        Status,
        Label: "Completed",
        Amount: 1000,
        Balance: Status === 2 ? 12000 : null,
      },
    })),
  );
  const statuses = [];
  for (let i = 0; i < 4; i++)
    statuses.push((await c.smartBetApi.getDepositStatus("TEST-DEPOSIT")).status);
  assert.deepEqual(statuses, ["PENDING", "SUCCESSFUL", "FAILED", "UNKNOWN"]);
});
test("branch voucher uses existing successful flag rather than requiring a nonexistent status", async () => {
  const c = client([
    {
      body: {
        successful: true,
        message: "Request Successful",
        code: "TEST-VOUCHER",
        balance: 9000,
        correlationId: "synthetic",
      },
    },
  ]);
  const result = await c.smartBetApi.withdrawAtBranch(1000);
  assert.equal(result.status, "APPROVED");
  assert.equal(result.code, "TEST-VOUCHER");
  assert.equal(c.calls[0].url, "/api/Online/WithdrawAtBranch");
});
test("financial 401/403/404 remain errors and never create client balances", async () => {
  for (const status of [401, 403, 404]) {
    const c = client([{ status, body: { message: "Not available" } }]);
    await assert.rejects(
      c.smartBetApi.getDepositStatus("TEST-DEPOSIT"),
      (e) => e.status === status,
    );
  }
});
test("public feed omits cookies based on exact configured origin", async () => {
  const c = client([{ body: [] }]);
  await c.smartBetApi.getPrematchFeed();
  assert.equal(c.calls[0].credentials, "omit");
});
test("matches metadata routes reuse backend develop, not the separate games host", async () => {
  const c = client([
    {
      body: [
        { CountryName: "Uganda", CountryId: 1, Leagues: [{ LeagueId: 1, LeagueName: "League" }] },
      ],
    },
    { body: 23 },
    {
      body: [
        {
          OriginalMatchId: 123,
          ShortCode: 1,
          HomeTeamName: "Home",
          AwayTeamName: "Away",
          Champ: "League",
          Odds: [{ K: "1", V: 1.9 }],
        },
      ],
    },
  ]);
  assert.equal((await c.smartBetApi.getCountriesWithLeagues())[0].CountryName, "Uganda");
  assert.equal(await c.smartBetApi.getSetCount(), 23);
  assert.equal((await c.smartBetApi.getTopMatches())[0].Odds[0].K, "1");
  assert.ok(
    c.calls.every((call) => call.url.startsWith("/api/Matches/") && call.credentials === "include"),
  );
});
test("authenticated password change sends existing model and requires a literal boolean", async () => {
  const c = client([{ body: true }, { body: false }, { body: { success: true } }]);
  const model = {
    UserName: "customer",
    OldPassword: "synthetic-old",
    NewPassword: "synthetic-new",
    ConfirmPassword: "synthetic-new",
  };
  assert.equal(await c.smartBetApi.changePassword(model), true);
  assert.equal(await c.smartBetApi.changePassword(model), false);
  await assert.rejects(c.smartBetApi.changePassword(model));
  assert.deepEqual(JSON.parse(c.calls[0].body), model);
});
test("availability helpers preserve value query and backend available envelope", async () => {
  const c = client([
    { body: { available: true } },
    { body: { available: false } },
    { body: { available: true } },
  ]);
  assert.equal((await c.smartBetApi.checkUsername("user name")).available, true);
  assert.equal((await c.smartBetApi.checkPhone("+256700000001")).available, false);
  await c.smartBetApi.checkEmail("user@example.test");
  assert.equal(c.calls[0].url, "/api/Account/CheckUsername?value=user%20name");
  assert.ok(c.calls[1].url.includes("%2B256"));
});
test("mobile withdrawal preserves stable requestId and existing challenge confirmation DTO", async () => {
  const requestId = "00000000-0000-4000-8000-000000000001";
  const c = client([
    { body: { status: "OTP", challengeId: requestId, requestId, amount: 1000 } },
    { body: { status: "PENDING", requestId, transactionId: requestId } },
  ]);
  const challenge = await c.smartBetApi.requestWithdrawal(requestId, 1000, "0700000001");
  await c.smartBetApi.confirmWithdrawalAlt(challenge.challengeId, "123456");
  assert.deepEqual(JSON.parse(c.calls[0].body), {
    requestId,
    amount: 1000,
    altPhone: "256700000001",
  });
  assert.deepEqual(JSON.parse(c.calls[1].body), { challengeId: requestId, otpCode: "123456" });
});
test("draft serialization retains backend codes/line and never invents provider identifiers or bonus", () => {
  const draft = {
    matchId: "123",
    odds: 1.9,
    betCategory: "OU",
    betOption: "Over",
    line: 2.5,
    bookMakerId: 1,
    matchOddId: 456,
  };
  assert.deepEqual(buildDevelopTicket([draft], 1000), payload);
  assert.throws(() => buildDevelopTicket([{ ...draft, betOption: undefined }], 1000));
  assert.throws(() => buildDevelopTicket([{ ...draft, bookMakerId: undefined }], 1000));
  assert.throws(() => buildDevelopTicket([draft], 1.5));
});
test("invalid pagination cannot produce a backend request", async () => {
  const c = client();
  await assert.rejects(c.smartBetApi.getMyBets(0));
  await assert.rejects(c.smartBetApi.getStatement(1, 101));
  assert.equal(c.calls.length, 0);
});

test("voucher redemption reuses authenticated code DTO and explicit success/balance", async () => {
  const c = client([
    {
      body: {
        success: true,
        message: "Deposit successful.",
        balance: 12000,
        amount: 1000,
        code: "TESTCODE",
      },
    },
  ]);
  const result = await c.smartBetApi.redeemDeposit(" TESTCODE ");
  assert.equal(result.success, true);
  assert.equal(result.balance, 12000);
  assert.deepEqual(JSON.parse(c.calls[0].body), { code: "TESTCODE" });
});

test("OnlineSettings and OpenBetsCount preserve existing numeric contracts", async () => {
  const c = client([{ body: { MinStake: 50, MaxStake: 50000, MaxPayOut: 1500000 } }, { body: 3 }]);
  assert.equal((await c.smartBetApi.getOnlineSettings()).MinStake, 50);
  assert.equal(await c.smartBetApi.getOpenBetsCount(), 3);
  assert.equal(c.calls[0].url, "/api/CompanySettings/OnlineSettings");
  assert.equal(c.calls[1].url, "/api/Online/OpenBetsCount");
});
