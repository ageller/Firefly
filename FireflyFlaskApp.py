from flask import Flask, render_template, request, session
from flask_socketio import SocketIO, emit

from threading import Lock
import sys
import numpy as np

import json

import os
sys.path.insert(0, os.path.join(os.getcwd(), 'dataReader'))
from firefly_api.reader import SimpleReader

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

#######for Streamer
#passing the rendered texture
@socketio.on('streamer_input', namespace=namespace)
def streamer_input(texture):
	socketio.emit('update_streamer', texture, namespace=namespace)


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
	reader = SimpleReader(fdir, write_jsons_to_disk=False, extension=ftype)
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


if __name__ == "__main__":
	#app.run(host='0.0.0.0')

	#Note: we could have a more sophisticated arg parser, but this is probably fine for now.
	#port as the first input
	args = sys.argv[1:]
	if len(args) >=1:
		port = int(sys.argv[1])
	else:
		port = 5000

	#stream fps as a second input
	if len(args) >=2:
		fps = float(sys.argv[2])
	else:
		fps = 30

	socketio.run(app, debug=True, host='0.0.0.0', port=port)





