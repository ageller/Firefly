# to run locally for development
# Note: if you have installed the pypi version of firefly previously, you must uninstall it first 
#   (and/or create a new conda env)
# $ pip install -e .
# $ firefly --method="flask" --directory="/foo/bar/Firefly/src/firefly"


import os
import sys
import json
import time
import atexit
import subprocess
import signal
import socket
import requests
import http.server
import socketserver

try:
    import fcntl # used to lock the PID file against concurrent writers; POSIX only
except ImportError:
    fcntl = None

import numpy as np

from flask import Flask, Response, abort, render_template, request, session, current_app, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room

from eventlet import event
from eventlet.timeout import Timeout

from firefly.data_reader import SimpleReader

#in principle, we could read in the data here...


app = Flask(__name__)

# Set this variable to "threading", "eventlet" ,"gevent" or "gevent_uwsgi" to test the
# different async modes, or leave it set to None for the application to choose
# the best option based on installed packages.
async_mode = "eventlet" #"eventlet" is WAY better than "threading"

app = Flask(__name__) 
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, async_mode=async_mode)#, max_http_buffer_size=10**9)

namespace = '/Firefly'

default_room = 'default_Firefly_AMG_ABG'

rooms = {} #will be updated below

user_data_dir = {} # will be populated when the room is defined

#for the stream
fps = 30

#decimation
dec = 1

#check if the GUI is separated to see if we need to send a reload signal (currently not used)
GUIseparated = False

events = {}



####### setting the room (to keep each session distinct)
@socketio.on('join', namespace=namespace)
def on_join(message):
    global rooms
    # join the room
    room = message['room']
    rooms[request.sid] = room
    print('======= in room', room)
    join_room(room)


# This will probalby never fire
@socketio.on('leave', namespace=namespace)
def on_leave(message):
    print(f'======= sid {request.sid} left room {rooms[request.sid]}', )
    leave_room(message['room'])

# this should fire when a user closes/refreshes their browser
@socketio.on('disconnect', namespace=namespace)
def disconnect():
    if (request.sid in rooms):
        print(f'======= sid {request.sid} disconnected from room {rooms[request.sid]}', )
    # remove this room from the dict
    rooms.pop(request.sid, None)

# will fire when user connects
@socketio.on('connect', namespace=namespace)
def connect():
    print("======= socket connected")
    emit('room_check',{'room': default_room}, namespace=namespace)


# testing the connection
@socketio.on('connection_test', namespace=namespace)
def connection_test(message):
    print('======= connected', message)
    # session['receive_count'] = session.get('receive_count', 0) + 1
    # emit('connection_response',{'data': message['data'], 'count': session['receive_count']}, namespace=namespace, to=rooms[request.sid])


######for viewer
#will receive data for viewer 
@socketio.on('viewer_input', namespace=namespace)
def viewer_input(message):
    if (request.sid in rooms):
        socketio.emit('update_viewerParams', message, namespace=namespace, to=rooms[request.sid])

#######for GUI
#will receive data for gui
@socketio.on('gui_input', namespace=namespace)
def gui_input(message):
    if (request.sid in rooms):
        socketio.emit('update_GUIParams', message, namespace=namespace, to=rooms[request.sid])


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


########reading in a directory of hdf5, csv or ffly files
@socketio.on('input_otherType', namespace=namespace)
def input_otherType(fileinfo):
    global user_data_dir

    print('======= showing loader')
    socketio.emit('show_loader', None, namespace=namespace, to=rooms[request.sid])
    socketio.sleep(0.1) #to make sure that the above emit is executed

    # fdir = os.path.join(os.getcwd(),'static','data',filedir)
    fdir = fileinfo['filepath'].strip()
    ftype = fileinfo['filetype']
    
    try:

        print('======= have input '+ftype+' data file(s) in', fdir)
        if (ftype == '.csv' or ftype == '.hdf5'):
            reader = SimpleReader(fdir, write_to_disk=False, extension=ftype, decimation_factor=dec)
            data = json.loads(reader.JSON)
            print('======= have data from file(s), sending to viewer ...')
            socketio.emit('input_data', {'status':'start', 'length':len(data)}, namespace=namespace, to=rooms[request.sid])
            socketio.sleep(0.1) #to make sure that the above emit is executed
            for fname in data:
                print(fname, len(data[fname]))
                output = {fname:data[fname], 'status':'data'}
                socketio.emit('input_data', output, namespace=namespace, to=rooms[request.sid])
                socketio.sleep(0.1) #to make sure that the above emit is executed
            socketio.emit('input_data', {'status':'done'}, namespace=namespace, to=rooms[request.sid])
            socketio.sleep(0.1) #to make sure that the above emit is executed
        else:
            # since the ffly files need to be read via javascript (is there a python way?), serve the data via flask in the user's directory
            room = rooms[request.sid]
            user_data_dir[room] = os.path.dirname(fdir)
            output = {"filepath": f"userdata/{room}/data/{os.path.basename(fdir)}", "prefix":f"userdata/{room}/"}
            socketio.emit('load_ffly_data', output, namespace=namespace, to=room)
            
        print('======= done')
    except:
        socketio.emit('cannot_load_data', None, namespace=namespace, to=rooms[request.sid])


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
    return render_template("default.html")
@app.route("/default")
def default1(): 
    return render_template("default.html")
@app.route("/index")
def default2(): 
    return render_template("default.html")

@app.route("/combined")
def combined(): 
    return render_template("combined.html")

@app.route("/VR")
def cardboard(): 
    return render_template("VR.html")

@app.route('/data_input', methods = ['POST'])
def data_input():
    print('======= receiving data from server ...')
    jsondata = request.get_json()

    sze = sys.getsizeof(jsondata)
    print("======= size of data", sze)

    data = json.loads(jsondata)

    if ('room' in data):
        ## need to remove it from the request because we don't want to send it to 
        ##  the firefly instance on the other side, just need to identify the socket.
        room = data.pop('room')
    else:
        room = default_room

    if (room):

        print('======= showing loader')
        socketio.emit('show_loader', None, namespace=namespace, to=room)
        socketio.sleep(0.1) #to make sure that the above emit is executed

        print('======= sending data to viewer ...')#,data.keys())
        socketio.emit('input_data', {'status':'start', 'length':len(data)}, namespace=namespace, to=room)
        socketio.sleep(0.1) #to make sure that the above emit is executed
        for fname in data:
            print(fname, len(data[fname]))
            output = {fname:data[fname], 'status':'data'}
            socketio.emit('input_data', output, namespace=namespace, to=room)
            socketio.sleep(0.1) #to make sure that the above emit is executed
        socketio.emit('input_data', {'status':'done'}, namespace=namespace, to=room)
        socketio.sleep(0.1) #to make sure that the above emit is executed

        print('======= done')
        return 'Done'
    else:
        print('User must specify a name for the websocket "room" connected to an active firefly instance.')
        return 'Error'

@app.route("/stream")
def streamer():  
    return render_template("streamer.html", input=json.dumps({'fps':fps}))

@app.route('/stream_input', methods = ['GET','POST'])
def stream_input():
    # get the image
    blob = request.files['image']  
    blob_binary = blob.read()
    #blob.save('tmp.jpg')

    # get the room
    room = request.form['room']

    socketio.emit('update_streamer', blob_binary, namespace=namespace,  to=room) #broadcast = True,

    return 'Done'

@app.route('/get_settings', methods = ['GET'])
def get_settings():
    global events
    events = {}
    print('======= received request for settings from user')

    # I have not tested to make sure this works with passing a room
    room = request.args.get('room')
    if (not room):
        room = default_room

    waitTime = request.args.get('timeout')
    if (not waitTime):
        waitTime = 10 #seconds

    try:
        print('======= gettings settings data')
        
        # send a request to JS to return the settings
        socketio.emit('output_settings', {'data':None}, namespace=namespace, to=room)

        # wait for the settings to come back
        timeout = Timeout(waitTime)
        try:
            e = events[room] = event.Event()
            resp = e.wait()
        except Timeout:
            print('!!!!!!!!!!!!!!! TIMEOUT')
            return Response('Timeout.  Please increase the waitTime using the params keyword', status = 504)
            # abort(504)
        finally:
            events.pop(room, None)
            timeout.cancel()

        return json.dumps(resp)

    except:
        print('!!!!!!!!!!!!!!! ERROR')
        return Response('Unknown error.  Please try again', status = 500)
    
# receive settings from JS and send it back via events to the GET location below  
@socketio.on('send_settings', namespace=namespace)
def send_settings(message):
    try:
        e = events[message['room']]
        e.send(message['settings'])
    except:
        pass


@app.route('/post_settings', methods = ['POST'])
def post_settings():
    print('======= received settings from server ...')
    jsondata = request.get_json()
    data = json.loads(jsondata)
    settings = data['settings']

    if ('room' in data):
        room = data['room']
    else:
        room = default_room

    if (room):
        socketio.emit('input_settings', settings, namespace=namespace, to=room)
        print('======= done')
        return 'Done'
    else:
        print('User must specify a name for the websocket "room" connected to an active firefly instance.')
        return 'Error'

@app.route('/get_selected_data', methods = ['GET'])
def get_selected_data():
    global events
    events = {}
    print('======= received request for selected data from user')

    # I have not tested to make sure this works with passing a room
    room = request.args.get('room')
    if (not room):
        room = default_room
    
    waitTime = request.args.get('waitTime')
    if (not waitTime):
        waitTime = 10 #seconds

    try:
        print(f'======= gettings selected data, waiting {waitTime}s')
        
        # send a request to JS to return the settings
        socketio.emit('output_selected_data', {'data':None}, namespace=namespace, to=room)

        # wait for all the data to come back
        timeout = Timeout(int(waitTime))
        try:
            e = events[room] = event.Event()
            resp = e.wait()
        except Timeout:
            print('!!!!!!!!!!!!!!! TIMEOUT')
            resp = selectedData
            if isinstance(resp, dict):
                resp['warning'] = (f'Timeout reached after {waitTime}s before all selected data arrived; '
                                    'returning partial data. Increase the waitTime parameter to receive the full dataset.')
        finally:
            events.pop(room, None)
            timeout.cancel()

        return json.dumps(resp)

    except:
        print('!!!!!!!!!!!!!!! ERROR')
        return Response('Unknown error.  Please try again', status = 500)


# serve data that is outside of the firefly path (used in input_otherType)
@app.route('/userdata/<room>/data/<path:filename>')
def serve_user_file(room, filename):
    global user_data_dir
    if room not in user_data_dir:
        return "room not found", 404
    if user_data_dir is None:
        return "No data directory selected", 400
    
    data_dir = user_data_dir[room] 

    # Prevent path traversal
    safe_path = os.path.abspath(os.path.join(data_dir, filename))
    if not safe_path.startswith(os.path.abspath(data_dir)):
        return "Access denied", 403
    
    return send_from_directory(data_dir, filename)
    


def compileData(current, new, keyList):

    def getPath(dataDict, path):
        # https://stackoverflow.com/questions/59323310/python-get-pointer-to-an-item-in-a-nested-dictionary-list-combination-based-on-a
        insertPosition = dataDict
        for k in path:
            insertPosition = insertPosition[k]
        return insertPosition
    
    getPath(current, keyList).extend(new)

    return current


# receive selecte data from JS and send it back via events to the GET location below  
selectedData = {}
@socketio.on('send_selected_data', namespace=namespace)
def send_selected_data(message):
    global selectedData
    # print('have', message['pass'], message['keyList'], message['done'])
    try:
        e = events[message['room']]

        # the first pass should be for the data structure
        if (message['pass'] == 'structure'):
            selectedData = message['data']
            # print('data structure = ', data)
        
        if (message['pass'] == 'data'):
            try:
                selectedData = compileData(selectedData, message['data'], message['keyList'])
            except:
                print('error compiling data', message['keyList'], message['done'])
        if (message['done']):
            e.send(selectedData)
    except:
        pass  
      
def reload():
    #currently not used
    if (GUIseparated):
        print('======= reloading GUI')
        socketio.emit('reload_GUI', None, namespace=namespace, to=rooms[request.sid]) 
    print('======= reloading viewer')
    socketio.emit('reload_viewer', None, namespace=namespace, to=rooms[request.sid])

@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

######## PID tracking, so quitAllFireflyServers can find every Firefly
######## server process regardless of how it was launched (CLI or
######## spawnFireflyServer), including both the Werkzeug reloader's
######## supervisor process and its worker child.
PID_FILE = os.path.join(os.path.expanduser('~'), '.firefly', 'server_pids.json')

def _with_pid_file_lock(fn):
    # guards against the reloader's parent + child (or multiple servers)
    # registering/deregistering at nearly the same time
    os.makedirs(os.path.dirname(PID_FILE), exist_ok=True)
    if fcntl is None: return fn()
    with open(PID_FILE + '.lock', 'w') as lockfile:
        fcntl.flock(lockfile, fcntl.LOCK_EX)
        try: return fn()
        finally: fcntl.flock(lockfile, fcntl.LOCK_UN)

def _read_pid_entries():
    if not os.path.exists(PID_FILE): return []
    try:
        with open(PID_FILE, 'r') as f: return json.load(f)
    except (json.JSONDecodeError, OSError): return []

def _write_pid_entries(entries):
    os.makedirs(os.path.dirname(PID_FILE), exist_ok=True)
    with open(PID_FILE, 'w') as f: json.dump(entries, f)

def _is_firefly_process(pid):
    # confirm the pid is alive and still looks like a Firefly server, so a
    # stale/reused pid never gets treated as one of ours
    if not isinstance(pid, int): return False
    try: os.kill(pid, 0)
    except OSError: return False
    try:
        with open(f'/proc/{pid}/cmdline', 'rb') as f:
            return b'firefly' in f.read().lower()
    except OSError:
        return True # non-Linux: no /proc, fall back to the liveness check alone

def _register_server_pid(port):
    def register():
        entries = _read_pid_entries()
        entries.append({'pid': os.getpid(), 'port': port, 'started': time.time()})
        _write_pid_entries(entries)
    _with_pid_file_lock(register)

    def deregister():
        def _remove():
            remaining = [e for e in _read_pid_entries() if e.get('pid') != os.getpid()]
            _write_pid_entries(remaining)
        _with_pid_file_lock(_remove)
    atexit.register(deregister)

# Helper functions to start/stop the server
def startFlaskServer(
    port=5500,
    directory=None,
    frames_per_second=30,
    decimation_factor=1,
    multiple_rooms=False):
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
    :param multiple_rooms: allow multiple rooms? If True, the user will be prompted in the browser to enter 
        a string to define the room for the given session (which would allow multiple users to interact with 
        separate Firefly instances on a server), defaults to False.
    :type multiple_rooms: bool, optional
    """

    global default_room

    _register_server_pid(port)

    if (multiple_rooms): default_room = None
    if (directory is None or directory == "None"): directory = os.path.dirname(__file__)

    old_dir = os.getcwd()
    try:
        print(f"Launching Firefly at: http://localhost:{port}")

        os.chdir(directory)
        if (directory is not None and directory != "None"):
            print(f"from directory {directory}")
            app.static_folder = os.path.join(directory, 'static')
            app.template_folder = os.path.join(directory, 'templates')

        global fps, dec

        fps = frames_per_second
        dec = decimation_factor

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

    _register_server_pid(port)

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
    max_time=10,
    multiple_rooms=False):
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
     :param multiple_rooms: allow multiple rooms? If True, the user will be prompted in the browser to enter 
        a string to define the room for the given session (which would allow multiple users to interact with 
        separate Firefly instances on a server), defaults to False.
    :type multiple_rooms: bool, optional

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
    if (multiple_rooms):
        args.append(f"--multiple_rooms")

    ## use this run_server.py (even if the other directory has one)
    ##  since it can be run remotely
    run_server = os.path.join(os.path.dirname(__file__),'bin','firefly')
    process = subprocess.Popen([sys.executable, run_server]+args)

    init_time = time.time()
    ## check if port is in use
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        print(
            "Waiting up to %d seconds for background Firefly server to start..."%max_time,
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
    """Quit python processes associated with hosting Firefly web-servers.

    Reads the pids that Firefly servers register with themselves in
    ``PID_FILE`` when they start (covers every launch method -- the ``firefly``
    CLI or :func:`spawnFireflyServer` -- and both the Werkzeug reloader's
    supervisor process and its worker child), confirms each one is still alive
    and still actually looks like a Firefly process, then terminates it
    (escalating to SIGKILL if it doesn't exit promptly).

    :param pid: process id to quit, defaults to None, quitting all registered
        Firefly server processes. If given, only this pid is quit, and only
        after confirming it is a live, registered Firefly process.
    :type pid: int, optional
    :return: the pids that were actually signaled
    :rtype: list
    """
    print("Server output:")
    print("--------------")

    entries = _read_pid_entries()
    targets = entries if pid is None else [e for e in entries if e.get('pid') == pid]

    killed = []
    for entry in targets:
        target_pid = entry.get('pid')
        if target_pid is None or not _is_firefly_process(target_pid):
            continue

        print(f"Stopping Firefly server (pid {target_pid}, port {entry.get('port')})")
        try:
            os.kill(target_pid, signal.SIGTERM)
        except OSError:
            continue

        # give it a moment to shut down gracefully before escalating
        for _ in range(10):
            if not _is_firefly_process(target_pid): break
            time.sleep(0.2)
        else:
            try: os.kill(target_pid, signal.SIGKILL)
            except OSError: pass

        killed.append(target_pid)

    # sweep the whole file (not just what this call targeted) and drop any
    # entry whose pid is no longer alive or no longer looks like a Firefly
    # process -- covers processes that died/were killed some other way
    # (e.g. SIGKILL, a crash) and never got to deregister themselves
    def _prune():
        remaining = [e for e in _read_pid_entries() if _is_firefly_process(e.get('pid'))]
        _write_pid_entries(remaining)
    _with_pid_file_lock(_prune)

    if not killed: print("No running Firefly server processes found.")
    return killed
