const { app, BrowserWindow,ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const isDev = require('electron-is-dev');
const kill = require('tree-kill');
const { } = require('electron');


let pyProc = null;
let mainWindow = null;
let jupyterProc = null;


// enable the system file browser
ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });

    if (result.canceled) return null;
    return result.filePaths[0]; // absolute path to selected folder
});


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
            webgl: true,
        }
    });

    // Load the app
    mainWindow.loadFile('src/firefly-electron.html');
}


const getPythonPath = () => {
    const pythonDir = isDev
        ? path.join(__dirname, 'bundle', 'python')
        : path.join(process.resourcesPath, 'bundle', 'python');

    return process.platform === 'win32'
        ? path.join(pythonDir, 'python.exe')
        : path.join(pythonDir, 'bin', 'python');
};

function startPythonBackend() {
    // this will launch the flask version of firefly bundled with the app
    const pythonPath = getPythonPath();

    const fireflyArgs = [
        '-m', 'firefly',
        '--method=flask',
    ];

    pyProc = spawn(pythonPath, fireflyArgs, {
        env: {
            ...process.env,
            PATH: `${path.dirname(pythonPath)}:${process.env.PATH}`,
            PYTHONUNBUFFERED: '1'
        },
        shell: true,
        detach: true,
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
    // this will launch the jupyter lab (using the bundled python)
    const notebookPath = path.join(__dirname, 'bundle', 'ntbks');
    const jupyterPath = path.join(__dirname, 'bundle', 'python', 'bin', 'jupyter');

    const pythonPath = getPythonPath();

    const jupyterArgs = [
        'lab',
        '--no-browser',
        '--port=8888',
        '--NotebookApp.token=""',
        `--notebook-dir=${notebookPath}`
    ];

    console.log('CHECKING', pythonPath, jupyterPath)
    jupyterProc = spawn(jupyterPath, jupyterArgs, {
        shell: true,
        detached: true,
        env: {
            ...process.env,
            PATH: `${path.dirname(pythonPath)}:${process.env.PATH}`,
        }
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
    // console.log("GPU Feature Status:");
    // console.log(app.getGPUFeatureStatus());

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