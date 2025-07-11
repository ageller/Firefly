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