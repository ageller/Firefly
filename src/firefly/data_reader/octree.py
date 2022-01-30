
import os
import numpy as np

class Octree(object):

    def __init__(
        self,
        data:dict,
        #inputFile,
        #NMemoryMax = 1e5,
        #NNodeMax = 5000, 
        #header = 0,
        #delim = None,
        #colIndices = {'Coordinates':[0,1,2]},
        #baseDir = 'octreeNodes',
        #Nmax=np.inf,
        #verbose=0,
        #path = None,
        #minWidth=0, 
        #h5PartKey = '',
        #keyList = ['Coordinates'],
        #logKey = [False],
        #center = None,
        #cleanDir = False,
        **fields):
        '''
            inputFile : path to the file. For now only text files.
            NMemoryMax : the maximum number of particles to save in the memory before writing to a file
            NNodeMax : the maximum number of particles to store in a node before splitting it
            header : the line number of the header (file starts at line 1, 
                set header=0 for no header, and in that case x,y,z are assumed to be the first three columns)
            delim : the delimiter between columns, if set to None, then hdf5 file is assumed
            colIndices : dict with the column numbers for each value in keyList (only necessary for csv files)
            baseDir : the directory to store the octree files
            Nmax : maximum number of particles to include
            verbose : controls how much output to write to the console
            path : the path to the output file
            minWidth : the minimum width that a node can have
            h5PartKey : if needed, can be used to specify which particle type to use, e.g. 'PartType0'
            keyList : Any additional keys that are desired; MUST contain the key to Coordinates first.  If blank, then assume that x,y,z is the first 3 columns in file
            logList : a list of true/false values indicating if a key from keyListshould be treated as the log (not Coordinates or Velocities)
            center : options for the user to provide the octree center (can save time)
            cleanDir : if true this will erase the files within that directory before beginning
        '''
        self.count = 0


        ## want the true mean, not the com-- we'll calculate the com at the end
        root_center = np.mean(data['Coordinates'],axis=0)

        self.Coordinates = data['Coordinates'] - root_center

        ## find the maximum extent in any coordinate direction and set the 
        ##  octree root bounding box to that size
        maxPos = np.abs(self.Coordinates.flatten().max())
        minPos = np.abs(self.Coordinates.flatten().min())
        root_width = 2.*np.max([maxPos,minPos])

        ## prepare field accumulators
        ##  add com calculators to fields
        weights = (data['Masses'] if 'Masses' in data else 
            np.ones(1,self.Coordinates.shape[0]))

        for i,axis in enumerate(['x','y','z']):
            fields[f'com_{axis}'] = self.Coordinates[:,i]*weights

        ##  we'll divide the accumulated [com_x,com_y,com_z] / accumulated weights
        ##  for each node when we output, this will give us a position in the octant for our node
        ##  if Masses is already in fields we'll be accumulating it anyway
        if 'Masses' not in fields: fields['com_weights'] = weights

        self.field_names = fields.keys()
        ## group fields and transpose so we can index it to get a particle's field values
        self.fieldss = np.array([fields[key] for key in self.field_names]).T

        ## initialize the octree node dictionary
        self.nodes = {'': OctNode(
            root_center,
            root_width,
            ## initialize all field accumulators to 0
            **dict(zip(self.field_names,np.zeros(len(self.field_names))))
        )}

        ## easier to start new nodes w/ 1 point but the root should have 0 to begin with
        ##  so we'll explicitly handle this exception
        self.nodes[''].npoints -=1

        """
        #create the output directory if needed
        if (not os.path.exists(self.path)):
            os.makedirs(self.path)
            
        #remove the files in that directory
        if (self.cleanDir):
            for f in os.listdir(self.path):
                os.remove(os.path.join(self.path, f))
        """

    def buildOctree(self,start=0,end=None,start_octant=''):

        ## TODO add ability to load subset of written octree data
        ##  and append to the octree. maybe i can be smart
        ##  and use start_octant to do that?
        ##  could be more flexible to 'just' implement the ability to merge two octree
        ##  dicts and build a whole new octree for whatever streamed data
        if end is None: end = self.Coordinates.shape[0]

        for i,point in enumerate(self.Coordinates[start:end]):
            addPointToOctree(
                point,
                self.nodes,
                ## ABG NOTE: i wonder if there's a way to better predict which node we should start at
                self.nodes[start_octant], 
                **dict(zip(self.field_names,self.fieldss[i])))

        #self.iterFileOctree(arr)

        #self.dumpNodesToFiles()
        #self.shuffleAllParticlesInFiles()

    def foo(self,point):
        #find the node that it belongs in 
        node = self.findClosestNode(np.array(point))
        if (self.verbose > 2):
            print('id, Nparticles', node['id'], node['Nparticles'])
            
        #add the particle to the node
        node['particles'].append(point)
        node['needsUpdate'] = True
        node['Nparticles'] += 1

        #check if we need to split the node
        if (node['Nparticles'] >= self.NNodeMax and node['width'] >= self.minWidth*2):
            self.createChildNodes(node) 

        #if we are beyond the memory limit, then write the nodes to files and clear the particles from the nodes 
        #(also reset the count)
        if (self.count > self.NMemoryMax):
            self.dumpNodesToFiles()

class OctNode(object):
    def __repr__(self):
        return "OctNode({self.name}):{self.npoints:d} points - {nfields:d} fields".format(
            self=self,
            nfields=len(self.fields.keys()))
        
    def __init__(
        self,
        center,
        width,
        name:str='',
        **fields):

        self.center = center
        self.width = width
        self.name = name

        self.npoints = 1

        ## save the index in the data field
        ##  array so that when we have this node we can
        ##  look up relevant field data
        self.fields = fields
            
def addPointToOctree(
    point,
    nodes:dict,
    parent:OctNode,
    **fields) -> OctNode:

    ## use 3 bit binary number to index
    ##  the octants-- for each element of the array 
    ##  it is either to the left or right of the center.
    ##  this determines which octant it lives in
    ##  thanks Mike Grudic for this idea!
    octant_offsets = 0.25 * np.array([
        [-1,-1,-1], ## x < 0, y < 0, z < 0 -> 000
        [ 1,-1,-1], ## x > 0, y < 0, z < 0 -> 100
        [-1, 1,-1], ## x < 0, y > 0, z < 0 -> 010
        [ 1, 1,-1], ## x > 0, y > 0, z < 0 -> 110
        [-1,-1, 1], ## x < 0, y < 0, z > 0 -> 001
        [ 1,-1, 1], ## x > 0, y < 0, z > 0 -> 101
        [-1, 1, 1], ## x < 0, y > 0, z > 0 -> 011
        [ 1, 1, 1]]) ## x > 0, y > 0, z > 0 -> 111
    
    octant_index = 0
    for axis in range(3): 
        if point[axis] > parent.center[axis]: octant_index+= (1 << axis)

    child_name = parent.name+'%d'%(octant_index)

    ## there's a node in this octant already, 
    ##  so we'll add this point to the parent's accumulators and 
    ##  start over with that child
    if child_name in nodes: 
        addPointToParent(parent,**fields)
        return addPointToOctree(point,nodes,nodes[child_name],**fields)
    ## create a new node! welcome to the party
    else: 
        child = OctNode(
            parent.center + parent.width*octant_offsets[octant_index],
            parent.width/2,
            child_name,
            **fields)
        nodes[child_name] = child
        return child

def addPointToParent(parent:OctNode,**fields):
    parent.npoints +=1

    for field in fields:
        ## add this field value to the parent's accumulator
        parent.fields[field]+=fields[field]