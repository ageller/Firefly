const { app, BrowserWindow,ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const detect = require('detect-port').default || require('detect-port');
const http = require('http');
const { URL } = require('url');
const kill = require('tree-kill');
//const { } = require('electron');

const rawIsDev  = require('electron-is-dev');
const isDev = (rawIsDev && typeof rawIsDev === 'object' && 'default' in rawIsDev)
  ? rawIsDev.default
  : rawIsDev;

let pyProc = null;
let mainWindow = null;
let jupyterProc = null;

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


// enable the system file browser
ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });

    if (result.canceled) return null;
    return result.filePaths[0]; // absolute path to selected folder
});


function createWindow (fireflyPort, jupyterPort) {
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
    urlWithParams.searchParams.append('fireflyPort', fireflyPort);
    urlWithParams.searchParams.append('jupyterPort', jupyterPort);
    mainWindow.loadURL(urlWithParams.toString());

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

    return port;
}

function stopPythonBackend() {
    if (pyProc && pyProc.pid) {
        kill(pyProc.pid, 'SIGTERM', err => {
            if (err) console.error('Failed to kill Python process:', err);
            else console.log('Python process killed.');
        });
    }
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

    return port;
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
                callback(...ports); // all ports are ready
            }
            }).on('error', () => {
            console.log(`Waiting for port ${port}...`);
            setTimeout(() => checkPort(port), 500);
        });
    };

    ports.forEach(port => checkPort(port));
}


app.whenReady().then(async() => {
    // console.log("GPU Feature Status:");
    // console.log(app.getGPUFeatureStatus());

    writeToLogFile("App is starting...");
    try {

        const fireflyPort = await startPythonBackend();
        const jupyterPort = await startJupyter();
        waitForLoading([fireflyPort, jupyterPort], createWindow);

        app.on('activate', function () {
            if (BrowserWindow.getAllWindows().length === 0) createWindow(fireflyPort, jupyterPort);
        });

    } catch (e) {
        writeToLogFile("Error: " + e.stack);
    }

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

