const { app, BrowserWindow, Menu, Tray, Notification, dialog, shell, session, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { PORTAL, isPortalURL, notificationURL, mayOpenExternally, alertTitle } = require('./policy.cjs');

let window, tray, quitting = false, polling = false, activeUser = null;
let seen = new Set();
const startedAt = Date.now();
const settingsFile = () => path.join(app.getPath('userData'), 'notifications.json');
let allowedUsers = new Set();

app.setAppUserModelId('ke.co.carebora.desktop');
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => show());
app.on('before-quit', () => { quitting = true; });

function saveSettings() {
  fs.writeFileSync(settingsFile(), JSON.stringify([...allowedUsers]), { mode: 0o600 });
}
function show(url) {
  if (!window) return;
  window.show();
  if (window.isMinimized()) window.restore();
  window.focus();
  if (url && isPortalURL(url)) void window.loadURL(url);
}
async function portalJSON(route) {
  const response = await window.webContents.session.fetch(`${PORTAL}/api/v1${route}`, {
    credentials: 'include', redirect: 'error', signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  return (await response.json()).data;
}
async function enableAlerts() {
  const user = await portalJSON('/auth/me').catch(() => null);
  if (!user?.id) {
    await dialog.showMessageBox(window, { type: 'info', message: 'Sign in to enable desktop alerts.', detail: 'Alerts are linked to your Care Bora account.' });
    show(`${PORTAL}/login`);
    return;
  }
  const { response } = await dialog.showMessageBox(window, {
    type: 'question', buttons: ['Enable alerts', 'Cancel'], defaultId: 0, cancelId: 1,
    message: 'Enable Care Bora desktop alerts?',
    detail: 'Receive service requests, appointment requests and provider-joined alerts for this account while Care Bora is running. Clinical details stay inside the portal.',
  });
  if (response === 0) { allowedUsers.add(user.id); saveSettings(); buildMenu(); }
}
function buildMenu() {
  const actions = [
    { label: 'Open Care Bora', click: () => show() },
    { label: 'Enable alerts for this account…', click: () => { void enableAlerts(); } },
    { label: 'Disable desktop alerts', click: () => { allowedUsers.clear(); saveSettings(); } },
    { label: 'Download the latest version', click: () => { void shell.openExternal(`${PORTAL}/download`); } },
    { type: 'separator' }, { role: 'quit', label: 'Quit Care Bora' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Care Bora', submenu: actions },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }] },
  ]));
  tray?.setContextMenu(Menu.buildFromTemplate(actions));
}
async function poll() {
  if (polling || !window || window.isDestroyed()) return;
  polling = true;
  try {
    const user = await portalJSON('/auth/me');
    if (!user?.id) { activeUser = null; seen.clear(); return; }
    if (activeUser !== user.id) { activeUser = user.id; seen.clear(); }
    if (!allowedUsers.has(user.id)) return;
    const data = await portalJSON('/notifications');
    if (!data?.notifications) return;
    // Re-check identity after fetching, so a logout/account switch cannot show
    // the previous account's alerts on a shared desktop.
    const current = await portalJSON('/auth/me');
    if (current?.id !== user.id || !allowedUsers.has(user.id)) return;
    for (const item of [...data.notifications].reverse()) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      const title = alertTitle(item.type);
      const age = Date.now() - Date.parse(item.createdAt);
      if (!title || item.readAt || Date.parse(item.createdAt) < startedAt || age > 15 * 60_000) continue;
      if (!Notification.isSupported()) continue;
      const alert = new Notification({ title: 'Care Bora', body: title, icon: path.join(__dirname, '../assets/icon.png') });
      alert.on('click', async () => {
        const stillSignedIn = await portalJSON('/auth/me').catch(() => null);
        if (stillSignedIn?.id === user.id) show(notificationURL(item.link));
      });
      alert.show();
    }
    if (seen.size > 500) seen = new Set([...seen].slice(-100));
  } catch { /* Network interruption: the next poll retries without replaying alerts. */ }
  finally { polling = false; }
}

app.whenReady().then(() => {
  try { allowedUsers = new Set(JSON.parse(fs.readFileSync(settingsFile(), 'utf8'))); } catch { /* first launch */ }
  const portalSession = session.fromPartition('persist:carebora');
  // Chromium's media preflight must pass for our consent request handler to run.
  portalSession.setPermissionCheckHandler((_contents, permission, origin) => isPortalURL(origin) && ['media', 'clipboard-sanitized-write'].includes(permission));
  portalSession.setPermissionRequestHandler(async (contents, permission, callback, details) => {
    if (!isPortalURL(contents.getURL()) || !isPortalURL(details.requestingUrl || contents.getURL()) || permission !== 'media') return callback(false);
    const { response } = await dialog.showMessageBox(window, {
      type: 'question', message: 'Allow camera and microphone for your consultation?',
      buttons: ['Allow', 'Cancel'], defaultId: 1, cancelId: 1,
    });
    callback(response === 0);
  });
  window = new BrowserWindow({
    width: 1280, height: 860, minWidth: 800, minHeight: 600, title: 'Care Bora',
    icon: path.join(__dirname, '../assets/icon.png'), backgroundColor: '#f8fafc',
    webPreferences: { partition: 'persist:carebora', nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, webviewTag: false },
  });
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  const external = async (url) => {
    if (!mayOpenExternally(url)) return;
    const { response } = await dialog.showMessageBox(window, {
      type: 'question', buttons: ['Open', 'Cancel'], defaultId: 1, cancelId: 1,
      message: 'Open this link outside Care Bora?', detail: url.slice(0, 400),
    });
    if (response === 0) await shell.openExternal(url);
  };
  window.webContents.on('will-navigate', (event, url) => {
    if (!isPortalURL(url)) { event.preventDefault(); void external(url); }
  });
  window.webContents.on('will-redirect', (event, url) => {
    if (!isPortalURL(url)) { event.preventDefault(); void external(url); }
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isPortalURL(url)) show(url); else void external(url);
    return { action: 'deny' };
  });
  portalSession.on('will-download', (event, item, contents) => {
    const url = item.getURL();
    const trusted = isPortalURL(url) || (url.startsWith('blob:') && isPortalURL(url.slice(5)));
    if (contents !== window.webContents || !trusted) { event.preventDefault(); return; }
    item.setSaveDialogOptions({ defaultPath: path.join(app.getPath('downloads'), path.basename(item.getFilename())) });
  });
  const icon = nativeImage.createFromPath(path.join(__dirname, '../assets/tray.png')).resize({ width: 22, height: 22 });
  tray = new Tray(icon);
  tray.setToolTip('Care Bora — appointments and service alerts');
  tray.on('click', () => show());
  buildMenu();
  window.on('close', event => {
    if (!quitting && allowedUsers.size) { event.preventDefault(); window.hide(); }
  });
  window.on('closed', () => { window = null; if (!quitting) app.quit(); });
  void window.loadURL(PORTAL);
  setInterval(() => { void poll(); }, 15000).unref();
  window.webContents.on('did-finish-load', () => { void poll(); });
  app.on('activate', () => show());
});
app.on('window-all-closed', () => app.quit());
