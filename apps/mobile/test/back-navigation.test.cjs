const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function fixture(pathname, canGoBack, platform = 'android') {
  const calls = []; let handler, cleanup;
  const mocks = {
    react: { useEffect: effect => { cleanup = effect(); } },
    'react-native': { Platform: { OS: platform }, BackHandler: { addEventListener: (event, callback) => { assert.equal(event, 'hardwareBackPress'); handler = callback; return { remove: () => calls.push('remove') }; } } },
    'expo-router': { usePathname: () => pathname, router: { canGoBack: () => canGoBack, back: () => calls.push('back'), replace: route => calls.push(route) } },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/features/AndroidBackNavigation.tsx'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => mocks[name] });
  exports.AndroidBackNavigation();
  return { calls, handler, cleanup };
}
test('system back pops existing history, including from home', () => {
  for (const pathname of ['/pharmacy', '/account', '/']) {
    const f = fixture(pathname, true);
    assert.equal(f.handler(), true); assert.deepEqual(f.calls, ['back']);
    f.cleanup(); assert.deepEqual(f.calls, ['back', 'remove']);
  }
});
test('a page opened without history goes home rather than exiting', () => {
  const f = fixture('/orders/123', false);
  assert.equal(f.handler(), true); assert.deepEqual(f.calls, ['/']);
});
test('home without history allows the normal Android exit', () => {
  const f = fixture('/', false);
  assert.equal(f.handler(), false); assert.deepEqual(f.calls, []);
});
test('iOS keeps native gesture handling', () => {
  assert.equal(fixture('/pharmacy', true, 'ios').handler, undefined);
});
