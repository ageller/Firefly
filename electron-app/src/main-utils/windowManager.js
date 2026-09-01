
const { BrowserWindow, ipcMain, dialog } = require('electron');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

const { loadLogContent } = require('./logManager');
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
        // alwaysOnTop: true,
        transparent: true,
        center: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        }
    });
    const filePath = path.join(__dirname, '..', 'webviews', 'splash.html');
    state.splash.loadURL(`file://${filePath}`);

    return state.splash;
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
        // make sure the mainWindow is in front
        state.mainWindow.focus();
        state.mainWindow.show(); 
        state.mainWindow.setAlwaysOnTop(true);
        state.mainWindow.setAlwaysOnTop(false);
    });

    state.mainWindow.on('closed', () => {
        state.mainWindow = null;
        if (state.logWindow && !state.logWindow.isDestroyed()) {
            state.logWindow.close();  // gracefully close log window
        }
    });
}

function createLogWindow() {
    state.logWindow = new BrowserWindow({
        width: 800,
        height: 900,
        webPreferences: {
            nodeIntegration: true, // needed to read file in renderer
            contextIsolation: false,
        },
    });


    loadLogContent();

    // Watch the log file for changes
    let logWatcher = fs.watch(state.logFile, { encoding: 'utf8' }, () => {
        loadLogContent();
    });

    state.logWindow.on('closed', () => {
        state.logWindow = null; // remove reference
        // stop watching the file
        if (logWatcher) logWatcher.close();
    });

    return state.logWindow;

}

function toggleLogWindow() {
    if (state.logWindow && !state.logWindow.isDestroyed()) {
        if (state.logWindow.isVisible()) {
            state.logWindow.focus();
        } else {
            state.logWindow.show();
        }
    } else {
        createLogWindow();
    }
}


module.exports = { createMainWindow, createSplash, toggleLogWindow };
