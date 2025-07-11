const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const isDev = require('electron-is-dev');
const kill = require('tree-kill');

let pyProc = null;
let mainWindow = null;

function createWindow () {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Load the WebGL viewer
    mainWindow.loadURL('http://localhost:5500/combined');
}

function startPythonBackend() {
    // this will launch the flask version of firefly, and assumes that firefly has been pip installed
    const fireflyDir = isDev
        ? path.join(__dirname, 'resources', 'firefly') // dev mode
        : path.join(process.resourcesPath, 'firefly'); // packaged app

    pyProc = spawn('firefly',['--method=flask', `--directory=${fireflyDir}`], { 
        shell: true,
        detach: true
    });

    pyProc.stdout.on('data', (data) => {
        console.log(`[PYTHON]: ${data}`);
    });
    pyProc.stderr.on('data', (data) => {
        console.error(`[PYTHON ERROR]: ${data}`);
    });
}

function stopPythonBackend() {
    if (pyProc && pyProc.pid) {
        kill(pyProc.pid, 'SIGTERM', err => {
            if (err) console.error('Failed to kill Python process:', err);
            else console.log('Python process killed.');
        });
    }
}

function waitForFlask(port, callback) {
    const retry = () => {
        http.get({ host: 'localhost', port }, () => {
            console.log('Flask server is ready.');
            callback();
        }).on('error', () => {
            console.log('Waiting for Flask server...');
            setTimeout(retry, 500);
        });
    };
    retry();
}

app.whenReady().then(() => {
    startPythonBackend();
    waitForFlask(5500, createWindow);

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    stopPythonBackend();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopPythonBackend();
});