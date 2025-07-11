const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const isDev = require('electron-is-dev');
const kill = require('tree-kill');

let pyProc = null;
let mainWindow = null;
let jupyterProc = null;

function createWindow () {
    mainWindow = new BrowserWindow({
        width: 2400,
        height: 1200,
        frame: true, 
        autoHideMenuBar: true,  
        transparent: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            webviewTag: true, 

        }
    });

    // Load the app
    mainWindow.loadFile('src/firefly-electron.html');
}

function startPythonBackend() {
    // this will launch the flask version of firefly, and assumes that firefly has been pip installed
    const fireflyDir = isDev
        ? path.join(__dirname, 'resources', 'firefly') // dev mode
        : path.join(process.resourcesPath, 'firefly'); // packaged app

    pyProc = spawn('firefly', ['--method=flask', `--directory=${fireflyDir}`], { 
        shell: true,
        detach: true
    });

    pyProc.stdout.on('data', (data) => {
        console.log(`[PYTHON]: ${data}`);
    });
    pyProc.stderr.on('data', (data) => {
        console.error(`[PYTHON STDERR]: ${data}`);
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


function startJupyter() {
    // this will launch the jupyter lab
    const notebookDir = path.join(__dirname, 'resources', 'firefly', 'ntbks');

    jupyterProc = spawn('jupyter', [
        'lab', 
        '--no-browser', 
        '--port=8888',
        '--NotebookApp.token=""',
        `--notebook-dir=${notebookDir}`
    ], {
        shell: true,
        detached: true
    });

    jupyterProc.stdout.on('data', (data) => {
        console.log(`[JUPYTER]: ${data}`);
    });

    jupyterProc.stderr.on('data', (data) => {
        console.error(`[JUPYTER STDERR]: ${data}`);
    });
}

function stopJupyter(){
    if (jupyterProc && jupyterProc.pid) {
        kill(jupyterProc.pid, 'SIGTERM', err => {
            if (err) console.error('Failed to kill Jupyter:', err);
            else console.log('Jupyter killed.');
        });
    }
}


function waitForLoading(ports, callback) {
    const pending = new Set(ports);

    const checkPort = (port) => {
        http.get({ host: 'localhost', port }, () => {
            console.log(`Port ${port} is ready.`);
            pending.delete(port);
            if (pending.size === 0) {
                callback(); // all ports are ready
            }
            }).on('error', () => {
            console.log(`Waiting for port ${port}...`);
            setTimeout(() => checkPort(port), 500);
        });
    };

    ports.forEach(port => checkPort(port));
}

app.whenReady().then(() => {
    startPythonBackend();
    startJupyter();
    waitForLoading([5500,8888], createWindow);

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    stopPythonBackend();
    stopJupyter();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopPythonBackend();
    stopJupyter();
});