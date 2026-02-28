const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_TITLE = 'keys';
let mainWindow = null;

function createWindow() {
  const win = new BrowserWindow({
    title: APP_TITLE,
    width: 1200,
    height: 820,
    minWidth: 1000,
    minHeight: 720,
    backgroundColor: '#f5f1e8',
    show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow = win;

  Menu.setApplicationMenu(null);

  const logPath = path.join(app.getPath('userData'), 'renderer.log');
  function log(line) {
    const msg = `[${new Date().toISOString()}] ${line}`;
    console.log(msg);
    try {
      fs.appendFileSync(logPath, msg + '\n', 'utf8');
    } catch {
    }
  }

  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    log(`renderer console(level=${level}) ${sourceId || ''}:${line || ''} ${message}`);
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    log(`render-process-gone: reason=${details.reason} exitCode=${details.exitCode}`);
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    log(`did-fail-load: code=${errorCode} desc=${errorDescription} url=${validatedURL}`);
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  win.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

}

if (process.platform === 'win32') {
  app.setAppUserModelId('com.awfulapps.keys');
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) {
      createWindow();
      return;
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

