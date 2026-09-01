///////////////////////////////////////////////////////////////////////////////
// The one place a user chooses data, built into the splash screen's bottom slot
// (#splashdivLoader) in place of the loading bar. Every route in ends up here:
//
//   * a startup.json with several entries      -> selectFromStartup() (dropdown)
//   * no startup.json / no data at all         -> showDataPicker()    (path)
//   * "Load New Data" in the GUI               -> loadNewData(), viewer side
//   * "h" once data is loaded                  -> showDataPickerAgain()
//
// Paths are resolved by the server (load_data_path in server.py): no browser API
// hands a page an absolute filesystem path, so the picking has to happen on the
// machine running flask. That machine also lists directories for us (/browse)
// and, when it's the same machine as the browser, can open its own OS folder
// dialog (native_browse).
///////////////////////////////////////////////////////////////////////////////

// is a dataset already showing in the viewer? when the GUI runs in its own
// window there is no viewerParams here, so fall back to the partsKeys the
// viewer sends us (null until sendInitGUI runs, and reset by defineGUIParams
// when a dataset is torn down)
function viewerHasData(){
	if (typeof viewerParams !== 'undefined' && viewerParams != null) return !!viewerParams.loaded;
	return GUIParams.partsKeys != null;
}

/////////////////////////////
// showing and hiding
/////////////////////////////

// the picker and the loading bar share the bottom slot; only one at a time
function dataPickerContainer(){
	var loaderDiv = d3.select('#splashdivLoader');
	if (!loaderDiv.node()) return null;

	loaderDiv.selectAll('#dataPicker').remove();
	d3.select('.ff-loader__bar').style('display', 'none');

	// the splash dismisses itself on click, which would swallow every click in
	//  here (picking a folder would close the splash instead)
	return loaderDiv.append('div')
		.attr('id', 'dataPicker')
		.attr('class', 'ff-picker')
		.on('click', function(){ if (d3.event) d3.event.stopPropagation(); });
}

function hideDataPicker(){
	d3.select('#dataPicker').style('display', 'none');
	d3.select('.ff-loader__bar').style('display', null);
}

// resetSplashProgress() (initViewer.js) hides the panel too, so read the DOM
// rather than tracking a flag of our own that it would leave stale
function dataPickerShowing(){
	var picker = document.getElementById('dataPicker');
	return !!picker && getComputedStyle(picker).display != 'none';
}

// the datasets a multi-entry startup.json offered, in the order it listed them.
// GUIParams.dir is sent by the viewer whenever it loads data or offers the
// picker, so this survives a dataset switch (which rebuilds GUIParams) without
// the picker having to hold a copy of its own.
function startupDirs(){
	if (GUIParams.dir == null) return [];
	var keys = Object.keys(GUIParams.dir);
	if (keys.length < 2) return [];  //a single entry is loaded without asking
	return keys.map(function(k, i){ return GUIParams.dir[i]; });
}

function hasStartupDirs(){
	return startupDirs().length > 0;
}

// bring the splash back up with the picker on it, however it was last configured
function showDataPickerAgain(){
	// showSplash() rebuilds the picker itself (see restoreDataPickerOnSplash),
	//  which keeps the two from calling back into each other
	showSplash(true);
}

// the splash is coming back up -- via "h", or via Load New Data -- over a dataset
// that is already loaded. Put the picker back in the slot the (long since
// finished) loading bar is holding, so another dataset can be chosen, or the
// whole thing cancelled without a reload.
function restoreDataPickerOnSplash(){
	if (!viewerHasData()) return;                              // nothing to return to
	if (!hasStartupDirs() && !GUIParams.usingSocket) return;    // nothing to offer
	buildDataPicker();
}

// startup.json listed several datasets: offer them, plus a path of the user's own
function selectFromStartup(prefix=""){
	GUIParams.startupPrefix = prefix;
	buildDataPicker();
}

// no startup.json that named a dataset: a path is all there is to offer. (the
// dropdown appears anyway if GUIParams.dir turns out to hold several datasets,
// which is what we want -- both routes stay open)
function showDataPicker(){
	buildDataPicker();
}

function buildDataPicker(){
	var picker = dataPickerContainer();
	if (!picker) return;

	// gui.html's splash normally reads "Waiting for Viewer...", which isn't what
	//  we're doing here
	d3.select('#splashdiv1').style('display', 'none');

	if (hasStartupDirs()) buildStartupRow(picker);

	// loading from a path needs the server on the other end of a socket
	if (GUIParams.usingSocket) buildPathRow(picker);
	else if (!hasStartupDirs()) picker.append('div')
		.attr('class', 'ff-picker__note')
		.text('No data found. Create a dataset with one of the python readers '
			+ '(e.g. firefly.data_reader.SimpleReader) and reload this page.');

	picker.append('div')
		.attr('id', 'dataPickerMessage')
		.attr('class', 'ff-picker__msg')
		.style('display', 'none');

	// only once there's a viewer state worth returning to
	if (viewerHasData()){
		picker.append('button')
			.attr('id', 'cancelDataPicker')
			.attr('class', 'button ff-button ff-button--secondary')
			.on('click', function(){
				d3.select('#splashdiv1').style('display', null);
				hideDataPicker();
				showSplash(false);
			})
			.append('span')
				.text('Cancel');
	}

}

/////////////////////////////
// the startup.json dropdown
/////////////////////////////

function buildStartupRow(picker){
	var row = picker.append('div').attr('class', 'ff-picker__row');
	var dirs = startupDirs();

	var select = row.append('select')
		.attr('id', 'selectedStartup')
		.attr('class', 'ff-select');

	select.selectAll('option')
		.data(dirs).enter()
			.append('option')
				.attr('value', function(d){ return d; })
				.text(function(d){ return d; });

	select.node().value = dirs[0];

	row.append('button')
		.attr('id', 'confirmStartupSelection')
		.attr('class', 'button ff-button')
		.on('click', function(){ loadStartupSelection(select.node().value); })
		.append('span')
			.text('Load');
}

function loadStartupSelection(dir){
	// these datasets are served out of firefly/static, so the GUI can read the
	//  manifest itself and hand the viewer everything it needs in one message
	d3.json(GUIParams.startupPrefix + dir + '/filenames.json', function(files){
		if (files == null) return dataPickerError('Could not read '
			+ GUIParams.startupPrefix + dir + '/filenames.json.');

		console.log('==loading data', files, GUIParams.startupPrefix);
		sendDataLoadToViewer([{'callLoadData':[files, GUIParams.startupPrefix, dir]}]);
	});
}

// tear the old dataset down before loading, or the new one is layered on top of
// the previous octree/GUI state. one message, so the reset and the load can't be
// split across two socket round trips when the viewer is in its own window.
function sendDataLoadToViewer(commands){
	d3.select('#splashdiv1').style('display', null);
	hideDataPicker();

	var forViewer = [];
	if (viewerHasData()) forViewer.push({'resetViewerToInitialState':true});
	commands.forEach(function(c){ forViewer.push(c); });
	sendToViewer(forViewer);
}

/////////////////////////////
// loading from a path on the server
/////////////////////////////

function buildPathRow(picker){
	var row = picker.append('div').attr('class', 'ff-picker__row');

	var input = row.append('input')
		.attr('id', 'dataPathInput')
		.attr('class', 'ff-input')
		.attr('type', 'text')
		.attr('spellcheck', false)
		.attr('placeholder', 'path to a data directory on the server')
		.on('keydown', function(){
			if (d3.event && d3.event.key == 'Enter') submitDataPath(this.value);
			// "h" and the like belong in the box, not to the splash
			if (d3.event) d3.event.stopPropagation();
		})
		.on('input', function(){ GUIParams.dataPicker.lastPath = this.value; });

	input.node().value = GUIParams.dataPicker.lastPath;

	row.append('button')
		.attr('id', 'dataPathBrowse')
		.attr('class', 'button ff-button ff-button--secondary')
		.on('click', openDataBrowser)
		.append('span')
			.text('Browse...');

	row.append('button')
		.attr('id', 'dataPathLoad')
		.attr('class', 'button ff-button')
		.on('click', function(){ submitDataPath(input.node().value); })
		.append('span')
			.text('Load');

	// built now, revealed by Browse
	buildDataBrowser(picker);
}

function submitDataPath(path){
	if (!path || !path.trim()) return dataPickerError('Enter a path, or use Browse.');
	if (!GUIParams.usingSocket) return dataPickerError(
		'This Firefly page has no connection to the server, so it cannot read a path.');

	GUIParams.dataPicker.lastPath = path.trim();
	dataPickerMessage('Looking for data in ' + path.trim() + ' ...');

	// the server replies straight to the viewer (load_ffly_data / input_data),
	//  which tears down whatever is loaded before taking the new data on
	socketParams.socket.emit('load_data_path', {'path':path.trim()});
}

/////////////////////////////
// the directory list, served by the machine running flask
/////////////////////////////

function buildDataBrowser(picker){
	var browser = picker.append('div')
		.attr('id', 'dataBrowser')
		.attr('class', 'ff-browser')
		.style('display', 'none');

	var bar = browser.append('div').attr('class', 'ff-browser__bar');
	bar.append('button')
		.attr('id', 'dataBrowserUp')
		.attr('class', 'ff-browser__btn')
		.on('click', function(){ requestBrowse(d3.select(this).attr('data-path')); })
		.text('up');
	bar.append('div').attr('id', 'dataBrowserShortcuts').attr('class', 'ff-browser__shortcuts');

	browser.append('div').attr('id', 'dataBrowserPath').attr('class', 'ff-browser__path');
	browser.append('div').attr('id', 'dataBrowserList').attr('class', 'ff-browser__list');
	// its own element, outside #dataBrowserList: anything sharing that container's
	//  .ff-browser__item class gets picked up by the data join in renderBrowse(),
	//  which would then call the key function on an element with no bound data
	browser.append('div')
		.attr('id', 'dataBrowserEmpty')
		.attr('class', 'ff-browser__empty')
		.style('display', 'none')
		.text('(no subdirectories)');

	var foot = browser.append('div').attr('class', 'ff-browser__foot');
	foot.append('button')
		.attr('id', 'dataBrowserUse')
		.attr('class', 'button ff-button')
		.on('click', function(){ if (GUIParams.dataPicker.browsePath) submitDataPath(GUIParams.dataPicker.browsePath); })
		.append('span')
			.text('Use this folder');
	// only offered when the server says a dialog of its own could be seen from here
	foot.append('button')
		.attr('id', 'dataBrowserNative')
		.attr('class', 'button ff-button ff-button--secondary')
		.style('display', 'none')
		.on('click', function(){
			dataPickerMessage('Waiting for the folder dialog...');
			socketParams.socket.emit('native_browse');
		})
		.append('span')
			.text('Use the OS dialog');
	foot.append('button')
		.attr('id', 'dataBrowserClose')
		.attr('class', 'button ff-button ff-button--secondary')
		.on('click', function(){ d3.select('#dataBrowser').style('display', 'none'); })
		.append('span')
			.text('Close');
}

function openDataBrowser(){
	d3.select('#dataBrowser').style('display', null);
	var typed = d3.select('#dataPathInput');
	requestBrowse(GUIParams.dataPicker.browsePath || (typed.node() ? typed.node().value : ''));
}

function requestBrowse(path){
	// two arguments, so d3 hands us the failure instead of swallowing it
	//  (d3.json wraps single-argument callbacks and drops the error)
	d3.json('browse?path=' + encodeURIComponent(path || ''), function(error, data){
		if (error || !data){
			// the error is the XHR event, so the status is on its target
			var status = error && (error.status || (error.target && error.target.status));
			return dataPickerError('Could not list directories on the server.'
				+ (status == 403 ? ' (This server is running in public mode.)' : ''));
		}
		renderBrowse(data);
	});
}

function renderBrowse(data){
	GUIParams.dataPicker.nativeAvailable = !!data.native;
	d3.select('#dataBrowserNative').style('display', data.native ? null : 'none');

	if (data.error){
		dataPickerError(data.error);
		if (!data.path) return;
	}

	GUIParams.dataPicker.browsePath = data.path;
	d3.select('#dataBrowserPath').text(data.path);
	d3.select('#dataBrowserUse').property('disabled', !data.path);

	d3.select('#dataBrowserUp')
		.attr('data-path', data.parent || '')
		.property('disabled', !data.parent);

	var shortcuts = d3.select('#dataBrowserShortcuts').selectAll('button')
		.data(data.shortcuts || [], function(d){ return d.path; });
	shortcuts.exit().remove();
	shortcuts.enter().append('button')
		.attr('class', 'ff-browser__btn')
		.on('click', function(d){ requestBrowse(d.path); })
	.merge(shortcuts)
		.text(function(d){ return d.label; });

	var entries = (data.dirs || []).map(function(d){
		return {'name':d.name, 'hint':d.hint, 'isdir':true};
	}).concat((data.files || []).map(function(f){
		return {'name':f, 'hint':'data', 'isdir':false};
	}));

	var list = d3.select('#dataBrowserList');
	// key on the kind as well as the name, so a directory and a file that happen
	//  to share a name in different listings can't reuse the same row
	var rows = list.selectAll('div.ff-browser__item')
		.data(entries, function(d){ return d ? (d.isdir ? 'd:' : 'f:') + d.name : ''; });
	rows.exit().remove();
	var incoming = rows.enter().append('div').attr('class', 'ff-browser__item');
	incoming.append('span').attr('class', 'ff-browser__name');
	incoming.append('span').attr('class', 'ff-browser__tag');

	var all = incoming.merge(rows);
	all.classed('ff-browser__item--file', function(d){ return !d.isdir; })
		.classed('ff-browser__item--data', function(d){ return !!d.hint; })
		.on('click', function(d){
			var full = joinBrowsePath(GUIParams.dataPicker.browsePath, d.name);
			// a file is a choice in itself; a directory is somewhere to look
			if (d.isdir) requestBrowse(full);
			else submitDataPath(full);
		});
	all.select('.ff-browser__name').text(function(d){ return d.isdir ? d.name + '/' : d.name; });
	all.select('.ff-browser__tag').text(function(d){
		if (d.hint == 'firefly') return 'firefly data';
		if (d.hint == 'startup') return 'startup.json';
		if (d.hint == 'data') return 'data files';
		return '';
	});

	d3.select('#dataBrowserEmpty').style('display', entries.length ? 'none' : null);
}

// the server may be on any OS, so keep whichever separator its paths already use
function joinBrowsePath(base, name){
	if (!base) return name;
	var sep = base.indexOf('\\') >= 0 && base.indexOf('/') < 0 ? '\\' : '/';
	if (base.charAt(base.length - 1) == sep) return base + name;
	return base + sep + name;
}

// the OS dialog came back with a directory
function nativeBrowseResult(path){
	GUIParams.dataPicker.browsePath = path;
	var input = d3.select('#dataPathInput');
	if (input.node()) input.node().value = path;
	submitDataPath(path);
}

/////////////////////////////
// messages
/////////////////////////////

function dataPickerMessage(message, isError=false){
	var box = d3.select('#dataPickerMessage');
	if (!box.node()) return;
	box.classed('ff-picker__msg--error', isError)
		.style('display', message ? null : 'none')
		.text(message);
}

// something went wrong: say what, and make sure the panel the user needs is the
// thing they're looking at (a failed load leaves the splash on a bar that will
// never fill otherwise)
function dataPickerError(message){
	console.log('!!! ' + message);
	// raise the splash first: showSplash() rebuilds the picker (see
	//  restoreDataPickerOnSplash), which would wipe the message if it ran after
	showSplash(true);
	if (!dataPickerShowing()) buildDataPicker();
	d3.select('#dataPicker').style('display', null);
	d3.select('.ff-loader__bar').style('display', 'none');
	dataPickerMessage(message, true);
}

