const { _electron } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');

(async () => {
  const profile = mkdtempSync(path.join(tmpdir(), 'carebora-desktop-test-'));
  const app = await _electron.launch({
    executablePath: require('electron'),
    args: [path.join(__dirname, '..'), '--use-fake-device-for-media-stream', `--user-data-dir=${profile}`],
    timeout: 30000,
  });
  try {
    const page = await app.firstWindow();
    await page.route('https://app.carebora.co.ke/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Care Bora media test</title>' }));
    await page.goto('https://app.carebora.co.ke/');
    await app.evaluate(({ dialog }) => {
      globalThis.testPrompts = 0;
      dialog.showMessageBox = async () => { globalThis.testPrompts++; return { response: 1 }; };
    });
    const result = () => page.evaluate(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const tracks = stream.getTracks().length;
        stream.getTracks().forEach(track => track.stop());
        return { tracks };
      } catch (error) { return { error: error.name }; }
    });
    assert.equal((await result()).error, 'NotAllowedError');
    assert.equal(await app.evaluate(() => globalThis.testPrompts), 1);
    await app.evaluate(({ dialog }) => {
      dialog.showMessageBox = async () => { globalThis.testPrompts++; return { response: 0 }; };
    });
    assert.ok((await result()).tracks > 0, 'Allow must connect the simulated camera');
    assert.equal(await app.evaluate(() => globalThis.testPrompts), 2);
    const security = await app.evaluate(({ BrowserWindow }) => {
      const prefs = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
      return { sandbox: prefs.sandbox, nodeIntegration: prefs.nodeIntegration, contextIsolation: prefs.contextIsolation };
    });
    assert.deepEqual(security, { sandbox: true, nodeIntegration: false, contextIsolation: true });
    console.log('Desktop consent: Cancel denies, Allow connects simulated camera; sandbox verified.');
  } finally {
    await app.close();
    rmSync(profile, { recursive: true, force: true });
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
