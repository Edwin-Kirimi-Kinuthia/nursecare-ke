const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function load(filename, mocks, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src/lib', filename), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => { if (!(name in mocks)) throw new Error(`Missing mock ${name}`); return mocks[name]; }, URL, Uint8Array, Date, ...globals });
  return exports;
}
function fixture({ shareFails = false, available = true } = {}) {
  const calls = [];
  class File {
    exists = false;
    uri = 'file:///cache/licence.pdf';
    create() { this.exists = true; calls.push(['create']); }
    async write(data, options) { calls.push(['write', data, options]); }
    delete() { this.exists = false; calls.push(['delete']); }
  }
  const mocks = {
    'react-native': { Platform: { OS: 'android' } },
    'expo-file-system': { File, Paths: { cache: 'cache' } },
    'expo-sharing': { isAvailableAsync: async () => available, shareAsync: async (...args) => { calls.push(['share', ...args]); if (shareFails) throw new Error('Share failed'); } },
    './config': { SITE_URL: 'https://app.carebora.co.ke' },
    './links': { openSite: async url => calls.push(['browser', url]) },
  };
  return { calls, mocks };
}
test('uploaded PDF is written as base64 and shared as a local file, then removed', async () => {
  const f = fixture();
  await load('documents.ts', f.mocks).openUploadedDocument('data:application/pdf;base64,JVBERi0=');
  assert.deepEqual(f.calls.map(c => c[0]), ['create', 'write', 'share', 'delete']);
  assert.equal(f.calls[1][1], 'JVBERi0=');
  assert.equal(f.calls[1][2].encoding, 'base64');
  assert.equal(f.calls[2][2].mimeType, 'application/pdf');
});
test('image uploads use their MIME type; normal links use the browser', async () => {
  const f = fixture();
  const { openUploadedDocument } = load('documents.ts', f.mocks);
  await openUploadedDocument('data:image/png;base64,aGVsbG8=');
  assert.equal(f.calls[2][2].mimeType, 'image/png');
  await openUploadedDocument('/uploads/licence.pdf');
  assert.deepEqual(f.calls.at(-1), ['browser', 'https://app.carebora.co.ke/uploads/licence.pdf']);
});
test('active content and unsupported addresses fail before native browser calls', async () => {
  const f = fixture();
  const { openUploadedDocument } = load('documents.ts', f.mocks);
  await assert.rejects(() => openUploadedDocument('data:text/html;base64,aGVsbG8='), /Unsupported document/);
  await assert.rejects(() => openUploadedDocument('javascript:alert(1)'), /Unsupported document/);
  assert.equal(f.calls.length, 0);
});
test('local licence is removed when sharing fails and unsupported devices show a recoverable error', async () => {
  const f = fixture({ shareFails: true });
  await assert.rejects(() => load('documents.ts', f.mocks).openUploadedDocument('data:application/pdf;base64,JVBERi0='), /Share failed/);
  assert.equal(f.calls.at(-1)[0], 'delete');
  const unavailable = fixture({ available: false });
  await assert.rejects(() => load('documents.ts', unavailable.mocks).openUploadedDocument('data:application/pdf;base64,JVBERi0='), /not available/);
});
test('protected PDF retries with a refreshed bearer token without downloading an error response', async () => {
  const f = fixture();
  let token = 'expired', requests = 0;
  f.mocks['./tokens'] = { getAccessToken: () => token };
  f.mocks['./api'] = { refreshSession: async () => { token = 'fresh'; return true; } };
  const fetch = async (_url, options) => {
    requests++;
    assert.equal(options.headers.Authorization, requests === 1 ? 'Bearer expired' : 'Bearer fresh');
    return requests === 1 ? { status: 401, ok: false } : { status: 200, ok: true, headers: new Headers({ 'content-type': 'application/pdf' }), arrayBuffer: async () => new ArrayBuffer(4) };
  };
  await load('pdf.ts', f.mocks, { fetch }).openAuthedPdf('https://app.carebora.co.ke/api/v1/test/pdf', 'test.pdf');
  assert.equal(requests, 2);
  assert.deepEqual(f.calls.map(c => c[0]), ['create', 'write', 'share', 'delete']);
});
