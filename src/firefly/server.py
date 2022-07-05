import os
import sys
import json
import time
import subprocess
import signal
import socket
import requests
import http.server
import socketserver

import numpy as np

from flask import Flask, render_template, request, session
from flask_socketio import SocketIO, emit
from threading import Lock

from firefly.data_reader import SimpleReader

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
#     socketio.emit('update_streamer', blob, namespace=namespace)


########reading in a directory of hdf5 or csv files
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
    reader = SimpleReader(fdir, write_to_disk=False, extension=ftype, decimation_factor=dec)
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

@app.route("/VR")
def cardboard(): 
    return render_template("VR.html")

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
    #     socketio.sleep(0.1)
    #     sze = sys.getsizeof(jsondata)
    #     print("======= size of data", sze)
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

def reload():
    #currently not used
    if (GUIseparated):
        print('======= reloading GUI')
        socketio.emit('reload_GUI', None, namespace=namespace) 
    print('======= reloading viewer')
    socketio.emit('reload_viewer', None, namespace=namespace)

# Helper functions to start/stop the server
def startFlaskServer(
    port=5500,
    directory=None,
    frames_per_second=30,
    decimation_factor=1,
    ):
    """Creates a global interpreter locked process to host a Flask server
        that can be accessed via localhost:<port>. 

    :param port: port number to serve the :code:`.html` files on, defaults to 5500
    :type port: int, optional
    :param frames_per_second: enforced FPS for stream quality, used only if
        localhost:<port>/stream is accessed, defaults to 30
    :type frames_per_second: int, optional
    :param decimation_factor: factor to decimate data that is being passed through
        localhost:<port>/data_input, defaults to 1
    :type decimation_factor: int, optional
    """

    if directory is None: directory = os.path.dirname(__file__)
    old_dir = os.getcwd()
    try:
        os.chdir(directory)
        global fps, dec

        fps = frames_per_second
        dec = decimation_factor

        print("Launching Firefly at: http://localhost:%d"%port)
        socketio.run(app, host='0.0.0.0', port=port, use_reloader=True)
    except: raise
    finally: os.chdir(old_dir)

def startHTTPServer(port=5500,directory=None):
    """Creates a global interpreter locked process to host either a Flask 
        or HTTP server that can be accessed via localhost:<port>. 

    :param port: port number to serve the :code:`.html` files on, defaults to 5500
    :type port: int, optional
    :param directory: the directory of the Firefly source files to be served, 
        if None, uses `os.dirname(__file__)` i.e. the directory of the `firefly`
        python distribution, defaults to None
    :type directory: str, optional
    """

    if directory is None: directory = os.path.dirname(__file__)
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", port), Handler) as httpd:
        ipaddress,port=httpd.server_address
        os.chdir(directory)
        print(f'Serving {os.getcwd()}/index.html at http://{ipaddress}:{port}')
        httpd.serve_forever()

def spawnFireflyServer(
    port=5500,
    method="flask",
    directory=None,
    frames_per_second=30,
    decimation_factor=1,
    max_time=10):
    """ Starts a Firefly server as a background process. Close the server by calling
        :func:`firefly.server.quitAllFireflyServers`.

    :param port: port number to serve the :code:`.html` files on, defaults to 5500
    :type port: int, optional
    :param method: what sort of Firefly server to open, a Flask ("flask") server 
        or an HTTP ("http"), defaults to "flask"
    :type method: str, optional
    :param directory: the directory of the Firefly source files to be served, 
        if None, uses `os.dirname(__file__)` i.e. the directory of the `firefly`
        python distribution, defaults to None
    :type directory: str, optional
    :param frames_per_second: enforced FPS for stream quality, used only if
        localhost:<port>/stream is accessed, defaults to 30
    :type frames_per_second: int, optional
    :param decimation_factor: factor to decimate data that is being passed through
        localhost:<port>/data_input, defaults to 1
    :type decimation_factor: int, optional
    :param max_time: maximum amount of time to wait for a Firefly server
        to be available. 
    :type max_time: float, optional
    :return: subprocess.Popen
    :rtype: subprocess handler
    :raises RuntimeError: if max_time elapses without a successful Firefly server being initialized.
    """

    port = int(port)

    ## wrap passed arguments into a list of strings
    args = [
        f"--port={port:d}",
        f"--fps={int(frames_per_second):d}",
        f"--dec={int(decimation_factor):d}",
        f"--method={method}",
        f"--directory={directory}"]

    ## use this run_server.py (even if the other directory has one)
    ##  since it can be run remotely
    run_server = os.path.join(os.path.dirname(__file__),'run_server.py')
    process = subprocess.Popen([sys.executable, run_server]+args)

    init_time = time.time()
    ## check if port is in use
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        print(
            "Waiting up to %d seconds for background Firefly server to start"%max_time,
            end="")
        while True:
            try: requests.post(f'http://localhost:{port:d}',json="test"); break
            except: 
            ## need to re-check the connection each iteration
                if time.time()-init_time >= max_time: raise RuntimeError(
                    "Hit max wait-time of %d seconds."%max_time+
                    " A Firefly server could not be opened in the background.")
                else: print(".",end=""); time.sleep(1)
            
    print(f"done! Your server is available at - http://localhost:{port}")

    return process

def quitAllFireflyServers(pid=None):
    """Quit python processes associated with hosting Flask web-servers.

    :param pid: process id to kill, defaults to None, quitting all processes
    :type pid: int, optional
    :return: return_code
    :rtype: int 
    """
    print("Server output:")
    print("--------------")
    ## kill indiscriminately
    if pid is None: return_code = os.system("ps aux | grep 'run_server.py' | awk '{print $2}' | xargs kill")
    ## kill only the pid we were passed, ideally from the subprocess.Popen().pid but
    ##  you know I don't judge.  
    else: return_code = os.kill(pid,signal.SIGINT)
    return return_code