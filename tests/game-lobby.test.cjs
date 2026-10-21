const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const exportsObject = {};
const code = ts.transpileModule(fs.readFileSync('src/games/casino-data.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
vm.runInNewContext(code, { exports: exportsObject });
const { casinoGames, filterAndSortGames } = exportsObject;
const defaults = { provider: 'all', type: 'all', volatility: 'all', query: '', sort: 'popular' };

test('lobby catalogue preserves the ZIP category sizes and default Aviator ordering', () => {
  assert.equal(casinoGames.filter((game) => game.category === 'casino').length, 8);
  assert.equal(casinoGames.filter((game) => game.category === 'crash').length, 6);
  const aviator = casinoGames.filter((game) => game.category === 'aviator');
  assert.equal(aviator.length, 5);
  assert.equal(filterAndSortGames(aviator, defaults).map((game) => game.name).join(', '), 'Aviator, Jet X, Aviator Pro, Balloon, Sky Chase');
});

test('compound filters and case-insensitive search work together', () => {
  const aviator = casinoGames.filter((game) => game.category === 'aviator');
  const result = filterAndSortGames(aviator, { ...defaults, provider: 'Spribe', type: 'Crash flight', volatility: 'High', query: '  PRO  ' });
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Aviator Pro');
  assert.equal(filterAndSortGames(aviator, { ...defaults, query: 'not-a-game' }).length, 0);
});

test('sorting by minimum bet leaves the source catalogue unchanged', () => {
  const before = casinoGames.map((game) => game.id).join(',');
  const result = filterAndSortGames(casinoGames, { ...defaults, sort: 'minbet' });
  assert.equal(result[0].minBet, 300);
  assert.equal(result[result.length - 1].minBet, 5000);
  assert.equal(casinoGames.map((game) => game.id).join(','), before);
});
