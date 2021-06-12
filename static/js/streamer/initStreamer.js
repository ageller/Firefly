//all "global" variables are contained within params object
var splashShowing = true;

function connectStreamerSocket(){
	document.addEventListener("DOMContentLoaded", function(event) { 

		socketParams.socket.on('connect', function() {
			socketParams.socket.emit('connection_test', {data: 'Streamer connected!'});
		});
		socketParams.socket.on('connection_response', function(msg) {
			console.log("connection response", msg);
			socketParams.socket.emit('viewer_input', {'setViewerParamByKey':[true, "streamerActive"]});
		});     

		socketParams.socket.on('update_streamer', function(msg) {
			if (splashShowing){
				document.getElementById('loader').classList.add('hidden');
				showSplash(false);
				splashShowing = false;
			}
			//console.log('have texture')
			document.getElementById('stream').src = msg;
		});
	});
}


//runs on load
defineSocketParams();
connectStreamerSocket();

