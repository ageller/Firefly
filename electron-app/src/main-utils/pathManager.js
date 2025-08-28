// get the paths (different for dev vs build)
const path = require('path');
const rawIsDev  = require('electron-is-dev');
const isDev = (rawIsDev && typeof rawIsDev === 'object' && 'default' in rawIsDev)
  ? rawIsDev.default
  : rawIsDev;

const state = require('./state');

const getPythonPath = () => {
    const pythonDir = isDev
        ? path.join(__dirname, '..', '..', 'bundle', 'python')
        : path.join(process.resourcesPath, 'bundle', 'python');

    return process.platform === 'win32'
        ? path.join(pythonDir, 'python.exe')
        : path.join(pythonDir, 'bin', 'python');
};

const getJupyterPath = () => {
    const jupyterPath = isDev
        ? path.join(__dirname, '..', '..', 'bundle', 'python')
        : path.join(process.resourcesPath, 'bundle', 'python');

    return process.platform === 'win32'
        ? path.join(jupyterPath, 'Scripts','jupyter.exe')
        : path.join(jupyterPath, 'bin', 'jupyter');
}; 

const getNotebookPath = () => {
    return isDev
        ? path.join(__dirname, '..', '..', 'bundle', 'ntbks')
        : path.join(process.resourcesPath, 'bundle', 'ntbks');
}; 

function initJupyterPath() {
    state.jupyterPath = getJupyterPath();
    return state.jupyterPath;
}

function initPythonPath() {
    state.pythonPath = getPythonPath();
    return state.pythonPath;
}

function initNotebookPath() {
    state.notebookPath = getNotebookPath();
    return state.notebookPath;
}



module.exports = { initPythonPath, initJupyterPath, initNotebookPath };
