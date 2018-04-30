
# coding: utf-8

# # openWithHaloFinder.ipynb
# 
# This is an advanced tutorial using FIREreader, be warned!!
# 
# This notebook is best used on Stampede2, where the halo file and snapshot directories live. You can run this notebook, and host a Firefly server, on Stampede by following the instructions [here](https://github.com/ageller/Firefly/wiki/Hosting-Firefly-on-a-Cluster-Environment). 
# 
# In this notebook, we open the AHF halo files saved on Stampede and offset the snapshot coordinates, as well as convert them to physical units, to put the center of the main halo at our origin. This is optional, since you can always fly within Firefly to a point and set that as your origin, but more convenient (and exact!). 
# 
# We also calculate the radius from the halo center for each particle and update the filter keys so we can interactively filter by radius from within Firefly. 
# 
# #### Importantly, we do **not** call the `reader.run()` method, which would not give us the flexibility required to change our units/calculate the radii before we output to JSON. 
# 
# 

# In[2]:

from FIREreader import FIREreader
import numpy as np
import os


# ## Initialize the FIRE Reader object

# In[3]:

reader = FIREreader()
reader.directory = "/scratch/projects/xsede/GalaxiesOnFIRE/core/m12i_res7100/output"
reader.snapnum = 600


# ## Open the AHF Halo file and extract the halo center and other parameters

# In[4]:

def load_AHF(directory,snapnum,current_redshift,hubble = 0.702):
        path = os.path.join(directory,'../halo/ahf/halo_00000_smooth.dat')
        
        ## find column numbers without having to count
        names_to_read = ['snum','Xc','Yc','Zc','Rvir','v_esc','Rstar0.5']
        
        ## load the first line of the datafile
        names = list(np.genfromtxt(path,skip_header=0,max_rows = 1,dtype=str))
        cols = []

        ## find the column each name appears in
        for name in names_to_read:
            cols+=[names.index(name)]

        ## load the rest of the file
        sns,xs,ys,zs, rvirs, vescs, rstar_halfs = np.genfromtxt(
            path,delimiter='\t',usecols=cols,unpack=1,skip_header=1)

        ## which row do I care about? make an index array
        index = sns==snapnum
        if np.sum(index)==0:
            ## snapnum is not in this halo file
            raise IOError
            
        ## presumably in comoving kpc/h 
        halo_center = np.array([xs[index],ys[index],zs[index]])/hubble*(1/(1+current_redshift))
        halo_center = halo_center.reshape(3,)

        ## convert other quantities one might care about from comoving kpc to pkpc
        rvir = rvirs[index][0]/hubble/(1+current_redshift)
        vesc = vescs[index][0]
        rstar_half = rstar_halfs[index][0]/hubble/(1+current_redshift)
        return halo_center, rvir, vesc, rstar_half


# In[5]:

## redshift is hard-coded in now, but you could imagine looking it up in snapshot-times.txt! :]
halo_center,rvir,vesc,rstar_half = load_AHF(reader.directory,reader.snapnum,current_redshift=0)
print halo_center,rvir


# ## Setup the reader configuration

# In[6]:

## decide which part types to save to JSON
reader.returnParts = ['PartType0', 'PartType4']

## choose the names the particle types will get in the UI
reader.names = {'PartType0':'Gas', 
                  'PartType1':'HRDM', 
                  'PartType2':'LRDM', 
                  'PartType4':'Stars' }

#define the defaults; this must be run first if you want to change the defaults below
reader.defineDefaults()

## by what factor should you sub-sample the data (e.g. array[::decimate])
decimate = [100., 1000.]

## load in the data from hdf5 files and put it into reader.partsDict
for i,p in enumerate(reader.returnParts):
    reader.decimate[p] = decimate[i]
    reader.returnKeys[p] = ['Coordinates', 'Density','Velocities']
    #Note: you should only try to filter on scalar values (like density).  
    #The magnitude of the Velocities are calculated in Firefly, and you will automatically be allowed to filter on it
    reader.addFilter[p] = [False, True, False]
    reader.dolog[p] = [False, True, False]

    #NOTE: all dictionaries in the "options" reference the swapped names (i.e., reader.names) you define above.  
    #If you don't define reader.names, then you can use the default keys from the hdf5 files 
    #(but then you will see those hdf5 names in the Firefly GUI)
    pp = reader.names[p]
    ## set the initial size of the particles when the interface loads
    reader.options['sizeMult'][pp] = 0.3

## set the default colors when the interface loads
reader.options['color'] = {'Gas':  [1., 0., 0., 1.],  
                           'HRDM': [1., 1., 0., 0.1],  
                           'LRDM': [1., 1., 0., 0.1],  
                           'Stars':[0., 0., 1., 0.1]} 

## set the camera center to be at the origin (defaults to np.mean(Coordinates) otherwise)
reader.options['center'] = np.array([0., 0., 0.])


# In[7]:

## run defineFilterKeys to add filters for whatever we pull out of the snapshot
reader.defineFilterKeys()


# ## Calculate and filter by quantities derived from the snapshot (but not in it)

# ### Setup Temperature filtering

# In[8]:

def getTemperature(U_code,y_helium,ElectronAbundance):
    """U_codes = res['u']
        y_heliums = res['z'][:,1]
        ElectronAbundance=res['ne']"""
    U_cgs = U_code*1e10
    gamma=5/3.
    kB=1.38e-16 #erg /K
    m_proton=1.67e-24 # g
    mu = (1.0 + 4*y_helium) / (1+y_helium+ElectronAbundance) 
    mean_molecular_weight=mu*m_proton
    return mean_molecular_weight * (gamma-1) * U_cgs / kB # kelvin


# In[9]:

## have to setup dolog/domags for the ElectronAbundance/Metallicity/InternalEnergy arrays 
##     even if I want to remove them from the partsDict before casting to JSON
reader.dolog['PartType0']+=[False,False,False]
reader.domag['PartType0']=np.append(reader.domag['PartType0'],[False,False,False])
print reader.dolog
print reader.domag


# In[10]:

## tell FIREreader to open the necessary arrays from the hdf5 file
reader.returnKeys['PartType0']+=['InternalEnergy','ElectronAbundance','Metallicity']
## add temperature as a filtered quantity within the parts dict, but only for gas
reader.filterKeys['PartType0']+=['log10Temperature']
reader.options['filterVals']['Gas']['log10Temperature']=None
print reader.returnKeys
print reader.filterKeys


# ### Setup Radius filtering

# In[11]:

## add radius as a filtered quantity within the parts dict
reader.filterKeys['PartType4']+=['Radius']
reader.options['filterVals']['Stars']['Radius']=None

## do the same for the gas particles
reader.filterKeys['PartType0']+=['Radius']
reader.options['filterVals']['Gas']['Radius']=None
print reader.filterKeys


# ### Load and decimate the snapshot data

# In[12]:

##load the snapshot data into reader.partsDict
reader.populate_dict()


# In[13]:

## confirm that firefly knows it should be able to filter on Radius, and on temperature for gas
print reader.partsDict['Gas']['filterKeys']
print reader.partsDict['Stars']['filterKeys']


# ### Now let's actually calculate the temperature

# In[14]:

print reader.partsDict['Gas'].keys()


# In[15]:

## calculate the gas temperature
partsDict = reader.partsDict['Gas']
gas_temperature=getTemperature(partsDict['InternalEnergy'],partsDict['Metallicity'][:,1],partsDict['ElectronAbundance'])

## add it to the partsDict, but let's take the log because that's more helpful
partsDict['log10Temperature']=np.log10(gas_temperature)
print reader.partsDict['Gas'].keys()

## let's remove the internal energy, electron abundance, and metallicity since we don't want it and it'll increase the JSON filesize
partsDict.pop('InternalEnergy')
partsDict.pop('Metallicity')
partsDict.pop('ElectronAbundance')
print partsDict.keys()


# In[16]:

## update the return keys since those arrays no longer exist... 
reader.returnKeys['PartType0']=reader.returnKeys['PartType0'][:-3]+['Temperature'] ## <--- not log10 because this "should" match hdf5 keys
print reader.returnKeys['PartType0']

## and update the dolog/domag... -2 because we want to save a spot for temperature
reader.domag['PartType0']=reader.domag['PartType0'][:-2]
reader.dolog['PartType0']=reader.dolog['PartType0'][:-2]

## and actually, we *would* like to take the log of temperature, so let's set temperature's do log to True
reader.dolog['PartType0'][-1]=True
## let's ensure our dolog is matching log10___ and that we didn't mess anything up 
print reader.dolog['PartType0']


# ### Now let's actually calculate the radius, offset the coordinates while we're at it, and convert to physical units

# In[17]:

hubble=.702
current_redshift=0
## calculate the radius from the halo center
gas_radii = np.sum((reader.partsDict['Gas']['Coordinates']/hubble/(1+current_redshift)-halo_center)**2,axis=1)**0.5
star_radii = np.sum((reader.partsDict['Stars']['Coordinates']/hubble/(1+current_redshift)-halo_center)**2,axis=1)**0.5

## while we're at it, let's just shift all the coordinates relative to the main halo center
reader.partsDict['Gas']['Coordinates']=reader.partsDict['Gas']['Coordinates']/hubble/(1+current_redshift)-halo_center
reader.partsDict['Stars']['Coordinates']=reader.partsDict['Stars']['Coordinates']/hubble/(1+current_redshift)-halo_center


# ### While we're here, let's remove the nearby star particles' CoM velocity from the Gas and Star particles' velocities

# In[21]:

near_star_indices = star_radii < rstar_half

## let's not load masses just to delete them to make this calculation... the mean is close enough
near_star_vcom = np.mean(reader.partsDict['Stars']['Velocities'][near_star_indices],axis=0)
print near_star_vcom,'kms'

## now let's remove it from the particle velocities
reader.partsDict['Stars']['Velocities']-=near_star_vcom
reader.partsDict['Gas']['Velocities']-=near_star_vcom


# In[22]:

## let's add the newly computed radii to the partsDict
reader.partsDict['Gas']['Radius']=gas_radii
reader.partsDict['Stars']['Radius']=star_radii
print reader.partsDict['Gas'].keys()
print reader.partsDict['Stars'].keys()


# Exercise for the reader: loop through each of the particle arrays in each partsDict[\*] and filter using numpy index arrays 
# so that you only put the stuff w/i the virial radius into the JSON

# ## Create the JSON file!

# In[23]:

reader.createJSON()


# In[ ]:



