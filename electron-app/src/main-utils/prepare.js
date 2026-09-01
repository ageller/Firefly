const { execSync, spawn } = require("child_process");
const { app, dialog  } = require("electron");
const path = require("path");
const fs = require("fs");

const { getResourcePath, getPythonPath, getBundlePath } = require('./pathManager')
const resourcePath = getResourcePath();
const bundlePath = getBundlePath();
const pythonPath = getPythonPath();

function runPrepareAsync(splash) {

    const flagFile = path.join(bundlePath, ".firefly_prepared");

    // Skip if already run
    if (fs.existsSync(flagFile)) {
        console.log("Prepare script already executed. Skipping.");
        console.log(`Flag file exists : ${flagFile}`)
        return;
    }


    return new Promise((resolve, reject) => {

        // Step 1: show the dialog
        dialog.showMessageBox({
            type: 'info',
            buttons: ['OK'],
            defaultId: 0,
            title: 'Installation',
            message: `Prior to launching Firefly for the first time, dependencies will be installed in:\n\n${bundlePath}\n\nThis may take a while, but this step should only be required once.`,
            detail: 'Click OK to continue.'
        })
        .then(() => {

            const platform = process.platform; // 'win32', 'darwin', 'linux'

            let scriptPath, cmd, args;

            if (platform === "win32") {
                scriptPath = path.join(resourcePath, "scripts", "prepare.ps1");
                if (!fs.existsSync(scriptPath)) {
                    console.error(`Windows prepare script not found: ${scriptPath}`);
                    reject(new Error(`Windows prepare script not found: ${scriptPath}`));
                }
                cmd = "powershell.exe";
                args = ["-ExecutionPolicy", "Bypass", "-File", scriptPath, resourcePath];

            } else {
                scriptPath = path.join(resourcePath, "scripts", "prepare.sh");
                if (!fs.existsSync(scriptPath)) {
                    console.error(`Unix prepare script not found: ${scriptPath}`);
                    reject(new Error(`Unix prepare script not found: ${scriptPath}`));
                }
                cmd = "bash";
                args = [scriptPath, resourcePath];
            }

            console.log(`Running prepare script: ${cmd} ${args.join(" ")}`);

            const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });


            child.stdout.on("data", (data) => {
                const text = data.toString();
                console.log(text)
                // Only send lines that start with "==="
                text.split("\n").forEach(line => {
                    if (line.startsWith("===")) {
                        splash.webContents.send("update-splash-progress", line);
                    }
                });
            });


            child.on("close", (code) => {
                if (code === 0) {
                    console.log("Prepare script completed successfully.");
                    // Create the flag file to mark it as done
                    fs.writeFileSync(flagFile, "done");
                    return resolve();
                } else {
                    console.error(`Prepare script exited with code ${code}`);
                    reject(new Error(`Prepare script exited with code ${code}`));
                }
            });
        });
    });

}

function createUserKernel(){
    // I should check if the kernel has the correct python path

    let kernelspecs;
    try {
        const out = execSync(`${pythonPath} -m jupyter kernelspec list --json`, { encoding: 'utf-8' });
        kernelspecs = JSON.parse(out).kernelspecs;
    } catch (err) {
        console.error("Couldn't query kernelspecs:", err);
        kernelspecs = {};
    }

    const kernelName = "firefly-electron";
    let needInstall = true;

    if (kernelName in kernelspecs) {
        try {
            // kernelspecs[kernelName].resource_dir points to the kernel directory
            const kernelJsonPath = path.join(kernelspecs[kernelName].resource_dir, 'kernel.json');
            const kernelJson = JSON.parse(fs.readFileSync(kernelJsonPath, 'utf-8'));

            // Check if the python path matches
            if (kernelJson.argv && kernelJson.argv[0] === pythonPath) {
                console.log("Jupyter kernel exists and has correct Python path.");
                needInstall = false;
            } else {
                console.log("Jupyter kernel exists but Python path is different. Reinstalling kernel...");
            }
        } catch (err) {
            console.error("Failed to read kernel.json:", err);
            console.log("Will reinstall Jupyter kernel...");
        }
    }

    if (needInstall) {
        console.log("Installing firefly-electron jupyter kernel ...");
        execSync(`${pythonPath} -m ipykernel install --user --name firefly-electron --display-name "firefly-electron-py3 \(ipykernel\)"`);
    } 
}


module.exports = { runPrepareAsync, createUserKernel };
