
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
        self.velocity = np.zeros(3)
        self.rgba_color = np.zeros(4)
        self.fields = np.zeros(nfields)

        ## buffers which will be flushed if max_npart_per_node is crossed
        self.buffer_coordss:list = []
        self.buffer_velss:list = []
        self.buffer_rgba_colors:list = []
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
        nodes:dict,
        velocity:np.ndarray=None,
        rgba_color:np.ndarray=None,
        ):

        ## okay we're allowed to hold the raw data here
        if self.npoints < self.max_npart_per_node: 
            ## store coordinate data in the buffer
            self.buffer_coordss += [point]

            if velocity is not None: self.buffer_velss += [velocity]
            if rgba_color is not None: self.buffer_rgba_colors += [rgba_color]

            ## store field data in the buffer
            self.buffer_fieldss += [fields]

            ## accumulate the point
            self.npoints+=1
            if velocity is not None: self.velocity += velocity
            if rgba_color is not None: self.rgba_color += rgba_color
            self.fields+=fields
            self.buffer_size+=1
        else: 
            ## need to cascade, split this node
            if hasattr(self,'buffer_coordss'): 

                buffer_coordss = self.buffer_coordss + [point]
                if velocity is not None: buffer_velss = self.buffer_velss + [velocity]
                if rgba_color is not None: buffer_rgba_colors = self.buffer_rgba_colors+[rgba_color]
                buffer_fieldss = self.buffer_fieldss + [fields]

                ## clear the buffers for this node
                del self.buffer_coordss,self.buffer_fieldss,self.buffer_velss,self.buffer_rgba_colors
                self.buffer_size = 0

                ## loop back through each point and end up in the other branch of the conditional
                ##  now that we have deleted the buffers
                for i,(point,fields) in enumerate(
                    zip(buffer_coordss,buffer_fieldss)): 
                    self.addPointToOctree(
                        point,
                        fields,
                        nodes,
                        buffer_velss[i] if velocity is not None else None,
                        buffer_rgba_colors[i] if rgba_color is not None else None)
            else: 

                ## accumulate the point
                self.npoints+=1
                self.fields+=fields
                if velocity is not None: self.velocity += velocity
                if rgba_color is not None: self.rgba_color += rgba_color

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

                child.addPointToOctree(point,fields,nodes,velocity,rgba_color)

    def merge_to_parent(self,nodes):
        parent:OctNode = nodes[self.name[:-1]]

        ## another child has already been merged into this parent
        if hasattr(parent,'buffer_coordss'):
            parent.buffer_coordss += self.buffer_coordss
            parent.buffer_velss += self.buffer_velss
            parent.buffer_rgba_colors += self.buffer_rgba_colors
            parent.buffer_fieldss += self.buffer_fieldss
            parent.buffer_size += self.buffer_size
        ## this is the first child to be merged to this parent
        else:
            parent.buffer_coordss = [] + self.buffer_coordss
            parent.buffer_fieldss = [] + self.buffer_fieldss
            parent.buffer_velss = [] + self.buffer_velss
            parent.buffer_rgba_colors = [] + self.buffer_rgba_colors
            parent.buffer_size = self.buffer_size

            ## clear this buffer so as to avoid duplicating data
            ##  as much as possible
            del self.buffer_coordss,self.buffer_fieldss,self.buffer_velss,self.buffer_rgba_colors
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
        root_center = np.zeros(3)#np.mean(particle_group.coordinates,axis=0)

        self.coordinates = particle_group.coordinates - root_center
        self.velocities = particle_group.velocities
        self.rgba_colors = particle_group.rgba_colors
 
        ## find the maximum extent in any coordinate direction and set the 
        ##  octree root bounding box to that size
        #coords = np.abs(self.coordinates.flatten())
        #np.percentile(coords,[99.99])

        
        ## easier to convert this to a dictionary for the next couple of lines
        fields = dict(zip(particle_group.field_names,particle_group.field_arrays))
        if particle_group.decimation_factor > 1:
            self.coordinates = self.coordinates[::particle_group.decimation_factor]
            if self.velocities is not None: self.velocities = self.velocities[::particle_group.decimation_factor]
            if self.rgba_colors is not None: self.rgba_colors = self.rgba_colors[::particle_group.decimation_factor]
            for key in fields.keys(): fields[key] = fields[key][::particle_group.decimation_factor]

        ## prepare field accumulators
        ##  add com calculators to fields
        weights = (fields['Masses'] if 'Masses' in fields else 
            np.ones(self.coordinates.shape[0]))

        ## copy velocities to octree and weight by mass if available
        if self.velocities is not None:
            ##  don't use *=, this will make a copy
            self.velocities = self.velocities*weights[:,None]
        if self.rgba_colors is not None:
            ##  don't use *=, this will make a copy
            self.rgba_colors = self.rgba_colors*weights[:,None]

        for i,axis in enumerate(['x','y','z']):
            fields[f'com_{axis}'] = self.coordinates[:,i]
        for i,axis in enumerate(['x','y','z']):
            fields[f'com_sq_{axis}'] = self.coordinates[:,i]**2
        ##  we'll divide the accumulated [com_x,com_y,com_z] / accumulated weights
        ##  for each node when we output, this will give us a position in the octant for our node
        ##  if Masses is already in fields we'll be accumulating it anyway, if it's not then 
        ##  we can use that conditional to divide by npoints

        self.field_names = list(fields.keys())
        ## group fields and transpose so we can index it to get a particle's field values
        self.fieldss = np.array([
            fields[key] if key == "Masses" else fields[key]*weights 
            for key in self.field_names],ndmin=2).T
        
        ## fill up the settings with appropriate limits
        ##  so that filters and colormaps are appropriate accounting
        ##  for unloaded particles
        settings = particle_group.attached_settings
        ## find the minimum and maximum value of each field
        ##  for initializing the filter if user values aren't passed.
        for i,key in enumerate(self.field_names[:-6]):
            if key in ['Masses']: vals = [0,fields[key].sum()*1.1]
            else: vals = [fields[key].min()*0.9, fields[key].max()*1.1]
            for setting_key in ['filterLims','filterVals','colormapLims','colormapVals']:
                if settings[setting_key][particle_group.UIname][key] is None:
                    settings[setting_key][particle_group.UIname][key]=vals

        self.filter_flags = particle_group.field_filter_flags
        self.colormap_flags = particle_group.field_colormap_flags
        self.radius_flags= particle_group.field_radius_flags

        ## initialize the octree node dictionary
        ##  find the maximum extent in any coordinate direction and set the 
        ##  octree root bounding box to that size
        coords = np.abs(self.coordinates.flatten())
        #root_width = 2.*np.max([maxPos,minPos])
        ## find the extent which contains 99.99% of the particles 
        ##  (to avoid weird outliers stretching your octree)
        root_width = 2*np.percentile(coords,[99.99]) ## 2* for +/-

        ## select those particles that are outside the root node's bounding box.
        outlier_mask = np.max(np.abs(self.coordinates),axis=1) > root_width/2
        if np.sum(outlier_mask) > 0:
            ## store the outliers in their own arrays so that we
            ##  can stuff them into the root node when we're ready to
            self.__outlier_coordinates = self.coordinates[outlier_mask,:]
            if self.velocities is not None: self.__outlier_velocities = self.velocities[outlier_mask,:]
            if self.rgba_colors is not None: self.__outlier_rgba_colors = self.rgba_colors[outlier_mask,:]
            self.__outlier_fieldss = self.fieldss[outlier_mask,:]

            ## exclude the outliers from the points that will 
            ##  be added to the octree normally
            self.coordinates = self.coordinates[~outlier_mask,:]
            if self.velocities is not None: self.velocities = self.velocities[~outlier_mask,:]
            self.fieldss = self.fieldss[~outlier_mask,:]

        self.nodes = {'': OctNode(
            np.zeros(3),
            root_width,
            nfields=len(self.field_names),
            name='',
            max_npart_per_node=max_npart_per_node)
        }

    def buildOctree(self,start_octant=''):

        node = self.nodes[start_octant]
        end = self.coordinates.shape[0]
        velocity = None
        rgba_color = None
        print(f"Bulding octree of {end:d} points")
        for i,(point,fields) in enumerate(zip(self.coordinates,self.fieldss)):
            if not (i % 10000): print("%.2f"%(i/end*100)+"%",end='\t') 

            if self.velocities is not None: velocity = self.velocities[i]
            if self.rgba_colors is not None: rgba_color = self.rgba_colors[i]

            node.addPointToOctree(point,fields,self.nodes,velocity,rgba_color)

        print("...done!")
        ## if there are any outliers, let's stuff them in the root node
        self.__store_outliers_in_root()

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

    def __store_outliers_in_root(self):
        """ mimic node.merge_to_parent but forcibly dump all the outlier
            particles (those outside the 99.99 %'ile root_width) into the root
            node's buffer. """
        try:
            ## see if it has the private attribute __outlier_coordinates
            buffer_coordss = self.__outlier_coordinates.tolist()
            buffer_velss = [] if self.velocities is None else self.__outlier_velocities.tolist()
            buffer_rgba_colors = [] if self.rgba_colors is None else self.__outlier_rgba_colors.tolist()
            buffer_fieldss = self.__outlier_fieldss.tolist()
            buffer_size = self.__outlier_coordinates.shape[0]
            print(f"adding {buffer_size} 'outliers' to root node's buffer.")

            ## select the root node
            parent = self.nodes['']

            ## accumulate the points and field values
            parent.npoints += buffer_size
            parent.fields += np.sum(self.__outlier_fieldss,axis=0)

            ## store the raw data in the root node's buffer
            ##  another child has already been merged into this parent, buffer exists
            if hasattr(parent,'buffer_coordss'):
                parent.buffer_coordss += buffer_coordss
                parent.buffer_velss += buffer_velss
                parent.buffer_rgba_colors += buffer_rgba_colors
                parent.buffer_fieldss += buffer_fieldss
                parent.buffer_size += buffer_size
            ## this is the first child to be merged to this parent, must create buffer
            else:
                parent.buffer_coordss = [] + buffer_coordss
                parent.buffer_fieldss = [] + buffer_fieldss
                parent.buffer_velss = [] + buffer_velss
                parent.buffer_rgba_colors = [] + buffer_rgba_colors
                parent.buffer_size = buffer_size

        except AttributeError: pass
    
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
        tree_filename,num_nodes = self.write_octree_json(path,prefix)
        return tree_filename,num_nodes,node_filenames
 
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
                ## all nodes in this chunk have buffer info, 
                ##  any buffer_size=0 nodes were tossed in split_chunks
                for node in chunk:
                    ## set attributes we know before writing
                    self.nodes[node.name].byte_offset = offset
                    self.nodes[node.name].buffer_filename = filename

                    ## we /were/ accumulating a weighted quantity for the CoM particles
                    ##  but /now/ we have to divide that weight back out
                    if 'Masses' in self.field_names:
                        weights = np.array(node.buffer_fieldss)[:,self.field_names.index('Masses')]
                    else: weights = np.ones(node.buffer_size)

                    ## initialize the writer object that will 
                    ##  convert the data to binary and write it in the
                    ##  correct .fftree order
                    binary_writer = OctBinaryWriter(
                        filename,
                        node.buffer_coordss,
                        None if self.velocities is None else
                            np.array(node.buffer_velss)/weights[:,None],
                        None if self.rgba_colors is None else
                            np.array(node.buffer_rgba_colors)/weights[:,None])

                    binary_writer.nparts = node.buffer_size
                    binary_writer.nfields = node.nfields-6

                    binary_writer.fields = np.array(node.buffer_fieldss)[:,:binary_writer.nfields]

                    ## renormalize every field except Masses
                    for i,field in enumerate(self.field_names[:binary_writer.nfields]):
                        if field!= 'Masses': binary_writer.fields[:,i]/=weights

                    ## take the transpose because binary_writer wants Nfields x Nparts
                    ##  but make sure numpy doesn't do anything funny like give you a view 
                    ##  of the transpose. change it in memory numpy!!
                    binary_writer.fields = np.array(binary_writer.fields.T,order='C')

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

        num_nodes = len(self.node_list)

        npoints = np.array([node.npoints for node in self.node_list])
        high_rscale = np.log10(np.percentile(npoints,95))
        low_rscale = np.percentile(np.log10(npoints),10)

        json_dict = {
            #'header':flag_dict,
            ##'node_arrays':node_arrays,
            'octree':{},
            'Coordinates_flat':np.zeros(3*num_nodes)
            }

        if self.velocities is not None: json_dict['Velocities_flat'] = np.zeros(3*num_nodes)
        if self.rgba_colors is not None: json_dict['rgbaColors_flat'] = np.zeros(4*num_nodes)

        for field in self.field_names[:-3]: json_dict[field] = np.zeros(num_nodes)

        for flag_name in ['filter_flags','colormap_flags','radius_flags']:
            flags = getattr(self,flag_name)
            js_name = flag_name.split('_')[0]+'Keys'
            json_dict[js_name] = []
            for field_name,flag in zip(self.field_names[:-6],flags):
                if flag: json_dict[js_name] += [field_name]

        json_dict['field_names'] = self.field_names[:-6]

        node_index = 0
        ## self.node_list should be sorted
        print("Writing aggregate/meta data to octree.json")
        for node in self.node_list[::-1]:
            if loud and (not node_index%(int(num_nodes/100)+1)): print(
                "%.2f"%(100*node_index/num_nodes)+'%',
                '<'+node.name+'>',end='\t',flush=True)
            node_dict = {}

            node_dict['children'] = node.children

            node_dict['center'] = node.center.tolist()
            ## set basic keys
            for key in ['width','name','refinement','npoints']:
                node_dict[key] = getattr(node,key)

            ## calculate center of mass
            com = node.fields[-6:-3] ## last 3 fields will always be xcom, ycom, zcom
            com_sq = node.fields[-3:] ## last 3 fields will always be xcom, ycom, zcom
            if 'Masses' in self.field_names:
                weights = node.fields[self.field_names.index('Masses')]
            else: weights = node.npoints

            com = com/weights
            com_sq = com_sq/weights
            ## sigma_x = <x^2>_m - <x>_m^2, take average over 3 axes to get 1d
            ##  sigma to represent 1-sigma extent of particles in node
            node_dict['radius'] = np.sqrt(np.mean(com_sq-com**2))

            node_dict['center_of_mass'] = com.tolist()

            ## set other accumulated field values, use the same weights
            for i,field_key in enumerate(self.field_names[:-3]):
                node_dict[field_key] = node.fields[i]
                if field_key != 'Masses': 
                    node_dict[field_key]/=weights
                json_dict[field_key][node_index] = node_dict[field_key]

            if 'static' in path: path = path.split('static')[1][1:]
            if hasattr(node,'buffer_filename'):
                node_dict['buffer_filename'] = os.path.join(
                    path,
                    node.buffer_filename)
                node_dict['buffer_size'] = node.buffer_size
                node_dict['byte_offset'] = node.byte_offset
                node_dict['byte_size'] = node.byte_size
                ##  I don't know if we want this so I'll comment it out 
                ##  but if it turns out we need it on the JSON side 
                ##  it'll be easy to add.
                #node_dict['npart_buffer_file'] = node.npart_buffer_file

            ## set center = 
            json_dict['Coordinates_flat'][3*node_index:3*(node_index+1)] = com
            #json_dict['Coordinates_flat'][3*node_index:3*(node_index+1)] = node.center.tolist()

            if self.velocities is not None: 
                vcom = node.velocity/weights
                json_dict['Velocities_flat'][3*node_index:3*(node_index+1)] = vcom
            
            if self.rgba_colors is not None:
                rgba_color = node.rgba_color/weights
                json_dict['rgbaColors_flat'][4*node_index:4*(node_index+1)] = rgba_color

            node_dict['node_index'] = node_index
            json_dict['octree'][node.name] = node_dict
            node_index+=1

        print('done!',flush=True)

        with open(octree_fname, 'w') as f:
            json.dump(json_dict, f, cls=npEncoder)

        octree_fname = octree_fname.split(os.path.join('static','data',''))[1]
        return octree_fname,num_nodes