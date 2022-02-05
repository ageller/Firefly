
from operator import attrgetter
import os
import numpy as np

import json

from .binary_writer import OctBinaryWriter

#https://stackoverflow.com/questions/56250514/how-to-tackle-with-error-object-of-type-int32-is-not-json-serializable
#to help with dumping to json
class npEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj,np.ndarray):
            return obj.tolist()
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
class OctNode(object):
    def __repr__(self):
        return f"OctNode({self.name}):{self.npoints:d} points - {self.nfields:d} fields"
        
    def __init__(
        self,
        center,
        width,
        nfields,
        name:str='',
        max_npart_per_node=1000):

        self.center = center
        self.width = width
        self.name = name
        self.refinement = len(name)
        self.max_npart_per_node = max_npart_per_node
        self.nfields = nfields

        self.children = []

        ## accumulator attributes
        self.npoints:int = 0
        self.fields = np.zeros(nfields)

        ## buffers which will be flushed if max_npart_per_node is crossed
        self.buffer_coordss:list = []
        #self.buffer_velss:list = []
        self.buffer_fieldss:list = []
        self.buffer_size:int = 0
    
    def purge_buffer(self):
        raise NotImplementedError(" we may need this for the streaming case... not sure")
        self.buffer_coordss = []
        self.buffer_fieldss = []
        #self.buffer_velss = []
                
    def addPointToOctree(
        self,
        point:np.ndarray,
        fields:np.ndarray,
        nodes:dict):

        ## okay we're allowed to hold the raw data here
        if self.npoints < self.max_npart_per_node: 
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
            self.buffer_size+=1
        else: 
            ## need to cascade, split this node
            if hasattr(self,'buffer_coordss'): 

                buffer_coordss = self.buffer_coordss + [point]
                #raw_vels = self.raw_vels + [vels)]
                buffer_fieldss = self.buffer_fieldss + [fields]

                ## clear the buffers for this node
                del self.buffer_coordss,self.buffer_fieldss
                #del self.raw_vels
                self.buffer_size = 0

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
                        max_npart_per_node=self.max_npart_per_node)
                    nodes[child_name] = child
                else: child:OctNode = nodes[child_name]

                child.addPointToOctree(point,fields,nodes)

    def merge_to_parent(self,nodes):
        parent = nodes[self.name[:-1]]

        ## another child has already been merged into this parent
        if hasattr(parent,'buffer_coordss'):
            parent.buffer_coordss += self.buffer_coordss
            parent.buffer_fieldss += self.buffer_fieldss
            parent.buffer_size += self.buffer_size
        ## this is the first child to be merged to this parent
        else:
            parent.buffer_coordss = [] + self.buffer_coordss
            parent.buffer_fieldss = [] + self.buffer_fieldss
            #parent.buffer_velss = []
            parent.buffer_size = self.buffer_size

            ## clear this buffer so as to avoid duplicating data
            ##  as much as possible
            del self.buffer_coordss,self.buffer_fieldss
class Octree(object):

    def __repr__(self):
        return 'Octree: %d nodes - %d points - %d fields'%(
            len(self.node_list),
            self.nodes[''].npoints,
            self.nodes[''].nfields-3)

    def __init__(
        self,
        particle_group,
        max_npart_per_node=1000):
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
        root_center = np.mean(particle_group.coordinates,axis=0)

        self.coordinates = particle_group.coordinates - root_center

        ## find the maximum extent in any coordinate direction and set the 
        ##  octree root bounding box to that size
        maxPos = np.abs(self.coordinates.flatten().max())
        minPos = np.abs(self.coordinates.flatten().min())
        root_width = 2.*np.max([maxPos,minPos])

        
        ## easier to convert this to a dictionary for the next couple of lines
        fields = dict(zip(particle_group.tracked_names,particle_group.tracked_arrays))

        ## prepare field accumulators
        ##  add com calculators to fields
        weights = (fields['Masses'] if 'Masses' in fields else 
            np.ones(self.coordinates.shape[0]))

        for key in fields.keys():
            if key != 'Masses': fields[key] = fields[key]*weights

        for i,axis in enumerate(['x','y','z']):
            fields[f'com_{axis}'] = self.coordinates[:,i]*weights
        ##  we'll divide the accumulated [com_x,com_y,com_z] / accumulated weights
        ##  for each node when we output, this will give us a position in the octant for our node
        ##  if Masses is already in fields we'll be accumulating it anyway, if it's not then 
        ##  we can use that conditional to divide by npoints

        self.field_names = list(fields.keys())
        ## group fields and transpose so we can index it to get a particle's field values
        self.fieldss = np.array([fields[key] for key in self.field_names],ndmin=2).T

        self.filter_flags = particle_group.tracked_filter_flags
        self.colormap_flags = particle_group.tracked_colormap_flags
        ## TODO should add a hook for this
        self.radius_flags= [False for field in self.field_names]

        ## initialize the octree node dictionary
        self.nodes = {'': OctNode(
            root_center,
            root_width,
            nfields=len(self.field_names),
            name='',
            max_npart_per_node=max_npart_per_node)
        }

    def buildOctree(self,start_octant=''):

        node = self.nodes[start_octant]
        end = self.coordinates.shape[0]
        print(f"Bulding octree of {end:d} points")
        for i,(point,fields) in enumerate(zip(self.coordinates,self.fieldss)):
            ## ABG NOTE: i wonder if there's a way to better predict which node we should start at
            ##  for each particle, like by sorting the particles by distance or something
            ## node = self.nodes[start_octant]
            if not (i % 10000): print("%.2f"%(i/end*100)+"%",end='\t') 

            node.addPointToOctree(point,fields,self.nodes)

        ## we want the nodelist to be sorted s.t. the highest refinement levels are first
        ##  so that if we decide to prune the tree all children will get added to their parent before
        ##  the parent is itself pruned. we'll do that with a "complex sort" (google it)
        ##  here we're first sorting by number of points and then by refinement level. 
        ##  because parents will have > the number of points of their children we will never
        ##  end up in a situation where a parent comes before a child even though we are not
        ##  sorting by refinement level.
        ##  on the other hand, it is most efficient to start merging by the smallest number of 
        ##  points, rather than the highest refined levels.
        node_list = sorted(self.nodes.values(),key=attrgetter('refinement','name'),reverse=True)
        node_list = sorted(node_list,key=attrgetter('npoints'),reverse=False)
        self.node_list = node_list
        return node_list
    
    def pruneOctree(self,min_npart_per_node=100):
        ## put ourselves in the unenviable position of some parents having children 
        ##  *and* their own buffer data. this is useful if we have child(s) octant with a tiny
        ##  number of particles in it but its sibling(s) has many. Better to associate the tiny 
        ##  number with the parent IMO
        i = 0
        while self.node_list[0].npoints < min_npart_per_node:
            if not (i % 100): print(i,self.node_list[0].npoints,end='\t') 
            this_node = self.node_list.pop(0)
            this_node.merge_to_parent(self.nodes)
            i+=1
        
        ## now populate the children list
        ## let's empty out the children, just in case we run this multiple times
        for node in self.node_list: node.children = []

        ## skip the last node, the root
        for node in self.node_list[:-1]: self.nodes[node.name[:-1]].children += [node.name]
        
    
    def writeOctree(self,path=None,prefix='',max_npart_per_file=1e5):

        ## find nodes which have buffer data and write that buffer
        ##  data to disk. when we do that, we will add: 
        ##    buffer_filename - which file 
        ##    byte_offset - position of beginning of byte string in file
        ##    byte_size - length of byte string for that node
        ##    npart_buffer_file - *total* number of particles in the buffer file (not just this node)
        ##  attributes to nodes which have buffer data.
        ##  files will be in binary .fftree format defined by kaitai_io/node.ksy
        node_filenames,_ = self.write_particle_data_nodes_fftree(path,prefix,max_npart_per_file)

        ## for *each* node (whether it has buffer data or not) write out meta/aggregate
        ##  data to a JSON that will be read in full when Firefly starts up.
        ##  nodes which have particles on disk will have necessary information to 
        ##  load that data from disk when requested in Firefly.
        tree_filename,_ = self.write_octree_json(path,prefix)
        return tree_filename,node_filenames
 
    def write_particle_data_nodes_fftree(self,path=None,prefix='',max_npart_per_file=1e5):

        ## partition nodes into ~max_npart_per_file sized chunks
        node_partitions,counts = self.split_chunks(max_npart_per_file)

        filenames = []

        for i,chunk in enumerate(node_partitions):
            offset = 0
            filename = '%soctnode_%04d.fftree'%(prefix,i)
            filenames += [filename]
            npart_this_file = counts[i]
            with open(os.path.join(path,filename),'wb') as handle:
                for node in chunk:
                    ## set attributes we know before writing
                    self.nodes[node.name].byte_offset = offset
                    self.nodes[node.name].buffer_filename = filename

                    ## initialize the writer object that will 
                    ##  convert the data to binary and write it in the
                    ##  correct .fftree order
                    binary_writer = OctBinaryWriter(
                        filename,
                        node.buffer_coordss,
                        node.buffer_velss if hasattr(node,'buffer_velss') else None)
                    binary_writer.nparts = node.buffer_size
                    binary_writer.nfields = node.nfields
                    binary_writer.fields = node.buffer_fieldss

                    ## write the data to the open binary file and in so doing
                    ##  count the length in bytes of this node
                    byte_size = binary_writer.write(handle)

                    ## store the length in bytes for this node
                    self.nodes[node.name].byte_size = byte_size

                    ## store the *total* number of particles that will end up in this node
                    ##  not sure we'll need it but it could be handy to have
                    self.nodes[node.name].npart_buffer_file = npart_this_file

                    ## increment the byte offset for this file
                    offset+=byte_size        
        return filenames,counts
    
    def split_chunks(self,max_npart_per_file=1e5) -> tuple[list[list[OctNode]],list[int]]:
        split_indices = []
        counts = []
        count = 0

        ## ok, want spatial localization on disk, so we want to store nodes
        ##  in similar regions of space next to one another
        ##  so we'll first sort by "name"
        ##  then we want to have larger nodes come first so we'll sort by buffer_size
        sorted_node_list = sorted(self.node_list,key=attrgetter('name','buffer_size'),reverse=True)

        ## let's split up our nodes into different output files
        ##  can't just do an even split by node b.c. the file size will be 
        ##  unbalanced. However, we also can't make them perfectly balanced
        ##  because the whole node must be contained within a single file
        popped = 0
        for i in range(len(sorted_node_list)):
            node = sorted_node_list[i-popped]
            ##  however we do *not* want any nodes that don't actually have associated particle data
            ##  so we'll remove them from the list
            if node.buffer_size == 0:
                sorted_node_list.pop(i-popped)
                popped+=1
                continue
                
            count+=node.buffer_size
            ## this node puts us over the limit, 
            if count > max_npart_per_file:
                split_indices+=[i-popped+1] ## +1 b.c. we want this node to be included in the file
                counts += [count]
                count=0
                
        ## add the last partition's count
        counts += [count]

        ## alright let's split the list now. we could've built it using appends above
        ##  but i have a feeling that's slower than what we ended up doing
        node_partitions = np.array_split(sorted_node_list,split_indices)

        ## return the partitioning and how many files there are, for convenience.
        return node_partitions,counts

    def write_octree_json(
        self,
        path=None,
        prefix='',
        loud=True):

        if path is None: path = os.getcwd()
        octree_fname = os.path.join(path, f'{prefix}octree.json')

        flag_dict = {}
        for flag_name in ['filter_flags','colormap_flags','radius_flags']:
            flag_dict[flag_name] = getattr(self,flag_name)

        flag_dict['field_names'] = self.field_names[:-3]

        json_dict = {'flag_dict':flag_dict}

        num_nodes = len(self.node_list)

        node_index = 0
        ## self.node_list should be sorted
        print("Writing aggregate/meta data to octree.json")
        for node in self.node_list[::-1]:
            if loud and (not node_index%int(num_nodes/100)): print(
                "%.2f"%(100*node_index/num_nodes)+'%',
                '<'+node.name+'>',end='\t',flush=True)
            node_dict = {}

            node_dict['children'] = node.children

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
            
            if hasattr(node,'buffer_filename'):
                node_dict['buffer_filename'] = node.buffer_filename
                node_dict['buffer_size'] = node.buffer_size
                node_dict['byte_offset'] = node.byte_offset
                node_dict['byte_size'] = node.byte_size
                ##  I don't know if we want this so I'll comment it out 
                ##  but if it turns out we need it on the JSON side 
                ##  it'll be easy to add.
                #node_dict['npart_buffer_file'] = node.npart_buffer_file

            json_dict[node.name] = node_dict
            node_index+=1
        print('done!',flush=True)

        with open(octree_fname, 'w') as f:
            json.dump(json_dict, f, cls=npEncoder)

        return octree_fname,0