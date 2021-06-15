//all "global" variables are contained within params object
var splashShowing = true;
var imgTime = Date.now();
var imgdt = 0;
var img = document.getElementById('stream');
var dtTarget = 33; //33 ~ 30 fps
var quality = 0.7;

img.onload = function(){
	imgdt = Date.now() - imgTime;
	imgTime = Date.now();
}

function initFPS(inp){
	input = JSON.parse(inp);
	console.log(input);
	dtTarget = 1000/input.fps;
}
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
			img.src = msg;
			if (Math.abs(dtTarget - imgdt) > 10){
				var sign = Math.sign(dtTarget - imgdt);
				quality += sign*0.05;
			}

			quality = Math.min(Math.max(quality, 0.3), 1.0);
			socketParams.socket.emit('viewer_input',[{'setViewerParamByKey':[quality, "streamQuality"]}]);


		});
	});
}


//runs on load
defineSocketParams();
connectStreamerSocket();

