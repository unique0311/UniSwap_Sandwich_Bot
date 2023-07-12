const path = require('path');

const { app, BrowserWindow, shell } = require('electron');
// eslint-disable-next-line no-unused-vars
const backend = require('../api/server');
const isDev = require('electron-is-dev');

const dotenv = require('dotenv');
if (!process.env.PORTABLE_EXECUTABLE_DIR) {
  dotenv.config();
} else {
  dotenv.config({ path: path.join(process.env.PORTABLE_EXECUTABLE_DIR, '.env') });
}


function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 850,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  win.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );
  
  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  win.webContents.on('new-window', function(event, url){    
    event.preventDefault();  
    shell.openExternal(url);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});