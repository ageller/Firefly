import os
import itertools
import copy
import multiprocessing
import itertools
import time

import numpy as np

from .json_utils import load_from_json,write_to_json
from .binary_writer import RawBinaryWriter,BinaryWriter
from abg_python.system_utils import printProgressBar

octant_offsets = 0.25 * np.array([
    [-1,-1,-1], ## x < 0, y < 0, z < 0 -> 000
    [ 1,-1,-1], ## x > 0, y < 0, z < 0 -> 100
    [-1, 1,-1], ## x < 0, y > 0, z < 0 -> 010
    [ 1, 1,-1], ## x > 0, y > 0, z < 0 -> 110
    [-1,-1, 1], ## x < 0, y < 0, z > 0 -> 001
    [ 1,-1, 1], ## x > 0, y < 0, z > 0 -> 101
    [-1, 1, 1], ## x < 0, y > 0, z > 0 -> 011
    [ 1, 1, 1]]) ## x > 0, y > 0, z > 0 -> 111

class OctNode(object):
    def __repr__(self):
        return f"OctNode({self.name}):{self.buffer_size}/{self.nparts:d} points - {self.nfields:d} fields"
        
    def __init__(
        self,
        center,
        width,
        field_names,
        name:str='',
        weight_index=None,
        coordss=None,
        fieldss=None,
        velss=None,
        rgba_colorss=None,
        has_velocities=False,
        has_colors=False,
        nthreads=1
        ):

        ## bind input
        self.center = center
        self.width = width
        self.field_names,self.nfields = field_names,len(field_names)
        self.name = name
        self.weight_index = weight_index
        self.nthreads = nthreads

        ## initialize the buffers (and fill with any data we were passed)
        self.set_buffers_from_arrays(
            coordss,
            fieldss,
            velss,
            rgba_colorss)

        self.has_velocities = has_velocities
        self.has_colors = has_colors
        self.prefixes = (
            ['x','y','z'] +
            ['vx','vy','vz']*has_velocities + 
            ['rgba_r','rgba_g','rgba_b','rgba_a']*has_colors +
            field_names)

        self.children = []
        self.child_names = []
 
    def set_buffers_from_dict(self,data_dict,width=None,init_node=False):
        """ data_dict requires: 
            'x','y','z'

            optionally:
            'vx','vy','vz'
            'rgba_r','rgba_g','rgba_b','rgba_a'
             
             any number of field names and arrays

        :param data_dict: _description_
        :type data_dict: _type_
        :param width: _description_, defaults to None
        :type width: _type_, optional
        :raises KeyError: _description_
        :return: _description_
        :rtype: _type_
        """
 
        keys = list(data_dict.keys())
        if 'x' not in keys: raise KeyError(f"Data dict missing coordinates {keys}")

        velss = None
        rgba_colorss = None

        nparts = data_dict['x'].shape[0]
        coordss = np.zeros((nparts,3))
        for i,axis in enumerate(['x','y','z']):
            coordss[:,i] = data_dict.pop(axis)
            key = 'v'+axis
            if key in keys: 
                if velss is None: 
                    velss = np.zeros((nparts,3))
                    self.has_velocities = True
                velss[:,i] = data_dict.pop(key)

        for i,color in enumerate(['r','g','b','a']):
            key = f'rgba_{color}'
            if key in keys: 
                if rgba_colorss is None:
                    self.has_colors = True
                    rgba_colorss = np.zeros((nparts,4))
                rgba_colorss[:,i] = data_dict.pop(key)
        
        ## the remaining keys are the fields
        self.field_names = list(data_dict.keys())
        self.nfields = len(self.field_names)

        self.prefixes = (
            ['x','y','z'] +
            ['vx','vy','vz']*self.has_velocities + 
            ['rgba_r','rgba_g','rgba_b','rgba_a']*self.has_colors +
            self.field_names)

        ## determine field names from remaining keys
        fieldss = np.zeros((nparts,self.nfields))
        for i,field_name in enumerate(self.field_names):
            fieldss[:,i] = data_dict.pop(field_name)

        #if width is None: width = np.max(coordss.max(axis=0) - coordss.min(axis=0))
        if width is None: 
            width = np.max(np.percentile(
                np.abs(coordss),
                99,axis=0))*2

        self.width = width
        self.center = np.zeros(3)
 
        self.set_buffers_from_arrays(
            coordss,
            fieldss,
            velss,
            rgba_colorss,
            check_boundaries=True,
            init_node=init_node) ## eject the particles outside the 99th %ile
        
        root_dict = {}

        root_dict = {'field_names':self.field_names,
            'has_velocities':self.has_velocities,
            'has_colors':self.has_colors,
            'weight_index':self.weight_index,
            'nodes':{}}
        return root_dict

    def set_buffers_from_disk(self,files,nparts):

        for fname in files: 
            split = os.path.basename(fname[0]).split('.')
            if len(split) != 3: raise IOError(f"bad .ffraw file name [{fname}] must be field.<i>.ffraw")
        
        coordss = np.empty((nparts,3))
        buffers = [coordss[:,0],coordss[:,1],coordss[:,2]]
        if self.has_velocities: 
            velss = np.empty((nparts,3)) 
            buffers += [velss[:,0],velss[:,1],velss[:,2]]
        else: velss = None

        if self.has_colors:
            rgba_colorss = np.empty((nparts,4)) 
            buffers += [rgba_colorss[:,0],rgba_colorss[:,1],rgba_colorss[:,2],rgba_colorss[:,2]]
        else: rgba_colorss = None

        fieldss = np.empty((nparts,self.nfields)) 
        for i in range(self.nfields):
            buffers += [fieldss[:,i]]

        ## sort files and group them into a numpy array
        files = group_files(self.prefixes,files)

        for prefix,buffer,these_files in zip(
            self.prefixes,
            buffers,
            files):
            count_offset = 0
            for fname,byte_offset,count in these_files:
                ## convert from numpy string to ints
                byte_offset = int(eval(byte_offset))
                count = int(eval(count))
                if os.path.basename(fname).split('.')[0][-len(prefix):] != prefix:
                    raise IOError(
                        "The file grouping didn't work. God save us. Report this to agurvich@u.northwestern.edu immediately.")
                RawBinaryWriter(fname,buffer[count_offset:count_offset+count]).read(byte_offset,count)
                count_offset+=count

        self.set_buffers_from_arrays(
            coordss,
            fieldss,
            velss,
            rgba_colorss)

    def set_buffers_from_arrays(
        self,
        coordss:np.ndarray,
        fieldss:np.ndarray,
        velss:np.ndarray=None,
        rgba_colorss:np.ndarray=None,
        check_boundaries:bool=False,
        init_node:bool=False):

        if coordss is None: coordss = np.zeros((0,3))

        self.buffer_coordss = coordss
        mask = np.ones(coordss.shape[0],dtype=bool)
        if check_boundaries:
            for axis in range(3):
                mask = np.logical_and(
                    mask,
                    np.abs(coordss[:,axis]) <= (self.center[axis]+self.width/2) )

            if self.nthreads == 1 and np.sum(mask) != mask.size: 
                print(f'ejecting {np.sum(~mask)} particles that are outside this node ({100*np.sum(~mask)/mask.size:0.2f}%)')

        if not init_node: self.buffer_coordss = self.buffer_coordss[mask].tolist()

        ## initialize the field buffers
        if fieldss is not None:
            self.nfields = fieldss.shape[1]

            ## +6 to hold the com and com^2 fields
            self.buffer_fieldss = np.zeros((coordss.shape[0],self.nfields+6))
            self.buffer_fieldss[:,:-6] = fieldss

            for i in range(3):
                self.buffer_fieldss[:,-6+i] = coordss[:,i]
                self.buffer_fieldss[:,-3+i] = (coordss[:,i]**2)
            
            self.buffer_fieldss = self.buffer_fieldss[mask]

        else: self.buffer_fieldss = np.zeros((0,self.nfields))
        if not init_node:self.buffer_fieldss = self.buffer_fieldss.tolist()
 
        ## determine if we're taking a weighted average
        if self.weight_index is not None:
            weights = self.buffer_fieldss[:,self.weight_index]

            ## need to weight the fieldss now that we know we're weighted
            for i in range(self.nfields):
                if i != self.weight_index:
                    self.buffer_fieldss[:,i]*=weights

            ## change shape of weights for broadcasting below
            weights = weights[:,None] 

        else: weights = 1

        ## initialize the velocities buffer
        if velss is not None:
            if velss.shape[0] != coordss.shape[0]:
                raise IndexError(
                    f"Size of velss ({velss.shape[0]})"+
                    f"does not match size of buffer ({coordss.shape[0]})")
            self.buffer_velss = (velss * weights)[mask]

        else: self.buffer_velss = np.zeros((0,3))
        if not init_node:self.buffer_velss = self.buffer_velss.tolist()

        ## initialize the rgba_colors buffer
        if rgba_colorss is not None:
            if rgba_colorss.shape[0] != coordss.shape[0]:
                raise IndexError(
                    f"Size of rgba_colorss ({rgba_colorss.shape[0]})"+
                    f"does not match size of buffer ({coordss.shape[0]})")
            self.buffer_rgba_colorss = (rgba_colorss * weights)[mask]

        else: self.buffer_rgba_colorss = np.zeros((0,4))
        if not init_node:self.buffer_rgba_colorss = self.buffer_rgba_colorss.tolist()  

        ## initialize com accumulators
        self.velocity = np.sum(self.buffer_velss,axis=0)
        self.rgba_color = np.sum(self.buffer_rgba_colorss,axis=0)
        self.fields = np.sum(self.buffer_fieldss,axis=0)

        self.buffer_size = np.sum(mask)
        self.nparts = np.sum(mask)
 
    def cascade(self,min_to_refine,nrecurse=0):

        #if self.nthreads < 5: print('Refining:',self)
        ## flush the buffer into its children
        #if self.nthreads < 5: printProgressBar(0,self.buffer_size,prefix = 'Progress:',suffix='complete',length=50,decimals=0)
        for i in range(self.buffer_size):
            self.sort_point_into_child(
                self.buffer_coordss[i], 
                self.buffer_fieldss[i],
                self.buffer_velss[i] if self.has_velocities else None,
                self.buffer_rgba_colorss[i] if self.has_colors else None)
            #if self.nthreads < 5: printProgressBar(i+1,self.buffer_size,prefix = 'Progress:',suffix='complete',length=50,decimals=0)
        #if self.nthreads < 5: printProgressBar(i+1,self.buffer_size,prefix = 'Progress:',suffix='complete',length=50,decimals=0)

        ## probably just [] tbh ??
        self.buffer_coordss = np.zeros((0,3)).tolist()
        self.buffer_fieldss = np.zeros((0,self.nfields)).tolist()
        self.buffer_velss = np.zeros((0,3)).tolist()
        self.buffer_rgba_colorss = np.zeros((0,4)).tolist()
        self.buffer_size = 0

        ## okay we made the children but... not all will
        ##  survive. the small ones will be merged back
        ##  into the parent
        self.prune(min_to_refine)

        #if self.nthreads < 5: print('New children:',self.child_names)

        return_value = [(self.name,self.buffer_size)]


        if nrecurse>0: 
            for child in self.children: return_value += child.cascade(min_to_refine,nrecurse-1)

        self.processed = True

        return return_value

    def sort_point_into_child(
        self,
        coords,
        fields,
        vels,
        rgba_colors):

        ## use 3 bit binary number to index
        ##  the octants-- for each element of the array 
        ##  it is either to the left or right of the center.
        ##  this determines which octant it lives in
        ##  thanks Mike Grudic for this idea!
        octant_index = 0
        for axis in range(3): 
            if coords[axis] > self.center[axis]: octant_index+= (1 << axis)
        child_name = self.name+'%d'%(octant_index)

        if child_name not in self.child_names: 
            ## create a new node! welcome to the party, happy birthday, etc.
            child = OctNode(
                self.center + self.width*octant_offsets[octant_index],
                self.width/2,
                self.field_names,
                name=child_name,
                has_velocities=self.has_velocities,
                has_colors=self.has_colors)
                #nthreads=self.nthreads) ## <-- unnecessary b.c. if nthreads > 0 then
                # we won't be recursively pruning so the child will have this set
                # when it's re-initialized in refineNode after it becomes a work_unit

            self.children += [child]
            self.child_names += [child_name]
        else: child:OctNode = self.children[self.child_names.index(child_name)]

        child.accumulate(coords,fields,vels,rgba_colors)

    def prune(self,min_to_refine):
        sort_indices = np.argsort([child.buffer_size for child in self.children])
        sort_children = np.array(self.children)[sort_indices]
        for child in sort_children:
            if (child.buffer_size + self.buffer_size) < min_to_refine/self.nthreads:
                self.buffer_coordss += child.buffer_coordss
                self.buffer_velss += child.buffer_velss
                self.buffer_rgba_colorss += child.buffer_rgba_colorss
                self.buffer_fieldss += child.buffer_fieldss
                self.buffer_size += child.buffer_size

                ## evict you
                self.children.pop(self.child_names.index(child.name))
                ## remove you from my will
                self.child_names.pop(self.child_names.index(child.name))
            else: break ## no more room to consume children, the rest get to live on
        #if self.buffer_size > 0 and self.nthreads < 5: print(f"Merged {self.buffer_size} particles back into parent.")

    def accumulate(
        self,
        coords:list,
        fields:list,
        vels:list=None,
        rgba_colors:list=None,
        ):

        ## accumulate the point
        self.nparts += 1
        self.buffer_size += 1

        ## store coordinate data in its buffer
        self.buffer_coordss.append(coords)

        ## store velocity data in its buffer
        ##  and increment the com velocity accumulator
        if self.has_velocities: 
            self.buffer_velss.append(vels)
            self.velocity += vels

        ## store rgba_color data in its buffer
        ##  and increment the com rgba_color accumulator
        if self.has_colors: 
            self.buffer_rgba_colorss.append(rgba_colors)
            self.rgba_color += rgba_color

        ## store field data in the buffer
        ##  and increment the com field accumulator
        ##  (which includes the com and com^2 as the last 6 entries)
        self.buffer_fieldss.append(fields)
        self.fields += fields

    def write_tree(self,target_directory,split_index,write_protect=False):

        ## format accumulated values into a dictionary
        if self.buffer_size == 0:
            this_node_dict = self.format_node_dictionary()
        ## some children were merged back into the parent, write them to disk
        else: this_node_dict = self.write(target_directory,split_index,write_protect=write_protect)

        if hasattr(self,'processed'): this_node_dict['processed'] = self.processed

        return_value = [this_node_dict] 
        for child in self.children:
            return_value += child.write_tree(target_directory,split_index)
        return return_value

    def format_node_dictionary(self):
        """
        '':{
        'name':'',
        'files':fnames,
        'width':dmax,
        'center':np.zeros(3),
        'nparts':np.sum(nparts),
        'children':[],
        'radius':radius,
        'center_of_mass':com,
        'weight_index':None,
        <field_names>
        }
        """

        node_dict = {}

        ## set basic keys
        for key in ['center','width','name','nparts','buffer_size']: 
            node_dict[key] = getattr(self,key)
        
        node_dict['children'] = [child.name for child in self.children]

        ## determine weight for accumulated fields
        if self.weight_index is not None: 
            weight = self.fields[self.weight_index]
        else: weight = self.nparts

        ## set other accumulated field values, use the same weight
        for i,field_key in enumerate(self.field_names):
            if self.weight_index is None or i != self.weight_index: 
                self.fields[i]/=weight
            node_dict[field_key] = self.fields[i]

        ## excluded from loop above because not in field names
        com = self.fields[-6:-3]/weight ## last 3 fields will always be xcom, ycom, zcom
        com_sq = self.fields[-3:]/weight ## last 3 fields will always be xcom^2, ycom^2, zcom^2
        ## sigma_x = <x^2>_m - <x>_m^2, take average over 3 axes to get 1d
        ##  sigma to represent 1-sigma extent of particles in node
        node_dict['radius'] = np.sqrt(np.mean(com_sq-com**2))
        node_dict['center_of_mass'] = com

        if self.has_velocities: vcom = self.velocity/weight
        else: vcom = None
        node_dict['com_velocity'] = vcom
        
        if self.has_colors: rgba_color = self.rgba_color/weight
        else: rgba_color = None
        node_dict['rgba_color'] = rgba_color

        return node_dict

    def write(self,top_level_directory,split_index=None,bytes_per_file=4e7,write_protect=False):

        ## convert buffers to numpy arrays
        self.buffer_coordss = np.array(self.buffer_coordss)
        self.buffer_fieldss = np.array(self.buffer_fieldss)
        self.buffer_velss = np.array(self.buffer_velss)
        self.buffer_rgba_colorss = np.array(self.buffer_rgba_colorss)

        this_dir = os.path.join(top_level_directory)
        if not os.path.isdir(this_dir): os.makedirs(this_dir)

        namestr = f'{self.name}-' if self.name != '' else 'root-'
        splitstr = ''#f'{split_index:02d}-' if split_index is not None else ''

        ## determine how many files we'll need to split this dataset into
        nsub_files = int(4*self.buffer_size//bytes_per_file + (4*self.buffer_size != bytes_per_file))
        counts = [arr.shape[0] for arr in np.array_split(np.arange(self.buffer_size),nsub_files)]

        ## ------ gather buffer array aliases to be written to disk
        buffers = [self.buffer_coordss[:,0],self.buffer_coordss[:,1],self.buffer_coordss[:,2]]

        if self.has_velocities:
            if self.buffer_velss.shape[0] > 0 and np.sum(self.velocity) == 0:
                raise IndexError("has_velocities but buffer_velss is empty")

            ## undo the weighting to write to disk
            if self.weight_index is not None: 
                self.buffer_velss /= self.buffer_fieldss[:,self.weight_index,None]

            buffers += [self.buffer_velss[:,0],self.buffer_velss[:,1],self.buffer_velss[:,2]]

        if self.has_colors:
            if self.buffer_rgba_colorss.shape[0] == 0:
                raise IndexError("self.has_colors but buffer_rgba_colorss is empty")

            ## undo the weighting to write to disk
            if self.weight_index is not None: 
                self.buffer_rgba_colorss /= self.buffer_fieldss[:,self.weight_index,None]

            buffers += [
                self.buffer_rgba_colorss[:,0],
                self.buffer_rgba_colorss[:,1],
                self.buffer_rgba_colorss[:,2],
                self.buffer_rgba_colorss[:,2]]

        if self.buffer_fieldss.shape[0] > 0:
            ## undo the weighting to write to disk
            for i in range(len(self.field_names)): 
                if self.weight_index is None or i == self.weight_index:
                    weight = 1
                else: weight = self.buffer_fieldss[:,self.weight_index]
                buffers += [self.buffer_fieldss[:,i]/weight]
        ## --------------------------------------------------

        ## write each buffer to however many subfiles we need to 
        ##  enforce a maximum file-size on disk
        files = []
        for prefix,buffer in zip(self.prefixes,buffers):
            count_offset = 0
            for index,count in enumerate(counts):
                ## if a child created in this thread or 
                ##  the parent node was not split between threads
                if not write_protect or split_index is None:
                    fname = os.path.join(top_level_directory,f"{namestr}{splitstr}{prefix}.{index}.ffraw")
                else:
                    ## don't overwrite a file before another thread can read particles from it
                    ##  this will only happen for a node that is split between multiple threads
                    ##  children won't be written with references to files that already exist. only
                    ##  pruned children are written on top of old particle data.
                    fname = os.path.join(top_level_directory,f"{namestr}pruned-{splitstr}{prefix}.{index}.ffraw")
                RawBinaryWriter(fname,buffer[count_offset:count_offset+count]).write()

                ## append to file list
                files += [[fname,0,int(count)]]
                count_offset+=count
                fsize = os.path.getsize(fname)
                if fsize != 4*(count+1):
                    raise IOError(f"file was not saved correctly, actual bytes:{int(fsize)} vs. expected:{int(4*count+1)}")

        ## format aggregate data into a dictionary
        node_dict = self.format_node_dictionary()

        ## append buffer files
        node_dict['files'] = files

        ## validate one more time...
        validate_files(node_dict)

        return node_dict
    
    def write_fftree(
        self,
        filename=None,
        handle=None,
        offset=0):

        ## we /were/ accumulating a weighted quantity for the CoM particles
        ##  but /now/ we have to divide that weight back out
        if self.weight_index is not None: weights = self.buffer_fieldss[self.weight_index]
        else: weights = np.ones(self.buffer_size)

        ## initialize the writer object that will 
        ##  convert the data to binary and write it in the
        ##  correct .fftree order
        binary_writer = BinaryWriter(
            filename,
            self.buffer_coordss,
            None if not self.has_velocities else
                np.array(self.buffer_velss)/weights[:,None],
            None if not self.has_colors else
                np.array(self.buffer_rgba_colorss)/weights[:,None])

        binary_writer.nparts = self.buffer_size
        binary_writer.nfields = self.nfields

        ## don't set binary_writer.field_names or binary_writer.<xxxx>_flags
        ##  because that info is stored in the octree.json file
        binary_writer.fields = np.array(self.buffer_fieldss)[:,:binary_writer.nfields]

        ## renormalize every field except Masses
        for i,field in enumerate(self.field_names[:binary_writer.nfields]):
            if i != self.weight_index: binary_writer.fields[:,i]/=weights

        ## take the transpose because binary_writer wants Nfields x Nparts
        ##  but make sure numpy doesn't do anything funny like give you a view 
        ##  of the transpose. change it in memory numpy!!
        binary_writer.fields = np.array(binary_writer.fields.T,order='C')

        ## creates a new file if handle is None
        byte_size = binary_writer.write(handle) 

        ## format aggregate data into a dictionary
        node_dict = self.format_node_dictionary()

        ## store the length in bytes for this node
        node_dict['byte_offset'] = 0 if handle is None else offset
        node_dict['buffer_filename'] = os.path.sep.join(filename.split(os.path.sep)[-3:])
        node_dict['byte_size'] = byte_size
        node_dict['ABG_byte_offsets'] = binary_writer.calculate_array_offsets()

        return node_dict


class Octree(object):
    def __repr__(self):
        my_str = f"{self.UIname} - {self.nparts_tot:,} parts ({len(self.root['nodes']):,} nodes) - {len(self.root['field_names'])} fields"
        return my_str
    
    def get_work_units(self,nthreads=1):

        work_units = []

        nodes = copy.deepcopy(self.root['nodes'])

        ## first find those nodes which need to be refined
        expand_nodes = [node for node in nodes.values() if
            'files' in node.keys() and 
            len(node['files']) > 0 and 
            node['buffer_size'] > self.min_to_refine]

        ## determine how many particles that represents
        nparts_tot = np.sum([node['buffer_size'] for node in expand_nodes])

        ## need to split that many particles among nthreads workers
        nparts_per_worker = [len(arr) for arr in np.array_split(np.arange(nparts_tot),nthreads)]
        this_node = None
        for nparts_this_worker in nparts_per_worker:
            work_unit = []
            nremain = nparts_this_worker
            while nremain > 0:
                if this_node is None: this_node = expand_nodes.pop(0)

                ## use this to differentiate between nodes that should
                ##  be deleted and those that should not
                this_node['processed'] = False

                if 'split_index' not in this_node.keys():
                    this_node['split_index'] = None

                this_node_nparts = this_node['nparts']

                ## add the whole node as a work unit
                if this_node_nparts <= nremain: 
                    work_unit += [this_node]
                    this_node = None
                    nremain -= this_node_nparts
                ## we only need part of this node to complete this worker's task queue
                else:
                    if this_node['split_index'] is None: this_node['split_index'] = 0
                    ## make a node that goes into the work unit
                    copy_node = {**this_node}
                    copy_node['nparts'] = nremain
                    this_node['nparts'] = this_node_nparts - nremain
                    copy_node['buffer_size'] = nremain
                    this_node['buffer_size'] = (this_node_nparts - nremain)

                    ## increment the split index for the copy of
                    ##  the node with the remaining particles
                    this_node['split_index'] +=1 

                    ## need to find the files that contain the subset we need
                    files = group_files(self.prefixes,this_node['files'])

                    first_split_files = []

                    for subfile_i in range(files.shape[1]):
                        npart_this_sub_file = int(eval(files[0,0,-1]))

                        ## add the first subfile in
                        first_split_files += [files[:,0]]

                        ## we can add the entire sub-file
                        ##  and still have room for more, 
                        ##  don't need to adjust the sizes of any files
                        if npart_this_sub_file <= nremain: 
                            ## get rid of the chunk file in the files array
                            files = np.delete(files,0,axis=1)
                            ## also have to get rid of it in the actual node dictionary
                            
                            for ftuple in first_split_files[-1]:
                                for this_index,ftuple_dict in enumerate(this_node['files']):
                                    if (ftuple[0] == ftuple_dict[0]): break
                                this_node['files'].pop(this_index)
                            nremain -= npart_this_sub_file
                        ## need to take *only a portion* of this chunk file.
                        ##  so we need to update the size inside first_split_files
                        ##  and inside the node
                        else: 
                            ## get rid of the chunk file in the files array
                            ## update the most recent list entry
                            ##  with the bytesize it should read
                            first_split_files[-1][...,-1] = int(nremain)

                            ## update the remaining files in the dictionary
                            ##  to reflect that the first part of the byte
                            ##  string is missing
                            for ftuple in first_split_files[-1]:
                                for this_index,ftuple_dict in enumerate(this_node['files']):
                                    if (ftuple[0] == ftuple_dict[0]): break
                                
                                this_node['files'][this_index] = (
                                    this_node['files'][this_index][0],
                                    ## whatever byte offset this sub file might've had
                                    int(first_split_files[-1][0,1]) + nremain*4,
                                    int(npart_this_sub_file-nremain)
                                )
                            nremain = 0
                            break ## we've filled up the node

                    copy_node['files'] = np.array(first_split_files).reshape(-1,3).tolist()
                    this_node['files'] = np.array(this_node['files']).tolist()

                    work_unit +=[copy_node]
                    nremain = 0

            work_units += [work_unit]

        self.work_units = work_units

        return work_units

    def print_work(self):
        namess = [[expand_node['name'] for expand_node in expand_nodes] for 
            expand_nodes in self.work_units]
        
        to_do = list(set(np.hstack(namess)))
        nparts = [self.root['nodes'][name]['buffer_size'] for name in to_do]
        if len(to_do) > 0: print(f"{self} ({100*(1-np.sum(nparts)/self.nparts_tot):0.1f}%) {to_do}")

    def __init__(
        self,
        UIname,
        pathh,
        min_to_refine=1e6):

        self.UIname = UIname
        """ pathh is path to data that has already been saved to .ffraw format and has an acompanying octree.json """
        ## gotsta point us to an octree my friend
        if not os.path.isdir(pathh): raise IOError(pathh)

        self.pathh = pathh
        self.min_to_refine = min_to_refine

        ## read octree summary file
        self.root = load_from_json(os.path.join(pathh,'octree.json'))

        self.nparts = np.array([node_dict['buffer_size'] for node_dict in self.root['nodes'].values()])
        self.nparts_tot = np.sum(self.nparts)
        self.node_names = np.array(list(self.root['nodes'].keys()))

        self.prefixes = (['x','y','z'] +
            ['vx','vy','vz']*self.root['has_velocities'] + 
            ['rgba_r','rgba_g','rgba_b','rgba_a']*self.root['has_colors'] + 
            self.root['field_names'])

        self.get_work_units()

    def full_refine(self,nthreads,nrecurse=0,use_mps=True,loud=True):
        init_time = time.time()

        while len(self.work_units[0]) >0:
            try: self.refine(nthreads,nrecurse,use_mps,loud)
            except IndexError as e:
                print(e.args[0])
                break

        if loud: 
            print()
            print(((time.time()-init_time)/60),'min elapsed')

    def refine(self,nthreads=1,nrecurse=0,use_mps=True,loud=True):

        argss = zip(
            self.get_work_units(nthreads),
            np.arange(nthreads,dtype=int),
            itertools.repeat(self.pathh),
            itertools.repeat(self.min_to_refine),
            itertools.repeat(self.root['field_names']),
            itertools.repeat(nthreads),
            itertools.repeat(nrecurse)
        )
            #node_dicts,
            #target_directory,
            #min_to_refine,
            #field_names
            #nrecurse=0


        ## print which nodes need to be refined to the console
        if loud: self.print_work()

        ## validate all the files
        validate_files(self.root)

        if np.size(self.work_units) == 0: raise IndexError("No work to be done! Celebrate!")

        if not use_mps or nthreads <= 1: 
            new_dicts = [refineNode(*args) for args in argss]
        else: 
            with multiprocessing.Pool(nthreads) as my_pool: new_dicts = my_pool.starmap(refineNode,argss)


        bad_files = set([])
        good_files = []
        popped = []
        for work_unit,children in zip(self.work_units,new_dicts):
            
            for old_node in work_unit:
                old_name = old_node['name']

                ## only remove it if it hasn't already been removed
                if old_name not in popped:
                    self.root['nodes'].pop(old_name)
                    popped+=[old_name]

                ## accumulate the bad files though. don't do this outside the loop
                ##  because there are nodes that don't need to be refined anymore
                ##  that aren't referenced in the new children
                this_bad_files = [fname[0] for fname in old_node['files']]
                bad_files = bad_files.union(set(this_bad_files))

            ## register the old_node (children[0]) and each of its children.
            for child in children: self.register_child(child)

            ## delete any files that are no longer being pointed to.
            good_files += [[ fname[0] for fname in node['files'] ] for node in children 
                if 'files' in node.keys() and node['buffer_size']>0]

        good_files = set(np.hstack(good_files))
        bad_files -= good_files
        for bad_file in bad_files:
            if os.path.isfile(bad_file): os.remove(bad_file)
        if len(bad_files) > 0: print('deleting',len(bad_files),'unreferenced files.')#,bad_files)

        ## write out the new octree.json
        write_to_json(self.root,os.path.join(self.pathh,'octree.json'))

        ## and validate once more...
        validate_files(self.root)
 
    def register_child(self,new_child,debug=False):

        weight_index = self.root['weight_index']
        child_name = new_child['name']
        ## easy, we've never seen this child before
        if child_name not in self.root['nodes']: self.root['nodes'][child_name] = new_child
        ## annoying, need to append...
        else:
            nodes = self.root['nodes']
            old_child = nodes[child_name]

            field_names = self.root['field_names']
            
            ## update the accumulated values
            if weight_index is not None:
                old_weight = old_child[field_names[weight_index]]
                new_weight = new_child[field_names[weight_index]]
            else: 
                old_weight = old_child['nparts']
                new_weight = new_child['nparts']

            for i,field_name in enumerate(
                field_names+['center_of_mass','com_velocity','rgba_color']):

                ## if don't have velocity or rgba_color, for example
                if old_child[field_name] is None: continue

                if weight_index is None or i!= weight_index:
                    old_this_weight = old_weight
                    new_this_weight = new_weight
                else: old_this_weight = new_this_weight = 1

                old_child[field_name] = (
                    (old_child[field_name]*old_this_weight + 
                        new_child[field_name]*new_this_weight) / 
                    (old_weight + new_weight))

            ## handle radius separately because have to do rms
            old_child['radius'] = np.sqrt((
                old_child['radius']**2*old_weight + 
                new_child['radius']**2*new_weight)/
                (old_weight+new_weight))

            ## add the number of particles
            old_child['nparts']+=new_child['nparts']
            old_child['buffer_size']+=new_child['buffer_size']
            if 'files' in new_child.keys():
                if 'files' not in old_child.keys(): old_child['files'] = []
                old_child['files'] += new_child['files']

            ## shouldn't need to do this b.c. aliasing
            ##  but you know one can never be too careful
            self.root['nodes'][child_name] = old_child

        if debug: print(child_name,'registered:',new_child['buffer_size'],'/',self.root['nodes'][child_name]['buffer_size'],'particles')

    def convert_ffraw_to_fftree(self,target_directory,fname_pattern,nthreads=1):
        ## sanitize input
        if not os.path.isdir(target_directory): os.makedirs(target_directory)
        if '%' not in fname_pattern: raise ValueError(
            f"fname_pattern must be a format string with % not {fname_pattern}")

        ## setup the work array, each node is indpt so we can multi-thread if desired
        num_nodes = len(self.root['nodes'].keys())
        argss = zip(
            self.root['nodes'].values(),
            [os.path.join(target_directory,fname_pattern%i) for i in range(num_nodes)],
            itertools.repeat(self.root['field_names'])
        )

        if nthreads <=1:
            ## single threaded, print a progress bar
            new_node_dicts = []
            printProgressBar(0,num_nodes,prefix='Converting .ffraw to .fftree')
            for i,args in enumerate(argss):
                new_node_dicts += [convertNodeFFRawFFTree(*args)]
                printProgressBar(i+1,num_nodes,prefix='Converting .ffraw to .fftree')
        else:
            with multiprocessing.Pool(min(num_nodes,multiprocessing.cpu_count())) as my_pool:
                new_node_dicts = my_pool.starmap(convertNodeFFRawFFTree,argss)

        ## now update the self.root dictionary
        for i,new_node_dict in enumerate(new_node_dicts):
            ## the children are lost in translation so the new node dict has to inherit them manually
            children = self.root['nodes'][new_node_dict['name']]['children']
            ## replace the dictionary
            self.root['nodes'][new_node_dict['name']] = new_node_dict
            ## inherit the children
            self.root['nodes'][new_node_dict['name']]['children'] = children


## what gets passed to the multiprocessing.Pool
def refineNode(
    node_dicts,
    thread_id,
    target_directory,
    min_to_refine,
    field_names,
    nthreads,
    nrecurse=0):

    output_dir = os.path.join(target_directory,f"output_{thread_id:02d}.0")
    if not os.path.isdir(output_dir): os.makedirs(output_dir)
    this_length = len(os.listdir(output_dir))

    ## find an output directory that has room for our files
    while this_length >= 1e4:
        base,count = os.path.basename(output_dir).split('.')
        output_dir = os.path.join(target_directory,f"{base}.{int(count)+1}")

        if not os.path.isdir(output_dir): os.makedirs(output_dir)
        this_length = len(os.listdir(output_dir))

    return_value = []
    for node_dict in node_dicts:
        this_node = OctNode(
            node_dict['center'],
            node_dict['width'],
            field_names,
            node_dict['name'],
            has_velocities=node_dict['com_velocity'] is not None,
            has_colors=node_dict['rgba_color'] is not None,
            ## nthreads will reduce the minimum number of particles to be
            ##  merged back into a parent b.c. multiple threads may have child
            ##  particles and that could push the parent back over the maximum
            ##  in an infinite loop.
            nthreads=nthreads)  
        
        ## load the particle data for this node from disk
        this_node.set_buffers_from_disk(node_dict['files'],node_dict['buffer_size'])

        ## sort these points directly into the children
        this_node.cascade(
            min_to_refine,
            ## only cascade children if they aren't split across threads
            ##  otherwise we need to synchronize after each refinement
            nrecurse if node_dict['split_index'] is None else 0)

        ## walk the sub-tree we just created and write node files to disk
        ##  returns a list of dictionaries summarizing the node files that were written to disk
        return_value += this_node.write_tree(output_dir,node_dict['split_index'],write_protect=True)
   
    return return_value 

def group_files(prefixes,files):
    ## group files by prefix with arbitrary number of files for each prefix
    ##  without having to check if `prefix in fname` b.c. that would mess up 
    ##  fields that include vx, x, etc...
    #files = np.transpose(np.array(sorted(files)).reshape(-1,len(prefixes),3),axes=(1,0,2))
    filenames_expand = np.array([
        fname[0].split(os.path.sep) + list(fname[1:])
        for fname in sorted(files)])
    new_files = sorted(filenames_expand,key=lambda x: x[-3])
    new_files = [[os.path.sep+os.path.join(*fline[:-2]),fline[-2],fline[-1]] for fline in new_files]
    new_files = np.array(np.array_split(new_files,len(prefixes)),dtype=object)#np.transpose(np.array(sorted(files)).reshape(-1,len(prefixes),3),axes=(1,0,2))

    ## now rearrange them to match the prefix order. don't ask
    ##  for whom the hack tolls for it tolls for thee
    new_files = new_files[np.argsort(np.argsort(prefixes))]

    for i,prefix in enumerate(prefixes):
        for isubfile,ftuple in enumerate(new_files[i]):
            if os.path.basename(ftuple[0]).split('.')[0][-len(prefix):] != prefix: 
                print(os.path.basename(ftuple[0]).split('.')[0][-len(prefix):],prefix)
                print(new_files)
                import pdb; pdb.set_trace()
                raise IOError('File grouping failed. Alert Alex immediately!!')

    return new_files

def validate_files(dictionary):

    ## pass a dictionary of dictionaries
    if 'nodes' in dictionary.keys():
        for node_name in dictionary['nodes'].keys():
            ## recursively validate
            validate_files(dictionary['nodes'][node_name])
        return True
    ## passed a single dictionary
    elif 'files' in dictionary.keys(): ftuples = dictionary['files']
    else: return True#raise KeyError(f"No files to validate in {dictionary.keys()}")

    validate_dict = {}
    for fname,byte_offset,count in ftuples:
        fsize = os.path.getsize(fname)
        filekey = os.path.basename(fname)
        if filekey not in validate_dict.keys():
            validate_dict[filekey] = [int(fsize/4-1),count]
        else: 
            validate_dict[filekey][0] += int(fsize/4-1) ## -1 b.c. ignore header bytes
            validate_dict[filekey][1] += count
    
    for key,(fcount,count) in validate_dict.items():
        if fcount != count: 
            raise IOError(
            f"{key} : {fcount:.0f} particles on disk but {count} in metadata.")
        #print(key,end='\t')
    #print()
    return True

def init_octree_root_node(dictionary,top_level_directory=None,thread_id=0):
    """
    root_dict = {'field_names':self.field_names,
            'has_velocities':self.has_velocities,
            'has_colors':self.has_colors,
            'weight_index':self.weight_index,
            'nodes':{}}
    """


    root = OctNode(None,None,[]) 
    root_dict = root.set_buffers_from_dict(dictionary,init_node=True)

    if top_level_directory is not None:
        output_dir = os.path.join(top_level_directory,f'output_{thread_id:02d}.0')
        root_dict['nodes'][root.name] = root.write(output_dir)
        write_to_json(root_dict,os.path.join(top_level_directory,'octree.json'))

    return root_dict

def convertNodeFFRawFFTree(
    node_dict,
    fname,
    field_names):

    if 'files' not in node_dict.keys(): return node_dict

    ## create a new octnode object to translate the data with
    node = OctNode(
        node_dict['center'],
        node_dict['width'],
        field_names,
        node_dict['name'],
        has_velocities=node_dict['com_velocity'] is not None,
        has_colors=node_dict['rgba_color'] is not None) 
    ## load the node's particles from the .ffraw files
    node.set_buffers_from_disk(node_dict['files'],node_dict['buffer_size'])
    return node.write_fftree(fname)