#!/usr/bin/env python
import sys
import os
import http.server
import socketserver

## make sure we are importing from wherever this file is, rather than the system 
##  installation of Firefly. Saves us devs a lot of confusion and is equivalent 
##  if you're only using a pip installed version
sys.path.insert(0,os.path.abspath(os.path.join(os.getcwd(),'..')))
from firefly.server import startFireflyServer

def startHTTPServer(port=5500):
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", port), Handler) as httpd:
        ipadd,port=httpd.server_address
        os.chdir(os.path.dirname(os.path.dirname(__file__)))
        print(f'Serving {os.getcwd()}/index.html at http://{ipadd}:{port}')
        httpd.serve_forever()

def main():
    #app.run(host='0.0.0.0')

    #Note: we could have a more sophisticated arg parser, but this is probably fine for now.
    #port as the first input
    args = sys.argv[1:]

    if len(args) >=1: 
        method = args[0]
        if method not in ['flask','http']: raise ValueError(
            f"second argument method must be one of flask or http, not {method}")
    else: method = 'http'

    if len(args) >=2: port = int(args[1])
    else: port = 5500

    #stream fps as a second input
    if len(args) >=3: fps = float(args[2])
    else: fps = 30

    #decimation factor as third input (for reading in files)
    if len(args) >=4: dec = float(args[3])
    else: dec = 1

    #socketio.run(app, debug=True, host='0.0.0.0', port=port)
    if method == 'flask': startFireflyServer(port=port, frames_per_second=fps, decimation_factor=dec)
    else: startHTTPServer(port)

if __name__ == "__main__":
    main()
    
