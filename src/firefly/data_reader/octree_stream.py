import os
import itertools
import copy
import multiprocessing
import itertools

import numpy as np

from .octree import octant_offsets
from .json_utils import load_from_json,write_to_json
from .binary_writer import RawBinaryWriter
from abg_python.system_utils import printProgressBar


class OctNodeStream(object):
    def __repr__(self):
        return f"OctNodeStream({self.name}):{self.buffer_size}/{self.nparts:d} points - {self.nfields:d} fields"
        
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
 
    def set_buffers_from_dict(
        self,
        data_dict,
        target_directory=None):
 
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

        width = np.max(coordss.max(axis=0) - coordss.min(axis=0))

        self.width = width
        self.center = np.zeros(3)
 
        self.set_buffers_from_arrays(
            coordss,
            fieldss,
            velss,
            rgba_colorss)
        
        root_dict = {}

        root_dict = {'field_names':self.field_names,
            'has_velocities':self.has_velocities,
            'has_colors':self.has_colors,
            'weight_index':self.weight_index,
            'nodes':{}}

        if target_directory is not None:
            output_dir = os.path.join(target_directory,f"output_0.0")
            root_dict['nodes'][self.name] = self.write(output_dir)
            write_to_json(root_dict,os.path.join(target_directory,'octree.json'))
        
        return root_dict

    def set_buffers_from_disk(self,files,nparts):

        indices = []
        for fname in files: 
            split = os.path.basename(fname[0]).split('.')
            if len(split) != 3: raise IOError("bad .ffraw file name, must be field.<i>.ffraw")
            if split[-1] == 'ffraw': 
                indices += [int(split[-2])]
        indices = np.unique(indices)
        
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

        count_offset = 0
        for index in indices:
            for prefix,buffer in zip(
                self.prefixes,
                buffers):
                for fname in files:
                    fname,byte_offset,byte_size = fname
                    count = int(byte_size/4) ## -1 because the header is integer=nparts
                    short_fname = os.path.basename(fname)
                    match = f"{prefix}.{index}.ffraw"
                    if short_fname[-len(match):] == match:
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
        rgba_colorss:np.ndarray=None):

        if coordss is None: coordss = np.zeros((0,3))

        self.buffer_coordss = coordss
        self.buffer_coordss = self.buffer_coordss.tolist()

        self.buffer_size = coordss.shape[0]
        self.nparts = coordss.shape[0]

        ## initialize the field buffers
        if fieldss is not None:
            self.nfields = fieldss.shape[1]

            ## +6 to hold the com and com^2 fields
            self.buffer_fieldss = np.zeros((coordss.shape[0],self.nfields+6))
            self.buffer_fieldss[:,:-6] = fieldss

            for i in range(3):
                self.buffer_fieldss[:,-6+i] = coordss[:,i]
                self.buffer_fieldss[:,-3+i] = (coordss[:,i]**2)

        else: self.buffer_fieldss = np.zeros((0,self.nfields))
        self.buffer_fieldss = self.buffer_fieldss.tolist()
 
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
            if velss.shape[0] != self.buffer_size:
                raise IndexError(
                    f"Size of velss ({velss.shape[0]})"+
                    f"does not match size of buffer ({self.buffer_size})")
            self.buffer_velss = velss * weights

        else: self.buffer_velss = np.zeros((0,3))
        self.buffer_velss = self.buffer_velss.tolist()

        ## initialize the rgba_colors buffer
        if rgba_colorss is not None:
            if rgba_colorss.shape[0] != self.buffer_size:
                raise IndexError(
                    f"Size of rgba_colorss ({rgba_colorss.shape[0]})"+
                    f"does not match size of buffer ({self.buffer_size})")
            self.buffer_rgba_colorss = rgba_colorss * weights

        else: self.buffer_rgba_colorss = np.zeros((0,4))
        self.buffer_rgba_colorss = self.buffer_rgba_colorss.tolist()  

        ## initialize com accumulators
        self.velocity = np.sum(self.buffer_velss,axis=0)
        self.rgba_color = np.sum(self.buffer_rgba_colorss,axis=0)
        self.fields = np.sum(self.buffer_fieldss,axis=0)
 
    def cascade(self,min_to_refine,nrecurse=0):

        print('Refining:',self)
        ## flush the buffer into its children
        printProgressBar(0,self.buffer_size,prefix = 'Progress:',suffix='complete',length=50,decimals=0)
        for i in range(self.buffer_size):
            self.sort_point_into_child(
                self.buffer_coordss[i], 
                self.buffer_fieldss[i],
                self.buffer_velss[i] if self.has_velocities else None,
                self.buffer_rgba_colorss[i] if self.has_colors else None)
            printProgressBar(i+1,self.buffer_size,prefix = 'Progress:',suffix='complete',length=50,decimals=0)
        printProgressBar(i+1,self.buffer_size,prefix = 'Progress:',suffix='complete',length=50,decimals=0)

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

        print('New children:',self.child_names)

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
            child = OctNodeStream(
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
        else: child:OctNodeStream = self.children[self.child_names.index(child_name)]

        child.accumulate(coords,fields,vels,rgba_colors)

    def prune(self,min_to_refine):
        sort_indices = np.argsort([child.buffer_size for child in self.children])
        sort_children = np.array(self.children)[sort_indices]
        for child in sort_children:
            if (child.buffer_size + self.buffer_size) < min_to_refine/self.nthreads:
                #print(f'Merging {child} into {self}')
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
        if self.buffer_size > 0: print(f"Merged {self.buffer_size} particles back into parent.")

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

    def write_tree(self,target_directory,split_index):

        ## format accumulated values into a dictionary
        if self.buffer_size == 0:
            this_node_dict = self.format_node_dictionary()
        ## some children were merged back into the parent, write them to disk
        else: this_node_dict = self.write(target_directory,split_index)

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

    def write(self,top_level_directory,split_index=None,bytes_per_file=4e7):

        ## convert buffers to numpy arrays
        self.buffer_coordss = np.array(self.buffer_coordss)
        self.buffer_fieldss = np.array(self.buffer_fieldss)
        self.buffer_velss = np.array(self.buffer_velss)
        self.buffer_rgba_colorss = np.array(self.buffer_rgba_colorss)

        this_dir = os.path.join(top_level_directory)
        if not os.path.isdir(this_dir): os.makedirs(this_dir)

        namestr = f'{self.name}-' if self.name != '' else 'root-'
        splitstr = f'{split_index:02d}-' if split_index is not None else ''

        ## determine how many files we'll need to split this dataset into
        nsub_files = int(4*self.buffer_size//bytes_per_file + (4*self.buffer_size != bytes_per_file))
        counts = [arr.shape[0] for arr in np.array_split(np.arange(self.buffer_size),nsub_files)]

        ## ------ gather buffer array aliases to be written to disk
        buffers = [self.buffer_coordss[:,0],self.buffer_coordss[:,1],self.buffer_coordss[:,2]]

        if self.has_velocities:
            if self.buffer_velss.shape[0] > 0:
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
        count_offset = 0
        for index,count in enumerate(counts):
            for prefix,buffer in zip(self.prefixes,buffers):
                fname = os.path.join(top_level_directory,f"{namestr}{splitstr}{prefix}.{index}.ffraw")
                RawBinaryWriter(fname,buffer[count_offset:count_offset+count]).write()

                ## append to file list
                files += [(fname,0,count*4)]

            count_offset+=count

        ## format aggregate data into a dictionary
        node_dict = self.format_node_dictionary()

        ## append buffer files
        node_dict['files'] = files

        return node_dict

class OctreeStream(object):

    def __repr__(self):
        return f"OctreeStream({len(self.work_units)}/{len(self.root['nodes'])})"
    
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

                    min_chunk = 1e10
                    ## find the earliest remaining chunk
                    for fname in copy_node['files']:
                        this_chunk = int(fname[0].split('.')[-2])
                        if  this_chunk < min_chunk: min_chunk = this_chunk

                    assigned = 0
                    first_split_files = []
                    ichunk = min_chunk
                    while assigned < nremain:
                        popped = 0
                        this_chunk_files = []
                        for i in range(len(this_node['files'])):
                            fname = this_node['files'][i-popped]
                            ## ignore any chunks that aren't the one we're looking for
                            if int(fname[0].split('.')[-2]) != ichunk: continue

                            this_chunk_files += [copy.deepcopy(this_node['files'][i-popped])]
                            n_this_chunk = fname[2]/4

                            ## we can add the whole chunk file
                            if n_this_chunk <= nremain: 
                                ## get rid of the chunk file in the
                                ##  node list
                                this_node['files'].pop(i-popped)
                                popped+=1
                            ## need to take *only a portion* of this chunk file.
                            else: 
                                ## update the most recent list entry
                                ##  with the bytesize it should read
                                this_chunk_files[-1] = (
                                    this_chunk_files[-1][0],
                                    this_chunk_files[-1][1],
                                    4*nremain
                                )

                                ## update the remaining files to reflect that the first part of the byte
                                ##  string is missing
                                this_node['files'][i-popped] = (
                                    this_chunk_files[-1][0],
                                    this_chunk_files[-1][1]+nremain*4,
                                    4*(n_this_chunk-nremain)
                                )

                        first_split_files += this_chunk_files
                        assigned += min(n_this_chunk,nremain)
                        ichunk+=1

                    copy_node['files'] = first_split_files

                    work_unit +=[copy_node]
                    nremain = 0

            work_units += [work_unit]

        self.work_units = work_units
        self.print_work()

        return work_units

    def __init__(self,pathh,min_to_refine=1e6):
        """ pathh is path to data that has already been saved to .ffraw format and has an acompanying octree.json """
        ## gotsta point us to an octree my friend
        if not os.path.isdir(pathh): raise IOError(pathh)

        self.pathh = pathh
        self.min_to_refine = min_to_refine

        ## read octree summary file
        self.root = load_from_json(os.path.join(pathh,'octree.json'))

        nodes = self.root['nodes']

        self.get_work_units()

    def refine(self,nthreads=1,nrecurse=0):

        argss = zip(
            self.get_work_units(nthreads),
            np.arange(nthreads,dtype=int),
            itertools.repeat(self.pathh),
            itertools.repeat(self.min_to_refine),
            itertools.repeat(self.root['field_names']),
            itertools.repeat(nrecurse)
        )
            #node_dicts,
            #target_directory,
            #min_to_refine,
            #field_names
            #nrecurse=0

        if np.size(self.work_units) == 0: raise IndexError("No work to be done! Celebrate!")

        if nthreads <=1: 
            new_dicts = [refineNode(*args) for args in argss]
        else: 
            with multiprocessing.Pool(nthreads) as my_pool: new_dicts = my_pool.starmap(refineNode,argss)


        bad_files = set([])
        popped = []
        for work_unit,children in zip(self.work_units,new_dicts):
            
            for old_node in work_unit:
                old_name = old_node['name']

                ## only remove it if it hasn't already been removed
                if old_name not in popped:
                    self.root['nodes'].pop(old_name)
                    popped+=[old_name]

                ## do want to accumulate the bad files though
                this_bad_files = [fname[0] for fname in old_node['files']]
                bad_files = bad_files.union(set(this_bad_files))

            ## register the old_node (children[0]) and each of its children.
            for child in children: self.register_child(child)

        ## delete any files that are no longer being pointed to.
        good_files = [[ fname[0] for fname in node['files'] ] for node in children 
            if 'files' in node.keys() and node['buffer_size']>0]
        good_files = set(np.hstack(good_files))
        bad_files -= good_files
        for bad_file in bad_files:
            if os.path.isfile(bad_file): os.remove(bad_file)
        if len(bad_files) > 0: print('deleting',len(bad_files),'unreferenced files.')#,bad_files)

        ## write out the new octree.json
        write_to_json(self.root,os.path.join(self.pathh,'octree.json'))

    def print_work(self):
        namess = [[expand_node['name'] for expand_node in expand_nodes] for 
            expand_nodes in self.work_units]

        print(set(np.hstack(namess)),'still need to be refined')
    
    def register_child(self,new_child):

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

        print(child_name,'registered:',new_child['buffer_size'],'/',self.root['nodes'][child_name]['buffer_size'],'particles')

    def full_refine(self,nthreads,nrecurse=0):

        while len(self.work_units) >0:
            print(self)
            try: self.refine(nthreads,nrecurse)
            except IndexError as e:
                print(e.args[0])
                break

## what gets passed to the multiprocessing.Pool
def refineNode(
    node_dicts,
    thread_id,
    target_directory,
    min_to_refine,
    field_names,
    nrecurse=0):

    output_dir = os.path.join(target_directory,f"output_{thread_id:d}.0")

    return_value = []
    for node_dict in node_dicts:
        
        this_node = OctNodeStream(
            node_dict['center'],
            node_dict['width'],
            field_names,
            node_dict['name'],
            has_velocities=False,
            has_colors=False)
        
        ## load the particle data for this node from disk
        this_node.set_buffers_from_disk(node_dict['files'],node_dict['buffer_size'])

        ## sort these points directly into the children
        this_node.cascade(
            min_to_refine,
            ## only cascade children if they aren't split across threads
            ##  otherwise we need to synchronize after each refinement
            nrecurse if node_dict['split_index'] is None else 0)

        if not os.path.isdir(output_dir): os.makedirs(output_dir)
        this_length = len(os.listdir(output_dir))

        ## find an output directory that has room for our files
        while this_length >= 1e4:
            base,count = output_dir.split(output_dir)
            output_dir = f"{base}.{int(count)+1}"

            if not os.path.isdir(output_dir): os.makedirs(output_dir)
            this_length = len(os.listdir(output_dir))

        ## walk the sub-tree we just created and write node files to disk
        ##  returns a list of dictionaries summarizing the node files that were written to disk
        return_value += this_node.write_tree(output_dir,node_dict['split_index'])
   
    return return_value 