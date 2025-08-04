// for the dividers
const overlay = document.getElementById('drag-overlay');
let isDragging = false;
let currentDivider = null;
let startX = 0;
let leftPanel = null;
let rightPanel = null;
let leftStartWidth = 0;
let rightStartWidth = 0;


// keep panel sizing consistent
function normalizePanelFlex(reset=false) {
    const panelContainer = document.getElementById('panels');
    const visiblePanels = Array.from(panelContainer.querySelectorAll('.panel'))
        .filter(p => !p.classList.contains('hidden'));
    const widths = visiblePanels.map(p => p.getBoundingClientRect().width);

    // Calculate total available width
    const totalPanelWidth = widths.reduce((a, b) => a + b, 0);

    visiblePanels.forEach((panel, i) => {
        // Proportion relative to current visible area
        if (reset) {
            panel.style.flexGrow = 1./visiblePanels.length;
        } else {
            const grow = totalPanelWidth > 0 ? widths[i] / totalPanelWidth : 1 / visiblePanels.length;
            panel.style.flexGrow = grow;
        }
    });
    // Hidden panels should not take up space
    Array.from(panelContainer.querySelectorAll('.panel.hidden')).forEach(p => {
        p.style.flexGrow = 0;
    });
}
function mousedown(e) {
    if (!e.target.classList.contains('divider')) return;
    overlay.style.display = 'block';

    isDragging = true;
    currentDivider = e.target;

    leftPanel = currentDivider.previousElementSibling;
    while (leftPanel && leftPanel.classList.contains('hidden')) {
        leftPanel = leftPanel.previousElementSibling;
    }
    rightPanel = currentDivider.nextElementSibling;
    while (rightPanel && rightPanel.classList.contains('hidden')) {
        rightPanel = rightPanel.nextElementSibling;
    }
    startX = e.clientX;

    // Instead of storing flexGrow, get actual widths in px:
    leftStartWidth = leftPanel.getBoundingClientRect().width;
    rightStartWidth = rightPanel.getBoundingClientRect().width;

    document.body.style.cursor = 'col-resize';

    e.preventDefault();
}

function mousemove(e) {
    if (!isDragging || !leftPanel || !rightPanel) return;

    const deltaX = e.clientX - startX;

    // Compute new widths but clamp to minimum (e.g. 50px)
    let newLeftWidth = Math.max(50, leftStartWidth + deltaX);
    let newRightWidth = Math.max(50, rightStartWidth - deltaX);

    const containerWidth = document.getElementById('panels').getBoundingClientRect().width;

    // Calculate new flexGrow as proportion of total container width
    leftPanel.style.flexGrow = newLeftWidth / containerWidth;
    rightPanel.style.flexGrow = newRightWidth / containerWidth;

    // Prevent default selection during drag
    e.preventDefault();
}

function mouseup(e) {
    if (!isDragging) return;
    normalizePanelFlex();
    isDragging = false;
    document.body.style.cursor = '';
    currentDivider = null;
    leftPanel = null;
    rightPanel = null;
    overlay.style.display = 'none';

}
window.addEventListener('resize', normalizePanelFlex);
window.addEventListener('mousedown', mousedown);
window.addEventListener('mousemove', mousemove);
window.addEventListener('mouseup', mouseup);


// toggle the webview based on sidebar button
function toggleView(button, panelId) {
    const panel = document.getElementById(panelId);
    const dividerBefore = panel.previousElementSibling;
    const dividerAfter = panel.nextElementSibling;
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        button.classList.add('shown');
        if (dividerBefore && dividerBefore.classList.contains('divider')) {
            dividerBefore.classList.remove('hidden');
        } else if (dividerAfter && dividerAfter.classList.contains('divider')) {
            dividerAfter.classList.remove('hidden');
        }
    } else {
        panel.classList.add('hidden');
        button.classList.remove('shown');
        if (dividerBefore && dividerBefore.classList.contains('divider')) {
            dividerBefore.classList.add('hidden');
        } else if (dividerAfter && dividerAfter.classList.contains('divider')) {
            dividerAfter.classList.add('hidden');
        }
    }
    normalizePanelFlex(reset=true);
}

// these two functions handle the data loading
function enableDataTypeSelection(){
    // show the dataType dropdown
    const dropdown = document.getElementById('dataTypeDropdown');
    if (dropdown.classList.contains('visible')) {
        dropdown.classList.remove('visible');
    } else {
        const rect = document.getElementById('loadDataButton').getBoundingClientRect();
        dropdown.style.top = (rect.top + 10) + 'px';
        dropdown.classList.add('visible');
    }
}
// use the system file loader to send data to Firefly
window.getFireflyFilePath = async function (){
    // hide the dataType dropdown
    const dropdown = document.getElementById('dataTypeDropdown');
    dropdown.classList.remove('visible');

    const folderPath = await window.electronAPI.selectDirectory();

    if (!folderPath) return;

    // I want to use a similar procedure as in the Firefly loader to access input_otherType in server.py
    // this input_otherType is a socket, so I will need to emit from the webview
      
    const webview = document.getElementById('firefly');
    // for debugging
    // webview.openDevTools(); 

    // Escape the string properly (not sure this is necessary, but was suggested by ChatGPT)
    const escapedPath = folderPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    console.log('comparing paths', folderPath,escapedPath)

    // input_otherType is built to work with hdf5, csv and json files.  I should eventually build that too
    const fileinfo = {
        filepath:escapedPath,
        filetype:document.getElementById('dataTypeSelect').value
    }    
    console.log('checking', fileinfo)

    webview.executeJavaScript(`
        if (window.socketParams.socket) {
            window.socketParams.socket.emit('input_otherType', ${JSON.stringify(fileinfo)});
            console.log('Emitted input_otherType with fileinfo: ${JSON.stringify(fileinfo)}');
        } else {
            console.error('Socket not initialized in webview.');
        }
    `);
    
}


window.addEventListener('DOMContentLoaded', () => {
    normalizePanelFlex(reset=true);
    const webviews = document.querySelectorAll('webview');
    webviews.forEach(wv => {
        if (wv.shadowRoot) {
            const iframe = wv.shadowRoot.querySelector('iframe');
            if (iframe) {
                iframe.style.height = '100%';
                iframe.style.width = '100%';
            } 
        }
    });
});

