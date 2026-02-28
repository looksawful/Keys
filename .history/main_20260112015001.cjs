const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

const APP_TITLE = 'keys';

function createWindow() {
  const win = new BrowserWindow({
    title: APP_TITLE,
    width: 1200,
    height: 820,
    minWidth: 1000,
    minHeight: 720,
    backgroundColor: '#0a0a0f',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  Menu.setApplicationMenu(null);

  win.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  // win.webContents.openDevTools();

  // Open DevTools for debugging (comment out in production)
  // win.webContents.openDevTools();
}

if (process.platform === 'win32') {
  app.setAppUserModelId('com.awfulapps.keys');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

