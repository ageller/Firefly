
from operator import attrgetter
import os
import numpy as np

import json

#https://stackoverflow.com/questions/56250514/how-to-tackle-with-error-object-of-type-int32-is-not-json-serializable
#to help with dumping to json
class npEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.int32):
            return int(obj)
        if isinstance(obj, np.float32):
            return float(obj)
        return json.JSONEncoder.default(self, obj)

octant_offsets = 0.25 * np.array([
    [-1,-1,-1], ## x < 0, y < 0, z < 0 -> 000
    [ 1,-1,-1], ## x > 0, y < 0, z < 0 -> 100
    [-1, 1,-1], ## x < 0, y > 0, z < 0 -> 010
    [ 1, 1,-1], ## x > 0, y > 0, z < 0 -> 110
    [-1,-1, 1], ## x < 0, y < 0, z > 0 -> 001
    [ 1,-1, 1], ## x > 0, y < 0, z > 0 -> 101
    [-1, 1, 1], ## x < 0, y > 0, z > 0 -> 011
    [ 1, 1, 1]]) ## x > 0, y > 0, z > 0 -> 111

#inputFile,
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
class Octree(object):

    def __repr__(self):
        return 'Octree: %d nodes - %d points - %d fields'%(
            len(self.nodes.keys()),
            self.nodes[''].npoints,
            self.nodes[''].nfields-3)

    def __init__(
        self,
        coordinates,
        npart_max=1000,
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
        root_center = np.mean(coordinates,axis=0)

        self.coordinates = coordinates - root_center

        ## find the maximum extent in any coordinate direction and set the 
        ##  octree root bounding box to that size
        maxPos = np.abs(self.coordinates.flatten().max())
        minPos = np.abs(self.coordinates.flatten().min())
        root_width = 2.*np.max([maxPos,minPos])

        ## prepare field accumulators
        ##  add com calculators to fields
        weights = (fields['Masses'] if 'Masses' in fields else 
            np.ones(1,self.coordinates.shape[0]))

        for i,axis in enumerate(['x','y','z']):
            fields[f'com_{axis}'] = self.coordinates[:,i]*weights
        ##  we'll divide the accumulated [com_x,com_y,com_z] / accumulated weights
        ##  for each node when we output, this will give us a position in the octant for our node
        ##  if Masses is already in fields we'll be accumulating it anyway, if it's not then 
        ##  we can use that conditional to divide by npoints

        self.field_names = list(fields.keys())
        ## group fields and transpose so we can index it to get a particle's field values
        self.fieldss = np.array([fields[key] for key in self.field_names],ndmin=2).T

        ## initialize the octree node dictionary
        self.nodes = {'': OctNode(
            root_center,
            root_width,
            nfields=len(self.field_names),
            name='',
            npart_max=npart_max)
        }

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
        if end is None: end = self.coordinates.shape[0]

        node = self.nodes[start_octant]
        for i,(point,fields) in enumerate(zip(self.coordinates[start:end],self.fieldss[start:end])):
            ## ABG NOTE: i wonder if there's a way to better predict which node we should start at
            ##  for each particle, like by sorting the particles by distance or something
            ## node = self.nodes[start_octant]
            if not ((i-start) % 10000): print("%.2f"%(i/end*100)+"%",end='\t') 

            node.addPointToOctree(point,fields,self.nodes)

        node_list = sorted(self.nodes.values(),key=attrgetter('refinement','name'),reverse=True)
        node_list = sorted(node_list,key=attrgetter('npoints'),reverse=False)
        self.node_list = node_list
        return node_list

    def write_octree_json(self,path=None):

        if path is None: path = os.getcwd()
        node_dict_list = []
        for node in self.node_list[::-1]:
            node_dict = {}

            node_dict['center'] = node.center.tolist()
            ## set basic keys
            for key in ['width','name','refinement','npoints']:
                node_dict[key] = getattr(node,key)

            ## calculate center of mass
            com = node.fields[-3:] ## last 3 fields will always be xcom, ycom, zcom
            if 'Masses' in self.field_names:
                weights = node.fields[self.field_names.index('Masses')]
            else: weights = node.npoints

            com/=weights

            node_dict['center_of_mass'] = com.tolist()

            ## set other accumulated field values, use the same weights
            for i,field_key in enumerate(self.field_names[:-3]):
                node_dict[field_key] = node.fields[i]
                if field_key != 'Masses': node_dict[field_key]/=weights

            buffer_exists = hasattr(node,'buffer_coordss')
            node_dict['buffer_exists'] = buffer_exists

            ## TODO need to write out the buffer and store byte offsets
            ##  or whatever... it might be time to look at kaitai stuff
            if buffer_exists:
                pass


            node_dict_list += [node_dict]

        octree_fname = os.path.join(path, 'octree.json')

        with open(octree_fname, 'w') as f:
            json.dump(node_dict_list, f, cls=npEncoder)

        return node_dict_list

        #self.iterFileOctree(arr)

        #self.dumpNodesToFiles()
        #self.shuffleAllParticlesInFiles()
class OctNode(object):
    def __repr__(self):
        return "OctNode({self.name}):{self.npoints:d} points - {self.nfields:d} fields".format(self=self)
        
    def __init__(
        self,
        center,
        width,
        nfields,
        name:str='',
        npart_max=1000):

        self.center = center
        self.width = width
        self.name = name
        self.refinement = len(name)
        self.npart_max = npart_max
        self.nfields = nfields

        ## accumulator attributes
        self.npoints:int = 0
        self.fields = np.zeros(nfields)

        ## buffers which will be flushed if npart_max is crossed
        self.buffer_coordss:list = []
        self.raw_velss:list = []
        self.buffer_fieldss:list = []
                
    def addPointToOctree(
        self,
        point:np.ndarray,
        fields:np.ndarray,
        nodes:dict):

        ## okay we're allowed to hold the raw data here
        if self.npoints < self.npart_max: 
            ## store coordinate data in the buffer
            self.buffer_coordss += [point]

            ## TODO implement velocities separately
            ##  as an optional buffer
            #self.raw_vels = []

            ## store field data in the buffer
            self.buffer_fieldss += [fields]

            ## accumulate the point
            self.npoints+=1
            self.fields+=fields
        else: 
            ## need to cascade, split this node
            if hasattr(self,'buffer_coordss'): 
                buffer_coordss = self.buffer_coordss + [point]
                #raw_vels = self.raw_vels + [vels)]
                buffer_fieldss = self.buffer_fieldss + [fields]

                ## clear the buffers for this node
                del self.buffer_coordss,self.buffer_fieldss
                #del self.raw_vels

                ## loop back through each point and end up in the other branch of the conditional
                ##  now that we have deleted the buffers
                for point,fields in zip(buffer_coordss,buffer_fieldss): self.addPointToOctree(point,fields,nodes)
            else: 

                ## accumulate the point
                self.npoints+=1
                self.fields+=fields

                ## use 3 bit binary number to index
                ##  the octants-- for each element of the array 
                ##  it is either to the left or right of the center.
                ##  this determines which octant it lives in
                ##  thanks Mike Grudic for this idea!
                octant_index = 0
                for axis in range(3): 
                    if point[axis] > self.center[axis]: octant_index+= (1 << axis)
                child_name = self.name+'%d'%(octant_index)

                if child_name not in nodes: 
                    ## create a new node! welcome to the party, happy birthday, etc.
                    child = OctNode(
                        center=self.center + self.width*octant_offsets[octant_index],
                        width=self.width/2,
                        nfields=self.nfields,
                        name=child_name,
                        npart_max=self.npart_max)
                    nodes[child_name] = child
                else: child:OctNode = nodes[child_name]

                child.addPointToOctree(point,fields,nodes)