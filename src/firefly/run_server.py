#!/usr/bin/env python
import sys
import os
import getopt

## make sure we are importing from wherever this file is, rather than the system 
##  installation of Firefly. Saves us devs a lot of confusion and is equivalent 
##  if you're only using a pip installed version
sys.path.insert(0,os.path.abspath(os.path.join(os.getcwd(),'..')))
from firefly.server import startHTTPServer, startFlaskServer

def main(
    port=5500,
    method='http',
    directory=None,
    dec=1,
    fps=30):
    """Creates a global interpreter locked process to host either a Flask 
        or HTTP server that can be accessed via localhost:<port>. 

    :param port: port number to serve the :code:`.html` files on, defaults to 5500
    :type port: int, optional
    :param method: what sort of Firefly server to open, a Flask ("flask") server 
        or an HTTP ("http"), defaults to "flask"
    :type method: str, optional
    :param directory: the directory of the Firefly source files to be served, 
        if None, uses `os.dirname(__file__)` i.e. the directory of the `firefly`
        python distribution, defaults to None
    :type directory: str, optional
    :param fps: enforced FPS for stream quality, used only if
		localhost:<port>/stream is accessed, defaults to 30
    :type fps: int, optional
    :param dec: factor to decimate data that is being passed through
		localhost:<port>/data_input, defaults to 1
    :type dec: int, optional
    """

    if method not in ['flask','http']: raise ValueError(
        f"method must be one of flask or http, not {method}")

    if method == 'flask': startFlaskServer(port,directory,fps,dec)
    else: startHTTPServer(port,directory)

if __name__ == '__main__':
    argv = sys.argv[1:]
    opts,args = getopt.getopt(
        argv,'',[
        'method=',
        'port=',
        'directory=',
        'dec=',
        'fps='])
    for i,opt in enumerate(opts):
        if opt[1]=='':
            opts[i]=('mode',opt[0].replace('-',''))
        else:
            try:
                ## if it's an int or a float this should work
                opts[i]=(opt[0].replace('-',''),eval(opt[1]))
            except:
                ## if it's a string... not so much
                opts[i]=(opt[0].replace('-',''),opt[1])
    main(**dict(opts))