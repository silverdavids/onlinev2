import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createRecoveryFlow,
  normalizeRecoveryPhone,
  OTP_LIFETIME_MS,
  RESEND_COOLDOWN_MS,
  initialRecoveryState,
} from "../src/lib/password-recovery.ts";

function fixture({
  issue = async () => true,
  complete = async () => ({ success: true }),
} = {}) {
  let time = 1_000_000;
  const calls = [];
  const states = [];
  const flow = createRecoveryFlow({
    now: () => time,
    onChange: (s) => states.push(s),
    api: {
      getOtp: (phone) => {
        calls.push({ action: "issue", phone });
        return issue();
      },
      verifyOtpAndSetPassword: (payload) => {
        calls.push({ action: "complete", payload });
        return complete();
      },
    },
  });
  return {
    flow,
    calls,
    states,
    advance: (ms) => {
      time += ms;
    },
  };
}
const goodPassword = "SyntheticPass1!";
const finish = (f) => f.flow.complete("012345", goodPassword, goodPassword);

test("recovery accepts only supported Ugandan mobile shapes", () => {
  for (const phone of ["0772000000", "772000000", "256772000000", "+256 (772) 000-000"])
    assert.equal(normalizeRecoveryPhone(phone), "+256772000000");
  for (const phone of [
    "",
    "customer",
    "077200000",
    "07720000000",
    "+254772000000",
    "+256412345678",
    "++256772000000",
    "0772<script>",
    "0".repeat(33),
  ])
    assert.equal(normalizeRecoveryPhone(phone), null);
});

test("invalid phone, code format, password policy and mismatch never reach reset API", async () => {
  const f = fixture();
  await f.flow.request("customer");
  assert.equal(f.calls.length, 0);
  await f.flow.request("0772000000");
  for (const args of [
    ["123", goodPassword, goodPassword],
    ["012345", "short", "short"],
    ["012345", "x".repeat(129), "x".repeat(129)],
    ["012345", goodPassword, "Different1!"],
  ]) {
    await f.flow.complete(...args);
    assert.ok(f.flow.snapshot().error);
  }
  assert.equal(f.calls.length, 1);
});

test("request acceptance opens code entry and atomic completion shows success", async () => {
  const f = fixture();
  await f.flow.request("0772000000");
  assert.equal(f.flow.snapshot().stage, "reset");
  assert.equal(f.flow.snapshot().busy, false);
  await finish(f);
  assert.equal(f.flow.snapshot().stage, "success");
  assert.equal(f.calls[1].payload.otpCode, "012345");
  assert.equal(f.calls[1].payload.phoneNumber, "+256772000000");
  assert.ok(!JSON.stringify(f.states).includes(goodPassword));
  assert.ok(!JSON.stringify(f.states).includes("012345"));
  await finish(f);
  assert.equal(f.calls.length, 2);
});

test("60-second cooldown includes phone aliases and permits retry at exact boundary", async () => {
  const f = fixture();
  await f.flow.request("0772000000");
  f.advance(RESEND_COOLDOWN_MS - 1);
  await f.flow.request("+256772000000");
  assert.equal(f.calls.length, 1);
  f.advance(1);
  await f.flow.request("+256772000000");
  assert.equal(f.calls.length, 2);
});

test("five-minute expiry blocks completion at exact boundary; resend starts new lifetime", async () => {
  const f = fixture();
  await f.flow.request("0772000000");
  f.advance(OTP_LIFETIME_MS);
  await finish(f);
  assert.equal(f.calls.length, 1);
  assert.match(f.flow.snapshot().error, /expired/);
  await f.flow.request("0772000000");
  await finish(f);
  assert.equal(f.flow.snapshot().stage, "success");
});

for (const status of [400, 403, 417, 429, 503]) {
  test(`HTTP ${status} issue failure without Retry-After allows an immediate retry`, async () => {
    const f = fixture({
      issue: async () => {
        throw { status };
      },
    });
    await f.flow.request("0772000000");
    assert.equal(f.flow.snapshot().stage, "phone");
    assert.equal(f.flow.snapshot().expiresAt, 0);
    assert.equal(f.flow.snapshot().cooldownUntil, 0);
    assert.ok(f.flow.snapshot().error);
    assert.equal(f.flow.snapshot().busy, false);
    await f.flow.request("0772000000");
    assert.equal(f.calls.length, 2);
  });
  test(`HTTP ${status} completion failure stays recoverable and never claims success`, async () => {
    const f = fixture({
      complete: async () => {
        throw { status };
      },
    });
    await f.flow.request("0772000000");
    await finish(f);
    assert.equal(f.flow.snapshot().stage, "reset");
    assert.ok(f.flow.snapshot().error);
    assert.equal(f.flow.snapshot().busy, false);
  });
}

test("server Retry-After sets the requested delay on a rejected OTP request", async () => {
  const f = fixture({
    issue: async () => {
      throw { status: 429, retryAfterMs: 12_000 };
    },
  });
  await f.flow.request("0772000000");
  assert.equal(f.flow.snapshot().cooldownUntil, 1_012_000);
  f.advance(11_999);
  await f.flow.request("0772000000");
  assert.equal(f.calls.length, 1);
  f.advance(1);
  await f.flow.request("0772000000");
  assert.equal(f.calls.length, 2);
});

test("failed resend invalidates previous UI proof without starting a cooldown", async () => {
  let sends = 0;
  const f = fixture({
    issue: async () => {
      if (++sends > 1) throw { status: 503 };
      return true;
    },
  });
  await f.flow.request("0772000000");
  f.advance(RESEND_COOLDOWN_MS);
  await f.flow.request("0772000000");
  await finish(f);
  assert.equal(f.calls.length, 2);
  assert.equal(f.flow.snapshot().expiresAt, 0);
  assert.equal(f.flow.snapshot().cooldownUntil, 0);
});

test("double-clicks issue and complete at most one in-flight request", async () => {
  let resolveIssue;
  let resolveComplete;
  const f = fixture({
    issue: () =>
      new Promise((resolve) => {
        resolveIssue = resolve;
      }),
    complete: () =>
      new Promise((resolve) => {
        resolveComplete = resolve;
      }),
  });
  const first = f.flow.request("0772000000");
  await f.flow.request("0772000000");
  assert.equal(f.calls.length, 1);
  resolveIssue(true);
  await first;
  const reset = finish(f);
  await finish(f);
  assert.equal(f.calls.length, 2);
  resolveComplete({ success: true });
  await reset;
  assert.equal(f.flow.snapshot().stage, "success");
});

test("cancel prevents late response from changing an abandoned screen", async () => {
  let resolve;
  const f = fixture({
    issue: () =>
      new Promise((done) => {
        resolve = done;
      }),
  });
  const request = f.flow.request("0772000000");
  f.flow.cancel();
  const count = f.states.length;
  resolve(true);
  await request;
  assert.equal(f.states.length, count);
});

test("network failures and false acceptance never produce success", async () => {
  for (const issue of [
    async () => {
      throw new TypeError("Synthetic offline");
    },
    async () => false,
  ]) {
    const f = fixture({ issue });
    await f.flow.request("0772000000");
    assert.equal(f.flow.snapshot().stage, "phone");
    assert.ok(f.flow.snapshot().error);
  }
  const f = fixture({ complete: async () => ({ success: false }) });
  await f.flow.request("0772000000");
  await finish(f);
  assert.equal(f.flow.snapshot().stage, "reset");
});

function renderRecovery(stage = "phone", error = "") {
  const source = fs.readFileSync("src/components/password-recovery.tsx", "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  const ui = (tag) => (props) => React.createElement(tag, props);
  const imports = {
    react: { ...React, default: React },
    "@/components/ui/button": { Button: ui("button") },
    "@/components/ui/input": { Input: ui("input") },
    "@/components/ui/label": { Label: ui("label") },
    "@/lib/api-smartbet": {
      smartBetApi: {
        getOtp: () => {
          throw new Error("SSR must not send");
        },
      },
    },
    "@/lib/password-recovery": {
      createRecoveryFlow,
      initialRecoveryState: { ...initialRecoveryState, stage, error },
    },
  };
  // Classic JSX needs React in scope in the VM; component and real React hooks still execute.
  const wrapper = vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { React });
  wrapper(
    (specifier) => {
      assert.ok(specifier in imports);
      return imports[specifier];
    },
    module,
    module.exports,
  );
  return renderToStaticMarkup(
    React.createElement(module.exports.PasswordRecovery, { onSignIn() {} }),
  );
}

test("temporary service feedback stays inside the visible recovery form", () => {
  const html = renderRecovery("phone", "Password recovery is temporarily unavailable.");
  assert.match(html, /role="alert"[^>]*>Password recovery is temporarily unavailable/);
  assert.match(html, /id="recovery-phone"/);
  assert.match(html, /Request SMS reset code/);
});
test("phone and reset SSR forms use POST and disabled fields before hydration", () => {
  for (const stage of ["phone", "reset"]) {
    const html = renderRecovery(stage);
    assert.match(html, /method="post"/);
    assert.match(html, /<fieldset disabled=""/);
    assert.doesNotMatch(html, /name="(?:.*password|.*code|.*phone)"/i);
    if (stage === "reset") {
      assert.match(html, /Confirm new password/);
      assert.match(html, /Receipt is not confirmed/);
    }
  }
});
