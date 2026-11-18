const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PORTAL, isPortalURL, notificationURL, mayOpenExternally, alertTitle } = require('../src/policy.cjs');

test('remote pages never inherit portal privileges', () => {
  assert.equal(isPortalURL(PORTAL + '/appointments'), true);
  for (const u of ['http://app.carebora.co.ke', 'https://app.carebora.co.ke.evil.test', 'https://user@app.carebora.co.ke', 'file:///etc/passwd', 'javascript:alert(1)']) assert.equal(isPortalURL(u), false);
});
test('notification destinations remain on the portal', () => {
  assert.equal(notificationURL('/admin'), PORTAL + '/admin');
  for (const u of ['//evil.test', 'https://evil.test', '/\\evil.test', null]) assert.equal(notificationURL(u), PORTAL + '/appointments');
});
test('external links exclude local files and command protocols', () => {
  assert.equal(mayOpenExternally('https://example.com'), true);
  for (const u of ['file:///tmp/example', 'javascript:alert(1)', 'shell:AppsFolder', 'https://user:pass@example.com']) assert.equal(mayOpenExternally(u), false);
});
test('notification titles use fixed operational text, not private message content', () => {
  assert.match(alertTitle('consultation_started'), /provider has joined/);
  assert.equal(alertTitle('clinical_notes'), null);
});
