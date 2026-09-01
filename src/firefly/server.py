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
import functools
import subprocess
import signal
import socket
import shutil
import requests
import http.server
import socketserver
from importlib.metadata import version as _pkg_version, PackageNotFoundError

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
from firefly.data_reader.reader import ALL_FIELDS

#in principle, we could read in the data here...


app = Flask(__name__)

# Set this variable to "threading", "eventlet" ,"gevent" or "gevent_uwsgi" to test the
# different async modes, or leave it set to None for the application to choose
# the best option based on installed packages.
async_mode = "eventlet" #"eventlet" is WAY better than "threading"

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, async_mode=async_mode)#, max_http_buffer_size=10**9)

try: FIREFLY_VERSION = _pkg_version('firefly')
except PackageNotFoundError: FIREFLY_VERSION = 'unknown'

namespace = '/Firefly'

default_room = 'default_Firefly_AMG_ABG'

## Public mode. A handful of endpoints below accept data or settings from whoever
##  can reach them and push it straight into a live viewer session, which is fine
##  for a local instance driven by the python API but not for a site on the open
##  internet. Turning public mode on refuses those endpoints and keeps a single
##  fixed room so visitors are never prompted for a session name.
##
##  Set FIREFLY_PUBLIC=1 in the environment (this is the one that works for a
##  gunicorn/wsgi deployment, where none of the start* helpers below ever run),
##  or pass --public to the firefly command.
def _env_flag(name):
    return os.environ.get(name,'').strip().lower() in ('1','true','yes','on')

public_mode = _env_flag('FIREFLY_PUBLIC')

def private_endpoint(fn):
    """Refuses the wrapped endpoint while the server is in public mode."""
    @functools.wraps(fn)
    def wrapper(*args,**kwargs):
        if public_mode:
            return (f'This Firefly server is running in public mode; '
                    f'the {request.path} endpoint is disabled.'), 403
        return fn(*args,**kwargs)
    return wrapper

def private_event(fn):
    """The socket-event counterpart of private_endpoint: reports back to the
        browser instead of returning an HTTP status."""
    @functools.wraps(fn)
    def wrapper(*args,**kwargs):
        if public_mode:
            emit_data_error('This Firefly server is running in public mode, so it '
                'will not read data from a path on the server.')
            return
        return fn(*args,**kwargs)
    return wrapper

def emit_data_error(message):
    """Tell the browser why we could not load what it asked for. Anything that
        leaves the splash up needs to say so here, or the user is left watching a
        loading bar that will never move."""
    print('======= data error:',message)
    if request.sid not in rooms: return
    socketio.emit('data_error', {'message':str(message)},
        namespace=namespace, to=rooms[request.sid])

def _is_local_request():
    """Is whoever is asking on the same machine as this server? Used to decide
        whether opening a dialog on the server's own display could be seen."""
    return request.remote_addr in ('127.0.0.1','::1','localhost')

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

# a GUI running in its own window announced itself after joining the room. it may
#  have connected after the viewer already loaded data, in which case everything
#  the viewer sent went nowhere; pass this on so the viewer can resend it.
@socketio.on('gui_connected', namespace=namespace)
def gui_connected():
    if (request.sid in rooms):
        print('======= GUI connected in room', rooms[request.sid])
        socketio.emit('gui_connected', {}, namespace=namespace, to=rooms[request.sid])

#######for Streamer
#passing the rendered texture
#trying with post below because this only seems to work when on the same localhost
# @socketio.on('streamer_input', namespace=namespace)
# def streamer_input(blob):
#     socketio.emit('update_streamer', blob, namespace=namespace)


########reading data from a path on the machine running this server
##  the browser can never hand us an absolute path (no browser API exposes one),
##  so the paths below always come from either the text field, the /browse
##  listing or the native dialog -- all three of which resolve here.

class DataSourceError(Exception):
    """A path we could not make sense of, with a message meant for the user."""
    pass

class NoParticleData(DataSourceError):
    """Nothing in this directory turned out to be particle data. Distinct so that
        detect_data_source can go on to try something else, where a directory that
        does hold data but is missing something reports that instead."""
    pass

## what SimpleReader can open, and the extension to hand it (see HDF5_EXTENSIONS
##  in data_reader/reader.py -- .h5 and .hdf5 are the same format)
READER_EXTENSIONS = {'.hdf5':'.hdf5', '.h5':'.h5', '.csv':'.csv'}

FIREFLY_PARTICLE_EXTENSIONS = ('.ffly','.json')

USE_A_READER = ("Use one of the python readers (e.g. firefly.data_reader.SimpleReader "
    "or ArrayReader) to write a Firefly-formatted directory, then load that.")

def _ffly_npart(fname):
    """Particle count from a .ffly header: u4 header_size, u1 has_velocities,
        u1 has_rgba_colors, u4 npart (see data_reader/binary_writer.py)."""
    import struct
    with open(fname,'rb') as handle: head = handle.read(14)
    if len(head) < 14: raise DataSourceError(f'{os.path.basename(fname)} is not a readable .ffly file.')
    return struct.unpack('<IBBI',head[:10])[3]

def _json_npart(fname):
    """Particle count from a Firefly .json particle file."""
    with open(fname,'r') as handle: data = json.load(handle)
    if 'Coordinates_flat' not in data: raise DataSourceError(
        f'{os.path.basename(fname)} has no Coordinates_flat, so it is not a Firefly particle file.')
    return len(data['Coordinates_flat'])//3

def _group_name_from_filename(fname):
    """Reader output is named <file_prefix><UIname><index>.<ext>, and nothing in
        the file says where the prefix ends, so the whole stem (less the index)
        becomes the group name."""
    stem = os.path.splitext(os.path.basename(fname))[0]
    return stem.rstrip('0123456789') or stem

## a settings file is not optional: applyOptions() in the viewer is what sets up
##  the column density colormap keys, among other things, and nothing else does
SETTINGS_KEYS = ('partsColors','plotNmax','colormapVals','showParts')

def _looks_like_settings(fname):
    """Is this .json the dataset's settings file (Settings.json, whatever prefix
        the reader gave it) rather than particle data?"""
    try:
        with open(fname,'r') as handle: data = json.load(handle)
    except Exception: return False
    return isinstance(data,dict) and any(key in data for key in SETTINGS_KEYS)

def synthesize_manifest(datadir):
    """Build the equivalent of a filenames.json for a directory of bare Firefly
        particle files that has none. Returned to the browser in the socket
        message rather than written to disk -- we never modify the user's data."""
    basename = os.path.basename(datadir)
    manifest = {}
    settings = None
    for fname in sorted(os.listdir(datadir)):
        ext = os.path.splitext(fname)[1].lower()
        if ext not in FIREFLY_PARTICLE_EXTENSIONS: continue
        full = os.path.join(datadir,fname)
        if not os.path.isfile(full): continue
        try:
            npart = _ffly_npart(full) if ext == '.ffly' else _json_npart(full)
        except DataSourceError:
            ## no coordinates: the settings file, or something we don't want
            if settings is None and _looks_like_settings(full):
                settings = os.path.join(basename,fname)
            continue
        except Exception: continue
        if not npart: continue
        group = _group_name_from_filename(fname)
        manifest.setdefault(group,[]).append([os.path.join(basename,fname),npart])

    if not manifest: raise NoParticleData(
        f'No Firefly particle data found in {datadir}. ' + USE_A_READER)

    if settings is None: raise DataSourceError(
        f'{datadir} has particle files but no settings file (Settings.json), which '
        f'Firefly needs to display them. ' + USE_A_READER)
    manifest['options'] = [[settings,0]]

    print('======= synthesized a manifest for',datadir,
        {k:sum(e[1] for e in v) for k,v in manifest.items() if k != 'options'})
    return manifest

def _first_buffer_filename(fname,max_bytes=int(8e6)):
    """The first buffer_filename in an octree's .json, without parsing the whole
        file (they can be large). None if there isn't one."""
    import re
    pattern = re.compile(r'"buffer_filename"\s*:\s*"([^"]+)"')
    tail = ''
    with open(fname,'r') as handle:
        read = 0
        while read < max_bytes:
            chunk = handle.read(1 << 20)
            if not chunk: break
            read += len(chunk)
            match = pattern.search(tail + chunk)
            if match: return match.group(1)
            tail = chunk[-256:] ## in case a match straddles the boundary
    return None

def _holds_an_octree(datadir):
    """Cheap test for octree data, so we don't go scanning the particle files of
        every ordinary .json dataset looking for node filenames."""
    for name in os.listdir(datadir):
        if name == 'octree.json': return True
        if name.endswith('fftree') and os.path.isdir(os.path.join(datadir,name)): return True
    return False

def _check_octree_paths(datadir,manifest):
    """Octree node filenames are written relative to static/data and so begin
        with the dataset directory's name as it was when the octree was built.
        If the directory has been renamed since, every node fetch 404s and the
        viewer waits forever, so refuse it up front with an explanation."""
    if not _holds_an_octree(datadir): return

    basename = os.path.basename(datadir)
    for entries in manifest.values():
        for entry in entries:
            fname = entry[0] if isinstance(entry,(list,tuple)) else entry
            if not fname.lower().endswith('.json'): continue
            full = os.path.join(os.path.dirname(datadir),fname)
            if not os.path.isfile(full): continue
            buffer_filename = _first_buffer_filename(full)
            if buffer_filename is None: continue
            expected = buffer_filename.replace('\\','/').split('/')[0]
            if expected != basename: raise DataSourceError(
                f'This octree was built in a directory named "{expected}" but is now '
                f'in "{basename}", and its node filenames still point at the old name. '
                f'Rename the directory back to "{expected}", or rebuild it: ' + USE_A_READER)
            return ## one node filename is enough to know the directory is intact

def detect_data_source(path):
    """Work out how to load whatever is at path, so the user doesn't have to tell
        us. Returns ('firefly',datadir,manifest_or_None) for data a reader has
        already written (.json/.ffly/octree, served over the /userdata route) or
        ('reader',path,extension) for raw .hdf5/.csv that SimpleReader can open.

        Raises DataSourceError with a message for the user if neither applies."""

    path = path.strip()
    if not path: raise DataSourceError('No path was given.')
    path = os.path.abspath(os.path.expanduser(path))

    if not os.path.exists(path): raise DataSourceError(f'There is no file or directory at {path}.')

    if os.path.isfile(path):
        ext = os.path.splitext(path)[1].lower()
        if ext in READER_EXTENSIONS: return ('reader',path,READER_EXTENSIONS[ext])
        ## a manifest itself is a reasonable thing to pick, so accept it
        if os.path.basename(path) == 'filenames.json': return detect_data_source(os.path.dirname(path))
        raise DataSourceError(
            f'Firefly does not know how to read {os.path.basename(path)}. Pick a '
            f'.hdf5 or .csv file, or a directory of Firefly data. ' + USE_A_READER)

    if not os.access(path,os.R_OK): raise DataSourceError(f'Cannot read {path} (permission denied).')

    contents = os.listdir(path)

    ## already Firefly-formatted: a manifest tells us the groups and counts
    if 'filenames.json' in contents:
        with open(os.path.join(path,'filenames.json'),'r') as handle: manifest = json.load(handle)
        _check_octree_paths(path,manifest)
        return ('firefly',path,None)

    ## a startup.json names one or more dataset directories relative to itself
    if 'startup.json' in contents:
        with open(os.path.join(path,'startup.json'),'r') as handle: startup = json.load(handle)
        dirs = [str(v) for v in startup.values()]
        if len(dirs) == 1:
            ## entries are relative to firefly/static, hence the leading 'data/'
            return detect_data_source(os.path.join(path,os.path.basename(dirs[0].rstrip('/'))))
        raise DataSourceError(
            f'{path} holds a startup.json listing {len(dirs)} datasets. Pick one of '
            f'its dataset directories instead: ' + ', '.join(sorted(dirs)))

    ## raw data files a reader can open
    for ext,reader_ext in READER_EXTENSIONS.items():
        if any(f.lower().endswith(ext) for f in contents): return ('reader',path,reader_ext)

    ## Firefly particle files with no manifest -- we can rebuild one
    if any(os.path.splitext(f)[1].lower() in FIREFLY_PARTICLE_EXTENSIONS for f in contents):
        try:
            manifest = synthesize_manifest(path)
        except NoParticleData:
            manifest = None  ## .json files, but none of them particle data
        if manifest is not None:
            _check_octree_paths(path,manifest)
            return ('firefly',path,manifest)

    ## a common near-miss: they picked the directory that holds their datasets
    ##  rather than one of the datasets
    datasets = sorted(name for name in contents
        if os.path.isdir(os.path.join(path,name))
        and os.path.isfile(os.path.join(path,name,'filenames.json')))
    if datasets: raise DataSourceError(
        f'{path} is not itself a dataset, but it contains {len(datasets)}. '
        f'Pick one of: ' + ', '.join(datasets[:12]) + (', ...' if len(datasets) > 12 else ''))

    raise DataSourceError(
        f'Found nothing Firefly can read in {path} (no filenames.json, and no '
        f'.hdf5, .csv or .ffly files). ' + USE_A_READER)

@socketio.on('load_data_path', namespace=namespace)
@private_event
def load_data_path(message):
    global user_data_dir

    if request.sid not in rooms: return
    room = rooms[request.sid]

    try: kind,path,extra = detect_data_source(message.get('path',''))
    except DataSourceError as error: return emit_data_error(error)
    except Exception as error: return emit_data_error(f'Could not read that path: {error}')

    print('======= showing loader')
    socketio.emit('show_loader', None, namespace=namespace, to=room)
    socketio.sleep(0.1) #to make sure that the above emit is executed

    try:
        if kind == 'reader':
            print(f'======= reading {extra} data from',path)
            ## ALL_FIELDS: whatever scalars the file happens to carry become
            ##  colormap/filter options, since the user never told us what to look for
            reader = SimpleReader(path, write_to_disk=False, extension=extra,
                field_names=ALL_FIELDS, decimation_factor=dec)
            data = json.loads(reader.JSON)
            print('======= have data from file(s), sending to viewer ...')
            socketio.emit('input_data', {'status':'start', 'length':len(data)}, namespace=namespace, to=room)
            socketio.sleep(0.1) #to make sure that the above emit is executed
            for fname in data:
                print(fname, len(data[fname]))
                output = {fname:data[fname], 'status':'data'}
                socketio.emit('input_data', output, namespace=namespace, to=room)
                socketio.sleep(0.1) #to make sure that the above emit is executed
            socketio.emit('input_data', {'status':'done'}, namespace=namespace, to=room)
            socketio.sleep(0.1) #to make sure that the above emit is executed
        else:
            # .ffly and .fftree files are read in javascript, so rather than load
            #  them here we serve the user's directory through flask (see
            #  serve_user_file below) and let the viewer fetch them
            user_data_dir[room] = os.path.dirname(path)
            output = {
                'filepath': f'userdata/{room}/data/{os.path.basename(path)}',
                'prefix': f'userdata/{room}/'}
            ## a directory with no filenames.json of its own; send the one we built
            if extra is not None: output['filenames'] = extra
            print('======= serving',path,'as',output['filepath'])
            socketio.emit('load_ffly_data', output, namespace=namespace, to=room)

        print('======= done')
    except Exception as error:
        emit_data_error(f'Could not load {path}: {error}')


########browsing the server's filesystem, so the user can pick a directory
##  without typing its path. the browser cannot do this for us: no browser API
##  reveals an absolute path, by design.

def _browse_shortcuts():
    """A few places worth starting from, plus the drives on Windows."""
    shortcuts = []
    home = os.path.expanduser('~')
    if os.path.isdir(home): shortcuts.append({'label':'Home','path':home})
    cwd = os.getcwd()
    if os.path.isdir(cwd) and cwd != home: shortcuts.append({'label':'Firefly','path':cwd})
    if sys.platform == 'win32':
        for letter in 'CDEFGHIJKLMNOPQRSTUVWXYZ':
            drive = f'{letter}:\\'
            if os.path.isdir(drive): shortcuts.append({'label':drive,'path':drive})
    return shortcuts

## a directory listing this long is more likely to be a data dump than somewhere
##  the user meant to browse, so stop describing its contents in detail
BROWSE_HINT_LIMIT = 300

def _browse_hint(path,name):
    """Mark the entries worth clicking on, so a data directory is recognizable
        in a long list."""
    full = os.path.join(path,name)
    try: contents = os.listdir(full)
    except OSError: return None
    if 'filenames.json' in contents: return 'firefly'
    if 'startup.json' in contents: return 'startup'
    for entry in contents:
        ext = os.path.splitext(entry)[1].lower()
        if ext in READER_EXTENSIONS or ext == '.ffly': return 'data'
    return None

@app.route('/browse')
@private_endpoint
def browse():
    path = request.args.get('path','')
    path = os.path.abspath(os.path.expanduser(path)) if path.strip() else os.path.expanduser('~')

    response = {
        'shortcuts':_browse_shortcuts(),
        'native':_native_dialog_available() and _is_local_request()}

    if not os.path.isdir(path):
        response['path'] = ''
        response['error'] = f'{path} is not a directory.'
        return json.dumps(response)

    try: contents = sorted(os.listdir(path),key=lambda x: x.lower())
    except OSError as error:
        response['path'] = ''
        response['error'] = f'Cannot open {path}: {error.strerror or error}.'
        return json.dumps(response)

    dirs = [name for name in contents
        if not name.startswith('.') and os.path.isdir(os.path.join(path,name))]
    files = [name for name in contents
        if os.path.splitext(name)[1].lower() in READER_EXTENSIONS]

    parent = os.path.dirname(path.rstrip(os.sep)) or None
    if parent == path: parent = None

    response['path'] = path
    response['parent'] = parent
    response['files'] = files
    response['dirs'] = [{'name':name,
            'hint':_browse_hint(path,name) if len(dirs) <= BROWSE_HINT_LIMIT else None}
        for name in dirs]
    ## does the directory we're looking at hold data itself?
    response['self_hint'] = ('firefly' if 'filenames.json' in contents else
        ('data' if files or any(f.lower().endswith('.ffly') for f in contents) else None))
    return json.dumps(response)


########the OS's own folder dialog, opened on the machine running this server
##  only useful when that is also the machine looking at the browser, so the
##  /browse listing above stays available as the fallback everywhere else.

def _native_dialog_candidates():
    """Ways to raise a folder dialog, best first. Each is a (name,argv) pair
        whose command prints the chosen directory on stdout and nothing (or a
        non-zero status) if the user cancels."""
    candidates = []

    if sys.platform == 'darwin':
        candidates.append(('osascript',['osascript','-e',
            'POSIX path of (choose folder with prompt "Choose a Firefly data directory")']))
    elif sys.platform == 'win32':
        candidates.append(('powershell',['powershell','-NoProfile','-STA','-Command',
            'Add-Type -AssemblyName System.Windows.Forms;'
            '$d = New-Object System.Windows.Forms.FolderBrowserDialog;'
            '$d.Description = "Choose a Firefly data directory";'
            'if ($d.ShowDialog() -eq "OK") { Write-Output $d.SelectedPath }']))

    ## tkinter is in the standard library and works on all three platforms; on
    ##  Linux it needs a display, which is also what zenity/kdialog need
    if sys.platform in ('darwin','win32') or os.environ.get('DISPLAY') or os.environ.get('WAYLAND_DISPLAY'):
        candidates.append(('tkinter',[sys.executable,'-c',
            'import tkinter,tkinter.filedialog as fd;'
            'r = tkinter.Tk(); r.withdraw();'
            'print(fd.askdirectory(title="Choose a Firefly data directory") or "");'
            'r.destroy()']))
        for tool,argv in (
            ('zenity',['zenity','--file-selection','--directory',
                '--title=Choose a Firefly data directory']),
            ('kdialog',['kdialog','--getexistingdirectory','.'])):
            if shutil.which(tool): candidates.append((tool,argv))

    return [(name,argv) for name,argv in candidates
        if name != 'tkinter' or _have_tkinter()]

_tkinter_ok = None
def _have_tkinter():
    global _tkinter_ok
    if _tkinter_ok is None:
        try:
            import tkinter
            _tkinter_ok = True
        except ImportError: _tkinter_ok = False
    return _tkinter_ok

def _native_dialog_available():
    return len(_native_dialog_candidates()) > 0

## how long to leave a dialog open before giving up on it
NATIVE_DIALOG_TIMEOUT = 300 #seconds

def _run_native_dialog():
    """Open the first dialog that works and return the chosen path, or None.

        The dialog blocks for as long as the user takes to answer, so it runs in
        a subprocess we poll through socketio.sleep() -- calling wait() here
        would stall eventlet's single thread and freeze the whole server."""
    for name,argv in _native_dialog_candidates():
        print('======= opening a folder dialog with',name)
        try:
            process = subprocess.Popen(argv,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
        except OSError as error:
            print('======= could not start',name,error)
            continue

        start = time.time()
        while process.poll() is None:
            if (time.time() - start) > NATIVE_DIALOG_TIMEOUT:
                print('======= folder dialog timed out')
                process.kill()
                return None
            socketio.sleep(0.1)

        out = process.stdout.read().decode('utf-8','replace').strip()
        if process.returncode == 0 and out: return out
        ## returned nothing: either the user cancelled or this tool doesn't work
        if process.returncode == 0: return None
    return None

@socketio.on('native_browse', namespace=namespace)
@private_event
def native_browse():
    if request.sid not in rooms: return
    room = rooms[request.sid]

    if not _is_local_request():
        return emit_data_error('A folder dialog would open on the machine running '
            'the Firefly server, which is not this one. Use the directory list instead.')

    try: path = _run_native_dialog()
    except Exception as error: return emit_data_error(f'Could not open a folder dialog: {error}')

    if not path: return   ## cancelled; nothing to report
    socketio.emit('native_browse_result', {'path':path}, namespace=namespace, to=room)


##############

#flask stuff
@app.route("/viewer")
def viewer():
    return render_template("viewer.html", version=FIREFLY_VERSION)

@app.route("/gui")
def gui():
    return render_template("gui.html", version=FIREFLY_VERSION)

@app.route("/")
def default():
    return render_template("default.html", version=FIREFLY_VERSION)
@app.route("/default")
def default1():
    return render_template("default.html", version=FIREFLY_VERSION)
@app.route("/index")
def default2():
    return render_template("default.html", version=FIREFLY_VERSION)

@app.route("/combined")
def combined():
    return render_template("combined.html", version=FIREFLY_VERSION)

@app.route("/VR")
def cardboard():
    return render_template("VR.html", version=FIREFLY_VERSION)

@app.route('/data_input', methods = ['POST'])
@private_endpoint
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
    return render_template("streamer.html", input=json.dumps({'fps':fps}), version=FIREFLY_VERSION)

@app.route('/stream_input', methods = ['GET','POST'])
@private_endpoint
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
@private_endpoint
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
@private_endpoint
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
@private_endpoint
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


# serve data that is outside of the firefly path (used by load_data_path)
@app.route('/userdata/<room>/data/<path:filename>')
@private_endpoint
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
    multiple_rooms=False,
    public=False):
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
    :param public: run in public mode, which disables the endpoints that accept
        data or settings for a live session and keeps a single fixed room so that
        visitors are never prompted for a session name. Equivalent to setting
        FIREFLY_PUBLIC=1 in the environment, defaults to False.
    :type public: bool, optional
    """

    global default_room, public_mode

    _register_server_pid(port)

    if public: public_mode = True

    if (public_mode and multiple_rooms):
        print('======= ignoring multiple_rooms: public mode keeps one fixed room so '
              'visitors are never prompted for a session name')
        multiple_rooms = False

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
    multiple_rooms=False,
    public=False):
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
    :param public: run the server in public mode, see :func:`startFlaskServer`,
        defaults to False
    :type public: bool, optional

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
    if (public):
        args.append(f"--public")

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
