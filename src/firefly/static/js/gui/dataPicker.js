///////////////////////////////////////////////////////////////////////////////
// The one place a user chooses data, built into the splash screen's bottom slot
// (#splashdivLoader) in place of the loading bar. Exactly one of two panels is
// offered at a time, never both:
//
//   * the startup.json dropdown, when startup.json lists several datasets
//   * the data picker (browse / OS dialog / typed path), when there is no
//     startup.json to load from, or when the user asks for new data from the GUI
//
// So startup.json is always what the splash comes back to (pressing "h", say);
// the picker is reached only by not having one, or by asking for it -- see
// loadNewData() in viewer/applyUISelections.js, which leaves the viewer as it is
// so that Cancel here can go straight back to it.
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
// which panel, and which face of it
/////////////////////////////

// the datasets startup.json named, in the order it listed them. GUIParams.dir is
// sent by the viewer whenever it loads data or offers the picker, so this
// survives a dataset switch (which rebuilds GUIParams) without the picker having
// to hold a copy of its own.
function startupDirs(){
	if (GUIParams.dir == null) return [];
	return Object.keys(GUIParams.dir).map(function(k, i){ return GUIParams.dir[i]; });
}

// more than one dataset to choose between: that choice is the dropdown
function hasStartupDirs(){
	return startupDirs().length > 1;
}

// did the GUI's "Load New Data" button ask for the picker? in a combined window
// the viewer sets this before its own message to us has been round-tripped
// through the server, so read it from viewerParams when there is one -- and a
// separate GUI window has only the flag that message sets.
function newDataRequested(){
	if (typeof viewerParams !== 'undefined' && viewerParams != null)
		return viewerParams.dataPickerState == 'newDataPicker';
	return GUIParams.dataPicker.newDataRequested;
}

// which panel the splash should be offering right now
function pickerMode(){
	// asked for from the GUI: the picker, and only the picker -- startup.json's
	//  own entries are deliberately left out of it
	if (newDataRequested()) return 'path';

	if (hasStartupDirs()) return 'startup';

	// a startup.json naming a single dataset leaves nothing to choose between:
	//  it is already loaded, or loading. Unless it turned out not to load, in
	//  which case a path is the only way forward.
	if (startupDirs().length == 1 && !GUIParams.dataPicker.startupFailed) return 'none';

	// a path needs a server to resolve it, so with data already in the viewer and
	//  no socket (index.html) there is nothing to offer either
	if (!GUIParams.usingSocket && viewerHasData()) return 'none';

	return 'path';
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

// gui.html's splash slot 1 reads "Waiting for Viewer...", which isn't what we're
// doing here. The full splash (templates/_splash.html) keeps the logo there, and
// that stays.
function hideSplashTitle(hide=true){
	var slot = d3.select('#splashdiv1');
	if (!slot.node() || slot.select('#splashimg').node()) return;
	slot.style('display', hide ? 'none' : null);
}

function hideDataPicker(){
	hideSplashTitle(false);
	d3.select('#dataPicker').style('display', 'none');
	d3.select('.ff-loader__bar').style('display', null);
}

// resetSplashProgress() (initViewer.js) hides the panel too, so read the DOM
// rather than tracking a flag of our own that it would leave stale
function dataPickerShowing(){
	var picker = document.getElementById('dataPicker');
	return !!picker && getComputedStyle(picker).display != 'none';
}

// the splash has gone down, however it was dismissed (Cancel, a click, "h", or a
// load finishing), so this visit to the picker is over: forget that the GUI asked
// for it, and the next splash offers whatever startup.json holds again. Called
// from showSplash() in misc/windowEvents.js.
function endPickerVisit(){
	var state = GUIParams.dataPicker;
	var wasRequested = newDataRequested() || state.newDataRequested;

	state.newDataRequested = false;
	state.startupFailed = false;
	state.stage = 'menu';

	if (!wasRequested) return;
	// the viewer keeps the same fact, both to answer newDataRequested() above in
	//  a combined window and to replay to a GUI window that connects later
	if (typeof dataPickerClosed === 'function') dataPickerClosed();
	else sendToViewer([{'dataPickerClosed':null}]);
}

// the splash is coming back up over a dataset that is already loaded. Put the
// picker back in the slot the (long since finished) loading bar is holding, so
// another dataset can be chosen, or the whole thing cancelled without a reload.
function restoreDataPickerOnSplash(){
	if (!viewerHasData()) return;  // whatever was offered for the first load stays put
	buildDataPicker();
}

// startup.json listed several datasets: offer them
function selectFromStartup(prefix=""){
	GUIParams.startupPrefix = prefix;
	buildDataPicker();
}

// no startup.json that named a dataset: a path is all there is to offer
function showDataPicker(){
	buildDataPicker();
}

// the GUI's "Load New Data" button, by way of loadNewData() in the viewer
function openDataPickerForNewData(){
	GUIParams.dataPicker.newDataRequested = true;
	GUIParams.dataPicker.stage = 'menu';
	buildDataPicker();
}

// move between the picker's faces: the opening menu, the directory browser, or
// the typed path. Only one is ever built, so there is never both a "Load" and a
// folder to pick from, or both a text field and a browser.
function showPickerStage(stage){
	GUIParams.dataPicker.stage = stage;
	buildDataPicker();

	if (stage == 'browse') openDataBrowser();
	if (stage == 'manual'){
		var input = document.getElementById('dataPathInput');
		if (input) input.focus();
	}
}

function buildDataPicker(){
	var mode = pickerMode();
	if (mode == 'none') return hideDataPicker();

	var picker = dataPickerContainer();
	if (!picker) return;
	hideSplashTitle();

	var state = GUIParams.dataPicker;

	// the panel above the buttons, when the current face of the picker has one
	if (mode == 'path'){
		if (!GUIParams.usingSocket) picker.append('div')
			.attr('class', 'ff-picker__note')
			.text('No data found. Create a dataset with one of the python readers '
				+ '(e.g. firefly.data_reader.SimpleReader) and reload this page.');
		else if (state.stage == 'browse'){
			buildDataBrowser(picker);
			// re-render the listing we already have rather than asking for it
			//  again: a rebuild can be triggered by a failed request (see
			//  dataPickerError), and requesting from here would loop
			if (state.lastListing) renderBrowse(state.lastListing);
		}
	}

	picker.append('div')
		.attr('id', 'dataPickerMessage')
		.attr('class', 'ff-picker__msg')
		.style('display', 'none');

	// one row holds every button the current face offers, so Cancel is always
	//  beside them rather than stretched across the bottom of the screen
	var row = picker.append('div').attr('class', 'ff-picker__row');
	if (mode == 'startup') buildStartupControls(row);
	else if (GUIParams.usingSocket){
		if (state.stage == 'browse') buildBrowseControls(row);
		else if (state.stage == 'manual') buildManualControls(row);
		else buildPickerMenu(row);
	}
	appendCancel(row);
	// no buttons on this face (no socket, so no path to load from, and nothing
	//  loaded to cancel back to): don't leave an empty row spacing out the note
	if (!row.node().childNodes.length) row.remove();
}

function pickerButton(row, id, label, onclick, secondary=false){
	var button = row.append('button')
		.attr('id', id)
		.attr('class', 'button ff-button' + (secondary ? ' ff-button--secondary' : ''))
		.on('click', onclick);
	button.append('span').text(label);
	return button;
}

// back to the picker's opening menu, from the browser or the text field
function appendBack(row){
	pickerButton(row, 'dataPickerBack', 'Back', function(){ showPickerStage('menu'); }, true);
}

function appendCancel(row){
	if (!viewerHasData()) return;  // no viewer state to go back to yet

	pickerButton(row, 'cancelDataPicker', 'Cancel', function(){
		// nothing was torn down to get here, so this is all it takes to put the
		//  user back in the viewer exactly as they left it
		showSplash(false);  // ends the visit, via endPickerVisit()
		// a separate viewer window put up a splash of its own (see loadNewData)
		if (!GUIParams.local) sendToViewer([{'showSplash':false}]);
	}, true);
}

/////////////////////////////
// the startup.json dropdown
/////////////////////////////

function buildStartupControls(row){
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

	pickerButton(row, 'confirmStartupSelection', 'Load', function(){
		loadStartupSelection(select.node().value);
	});
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
	hideDataPicker();

	var forViewer = [];
	if (viewerHasData()) forViewer.push({'resetViewerToInitialState':true});
	commands.forEach(function(c){ forViewer.push(c); });
	sendToViewer(forViewer);
}

/////////////////////////////
// loading from a path on the server
/////////////////////////////

// the way in: pick a folder from the server's own listing, from a dialog on the
// machine running flask, or by typing the path
function buildPickerMenu(row){
	pickerButton(row, 'dataPickerBrowse', 'Browse...', function(){ showPickerStage('browse'); });

	// only offered when the server says a dialog of its own could be seen from
	//  here, which is what probeNativeBrowse() below asks it
	pickerButton(row, 'dataPickerNative', 'Open OS file explorer', function(){
			dataPickerMessage('Waiting for the folder dialog...');
			socketParams.socket.emit('native_browse');
		}, true)
		.style('display', GUIParams.dataPicker.nativeAvailable ? null : 'none');

	pickerButton(row, 'dataPickerManual', 'Enter path manually', function(){
		showPickerStage('manual');
	}, true);

	probeNativeBrowse();
}

// can the machine running flask put a folder dialog on the user's screen? /browse
// answers that alongside its listing, so ask it here rather than making the user
// open the browser panel to find out. A failure is left silent: the button simply
// stays hidden.
function probeNativeBrowse(){
	d3.json('browse?path=', function(error, data){
		var available = !error && data != null && !!data.native;
		GUIParams.dataPicker.nativeAvailable = available;
		d3.select('#dataPickerNative').style('display', available ? null : 'none');
	});
}

function buildManualControls(row){
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

	pickerButton(row, 'dataPathLoad', 'Load', function(){ submitDataPath(input.node().value); });
	appendBack(row);
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
		.attr('class', 'ff-browser');

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
}

// loads the folder the browser is showing; the folders inside it are one click
// away in the list itself
function buildBrowseControls(row){
	pickerButton(row, 'dataBrowserUse', 'Load', function(){
		var path = GUIParams.dataPicker.browsePath;
		if (path) submitDataPath(path);
	}).property('disabled', !GUIParams.dataPicker.browsePath);

	appendBack(row);
}

function openDataBrowser(){
	var state = GUIParams.dataPicker;
	requestBrowse(state.browsePath || state.lastPath || '');
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

	// kept so the panel can be rebuilt without asking the server again
	GUIParams.dataPicker.lastListing = data;
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
	// nothing loaded and nothing offered means startup.json named a dataset that
	//  won't load: fall back to the picker, or the message has nowhere to go
	if (!viewerHasData()) GUIParams.dataPicker.startupFailed = true;
	// raise the splash first: showSplash() rebuilds the picker (see
	//  restoreDataPickerOnSplash), which would wipe the message if it ran after
	showSplash(true);
	if (!dataPickerShowing()) buildDataPicker();
	d3.select('#dataPicker').style('display', null);
	d3.select('.ff-loader__bar').style('display', 'none');
	dataPickerMessage(message, true);
}
