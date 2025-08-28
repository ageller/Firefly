const { app, BrowserWindow,ipcMain, dialog } = require('electron');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const detect = require('detect-port').default || require('detect-port');
const http = require('http');
const { URL } = require('url');
const kill = require('tree-kill');
const os = require('os');
const find = require('find-process');
//const { } = require('electron');

const rawIsDev  = require('electron-is-dev');
const isDev = (rawIsDev && typeof rawIsDev === 'object' && 'default' in rawIsDev)
  ? rawIsDev.default
  : rawIsDev;

let pyProc = null;
let fireflyPort = null;
let mainWindow = null;
let splash = null;
let jupyterProc = null;
let jupyterPort = null;
let logWindow = null;


// for logging
const logFile = path.join(app.getPath('userData'),  'Firefly-log.txt');
fs.mkdirSync(path.dirname(logFile), { recursive: true }); // create the file if needed
fs.writeFileSync(logFile, '', { encoding: 'utf8' });  // clear the file (could remove/adjust if history needed)
console.log("LOGFILE:", logFile)
function writeToLogFile(level, args) {
    const timestamp = new Date().toISOString();
    const message = (args && args.length > 0)
        ? args.map(arg =>
            typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
        ).join(' ')
        : ''; // handle empty console.log()
    const line = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    // Append to file
    fs.appendFileSync(logFile, line, { encoding: 'utf8' });

    // Still print to console (so you see logs in `npm start`)
    if (level === 'error') {
        process.stderr.write(line);
    } else {
        process.stdout.write(line);
    }
}

// Monkey-patch console
['log', 'info', 'warn', 'error'].forEach(level => {
    const orig = console[level];
    console[level] = (...args) => {
        writeToLogFile(level, args);
        //orig.apply(console, args); // keep default behavior too
    };
});

function createLogWindow() {
    logWindow = new BrowserWindow({
        width: 600,
        height: 800,
        webPreferences: {
            nodeIntegration: true, // needed to read file in renderer
            contextIsolation: false,
        },
    });

    loadLogContent();

    // Watch the log file for changes
    fs.watch(logFile, { encoding: 'utf8' }, () => {
        loadLogContent();
    });
}

// Reads the log file and updates the window content
function loadLogContent() {
    if (!logWindow) return;

    const logText = fs.existsSync(logFile)
    ? fs.readFileSync(logFile, 'utf8')
    : 'Log is empty';

    const html = `
        <html>
            <head>
                <title>App Log</title>
                <style>
                    body {
                        background: #111;
                        color: #eee;
                        font-family: monospace;
                        white-space: pre-wrap;
                        padding: 10px;
                    }
                </style>
            </head>
            <body>
                ${logText}
            <script>
                window.scrollTo(0, document.body.scrollHeight);
            </script>
            </body>
        </html>
    `;

    logWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

// keep track of processes that this app spawned (to make sure they are killed)
const pidFile = path.join(app.getPath('userData'),  'Firefly-pid.txt');
fs.mkdirSync(path.dirname(pidFile), { recursive: true }); // create the file if needed
console.log("PIDFILE:", pidFile)
function writePidFile(pid, port, name) {
    const timestamp = new Date().toISOString();
    let entries = [];
    if (fs.existsSync(pidFile)) {
        try {
            const content = fs.readFileSync(pidFile, 'utf8').trim();
            if (content) {
                entries = JSON.parse(content);
                if (!Array.isArray(entries)) entries = [];
            }
        } catch (err) {
            console.warn('PID file corrupted, resetting.', err);
            entries = [];
        }
    }

    // Append the new entry
    entries.push({ pid, port, name, timestamp });

    // Write the updated array back to the file
    fs.writeFileSync(pidFile, JSON.stringify(entries, null, 2));

}

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
    splash = new BrowserWindow({
        width: 800,
        height: 300,
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        center: true
    });
    splash.loadFile(path.join(__dirname, 'src', 'splash.html'));
}

function createMainWindow (fPort, jPort) {
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

    // Load the app, sending the correct ports
    const filePath = path.join(__dirname, 'src', 'firefly-electron.html');
    const urlWithParams = new URL(`file://${filePath}`);
    urlWithParams.searchParams.append('fireflyPort', fPort);
    urlWithParams.searchParams.append('jupyterPort', jPort);
    mainWindow.loadURL(urlWithParams.toString());


    // Once the main window is ready, show it and close splash
    mainWindow.once('ready-to-show', () => {
        if (splash) {
            splash.close();
        }
        mainWindow.show();
    });
}

// get the paths (different for dev vs build)
const getPythonPath = () => {
    const pythonDir = isDev
        ? path.join(__dirname, 'bundle', 'python')
        : path.join(process.resourcesPath, 'bundle', 'python');

    return process.platform === 'win32'
        ? path.join(pythonDir, 'python.exe')
        : path.join(pythonDir, 'bin', 'python');
};

const getJupyterPath = () => {
    const jupyterPath = isDev
        ? path.join(__dirname, 'bundle', 'python')
        : path.join(process.resourcesPath, 'bundle', 'python');

    return process.platform === 'win32'
        ? path.join(jupyterPath, 'Scripts','jupyter.exe')
        : path.join(jupyterPath, 'bin', 'jupyter');
}; 

const getNotebookPath = () => {
    return isDev
        ? path.join(__dirname, 'bundle', 'ntbks')
        : path.join(process.resourcesPath, 'bundle', 'ntbks');
}; 

const notebookPath = getNotebookPath();
const jupyterPath = getJupyterPath();
const pythonPath = getPythonPath();

console.log("PYTHON PATH = ", pythonPath);
console.log("JUPYTER PATH = ", jupyterPath);
console.log("NOTEBOOK PATH = ", notebookPath);


async function startPythonBackend() {
    // this will launch the flask version of firefly bundled with the app
    
    // check for an available port
    const defaultPort = 5500;
    const port = await detect(defaultPort);

    if (port !== defaultPort) {
        console.log(`Port ${defaultPort} is in use, switching firefly to port ${port}`);
    } else {
        console.log(`Port ${defaultPort} is free, launching firefly there.`);
    }

    const fireflyArgs = [
        '-m', 'firefly',
        '--method=flask',
        `--port=${port}`,
    ];

    pyProc = spawn(pythonPath, fireflyArgs, {
        shell: true,
        detach: true,
        windowsHide: true,
        env: {
            ...process.env,
            PATH: `${path.dirname(pythonPath)}:${process.env.PATH}`,
            PYTHONUNBUFFERED: '1'
        },

    });

    pyProc.stdout.on('data', (data) => {
        console.log(`[PYTHON]: ${data}`);
    });
    pyProc.stderr.on('data', (data) => {
        console.error(`[PYTHON STDERR]: ${data}`);
    });

    pyProc.on('exit', (code, signal) => {
        console.log(`Firefly python backend exited with code ${code}, signal ${signal}`);
    });

    writePidFile(pyProc.pid, port, 'Firefly Python backend');

    return port;
}

async function startJupyter() {
    // this will launch the jupyter lab (using the bundled python)

    // check for an available port
    const defaultPort = 8888;
    const port = await detect(defaultPort);

    if (port !== defaultPort) {
        console.log(`Port ${defaultPort} is in use, switching jupyter to port ${port}`);
    } else {
        console.log(`Port ${defaultPort} is free, launching Jupyter there.`);
    }

    const jupyterArgs = [
        'lab',
        '--no-browser',
        `--port=${port}`,
        '--NotebookApp.token=""',
        `--notebook-dir=${notebookPath}`
    ];


    jupyterProc = spawn(jupyterPath, jupyterArgs, {
        shell: false,
        detached: true,
        windowsHide: true,
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

    jupyterProc.on('exit', (code, signal) => {
        console.log(`Jupyter exited with code ${code}, signal ${signal}`);
    });

    writePidFile(jupyterProc.pid, port, 'Jupyter');

    return port;
}



function waitForLoading(ports, callback) {
    const pending = new Set(ports);

    const interval = setInterval(() => {
        for (const port of [...pending]) {
            http.get({ host: 'localhost', port }, () => {
                console.log(`Port ${port} is ready.`);
                pending.delete(port);

                if (pending.size === 0) {
                    clearInterval(interval); 
                    callback(...ports);
                }
            }).on('error', () => {
                console.log(`Waiting for port ${port}...`);
            });
        }
    }, 500);
}


app.whenReady().then(async() => {
    // console.log("GPU Feature Status:");
    // console.log(app.getGPUFeatureStatus());

    writeToLogFile("App is starting...");
    try {

        createSplash();
        //createLogWindow(); <-- causing errors (come back to this)
        await checkAndKillExistingProcess();
        fireflyPort = await startPythonBackend();
        jupyterPort = await startJupyter();
        waitForLoading([fireflyPort, jupyterPort], createMainWindow);

        app.on('activate', function () {
            if (BrowserWindow.getAllWindows().length === 0) createMainWindow(fireflyPort, jupyterPort);
        });


    } catch (e) {
        writeToLogFile("Error: " + e.stack);
    }

});

// cleanup on close
async function killProcessTree(pid, name = 'process', port = null) {
    return new Promise((resolve) => {
        if (!pid && !port) return resolve();

        const attemptPortKill = async () => {
            if (!port) return resolve();
            try {
                // find-process works across platforms
                const list = await find('port', port);
                if (list.length > 0) {
                    const p = list[0];
                    console.warn(`${name}: port ${port} still in use by PID ${p.pid}, force killing...`);
                    try {
                        process.kill(p.pid, 'SIGKILL');
                        console.log(`${name}: killed PID ${p.pid} via port fallback.`);
                    } catch (e) {
                        console.error(`${name}: failed to kill PID ${p.pid} via port fallback:`, e);
                    }
                } else {
                    console.log(`${name}: port ${port} is free.`);
                }
            } catch (err) {
                console.error(`${name}: failed to query port ${port}:`, err);
            }
            resolve();
        };

        if (pid) {
            kill(pid, 'SIGTERM', (err) => {
                if (!err) {
                    console.log(`${name} (pid ${pid}) killed via tree-kill.`);
                    return attemptPortKill();
                }

                console.warn(`tree-kill failed for ${name} (pid ${pid}):`, err);

                if (os.platform() === 'win32') {
                    exec(`taskkill /PID ${pid} /T /F`, (error, stdout, stderr) => {
                        if (error) {
                            console.error(`taskkill failed for ${name} (pid ${pid}):`, stderr);
                        } else {
                            console.log(`${name} (pid ${pid}) killed via taskkill.`);
                        }
                        attemptPortKill();
                    });
                } else {
                    try {
                        process.kill(-pid, 'SIGKILL');
                        console.log(`${name} (pid ${pid}) killed via process group kill.`);
                    } catch (e) {
                        console.error(`process.kill failed for ${name} (pid ${pid}):`, e);
                    }
                    attemptPortKill();
                }
            });
        } else {
            attemptPortKill();
        }
    });
}

async function checkAndKillExistingProcess() {
    if (!fs.existsSync(pidFile)) return;

    try {
        const entries = JSON.parse(fs.readFileSync(pidFile, 'utf8'));
        const remaining = [];
        if (!entries) return;
        for (const {pid, port, name} of entries) {

            console.log('CHECKING', pid, port, name)
            try {
                console.log(`Found existing process PID ${pid} on port ${port}, attempting to kill...`);
                await killProcessTree(pid, name, port);
                console.log(`Process ${name} PID ${pid} killed.`);
            } catch (err) {
                console.error(`Failed to kill ${name} PID ${pid}:`, err);
                remaining.push({ pid, port, name });
            }
        }

        // Write back remaining PIDs or remove file if empty
        if (remaining.length) {
            fs.writeFileSync(pidFile, JSON.stringify(remaining, null, 2));
        } else {
            fs.unlinkSync(pidFile);
        }

    } catch (err) {
        console.error('Failed to read or parse PID file:', err);
    } 
}

app.on('will-quit', async (event) => {
    event.preventDefault(); // stop default quit

    console.log('Cleaning up before quit...');
    await checkAndKillExistingProcess();
    await killProcessTree(pyProc?.pid, 'Firefly Python backend', fireflyPort);
    await killProcessTree(jupyterProc?.pid, 'Jupyter',jupyterPort);

    console.log('All cleaned up. Now exiting.');
    process.exit(0);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// force only a single instance of the app
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
    // Someone tried to open a 2nd instance → focus existing window instead
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}