const { _electron } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');

(async () => {
  const profile = mkdtempSync(path.join(tmpdir(), 'carebora-alert-test-'));
  const app = await _electron.launch({ executablePath: require('electron'), args: [path.join(__dirname, '..'), `--user-data-dir=${profile}`], timeout: 30000 });
  try {
    const page = await app.firstWindow();
    await page.route('https://app.carebora.co.ke/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Care Bora alert test</title>' }));
    await app.evaluate(({ BrowserWindow, dialog, Notification }) => {
      globalThis.fixtureUser = 'account-a';
      globalThis.fixtureItems = [];
      globalThis.alerts = [];
      // CI has no notification daemon. Exercise our native options and account
      // handling with a supported OS fixture, without sending real alerts.
      Notification.isSupported = () => true;
      dialog.showMessageBox = async () => ({ response: 0 });
      Notification.prototype.show = function () { globalThis.alerts.push({ title: this.title, body: this.body, silent: this.silent }); };
      BrowserWindow.getAllWindows()[0].webContents.session.fetch = async url => ({
        ok: true, json: async () => ({ data: url.endsWith('/auth/me') ? { id: globalThis.fixtureUser } : { notifications: globalThis.fixtureItems } }),
      });
    });
    await page.goto('https://app.carebora.co.ke/');
    await app.evaluate(({ Menu }) => Menu.getApplicationMenu().items[0].submenu.items.find(item => item.label.startsWith('Enable alerts')).click());
    await page.waitForTimeout(200);
    await app.evaluate(() => {
      globalThis.fixtureItems = [
        { id: 'confirmed', type: 'appointment_confirmed', body: 'Private clinical data', createdAt: new Date().toISOString() },
        { id: 'message', type: 'support_reply', body: 'Private client message', createdAt: new Date().toISOString() },
        { id: 'old', type: 'appointment_confirmed', createdAt: new Date(Date.now() - 3600000).toISOString() },
      ];
    });
    await page.reload();
    const deadline = Date.now() + 25000;
    while ((await app.evaluate(() => globalThis.alerts)).length < 2 && Date.now() < deadline) await page.waitForTimeout(100);
    let alerts = await app.evaluate(() => globalThis.alerts);
    assert.equal(alerts.length, 2);
    assert.ok(alerts.every(alert => alert.silent === false));
    assert.ok(!JSON.stringify(alerts).includes('Private'));
    await page.reload(); await page.waitForTimeout(200);
    assert.equal((await app.evaluate(() => globalThis.alerts)).length, 2, 'Reload must not replay notifications');
    await app.evaluate(({ Menu }) => Menu.getApplicationMenu().items[0].submenu.items.find(item => item.label === 'Test sound and notification').click());
    await page.waitForTimeout(200);
    assert.equal((await app.evaluate(() => globalThis.alerts)).length, 3);
    await app.evaluate(() => { globalThis.fixtureUser = 'account-b'; globalThis.fixtureItems = [{ id: 'another', type: 'consultation_started', createdAt: new Date().toISOString() }]; });
    await page.reload(); await page.waitForTimeout(200);
    assert.equal((await app.evaluate(() => globalThis.alerts)).length, 3, 'A new account must explicitly enable alerts');
    console.log('Desktop alerts: sound requested, confirmations/messages included, private text hidden, replay and account switching checked.');
  } finally { await app.close(); rmSync(profile, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
