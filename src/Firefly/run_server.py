#!/usr/bin/env python
import sys
import os

## make sure we are importing from wherever this file is, rather than the system 
##  installation of Firefly. Saves us devs a lot of confusion and is equivalent 
##  if you're only using a pip installed version
sys.path.insert(0,os.path.abspath(os.path.join(os.getcwd(),'..')))
from Firefly.server import startFireflyServer

def main():
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

	#decimation factor as third input (for reading in files)
	if len(args) >=3:
		dec = float(sys.argv[3])
	else:
		dec = 1

	#socketio.run(app, debug=True, host='0.0.0.0', port=port)
	startFireflyServer(port=port, frames_per_second=fps, decimation_factor=dec)

if __name__ == "__main__":
    main()
	
