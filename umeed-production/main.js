const { app, BrowserWindow, Menu, shell, ipcMain, dialog, protocol, net, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

protocol.registerSchemesAsPrivileged([
  { scheme: 'umeed', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);

function safeAppFile(urlString) {
  const url = new URL(urlString);
  let rel = decodeURIComponent(url.pathname || '/index.html').replace(/^\/+/, '');
  if (!rel) rel = 'index.html';
  const root = path.resolve(__dirname);
  const file = path.resolve(root, rel);
  if (!file.startsWith(root + path.sep) && file !== path.join(root, 'index.html')) return null;
  return file;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#0A0C10',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: true
    }
  });

  win.loadURL('umeed://app/index.html');
  win.once('ready-to-show', () => { win.maximize(); win.show(); });

  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const u = new URL(url);
      if (u.protocol === 'https:' && (u.hostname === 'wa.me' || u.hostname === 'api.whatsapp.com')) {
        shell.openExternal(url);
      }
    } catch {}
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('umeed://app/')) event.preventDefault();
  });
}

app.whenReady().then(async () => {
  protocol.handle('umeed', request => {
    const file = safeAppFile(request.url);
    if (!file) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });

  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('app-version', () => app.getVersion());

ipcMain.handle('umeed-print-a5', async (event) => {
  return await new Promise(resolve => {
    event.sender.print({
      silent: false,
      printBackground: true,
      color: true,
      landscape: false,
      pageSize: 'A5',
      margins: { marginType: 'none' },
      scaleFactor: 100
    }, (success, failureReason) => resolve({ ok: success, error: failureReason || null }));
  });
});

ipcMain.handle('umeed-export-json', async (_event, payload) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save UMEED Backup',
    defaultPath: 'UMEED-Backup.json',
    filters: [{ name: 'JSON Backup', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { ok: false };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  return { ok: true, filePath };
});

ipcMain.handle('umeed-import-json', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Restore UMEED Backup',
    properties: ['openFile'],
    filters: [{ name: 'JSON Backup', extensions: ['json'] }]
  });
  if (canceled || !filePaths.length) return { ok: false };
  const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
  return { ok: true, filePath: filePaths[0], data };
});
