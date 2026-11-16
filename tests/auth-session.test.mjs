import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSmartBetCheckLogin, validateSmartBetSession } from "../src/lib/auth-session.ts";

test("invalid credentials cannot create an authenticated customer", async () => {
  const user = await validateSmartBetSession(async () => null);
  assert.equal(user, null);
});

test("an unavailable backend cannot create an authenticated customer", async () => {
  const user = await validateSmartBetSession(async () => {
    throw new Error("backend unavailable");
  });
  assert.equal(user, null);
});

test("an expired session cannot create an authenticated customer", async () => {
  const user = await validateSmartBetSession(async () => null);
  assert.equal(user, null);
});

test("a session response without a stable customer identity is rejected", async () => {
  const user = await validateSmartBetSession(async () => ({ UserName: "unverified" }));
  assert.equal(user, null);
});

test("the verified CheckLogin envelope maps its nested customer only when authenticated", () => {
  assert.deepEqual(
    normalizeSmartBetCheckLogin({
      authenticated: true,
      user: { id: "account-id", username: "online-customer", email: "customer@example.test" },
      roles: ["OnlineClient"],
    }),
    { UserId: "account-id", UserName: "online-customer", Email: "customer@example.test" },
  );
  assert.equal(
    normalizeSmartBetCheckLogin({
      authenticated: false,
      user: { id: "account-id", username: "online-customer" },
    }),
    null,
  );
});
