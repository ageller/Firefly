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
		
		// Connect to the Socket.IO server.
		// The connection URL has the following format:
		//     http[s]://<domain>:<port>[/<namespace>]

		this.socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + this.namespace, 
		{
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
