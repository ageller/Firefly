const { spawn } = require('child_process');
const path = require('path');
const detect = require('detect-port').default || require('detect-port');
const http = require('http');

const { writePidFile } = require('./cleanupManager');
const { initPythonPath, initJupyterPath, initNotebookPath } = require('./pathManager')
const state = require('./state');

// define the paths
const pythonPath = state.pythonPath || initPythonPath();
const jupyterPath = state.jupyterPath || initJupyterPath();
const notebookPath = state.notebookPath || initNotebookPath();

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

    state.pyProc = spawn(pythonPath, fireflyArgs, {
        shell: true,
        detach: true,
        windowsHide: true,
        env: {
            ...process.env,
            PATH: `${path.dirname(pythonPath)}:${process.env.PATH}`,
            PYTHONUNBUFFERED: '1'
        },

    });

    state.pyProc.stdout.on('data', (data) => {
        console.log(`[PYTHON]: ${data}`);
    });
    state.pyProc.stderr.on('data', (data) => {
        console.error(`[PYTHON STDERR]: ${data}`);
    });

    state.pyProc.on('exit', (code, signal) => {
        console.log(`Firefly python backend exited with code ${code}, signal ${signal}`);
    });

    writePidFile(state.pyProc.pid, port, 'Firefly Python backend');

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
        '--IdentityProvider.token=""',
        `--notebook-dir=${notebookPath}`
    ];


    state.jupyterProc = spawn(jupyterPath, jupyterArgs, {
        shell: false,
        detached: true,
        windowsHide: true,
        env: {
            ...process.env,
            PATH: `${path.dirname(pythonPath)}:${process.env.PATH}`,
        }
    });

    state.jupyterProc.stdout.on('data', (data) => {
        console.log(`[JUPYTER]: ${data}`);
    });
    state.jupyterProc.stderr.on('data', (data) => {
        console.error(`[JUPYTER STDERR]: ${data}`);
    });

    state.jupyterProc.on('exit', (code, signal) => {
        console.log(`Jupyter exited with code ${code}, signal ${signal}`);
    });

    writePidFile(state.jupyterProc.pid, port, 'Jupyter');

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

module.exports = { startPythonBackend, startJupyter, waitForLoading };
