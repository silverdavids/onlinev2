import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSmartBetCheckLogin, validateSmartBetSession } from "../src/lib/auth-session.ts";
import { createRequestEpoch } from "../src/lib/request-epoch.ts";

test("invalid credentials cannot create an authenticated customer", async () => {
  const user = await validateSmartBetSession(async () => null);
  assert.equal(user, null);
});

test("late session and account replies are ignored after logout or a newer refresh", async () => {
  const requests = createRequestEpoch();
  let finish;
  const delayed = new Promise((resolve) => {
    finish = resolve;
  });
  const request = requests.next();
  let published = null;
  const pending = delayed.then((user) => {
    if (requests.isCurrent(request)) published = user;
  });
  requests.invalidate();
  finish({ id: "previous-account" });
  await pending;
  assert.equal(published, null);
  const oldRefresh = requests.next();
  const newRefresh = requests.next();
  assert.equal(requests.isCurrent(oldRefresh), false);
  assert.equal(requests.isCurrent(newRefresh), true);
});

test("malformed truthy authenticated flags never create an identity", () => {
  assert.equal(
    normalizeSmartBetCheckLogin({ authenticated: "true", user: { id: "id", username: "name" } }),
    null,
  );
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
