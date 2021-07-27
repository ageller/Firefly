#!/usr/bin/env python
# coding: utf-8

# `Firefly/ntbks/settings_tutorial.ipynb`

# In[1]:


get_ipython().run_line_magic('load_ext', 'autoreload')
get_ipython().run_line_magic('autoreload', '2')
from IPython.display import YouTubeVideo


# A recording of this jupyter notebook in action is available at:

# In[2]:


YouTubeVideo("Xt1vce_2DYo")


# In[3]:


YouTubeVideo("ft0Y3XNJhl4")


# In[4]:


import sys
import os
import numpy as np
from Firefly.data_reader import ParticleGroup,Settings,ArrayReader


# # Tutorial notebook: Managing Custom Settings
# One of the core features of Firefly is the ability to customize the user interface (UI) and the startup behavior to make bespoke iterations of Firefly using ones own data. We have organized the different options that one can customize into different settings groups that fall into two categories: those that affect the app as a whole and those that are particular to an individual group of particles.
# 
# **App Settings** |     |**Particle Group Settings**
# :-----:|:--:|:------:
# Startup|         |Startup
# UI|              |UI
# Window|          |Filter
# Camera|          |Colormap
# 
# 
# 
# Specific information for each key can be found in <a href="https://ageller.github.io/Firefly/docs/build/html/data_reader/settings.html">this documentation</a>.  
# 
# To create the necessary JSON files one should use the `Firefly.data_reader.Settings` class to create a `Settings` object. Once you have a `Settings` object you can manipulate the settings as you see fit and then either 
# 1. manually save it to a file using the `outputToJSON()` method or
# 2. connect it to a `Firefly.data_reader.Reader` object in order to link it to a specific visualization (see the <a href="https://ageller.github.io/Firefly/docs/build/html/data_reader/reader.html">reader documentation</a> for details on how to use a `Reader` object).

# In[5]:


## let's create an settings object with the default keys
settings = Settings()

## we'll print the current settings to the console, organized into groups 
##  (but we'll use the values=False keyword argument because we only want to see the keys for now)
settings.printKeys(values=False)


# ## Settings can be changed the same way you would change a key in a dictionary
# There is key validation (so you can't attempt to set a setting that doesn't exist) but there is no value validation, so be careful that you use appropriate values or your app might not work. See the <a href="https://ageller.github.io/Firefly/docs/build/html/data_reader/settings.html">settings documentation</a> for details on what values each setting can take.

# In[6]:


## let's change the title that shows up in the browser's tab list
print("before:")
## print only the settings that have to do with the window
settings.printKeys(pattern='window')
## update the title using dictionary syntax
settings['title']='---> My Favorite Data <--- '
print("after:")
## print only the settings that have to do with the window to confirm it changed
settings.printKeys(pattern='window')


# ## Settings are most useful when connected to a `Firefly.data_reader.Reader` object
# Doing so allows many of the necessary settings to be automatically generated as additional particle groups are added.

# In[7]:


## let's create some sample data, a grid of points in a 3d cube
my_coords = np.linspace(-10,10,20)
xs,ys,zs = np.meshgrid(my_coords,my_coords,my_coords)
xs,ys,zs = xs.flatten(),ys.flatten(),zs.flatten()
coords = np.array([xs,ys,zs]).T

## we'll pick some random field values to demonstrate filtering/colormapping
fields = np.random.random(size=xs.size)


# Before we've attached the `Settings` object the particle settings are all empty.

# In[8]:



settings.printKeys(pattern='particle')


# We'll use a `Firefly.data_reader.ArrayReader`, a workhorse `Firefly.data_reader.Reader` sub-class with many convenient functions. See the <a href="https://ageller.github.io/Firefly/docs/build/html/data_reader/reader.html">reader documentation</a> for details that are outside the scope of this tutorial.

# In[9]:


## initialize an ArrayReader
reader = ArrayReader(
    coordinates=[coords[:-1],coords], ## pass in two particle groups as a demonstration (just copies of our sample data)
    write_jsons_to_disk=False,
    settings=settings, ## the settings object to link
    fields=[[],[fields,fields]]) ## field data for each particle group, 0 fields for 1 and 2 repeated fields for the other.


# The original `Settings` object is stored in `reader.settings`.

# In[10]:


## demonstrate that reader.settings is the original settings object
print('(reader.settings is settings) =',reader.settings is settings)
print()

reader.settings.printKeys(pattern='particle')


# Notice that the dictionaries are filled with keys corresponding to each of the particle groups we passed in and sensible default values for each. The values of nested dictionaries should be changed by accessing each in turn, e.g.
# ```python
# settings['colormapLims']['PGroup_1']['field0'] = [0,1]
# ```

# for the purposes of this tutorial, we'll just go ahead and output the `Settings` object we have manually

# In[11]:


## output the example settings file to a .json in this directory
settings.outputToJSON('.','example')


# ## Settings can also be imported from `.json` files
# Only settings defined in the file will be overwritten, so you can also mix-and-match settings files.

# In[12]:


## initialize a new settings object
new_settings = Settings()

## import the settings from what we just saved above; prints the settings that are updated
new_settings.loadFromJSON("./exampleSettings.json")


# ## Attaching a ParticleGroup to a Settings
# One other thing you may want to do (perhaps in the course of building your own custom `Reader` sub-class) is link a `Firefly.data_reader.ParticleGroup` object to a `Settings` object so that the different particle settings can be imported. 
# `ParticleGroup` settings can be changed in `settings_default` attribute (which is just a normal python dictionary). 

# In[13]:


## create a test particle group
particleGroup = ParticleGroup('test',coords)
## update the color of this particle group *before* attaching it to a settings object
particleGroup.settings_default['color'] = [0,0,1,1]


# In[14]:


## attach the particle group to the settings object
##  you can find the settings in the "particleGroup.attached_settings attribute"
new_settings.attachSettings(particleGroup)
print('(particleGroup.attached_settings is new_settings) =',particleGroup.attached_settings is new_settings)
print()
particleGroup.attached_settings.printKeys(pattern='particle')


# Notice that the `'test'` particle group now appears in the particle settings dictionaries (and in particular, note that `settings['color']['test'] = [0,0,1,1]`.
