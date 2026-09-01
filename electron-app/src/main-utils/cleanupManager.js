// keep track of processes that this app spawned (to make sure they are killed)

const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const kill = require('tree-kill');
const os = require('os');
const find = require('find-process');
const { exec } = require('child_process');
const state = require('./state');
const { getBundlePath } = require('./pathManager')

state.pidFile = path.join(getBundlePath(),  'Firefly-pid.txt');
fs.mkdirSync(path.dirname(state.pidFile), { recursive: true }); // create the directory if needed

function writePidFile(pid, port, name) {
    const timestamp = new Date().toISOString();
    let entries = [];
    if (fs.existsSync(state.pidFile)) {
        try {
            const content = fs.readFileSync(state.pidFile, 'utf8').trim();
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
    fs.writeFileSync(state.pidFile, JSON.stringify(entries, null, 2));

}

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
    if (!fs.existsSync(state.pidFile)) return;

    try {
        const entries = JSON.parse(fs.readFileSync(state.pidFile, 'utf8'));
        const remaining = [];
        if (!entries) return;
        for (const {pid, port, name} of entries) {
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
            fs.writeFileSync(state.pidFile, JSON.stringify(remaining, null, 2));
        } else {
            fs.unlinkSync(state.pidFile);
        }

    } catch (err) {
        console.error('Failed to read or parse PID file:', err);
    } 
}


module.exports = { writePidFile, killProcessTree, checkAndKillExistingProcess };
