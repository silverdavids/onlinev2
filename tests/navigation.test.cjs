const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadTs(file, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, URLSearchParams, ...globals });
  return exports;
}

const { resolveLegacyRoute } = loadTs('src/navigation/legacyRoutes.ts');
const { menuGroups, accountLinks } = loadTs('src/navigation/siteNavigation.ts');

function hasPage(href) {
  const pathname = href.split('?')[0].replace(/^\//, '');
  if (!pathname) return fs.existsSync('app/page.tsx');
  if (['tsx', 'jsx'].some((ext) => fs.existsSync(path.join('app/(common)', pathname, `page.${ext}`)))) return true;
  if (/^fixture\/[^/]+$/.test(pathname)) return fs.existsSync('app/(common)/fixture/[originalMatchId]/page.tsx');
  if (/^tickets\/[^/]+$/.test(pathname)) return fs.existsSync('app/(common)/tickets/[receiptId]/page.tsx');
  if (/^live-betting\/[^/]+$/.test(pathname)) return fs.existsSync('app/(common)/live-betting/[matchId]/page.tsx');
  return false;
}

test('all current menu and account navigation destinations have pages', () => {
  for (const link of [...menuGroups.flatMap((group) => group.links), ...accountLinks]) {
    assert.equal(hasPage(link.href), true, `${link.label}: ${link.href}`);
  }
  for (const href of ['/casino', '/aviator', '/crash', '/slots', '/virtuals', '/deposit/mobile-money', '/withdraw/branch', '/withdraw/mobile-money']) {
    assert.equal(hasPage(href), true, href);
  }
});

test('reference desktop and mobile URLs all reach responsive equivalents', () => {
  const referencePaths = [
    'register', 'MobileLogin', 'MobileRegistration', 'MobileOtpVerification',
    'soccerodds', '1x2-odds', 'MobileTiles', 'live', 'MobileDeposit', 'MobileBetSlip',
    'my-bets', 'BetHistory', 'Statements', 'Account/Bonuses', 'MobileWithdraw',
    'MobileWithdraw/branch', 'MobileWithdraw/mtn', 'MobileWithdraw/airtel', 'withdrawMM',
    'messages', 'MobilePrivacyPolicy', 'MobileTerms', 'MobileResponsibleGaming',
    'MobileGamingRules', 'MobileForgotPassWord', 'ForgotPassWordForm', 'OtpForm',
    'ResetPassWord', 'ChangePassWord', 'AuthenticatedUserFooter', 'Aviator',
    'game-details/123', 'EventDetails/123', 'live-game-details/123',
    'receipt-details/123', 'MobileBetDetails/123',
  ];
  for (const legacy of referencePaths) {
    const target = resolveLegacyRoute(legacy.split('/'));
    assert.ok(target, legacy);
    assert.ok(hasPage(target), `${legacy} -> ${target}`);
  }
});

test('legacy redirects preserve query filters and enforce provider-specific paths', () => {
  assert.equal(resolveLegacyRoute(['withdrawMM'], { method: 'mtn' }), '/withdraw/mobile-money?method=mtn');
  assert.equal(resolveLegacyRoute(['MobileWithdraw', 'airtel'], { method: 'mtn' }), '/withdraw/mobile-money?method=airtel');
  assert.equal(resolveLegacyRoute(['game-details', '123'], { HomeTeam: 'Team A', MatchNo: '456' }), '/fixture/123?HomeTeam=Team+A&MatchNo=456');
  assert.equal(resolveLegacyRoute(['does-not-exist']), null);
  assert.equal(resolveLegacyRoute(['constructor']), null);
  assert.equal(resolveLegacyRoute(['__proto__']), null);
  assert.equal(resolveLegacyRoute(['https:', 'example.com']), null);
});

test('notification history stays scoped to the account and caps session history', () => {
  const storage = new Map();
  let nextId = 0;
  const store = loadTs('src/notifications/ticketNotifications.ts', {
    sessionStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    crypto: { randomUUID: () => String(++nextId) },
    Event: class Event {},
    window: { dispatchEvent() {} },
  });
  for (let index = 0; index < 55; index++) store.recordTicketNotification('user-a', { title: 'Ticket response', message: `Message ${index}`, href: '/betslip' });
  assert.equal(store.readTicketNotifications('user-a').length, 50);
  assert.equal(store.readTicketNotifications('user-a')[0].message, 'Message 54');
  assert.equal(store.readTicketNotifications('user-b').length, 0);
  storage.set('smartbet.notifications.user-b', '{invalid');
  assert.equal(store.readTicketNotifications('user-b').length, 0);
});
