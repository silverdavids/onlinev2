const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the component without adding a browser or DOM dependency.
function loadNotification() {
  const effects = [];
  const timers = [];
  const cleared = [];
  const body = {};
  const exports = {};
  const source = fs.readFileSync('components/Shared/BetslipNotification.tsx', 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === 'react') return {
        useState: () => [false, () => {}],
        useEffect: (effect) => effects.push(effect),
      };
      if (name === 'react-dom') return { createPortal: (element, destination) => ({ element, destination }) };
      if (name === '@tabler/icons-react') return { IconCircleCheck: 'svg', IconAlertTriangle: 'svg', IconX: 'svg' };
      return require(name);
    },
    document: { body },
    window: {
      setTimeout(callback, delay) { timers.push({ callback, delay }); return timers.length; },
      clearTimeout(id) { cleared.push(id); },
    },
  });
  return { ...exports, effects, timers, cleared, body };
}

test('rejected ticket messages are never shown as successful placements', () => {
  const { getBetslipNotice } = loadNotification();
  for (const message of [
    'Ticket could not be placed.',
    'Ticket was not placed successfully.',
    'Booking not found, expired, or already used.',
    'Insufficient balance.',
    'Your session has expired. Please log in again.',
  ]) {
    const notice = getBetslipNotice(message);
    assert.equal(notice.role, 'alert', message);
    assert.equal(notice.title, 'Request failed', message);
  }
});

test('success, odds decisions, and unrecognized server responses remain distinct', () => {
  const { getBetslipNotice } = loadNotification();
  assert.equal(getBetslipNotice('Ticket placed successfully.').role, 'status');
  assert.equal(getBetslipNotice('Booking saved. Use the booking code below.').role, 'status');
  assert.equal(getBetslipNotice('Odds changed. Review the changes.').title, 'Action needed');
  assert.equal(getBetslipNotice('Service temporarily unavailable.').role, 'alert');
});

test('errors escape the scroll container and stay visible until dismissed', () => {
  const component = loadNotification();
  let dismissed = false;
  const result = component.default({
    notice: component.getBetslipNotice('Insufficient balance.'),
    message: 'Insufficient balance.',
    onDismiss: () => { dismissed = true; },
  });
  assert.equal(result.destination, component.body);
  assert.equal(result.element.props.role, 'alert');
  component.effects.forEach((effect) => effect());
  assert.equal(component.timers.length, 0);
  const heading = result.element.props.children[0];
  heading.props.children[2].props.onClick();
  assert.equal(dismissed, true);
});

test('success notifications allow reading time and clean up their timer', () => {
  const component = loadNotification();
  let dismissed = false;
  component.default({
    notice: component.getBetslipNotice('Ticket placed successfully.'),
    message: 'Ticket placed successfully.',
    onDismiss: () => { dismissed = true; },
  });
  const cleanup = component.effects[0]();
  assert.equal(component.timers[0].delay, 12000);
  component.timers[0].callback();
  assert.equal(dismissed, true);
  cleanup();
  assert.deepEqual(component.cleared, [1]);
});
