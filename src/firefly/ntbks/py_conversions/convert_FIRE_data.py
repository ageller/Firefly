#!/usr/bin/env python
# coding: utf-8

# In[1]:


get_ipython().run_line_magic('load_ext', 'autoreload')
get_ipython().run_line_magic('autoreload', '2')


# In[2]:


import numpy as np
import os

import sys
## ignore these lines, you do not need to add this if Firefly is pip installed into your PYTHONPATH
sys.path.insert(0, '/Users/ageller/VISUALIZATIONS/Firefly')
sys.path.insert(0,'/Users/agurvich/research/repos/firefly/src')
from firefly.data_reader import FIREreader,SimpleFIREreader,TweenParams
from abg_python.galaxy.gal_utils import Galaxy


# # Convert FIRE data
# In this example notebook we demonstrate how to use the `firefly.data_reader.FIREreader` sub-class which creates specialized data files for FIRE formatted data. The details of how the `FIREreader` class is "specialized" see the <a href="https://alexbgurvi.ch/Firefly/docs/build/html/reference/api/api.html">API documentation</a> and to see the example of this output visit <a href="https://alexbgurvi.ch/firefly/src/firefly/index.html">the live demo version</a>.

# In[3]:


galaxy = Galaxy('m12b_res57000',600)
galaxy.extractMainHalo(use_saved_subsnapshots=False)


# In[4]:


thetas = np.linspace(0,360,1000)/180*np.pi
coords = np.zeros((thetas.size,3))
coords[:,0] = 0
coords[:,1] = np.cos(thetas)
coords[:,2] = np.sin(thetas)
coords*=150
my_tweenParams = TweenParams(coords,30) ## dt = 3000 ms between frames


# In[5]:


## create a FIRE reader object
reader = FIREreader(
    ## path to directory containing (optionally multiple) .hdf5 files
    snapdir = "/Users/agurvich/research/snaps/metal_diffusion/m12b_res57000/output/",
    ## the snapshot number, best to provide separately in order to disambiguate
    snapnum = 600,
    ## particle types one would like to extract from .hdf5 files
    ptypes=[0,4,1,2],
    ## what to call them in the UI
    UInames=['Gas','Stars','HRDM','LRDM'],
    ## by what factor would we like to reduce the data for performance stability and disk space concerns
    decimation_factors=[10,10,10,10],
    ## what fields would we like to extract
    fields=['Density','Temperature','AgeGyr','GCRadius'],
    ## do we want to take the magnitude of any of these fields?
    ## do we want to take the log? 
    logFlags=[True,True,False,False],
    ## which fields do we want to be able to filter on?
    filterFlags=[True,True,True,True],
    ## which fields do we want to be able to colormap by?
    colormapFlags=[True,True,True,True],
    radiusFlags=[False,True,True,False],
    ## where should the output .json files be saved to? 
    ##  if a relative path is given, like here, saves to $HOME/<JSONdir>
    ##  and creates a soft-link to firefly/static/data
    JSONdir=os.path.abspath(os.path.join(os.getcwd(),'..','static','data','FIRESampleData')),
    ## overwrite the existing startup.json file
    write_startup=True,
    tweenParams=my_tweenParams)

## fetch data from .hdf5 files
reader.loadData(com=galaxy.scom,vcom=galaxy.sub_snap['vscom'])


# In[6]:


## initialize the camera view
camera = np.array([251,-117,82])
camera = camera/np.linalg.norm(camera)*250
reader.settings['camera'] = camera

## set the initial colors of each of the particle groups
reader.settings['color']['Gas']=[1,0,0,1]
reader.settings['color']['Stars'] = [1,1,1,0.025]
reader.settings['color']['HRDM'] = [0.5,0,0.5,1]
reader.settings['color']['LRDM'] = [0.5,0,0.5,1]

## set the sizes of each of the particle groups
reader.settings['sizeMult']['Gas']=0.25
reader.settings['sizeMult']['Stars']=0.1
reader.settings['sizeMult']['HRDM']=1
reader.settings['sizeMult']['LRDM']=1


# In[7]:


## initialize the gas with a colormap
reader.settings['showColormap']['Gas'] = True
reader.settings['colormapVariable']['Gas'] = 3
reader.settings['colormapLims']['Gas']['Velocity'] = [50,500]
reader.settings['colormapVals']['Gas']['Velocity'] = [50,500]

## initialize the gas with radius scaling (index 1 corresponds to Temperature, specified above)
reader.settings['radiusVariable']['Gas'] = 1

## initialize gas with velocity vectors
reader.settings['showVel']['Gas'] = True
reader.settings['velType']['Gas'] = 'arrow'

## initialize HRDM with a filter excluding the center so as not to crowd the view
reader.settings['filterVals']['HRDM']['GCRadius'] = [300,5000]
reader.settings['filterLims']['HRDM']['GCRadius'] = [0,5000]


# In[8]:


## dump output to .ffly files
reader.writeToDisk()


# ## Using `firefly.data_reader.SimpleFIREreader`
# To simplify this process we have provided `firefly.data_reader.SimpleFIREreader` which takes a path to a FIRE snapshot and creates a basic iteration of Firefly showing the gas and stars given only a path to the data.

# In[9]:


reader = SimpleFIREreader(
    ## path to directory containing (optionally multiple) .hdf5 files
    path_to_snapshot = "/Users/agurvich/research/snaps/metal_diffusion/m12b_res57000/output/snapdir_600",
    ## overwrite the existing startup.json file
    write_startup=True, 
    ## pass absolute path to avoid symlink
    JSONdir=os.path.abspath(os.path.join(os.getcwd(),'..','static','data','FIREData_50')))

