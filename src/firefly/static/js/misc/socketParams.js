//all "global" variables are contained within params object
var socketParams;

function defineSocketParams(){
	socketParams = new function() {

		//flask + socketio
		// Use a "/test" namespace.
		// An application can open a connection on multiple namespaces, and
		// Socket.IO will multiplex all those connections on a single
		// physical channel. If you don't care about multiple channels, you
		// can set the namespace to an empty string.
		this.namespace = '/Firefly';

		//room will be set by the user with a prompt.  This will allow different sessions of e.g., gui+viewer to connect at the same time without confusing messages
		this.room = null;

		// the server routes messages by room, and silently drops anything from a
		//  client that hasn't joined yet. so hold outgoing messages until the
		//  join is confirmed (see flushPendingSocketMessages in utils.js).
		this.joined = false;
		this.pendingGUI = [];
		this.pendingViewer = [];

		// set by gui.html only: this window is a GUI on its own, so it announces
		//  itself to the viewer, which may have loaded data before we existed
		this.isSeparateGUI = false;
		
		// Connect to the Socket.IO server.
		// The connection URL has the following format:
		//     http[s]://<domain>:<port>[/<namespace>]

		// has connectFireflySocket() been asked to open the connection yet?
		this.connectQueued = false;

		this.socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + this.namespace, 
		{
			// opened by connectFireflySocket() below, once the handlers exist.
			//  connecting here instead would race them: this runs early in the
			//  page, and 'connect' and 'room_check' both arrive before the
			//  connectGUISocket()/connectViewerSocket() calls at the end of the
			//  body have registered anything to receive them -- socket.io does
			//  not replay events, so the window ends up connected to the server
			//  but never joined to a room, and silently does nothing.
			autoConnect: false,
			query: {
				nocache: Date.now()  // Add a unique query parameter to bypass caching
			},
			rememberTransport: false,
			transports: ["websocket"],
			forceNew: true,
			reconnection: true,
			maxHttpBufferSize: 1e9, //1Gb, but I'm not sure this actually sets the limit
            pingTimeout: 1e7,
		});

        // this.socket.io._timeout = 1e9;

	}
}

// open the connection, once. Called at the end of connectGUISocket() and
// connectViewerSocket(); deferred by a timeout so that a page calling both (the
// combined viewer) has registered every handler in both before the server can
// answer. Emits made in the meantime are buffered by socket.io and flush on
// connect.
function connectFireflySocket(){
	if (socketParams.connectQueued) return;
	socketParams.connectQueued = true;
	setTimeout(function(){ socketParams.socket.connect(); }, 0);
}
