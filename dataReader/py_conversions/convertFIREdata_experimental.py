
# coding: utf-8

# # Convert FIRE data
# 
# This script will convert the FIRE .hdf5 files into a .json data files that can be read into Firefly. 
# 
# FIREreader is the class that will allow you to read in files within a directory, create the dictionary, and write out the json files

# In[1]:

from FIREreader import FIREreader
import numpy as np


# ### Set the defaults and create the .json files

# In[3]:

#a user defined function to calculate the radius, usekey must be partRadius
def calcRadius(self, data, snap, p):
    if ('SmoothingLength' in snap[p]):
        #print("calculating SmoothinLength radius", p)
        self.addtodict(data, snap, p, 'SmoothingLength', False, False, usekey="partRadius")

#a user defined function to calculate the weights, usekey must be partWeight
def calcWeight(self, data, snap, p):
    if ('Density' in snap[p]):
        #print("calculating Density weight", p)
        self.addtodict(data, snap, p, 'Density', False, False, usekey="partWeight", mfac = 100000.)


reader = FIREreader()

#modify the defaults here
#reader.directory = "/Users/ageller/Visualizations/Firefly/snapdir_440"
reader.directory = "/Users/ageller/Visualizations/Firefly"
#reader.directory = "/Users/agurvich/research/snaps/Control_G4_20/snapdir_050"
#reader.directory = "/projects/b1026/agurvich/isoDisk/makeNewDisk_tests/rescaled_snonly/rescaled_fiducial/output/"
#reader.directory = "/projects/b1026/agurvich/cosmo/m12i_res7000_latte/output/"

reader.snapnum = 50
#reader.snapnum = 440


reader.returnParts = ['PartType0', 'PartType4']
reader.names = {'PartType0':'Gas', 
                  'PartType1':'HRDM', 
                  'PartType2':'LRDM', 
                  'PartType4':'Stars' }

#define the defaults; this must be run first if you want to change the defaults below
reader.defineDefaults()

decimate = [1., 1.]

for i,p in enumerate(reader.returnParts):
    reader.decimate[p] = decimate[i]
    reader.returnKeys[p] = ['Coordinates', 'Density','Velocities']
    reader.addFilter[p] = [False, True, False]
    reader.dolog[p] = [False, True, False]
    reader.domag[p] = [False, False, False]#NOTE: calculating the magnitudes takes time. (I calculate magnitude of velocity, if Velocities is supplied, in the web app)..

#    reader.radiusFunction[p] = calcRadius #currently not implemented in the web app
    reader.sizeMult[p] = 0.01
    reader.nMaxPlot[p] = 1e10

#    reader.weightFunction[p] = calcWeight #currently not implemented in the web app
    
#     pp = reader.names[p]
#     reader.options['UIdropdown'][pp] = 1
#     reader.options['UIcolorPicker'][pp] = 0
    
reader.colors = {'PartType0': [1., 0., 0., 1.],  
           'PartType1': [1., 1., 0., 0.1],  
           'PartType2': [1., 1., 0., 0.1],  
           'PartType4': [0., 0., 1., 0.1] } 

        
reader.showkeys = False

#good starting point for snap050
reader.options['center'] = np.array([0., 0., 0.])
#reader.options['camera'] = np.array([-55.11, -21.17, -43.34])

#reader.options['UI'] = False
#reader.options['cameraRotation'] = np.array([2.138, -0.911, -0.704])


#make the file
reader.run()





# ## Testing IFrames for the WebGL application
# #### Not clear how to get the SimpleHTTPServer to run (or if it's even necessary)

# In[8]:

import os
import signal
import subprocess
#directory = "/Users/ageller/Visualizations/Firefly/WebGLonFIRE/threejs/onGitHub/Firefly"
directory = "/Users/agurvich/research/repos/Firefly_threejs"

cmd = "pushd " + directory + " ; python -m SimpleHTTPServer; popd"
pro = subprocess.Popen(cmd, stdout = subprocess.PIPE, shell = True, preexec_fn = os.setsid) 


# In[1]:

from IPython.display import IFrame

url = "http://localhost:8000/"
IFrame(url, width=700, height=700)


# In[6]:

os.killpg(os.getpgid(pro.pid), signal.SIGTERM)  # Send the signal to all the process groups


# In[ ]:



