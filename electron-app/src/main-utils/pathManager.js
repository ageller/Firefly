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
        ? path.join(pythonDir, 'Scripts', 'python.exe')
        : path.join(pythonDir, 'bin', 'python');
};


const getNotebookPath = () => {
    return isDev
        ? path.join(__dirname, '..', '..', 'bundle', 'ntbks')
        : path.join(process.resourcesPath, 'bundle', 'ntbks');
}; 

function initPythonPath() {
    state.pythonPath = getPythonPath();
    return state.pythonPath;
}

function initNotebookPath() {
    state.notebookPath = getNotebookPath();
    return state.notebookPath;
}



module.exports = { initPythonPath, initNotebookPath };
