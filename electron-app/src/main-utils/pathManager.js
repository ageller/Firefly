// get the paths (different for dev vs build)
const path = require('path');
const rawIsDev  = require('electron-is-dev');
const isDev = (rawIsDev && typeof rawIsDev === 'object' && 'default' in rawIsDev)
  ? rawIsDev.default
  : rawIsDev;

const state = require('./state');

const getBundlePath = () => {
    return isDev
        ? path.join(__dirname, '..', '..', 'resources')
        : process.resourcesPath;

};

const getPythonPath = () => {
    const pythonDir = path.join(getBundlePath(), 'python');

    return process.platform === 'win32'
        ? path.join(pythonDir, 'python.exe')
        : path.join(pythonDir, 'bin', 'python');
};

const getNotebookPath = () => {
    return path.join(getBundlePath(), 'ntbks');
}; 

function initBundlePath(){
    state.bundlePath = getBundlePath();
    return state.bundlePath;

}

function initPythonPath() {
    state.pythonPath = getPythonPath();
    return state.pythonPath;
}


function initNotebookPath() {
    state.notebookPath = getNotebookPath();
    return state.notebookPath;
}



module.exports = { initBundlePath, initPythonPath, initNotebookPath };
