import numpy as np
import pandas as pd
import h5py,os

class FIREreader(object):
    """
    #These are the defaults that can be redefined by the user at runtime.  
    #These defaults are only applied after running self.defineDefaults().

        #directory that contains all the hdf5 data files
        self.directory = './' 
        

        #particles to return
        self.returnParts = ['PartType0', 'PartType1', 'PartType2', 'PartType4']
 
        #set names for the particle sets (note: these will be used in the UI of WebGLonFIRE; 4 characters or less is best)
        self.names = {'PartType0':'Gas', 
                      'PartType1':'HRDM', 
                      'PartType2':'LRDM', 
                      'PartType4':'Stars' }

        #amount to decimate the data (==1 means no decimates, >1 factor by which to reduce the amount of data)
        self.decimate = {'PartType0':1., 
                      'PartType1':1., 
                      'PartType2':1., 
                      'PartType4':1. }
                      
        #keys from the hdf5 file to include in the JSON file for WebGLonFIRE (must at least include Coordinates)
        self.returnKeys = {'PartType0': ['Coordinates'],  
                           'PartType1': ['Coordinates'],  
                           'PartType2': ['Coordinates'],  
                           'PartType4': ['Coordinates'] }         
        
        
        #set the default colors = rgba.  The alpha value here becomes a multiplier if weights are provided. 
        self.colors = {'PartType0': [1., 0., 0., 0.1],  
                       'PartType1': [1., 1., 0., 0.1],  
                       'PartType2': [1., 1., 0., 0.1],  
                       'PartType4': [0., 0., 1., 0.1] } 

        #set the weight of the particles (to define the alpha value). This is a function that will calculate the weights
        self.weightFunction = {'PartType0': None, 
                      'PartType1': None, 
                      'PartType2': None, 
                      'PartType4': None}
        
        #set the radii of the particles. This is a function that will calculate the radii
        self.radiusFunction = {'PartType0': None, 
                      'PartType1': None, 
                      'PartType2': None, 
                      'PartType4': None}
        
        #set the default point size multiplier 
        self.sizeMult = {'PartType0':0.1, 
                      'PartType1':0.1, 
                      'PartType2':0.1, 
                      'PartType4':0.1 }
                      
        #set the number of points to plot during each draw (larger numbers will make the visualization run more slowly)
        self.nMaxPlot = {'PartType0':1e4, 
                      'PartType1':1e4, 
                      'PartType2':1e4, 
                      'PartType4':1e4 }
                      
        #decide whether you want to use the key from returnKeys as a filter item in the UI
        #NOTE: each of these must be the same length as self.returnKeys
        self.addFilter = {'PartType0': [False],  
                           'PartType1': [False],  
                           'PartType2': [False],  
                           'PartType4': [False] }        
  
        #should we use the log of these values?  
        #NOTE: this must be the same length as self.returnKeys
        self.dolog = {'PartType0': [False],  
                       'PartType1': [False],  
                       'PartType2': [False],  
                       'PartType4': [False] }          

        #should we use the magnitude of these values?   
        #NOTE: this must be the same length as self.returnKeys
        #NOTE: setting any of these to true will significantly slow down the file creation
        self.domag = {'PartType0': [False],  
                       'PartType1': [False],  
                       'PartType2': [False],  
                       'PartType4': [False] }  
 
        #should we plot using Alex Gurvich's radial profile fit to the SPH particles (==1), or a simple symmetric radial profile?   
        #NOTE: this must be the same length as self.returnKeys
        self.doSPHrad = {'PartType0': [1],
                       'PartType1': [0],  
                       'PartType2': [0],  
                       'PartType4': [0] }  


        #the name of the JSON file
        self.JSONfname = 'FIREdata.json'
        
        #a dictionary of options for the WebGL app
        #a dictionary of options for the WebGL app
        self.options = {'title':'WebGLonFIRE', #set the title of the webpage
                       'UIdropdown':dict(), #do you want to enable the dropdown menus for particles in the user interface (default = 1 == True)
                       'UIcolorPicker':dict(), #do you want to allow the user to change the color
                       'center':None, #do you want to define the initial camera center (if not, the WebGL app will calculate the center as the mean of the coordinates of the first particle set loaded in)
                       } 

        #in case you want to print the available keys to the screen
        self.showkeys = False

    """


    def __init__(self, *args,**kwargs):
##################################################        
#defaults that can be modified

        #directory that contains all the hdf5 data files
        self.directory = './' 

        #particles to return
        self.returnParts = ['PartType0', 'PartType1', 'PartType2', 'PartType4']
 
        #set names for the particle sets (note: these will be used in the UI of WebGLonFIRE; 4 characters or less is best)
        self.names = {'PartType0':'Gas', 
                      'PartType1':'HRDM', 
                      'PartType2':'LRDM', 
                      'PartType4':'Stars' }
        
        #flag to check if user has already defined the default values
        self.defined = False
        
        #amount to decimate the data (==1 means no decimates, >1 factor by which to reduce the amount of data)
        self.decimate = dict()
        
        #keys from the hd5 file to include in the JSON file for WebGLonFIRE (must at least include Coordinates)
        self.returnKeys = dict()
        
        #set the default colors = rgba.  The alpha value here becomes a multiplier if weights are provided. 
        self.colors = dict()
        
        #set the weight of the particles (to define the alpha value). This is a function that will calculate the weights
        self.weightFunction = dict()
        
        #set the radii of the particles. This is a function that will calculate the radii
        self.radiusFunction = dict()
        
        #set the default point size multiplier 
        self.sizeMult = dict()

        #set the number of points to plot during each draw (larger numbers will make the visualization run more slowly)
        self.nMaxPlot = dict()
        
        #decide whether you want to use the key from returnKeys as a filter item in the UI
        #NOTE: each of these must be the same length as self.returnKeys
        self.addFilter = dict()
  
        #should we use the log of these values?  
        #NOTE: this must be the same length as self.returnKeys
        self.dolog = dict()

        #should we use the magnitude of these values?   
        #NOTE: this must be the same length as self.returnKeys
        #NOTE: setting any of these to true will significantly slow down the file creation
        self.domag = dict()
 
        #should we plot using Alex Gurvich's radial profile fit to the SPH particles (==1), or a simple symmetric radial profile?   
        #NOTE: this must be the same length as self.returnKeys
        self.doSPHrad = dict()
        
        #a dictionary of options for the WebGL app
        self.options = {'title':'WebGLonFIRE', #set the title of the webpage
                        'UIdropdown':dict(), #do you want to enable the dropdown menus for particles in the user interface (default = 1 == True)
                        'UIcolorPicker':dict(), #do you want to allow the user to change the color
                        'center':None, #do you want to define the initial camera center (if not, the WebGL app will calculate the center as the mean of the coordinates of the first particle set loaded in)
                        'cameraDistance':np.array([0., 0. -10]), #initial camera location, NOTE: the magnitude must be >0
                      } 
        
        #the name of the JSON file
        self.JSONfname = 'FIREdata'
        
        #in case you want to print the available keys to the screen
        self.showkeys = False
        
################################################## 
#don't modify these

        #the data for the JSON file
        self.partsDict = dict()
        
        #keys that shouldn't be shuffled or decimated
        self.nodecimate = ['color','sizeMult','filterKeys','doSPHrad', 'nMaxPlot']
        
        #keys for filtering (will be defined below)
        self.filterKeys = {}
        
################################################## 
################################################## 
################################################## 
        
    def defineDefaults(self):
        self.defined = True
        for p in self.returnParts:
            #amount to decimate the data (==1 means no decimates, >1 factor by which to reduce the amount of data)
            self.decimate[p] = 1.

            #keys from the hdf5 file to include in the JSON file for WebGLonFIRE (must at least include Coordinates)
            self.returnKeys[p] = ['Coordinates']      

            #set the default colors = rgba.  The alpha value here becomes a multiplier if weights are provided. 
            self.colors[p] = [np.random.random(), np.random.random(), np.random.random(), 1.]

            #set the weight of the particles (to define the alpha value). This is a function that will calculate the weights
            self.weightFunction[p] = None

            #set the radii of the particles. This is a function that will calculate the radii
            self.radiusFunction[p] = None

            #set the default point size multiplier 
            self.sizeMult[p] = 1.

            #set the number of points to plot during each draw (larger numbers will make the visualization run more slowly)
            self.nMaxPlot[p] = 1e4

            #decide whether you want to use the key from returnKeys as a filter item in the UI
            self.addFilter[p] = [False]   

            #should we use the log of these values?  
            self.dolog[p] = [False]

            #should we use the magnitude of these values?   
            self.domag[p] = [False]

            #should we plot using Alex Gurvich's radial profile fit to the SPH particles (==1), or a simple symmetric radial profile?   
            self.doSPHrad[p] = [0]

            #options
            #dropdown menus
            pp = self.swapnames(p) 
            self.options['UIdropdown'][pp] = 1
            self.options['UIcolorPicker'][pp] = 1
            
    #used self.names to swap the dictionary keys
    def swapnames(self, pin):
        return self.names[pin]

    #adds an array to the dict for a given particle set and data file 
    def addtodict(self, d, snap, part, dkey, sendlog, sendmag, usekey = None, mfac = 1.):
        if (usekey == None):
            ukey = dkey
        else:
            ukey = usekey
            
        vals = snap[part + '/' + dkey][...] * mfac      
        if (sendlog):
            ukey = "log10"+ukey
            vals = np.log10(vals)
        if (sendmag):  
            #print "calculating magnitude for ", ukey
            ukey = "mag"+ukey
            vals = [np.linalg.norm(v) for v in vals]
         
        if ukey in d[part].keys():
            d[part][ukey] = np.append(vals, d[part][ukey], axis=0)
        else:
            d[part][ukey] = vals

                                   
    #populate the dict
    def populate_dict(self):
        for fname in os.listdir(self.directory):
            print(fname)
            with h5py.File(self.directory + '/' + fname,'r') as snap:
                parts = snap.keys()[1:]
                for p in parts:
                    if p in self.returnParts:
                        if p not in self.partsDict:
                            self.partsDict[p] = dict()
                        vals = snap[p].keys()
                        #This shows the available keys
                        if (self.showkeys):
                            print(p,self.swapnames(p), vals)
                        if (self.radiusFunction[p] != None):
                            self.radiusFunction[p](self, self.partsDict, snap, p)
                        if (self.weightFunction[p] != None):
                            self.weightFunction[p](self, self.partsDict, snap, p)
                        for i,k in enumerate(self.returnKeys[p]):
                            if (k in vals):
                                self.addtodict(self.partsDict, snap, p, k, self.dolog[p][i], self.domag[p][i])

                            
        #and add on the colors and point size defaults
        #also calculate the magnitude where necessary
        for p in self.partsDict.keys():
            self.partsDict[p]['color'] = self.colors[p]
            self.partsDict[p]['sizeMult'] = self.sizeMult[p]
            self.partsDict[p]['filterKeys'] = self.filterKeys[p]
            self.partsDict[p]['doSPHrad'] = self.doSPHrad[p]
            self.partsDict[p]['nMaxPlot'] = self.nMaxPlot[p]

                    
            #should we decimate the data? (NOTE: even if decimate = 1, it is wise to shuffle the data so it doesn't display in blocks)
            if (self.decimate[p] > 0): 
                if (self.decimate[p] > 1):
                    print("decimating and shuffling ...")
                else:
                    print("shuffling ... ")
                N = int(len(self.partsDict[p][self.returnKeys[p][0]]))
                indices = np.arange(N )
                dindices = np.random.choice(indices, size = int(round(N/self.decimate[p])))
                for k in self.partsDict[p].keys():
                    if (k not in self.nodecimate):
                        self.partsDict[p][k] = self.partsDict[p][k][dindices]

        #swap the names
        for p in self.partsDict.keys():
            pp = self.swapnames(p)
            self.partsDict[pp] = self.partsDict.pop(p)
            
            
    #create the JSON file, and then add the name of the variable (parts) that we want in WebGLonFIRE
    def createJSON(self):
        print("writing JSON files ...")
        #first create the dict of file names and write that to a JSON file
        filenames = dict()
        for p in self.partsDict:
            filenames[p] = self.JSONfname+p+'.json'
            print(filenames[p])
            pd.Series(self.partsDict[p]).to_json(filenames[p], orient='index') 
        #for the options
        filenames['options'] = self.JSONfname+'Options.json'
        print(filenames['options'])
        pd.Series(self.options).to_json(filenames['options'], orient='index') 
        #the list of files
        pd.Series(filenames).to_json('filenames.json', orient='index') 
        
    
    def defineFilterKeys(self):
        for p in self.returnParts:
            self.filterKeys[p] = []
            j = 0
            for i,k in enumerate(self.returnKeys[p]):
                if (self.addFilter[p][i]):
                    self.filterKeys[p].append(k)
                    if (self.dolog[p][i]):
                        self.filterKeys[p][j] = 'log10' + self.filterKeys[p][j]
                    if self.domag[p][i]:
                        self.filterKeys[p][j] = 'mag' + self.filterKeys[p][j]
                    j += 1
        #print "filters = ", self.filterKeys
        


    def run(self):
        if (not self.defined):
            self.defineDefaults()
            
        self.defineFilterKeys()
        self.populate_dict()
        self.createJSON()
        print("done")