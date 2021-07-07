#!/usr/bin/env python
# coding: utf-8

# In[1]:


get_ipython().run_line_magic('load_ext', 'autoreload')
get_ipython().run_line_magic('autoreload', '2')


# In[2]:


import numpy as np
import os

import sys
sys.path.insert(0, '/Users/ageller/VISUALIZATIONS/Firefly')
sys.path.insert(0,'/Users/agurvich/research/repos/Firefly/src')
from Firefly.data_reader import FIREreader,SimpleFIREreader


# # Convert FIRE data
# In this example notebook we demonstrate how to use the `Firefly.data_reader.FIREreader` sub-class which creates specialized data files for FIRE formatted data. The details of how the `FIREreader` class is "specialized" see the <a href="https://ageller.github.io/Firefly/docs/build/html/reference/api/api.html">API documentation</a> and to see the example of this output visit <a href="https://ageller.github.io/Firefly/src/Firefly/index.html">the live demo version</a>.

# In[3]:


## create a FIRE reader object
reader = FIREreader(
    ## path to directory containing (optionally multiple) .hdf5 files
    snapdir = "/Users/agurvich/research/snaps/isolated_disks/Control_G4_20/snapdir_050/",
    ## the snapshot number, best to provide separately in order to disambiguate
    snapnum = 50,
    ## particle types one would like to extract from .hdf5 files
    ptypes=[0,4],
    ## what to call them in the UI
    UInames=['Gas','Stars'],
    ## by what factor would we like to reduce the data for performance stability and disk space concerns
    decimation_factors=[10,100],
    ## what fields would we like to extract
    fields=['Density','Velocities','Temperature'],
    ## do we want to take the magnitude of any of these fields?
    ##  typically answer is yes for vector fields like Velocity
    magFlags=[False,True,False],
    ## do we want to take the log? 
    logFlags=[True,False,True],
    ## which fields do we want to be able to filter on?
    filterFlags=[True,True,True],
    ## which fields do we want to be able to colormap by?
    colormapFlags=[True,True,True],
    ## where should the output .json files be saved to? 
    ##  if a relative path is given, like here, saves to $HOME/<JSONdir>
    ##  and creates a soft-link to Firefly/static/data
    JSONdir=os.path.abspath(os.path.join(os.getcwd(),'..','static','data','FIREData_50')),
    ## overwrite the existing startup.json file
    write_startup=True)

## fetch data from .hdf5 files
reader.loadData()

## set the color and size of the gas and star particles
##  to be aesthetically pleasing
reader.settings['color']['Gas']=[1,0,0,1]
reader.settings['color']['Stars']=[0,0,1,1]
reader.settings['sizeMult']['Gas']=1
reader.settings['sizeMult']['Stars']=0.5
reader.settings['camera'] = [0,0,-15]

## dump output to .json files
reader.dumpToJSON()


# ## Using `Firefly.data_reader.SimpleFIREreader`
# To simplify this process we have provided `Firefly.data_reader.SimpleFIREreader` which takes a path to a FIRE snapshot and creates a "standard" iteration of Firefly given only a path to the data.

# In[4]:


reader = SimpleFIREreader(
    ## path to directory containing (optionally multiple) .hdf5 files
    "/Users/agurvich/research/snaps/isolated_disks/Control_G4_20/snapdir_050/",
    ## overwrite the existing startup.json file
    write_startup=True, 
    ## pass absolute path to avoid symlink
    JSONdir=os.path.abspath(os.path.join(os.getcwd(),'..','static','data','FIREData_50')))

