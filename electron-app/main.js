const { app, BrowserWindow, ipcMain } = require('electron');


// my scripts
const state = require('./src/main-utils/state');
const { initLogFile } = require('./src/main-utils/logManager');
const { killProcessTree, checkAndKillExistingProcess } = require('./src/main-utils/cleanupManager');
const { createMainWindow, createSplash, toggleLogWindow } = require('./src/main-utils/windowManager');
const { startPythonBackend, startJupyter, waitForLoading, createUserKernel } = require('./src/main-utils/processManager');



// force only a single instance of the app
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
    // Someone tried to open a 2nd instance --> focus existing window instead
    // it may be possible that state.mainWindow doesn't get set in time -- come back to this
        if (state.mainWindow) {
            if (state.mainWindow.isMinimized()) state.mainWindow.restore();
            state.mainWindow.focus();
        }
    });
}

// launch the app
app.whenReady().then(async() => {
    // console.log("GPU Feature Status:");
    // console.log(app.getGPUFeatureStatus());
    
    initLogFile();
    console.log("Firefly is starting...");
    try {

        createSplash();
        createUserKernel();
        await checkAndKillExistingProcess();
        state.fireflyPort = await startPythonBackend();
        state.jupyterPort = await startJupyter();
        waitForLoading([state.fireflyPort, state.jupyterPort], createMainWindow);

        app.on('activate', function () {
            if (BrowserWindow.getAllWindows().length === 0) createMainWindow(state.fireflyPort, state.jupyterPort);
        });


    } catch (e) {
        writeToLogFile("Error: " + e.stack);
    }

});

// on messages from the mainWindow, open the log viewer
ipcMain.on('open-log-viewer', () => {
    toggleLogWindow();
});

// gracefully exit
app.on('will-quit', async (event) => {
    event.preventDefault(); // stop default quit

    console.log('Cleaning up before quit...');
    await checkAndKillExistingProcess();
    await killProcessTree(state.pyProc?.pid, 'Firefly Python backend', state.fireflyPort);
    await killProcessTree(state.jupyterProc?.pid, 'Jupyter',state.jupyterPort);

    console.log('All cleaned up. Now exiting.');
    process.exit(0);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

