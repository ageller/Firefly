// get the paths (different for dev vs build)
const { app } = require('electron');
const path = require('path');
const rawIsDev  = require('electron-is-dev');
const isDev = (rawIsDev && typeof rawIsDev === 'object' && 'default' in rawIsDev)
  ? rawIsDev.default
  : rawIsDev;

const state = require('./state');

const getResourcePath = () => {
    return isDev
        ? path.join(__dirname, '..', '..', 'resources')
        : process.resourcesPath;
};

const getBundlePath = () => {
    return path.join(app.getPath("home"), ".firefly");
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

module.exports = { getBundlePath, getPythonPath, getNotebookPath, getResourcePath };
