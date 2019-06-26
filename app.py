from flask import Flask, render_template, request, session
from flask_socketio import SocketIO, emit

from threading import Lock
import sys
import numpy as np

import json

#in principle, we could read in the data here...


app = Flask(__name__)

# Set this variable to "threading", "eventlet" or "gevent" to test the
# different async modes, or leave it set to None for the application to choose
# the best option based on installed packages.
async_mode = None

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, async_mode=async_mode)
thread = None
thread_lock = Lock()

#global variables to hold the params object (not all of this needs to be passed along...)
viewerParams = None
updateViewerParams = False
GUIParams = None
updateGUIParams = False

#number of seconds between updates
seconds = 0.01

#this will pass to the viewer every "seconds" 
def background_thread():
	"""Example of how to send server generated events to clients."""
	global viewerParams, updateViewerParams, GUIParams, updateGUIParams
	while True:
		socketio.sleep(seconds)
		if (updateViewerParams):
			#print("========= viewerParams:",viewerParams)
			socketio.emit('update_viewerParams', viewerParams, namespace='/test')
		if (updateGUIParams):
			print("========= GUIParams:",GUIParams)
			socketio.emit('update_GUIParams', GUIParams, namespace='/test')
		updateViewerParams = False
		updateGUIParams = False
		
#testing the connection
@socketio.on('connection_test', namespace='/test')
def connection_test(message):
	session['receive_count'] = session.get('receive_count', 0) + 1
	emit('connection_response',{'data': message['data'], 'count': session['receive_count']})



######for viewer
#will receive data from viewer 
@socketio.on('viewer_input', namespace='/test')
def viewer_input(message):
	global viewerParams, updateViewerParams
	updateViewerParams = True
	viewerParams = message

#the background task sends data to the viewer
@socketio.on('connect', namespace='/test')
def from_viewer():
	global thread
	with thread_lock:
		if thread is None:
			thread = socketio.start_background_task(target=background_thread)

#######for GUI
#will receive data from gui
@socketio.on('gui_input', namespace='/test')
def gui_input(message):
	global GUIParams, updateGUIParams
	updateGUIParams = True
	GUIParams = message

#the background task sends data to the viewer
@socketio.on('connect', namespace='/test')
def from_gui():
	global thread
	with thread_lock:
		if thread is None:
			thread = socketio.start_background_task(target=background_thread)

##############

#flask stuff
@app.route("/viewer")
def viewer():  
	return render_template("viewer.html")

@app.route("/gui")
def gui(): 
	return render_template("gui.html")

if __name__ == "__main__":
	socketio.run(app, debug=True, host='0.0.0.0', port=5000)
	#app.run(host='0.0.0.0')





