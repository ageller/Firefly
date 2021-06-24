from flask import Flask, render_template, request, session
from flask_socketio import SocketIO, emit

from threading import Lock
import sys
import numpy as np

import subprocess,signal

import json

import os

from Firefly.data_reader import SimpleReader

#in principle, we could read in the data here...


app = Flask(__name__)

# Set this variable to "threading", "eventlet" ,"gevent" or "gevent_uwsgi" to test the
# different async modes, or leave it set to None for the application to choose
# the best option based on installed packages.
async_mode = "eventlet" #"eventlet" is WAY better than "threading"

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

namespace = '/Firefly'
#number of seconds between updates
seconds = 0.01

#for the stream
fps = 30

#decimation
dec = 1

#check if the GUI is separated to see if we need to send a reload signal (currently not used)
GUIseparated = False

#this will pass to the viewer every "seconds" 
def background_thread():
	"""Example of how to send server generated events to clients."""
	global viewerParams, updateViewerParams, GUIParams, updateGUIParams
	while True:
		socketio.sleep(seconds)
		if (updateViewerParams):
			#print("========= viewerParams:",viewerParams)
			socketio.emit('update_viewerParams', viewerParams, namespace=namespace)
		if (updateGUIParams):
			#print("========= GUIParams:",GUIParams)
			socketio.emit('update_GUIParams', GUIParams, namespace=namespace)
		updateViewerParams = False
		updateGUIParams = False


#testing the connection
@socketio.on('connection_test', namespace=namespace)
def connection_test(message):
	print('======= connected', message)
	session['receive_count'] = session.get('receive_count', 0) + 1
	emit('connection_response',{'data': message['data'], 'count': session['receive_count']}, namespace=namespace)


######for viewer
#will receive data from viewer 
@socketio.on('viewer_input', namespace=namespace)
def viewer_input(message):
	global viewerParams, updateViewerParams
	updateViewerParams = True
	viewerParams = message

#the background task sends data to the viewer
@socketio.on('connect', namespace=namespace)
def from_viewer():
	global thread
	with thread_lock:
		if thread is None:
			thread = socketio.start_background_task(target=background_thread)


#######for GUI
#will receive data from gui
@socketio.on('gui_input', namespace=namespace)
def gui_input(message):
	global GUIParams, updateGUIParams
	updateGUIParams = True
	GUIParams = message

#the background task sends data to the viewer
@socketio.on('connect', namespace=namespace)
def from_gui():
	global thread
	with thread_lock:
		if thread is None:
			thread = socketio.start_background_task(target=background_thread)

@socketio.on('separate_GUI', namespace=namespace)
def separate_GUI():
	global GUIseparated
	GUIseparated = True

#######for Streamer
#passing the rendered texture
#trying with post below because this only seems to work when on the same localhost
# @socketio.on('streamer_input', namespace=namespace)
# def streamer_input(blob):
# 	socketio.emit('update_streamer', blob, namespace=namespace)


########reading in hdf5 or csv files
@socketio.on('input_otherType', namespace=namespace)
def input_otherType(filedir):
	print('======= showing loader')
	socketio.emit('show_loader', None, namespace=namespace)
	socketio.sleep(0.1) #to make sure that the above emit is executed

	fdir = os.path.join(os.getcwd(),'static','data',filedir)
	#check the file types
	ftype = '.hdf5'
	try:
		for f in os.listdir(fdir):
			if ('.csv' in f):
				ftype = '.csv'
			if ('.hdf5' in f):
				ftype = '.hdf5'
	except:
		pass

	print('======= have input '+ftype+' data file(s) in', fdir)
	reader = SimpleReader(fdir, write_jsons_to_disk=False, extension=ftype, decimation_factor=dec)
	data = json.loads(reader.JSON)

	print('======= have data from file(s), sending to viewer ...')
	socketio.emit('input_data', {'status':'start', 'length':len(data)}, namespace=namespace)
	socketio.sleep(0.1) #to make sure that the above emit is executed
	for fname in data:
		print(fname, len(data[fname]))
		output = {fname:data[fname], 'status':'data'}
		socketio.emit('input_data', output, namespace=namespace)
		socketio.sleep(0.1) #to make sure that the above emit is executed
	socketio.emit('input_data', {'status':'done'}, namespace=namespace)
	socketio.sleep(0.1) #to make sure that the above emit is executed

	print('======= done')


##############

#flask stuff
@app.route("/viewer")
def viewer():  
	return render_template("viewer.html")

@app.route("/gui")
def gui(): 
	return render_template("gui.html")

@app.route("/")
def default(): 
	return render_template("combined.html")
@app.route("/index")
def index(): 
	return render_template("combined.html")
@app.route("/combined")
def combined(): 
	return render_template("combined.html")

@app.route("/cardboard")
def cardboard(): 
	return render_template("cardboard.html")

@app.route('/data_input', methods = ['POST'])
def data_input():

	print('======= showing loader')
	socketio.emit('show_loader', None, namespace=namespace)
	socketio.sleep(0.1) #to make sure that the above emit is executed

	print('======= receiving data from server ...')
	jsondata = request.get_json()
	#this loop may not be necessary
	# sze = 0
	# while (sze != sys.getsizeof(jsondata)):
	# 	socketio.sleep(0.1)
	# 	sze = sys.getsizeof(jsondata)
	# 	print("======= size of data", sze)
	sze = sys.getsizeof(jsondata)
	print("======= size of data", sze)

	data = json.loads(jsondata)
	print('======= sending data to viewer ...')#,data.keys())
	socketio.emit('input_data', {'status':'start', 'length':len(data)}, namespace=namespace)
	socketio.sleep(0.1) #to make sure that the above emit is executed
	for fname in data:
		print(fname, len(data[fname]))
		output = {fname:data[fname], 'status':'data'}
		socketio.emit('input_data', output, namespace=namespace)
		socketio.sleep(0.1) #to make sure that the above emit is executed
	socketio.emit('input_data', {'status':'done'}, namespace=namespace)
	socketio.sleep(0.1) #to make sure that the above emit is executed

	print('======= done')
	return 'Done'

@app.route("/stream")
def streamer():  
	return render_template("streamer.html", input=json.dumps({'fps':fps}))

@app.route('/stream_input', methods = ['GET','POST'])
def stream_input():
	blob = request.files['image']  # get the image
	blob_binary = blob.read()
	#blob.save('tmp.jpg')
	socketio.emit('update_streamer', blob_binary, namespace=namespace, broadcast = True)

	return 'Done'

# Helper functions to start/stop the server
def startFireflyServer(port=5000, frames_per_second=30, decimation_factor=1):
    old_dir = os.getcwd()
    try:
        os.chdir(os.path.dirname(__file__))
        global fps, dec

        fps = frames_per_second
        dec = decimation_factor

        socketio.run(app, host='0.0.0.0', port=port, use_reloader=True)
    except:
        raise
    finally:
        os.chdir(old_dir)

def reload():
	#currently not used
	if (GUIseparated):
		print('======= reloading GUI')
		socketio.emit('reload_GUI', None, namespace=namespace) 
	print('======= reloading viewer')
	socketio.emit('reload_viewer', None, namespace=namespace)

def spawnFireflyServer(*args):
	## args must be positional, they are 1) port 2) fps 3) decimation_factor
	return subprocess.Popen(["python", __file__]+np.array(args).astype('str').tolist())

def killAllFireflyServers(pid=None):
	if pid is None:
		## kill indiscriminately
		subp = os.system("ps aux | grep 'FireflyFlaskApp.py' | awk '{print $2}' | xargs kill")
	else:
		## kill only the pid we were passed, ideally from the subprocess.Popen().pid but
		##  you know I don't judge.  
		subp = os.kill(pid,signal.SIGINT)
	return subp
