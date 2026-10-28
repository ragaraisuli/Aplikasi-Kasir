const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Memuat langsung aplikasi Anda dari Vercel
  win.loadURL('https://app-kasirl.vercel.app');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Mendengarkan perintah cetak dari aplikasi web
ipcMain.on('print-receipt', (event, transactionData) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.webContents.print({
      silent: true,            // Mencetak langsung tanpa dialog pop-up
      printBackground: true,
    }, (success, failureReason) => {
      if (!success) console.log('Gagal mencetak: ', failureReason);
    });
  }
});