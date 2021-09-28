#!/usr/bin/env python
# coding: utf-8

# # Load Data
# Here we use some minimal example data.

# In[1]:


import numpy as np


# In[2]:


# Load your data. Here we're creating random data.
coords = np.random.randn( 20000, 3 )
fields = np.random.random(size=coords[:,0].size)


# # Format Data for Firefly

# In[3]:


from firefly.data_reader import ArrayReader


# In[4]:


my_arrayReader = ArrayReader(
    coords,
    fields=fields,
    write_jsons_to_disk=False)


# # Display Inline

# In[5]:


from firefly.server import spawnFireflyServer


# In[6]:


process = spawnFireflyServer()


# In[7]:


from IPython.display import IFrame
url = "http://localhost:5000"
IFrame(url, width=1000, height=500)


# In[11]:


# Send data to the server.
# Wait until it loads to run this command
my_arrayReader.sendDataViaFlask()


# In[9]:


# killAllFireflyServers()

