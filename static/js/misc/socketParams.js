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
		// Connect to the Socket.IO server.
		// The connection URL has the following format:
		//     http[s]://<domain>:<port>[/<namespace>]
		this.socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + this.namespace);//, {
		// 	'reconnectionDelay': 10000,
		// 	'reconnectionDelayMax': 20000,
		// });

	}
}
