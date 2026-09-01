
// for logging
 
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const state = require('./state');
const { getBundlePath, getPythonPath, getNotebookPath } = require('./pathManager')


// Monkey-patch console
const levels = ['log', 'info', 'warn', 'error'];
levels.forEach(level => {
    const orig = console[level];
    console[level] = (...args) => {
        writeToLogFile(level, args);
        //orig.apply(console, args); // keep default behavior too
    };
});


state.logFile = path.join(getBundlePath(),  'Firefly-log.txt');
const asciiFile = path.join(__dirname, '..','images','firefly-icon-ascii.txt');

function initLogFile() {
    // add a fun ascii art to the top of the logfile
    // this will clear the file (could remove/adjust if history needed)
    
    console.log('checking',path.dirname(state.logFile))
    fs.mkdirSync(path.dirname(state.logFile), { recursive: true }); // create the directory if needed
    
    let header = '';
    if (fs.existsSync(asciiFile)) {
        header = fs.readFileSync(asciiFile, 'utf8') + '\n';
    }
    fs.writeFileSync(state.logFile, header);

    console.log("LOGFILE :", state.logFile)
    console.log("PIDFILE :", state.pidFile)
    console.log("PYTHON PATH : ", getPythonPath());
    console.log("NOTEBOOK PATH : ", getNotebookPath());
}

function writeToLogFile(level, args) {
    const timestamp = new Date().toISOString();
    const message = (args && args.length > 0)
        ? args.map(arg =>
            typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
        ).join(' ')
        : ''; // handle empty console.log()
    const line = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    // Append to file
    fs.appendFileSync(state.logFile, line, { encoding: 'utf8' });

    // Still print to console (so you see logs in `npm start`)
    if (level === 'error') {
        process.stderr.write(line);
    } else {
        process.stdout.write(line);
    }
}


// Reads the log file and updates the window content
// a bit clunky because it recreates the full html file each time the log is updated...
function loadLogContent() {
    if (!state.logWindow) return;

    const logText = fs.existsSync(state.logFile)
    ? fs.readFileSync(state.logFile, 'utf8')
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

    state.logWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}


module.exports = { initLogFile, writeToLogFile, loadLogContent };
