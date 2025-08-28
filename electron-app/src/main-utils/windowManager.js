
const { BrowserWindow, ipcMain, dialog } = require('electron');
const { URL } = require('url');
const path = require('path');

const state = require('./state');

// enable the system file browser
ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });

    if (result.canceled) return null;
    return result.filePaths[0]; // absolute path to selected folder
});

function createSplash(){
    // Create splash screen
    state.splash = new BrowserWindow({
        width: 800,
        height: 300,
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        center: true
    });
    state.splash.loadFile(path.join(__dirname, '..', 'webviews', 'splash.html'));
}

function createMainWindow (fPort, jPort) {
    // main app window with jupyter and firefly
    state.mainWindow = new BrowserWindow({
        width: 2400,
        height: 1200,
        frame: true, 
        autoHideMenuBar: true,  
        transparent: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            webviewTag: true, 
            webgl: true,
        }
    });

    // Load the app, sending the correct ports
    const filePath = path.join(__dirname, '..', 'webviews', 'firefly-electron.html');
    const urlWithParams = new URL(`file://${filePath}`);
    urlWithParams.searchParams.append('fireflyPort', fPort);
    urlWithParams.searchParams.append('jupyterPort', jPort);
    state.mainWindow.loadURL(urlWithParams.toString());


    // Once the main window is ready, show it and close splash
    state.mainWindow.once('ready-to-show', () => {
        if (state.splash) {
            state.splash.close();
        }
        state.mainWindow.show();
    });

    state.mainWindow.on('closed', () => {
        state.mainWindow = null;
        if (state.logWindow && !state.logWindow.isDestroyed()) {
            state.logWindow.close();  // gracefully close log window
        }
    });
}

// Note that the log window is created in logManager.js

module.exports = { createMainWindow, createSplash };
