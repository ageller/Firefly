//all "global" variables are contained within params objects
//
// This one holds the handful of values that must NOT be reset when a dataset is
// torn down and replaced. defineViewerParams() and defineGUIParams() build a
// brand new viewerParams/GUIParams each time that happens, so anything kept
// there is lost -- which is exactly what these values can't afford. Everything
// else belongs in viewerParams (viewer state), GUIParams (GUI state) or
// socketParams (the connection).
//
// Deliberately a plain object initialized here rather than a define...Params()
// function: there is nothing to re-initialize, and being called again is the one
// thing that would break it.
var persistentParams = {

	//// viewer side

	// bumped by stopAnimation()/startAnimation() (renderLoop.js) and captured by
	//  each render loop, which exits as soon as the two disagree. This is how an
	//  old loop is retired when a new dataset starts one. If it reset with
	//  viewerParams the count would start over, a stale loop's captured value
	//  could match the new loop's, and both would keep drawing.
	viewerLoopGeneration: 0,

	// defaultSettings.json / defaultParticleSettings.json, fetched once (see
	//  setDefaultViewerParams() in viewerParams.js). Every dataset load calls
	//  defineViewerParams(), so caching these inside viewerParams would re-fetch
	//  them each time and re-open the window where WebGLStart() can run before
	//  they land -- the "GUI missing partsKeys" hang.
	cachedDefaultSettings: null,
	cachedDefaultParticleSettings: null,

	//// GUI side

	// the GUI cube scene's own render loop; same reasoning as
	//  viewerLoopGeneration above (see animateGUI(), GUIsocket.js)
	GUILoopGeneration: 0,

	// the renderer and window-resize handle from the previous initGUIScene(), so
	//  the next one can release them. Browsers cap how many live WebGL contexts a
	//  page may hold, so a long session of dataset switches leaks its way to a
	//  dead GUI scene without this. Held here because the reset that makes a new
	//  scene necessary is the same reset that wipes GUIParams.
	previousGUIRenderer: null,
	previousGUIWindowResize: null,
};
