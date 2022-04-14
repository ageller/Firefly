import numpy as np

class BinaryWriter(object):
    
    def __init__(
        self,
        fname,
        coordinates,
        velocities=None,
        rgba_colors=None,
        shuffle=True):
        
        ## bind input
        self.fname = fname

        ## massage coordinate input if necessary
        coordinates = np.array(coordinates,ndmin=2)
        if (len(coordinates.shape) != 2 or coordinates.shape[1] != 3):
            raise ValueError("coordinates must be an Nx3 array")


        if velocities is not None:
            if( len(velocities.shape) != 2 or
                velocities.shape[1] != 3 or
                velocities.shape[0] != coordinates.shape[0]):
                raise ValueError("velocities must be an Nx3 array")

        if rgba_colors is not None:
            if( len(rgba_colors.shape) != 2 or
                rgba_colors.shape[1] != 4 or
                rgba_colors.shape[0] != coordinates.shape[0]):
                raise ValueError("rgba_colors must be an Nx4 array")

        ## now that we've confirmed we were passed appropriately shaped arrays
        ##  let's bind them
        self.nparts = coordinates.shape[0]
        self.coordinates = coordinates
        self.velocities = velocities
        self.rgba_colors = rgba_colors
        
        ## initialize scalar field variables
        self.nfields = 0
        self.fields = []
        self.field_names = []
        self.filter_flags = []
        self.colormap_flags = []
        self.radius_flags = []

        self.shuffle_indices = None
        if shuffle: 
            self.shuffle_indices = np.arange(coordinates.shape[0],dtype=int)
            ## modifies in-place
            np.random.shuffle(self.shuffle_indices)
    
    def write(self):
        with open(self.fname,'wb') as handle:
            byte_size = 0
            byte_size += self.write_header(handle)
            byte_size += self.write_vector_field(handle,self.coordinates)
            if self.velocities is not None: byte_size += self.write_vector_field(handle,self.velocities)
            if self.rgba_colors is not None: byte_size += self.write_vector_field(handle,self.rgba_colors)
            for field in self.fields: byte_size += self.write_field(handle,field)
            return byte_size

    def write_header(self,handle):
        byte_size = 0
        header_size = 0

        ## size of the header, 2 32 bit ints and a 1 bit boolean
        header_size += 4 ## size of header
        header_size += 1 ## velocity flag
        header_size += 1 ## rgba_color flag
        header_size += 4 ## nparts 
        header_size += 4 ## nfields
        ## length of string as an int followed by the string
        ## each char gets 4 bytes for UTF-8 (ascii is just 1 byte tho)
        header_size += 4*self.nfields + 4*np.sum([len(field_name) for field_name in self.field_names]) 
        header_size += 3*self.nfields ## filter, colormap, and radius flags

        byte_size += self.write_int(handle,header_size) 
        ## boolean flag for whether there are velocities
        byte_size += self.write_flag(handle,self.velocities is not None)
        ## boolean flag for whether there are rgba_colors
        byte_size += self.write_flag(handle,self.rgba_colors is not None)
        ## number of particles
        byte_size += self.write_int(handle,self.nparts) 
        ## number of scalar fields
        byte_size += self.write_int(handle,self.nfields)
        ## write each field name as a variable byte-length string
        for field_name in self.field_names: byte_size += self.write_field_name(handle,field_name)
        ## write the filter flag array
        byte_size += self.write_flag(handle,self.filter_flags)
        ## write the colormap flag array
        byte_size += self.write_flag(handle,self.colormap_flags)
        ## write the scale-by radius flag array
        byte_size += self.write_flag(handle,self.radius_flags)

        if header_size != byte_size: 
            raise IOError(
                f"We did not count our bytes correctly predicted:{header_size:d} counted:{byte_size:d}")
        return byte_size

    def write_flag(self,handle,flag):
        ##allow overload-- can send in and integer and/or an array of integers
        flag = np.array(flag,dtype=bool)
        handle.write(flag)
        return flag.size
    
    def write_int(self,handle,integer):
        arr = np.array(integer,dtype=np.int32)
        handle.write(arr)
        return 4*arr.size
                
    def write_field_name(self,handle,field_name):
        str_len = len(field_name)
        ## write the length of the string
        handle.write(np.int32(str_len))
        handle.write(field_name.encode('UTF-8'))
        return 4 + str_len*4
        
    def write_vector_field(self,handle,vfield):
        ## flatten the vector field to write it, row-major order.
        if self.shuffle_indices is not None: vfield = vfield[self.shuffle_indices]
        handle.write(np.array(vfield,dtype=np.float32).flatten())
        return vfield.size*4

    def write_field(self,handle,field):
        if self.shuffle_indices is not None: field = field[self.shuffle_indices]
        handle.write(field.astype(np.float32))
        return field.size*4
     
    def add_field(
        self,
        field,
        field_name,
        filter_flag=True,
        colormap_flag=True,
        radius_flag=False):

        if field.size != self.nparts: 
            raise ValueError("Field must have %d particles, not %d"%(self.nparts,field.size))

        self.fields += [field]
        self.field_names += [field_name]
        self.nfields+=1

        self.filter_flags+=[filter_flag]
        self.colormap_flags+=[colormap_flag]
        self.radius_flags+=[radius_flag]
        
class OctBinaryWriter(BinaryWriter):
    ## assumes we have already opened a handle-- we're
    ##  actually appending to a binary file
    ##  TODO: this could really mess up the octree streamer :\
    def write(self,handle=None):
        """
seq:
  - id: octree_header
    type: header
  - id: node
    type: node_data 
types: 
    """
        if handle is None:
            with open(self.fname,'wb') as handle:
                byte_size = 0
                byte_size += self.write_header(handle)
                byte_size += self.write_node(handle)
        else:
            byte_size = 0
            byte_size += self.write_header(handle)
            byte_size += self.write_node(handle)
        return byte_size
        
    def write_header(self,handle):
        """
header:
    seq:
      - id: node_size
        type: u4
      - id: has_velocities
        type: u1
        doc: A flag for whether this file contains vector velocities
      - id: nfields 
        type: u4
        doc: number of scalar fields which are tracked alongside coordinates and velocities
        """

        byte_size = 0
  
        byte_size += self.write_int(handle,self.nparts)
        byte_size += self.write_flag(handle,self.velocities is not None)
        byte_size += self.write_flag(handle,self.rgba_colors is not None)
        byte_size += self.write_int(handle,self.nfields)

        return byte_size
    
    def write_node(self,handle):
        """
node_data:
    seq:
      - id: coordinates_flat
        type: vector_field('f4')
      - id: velocities_flat
        type: vector_field('f4')
        if: _root.octree_header.has_velocities != 0
      - id: scalar_fields
        type: scalar_field('f4')
        repeat: expr
        repeat-expr: _root.octree_header.nfields
        """
        byte_size = 0

        byte_size += self.write_vector_field(handle,self.coordinates)
        if self.velocities is not None: byte_size += self.write_vector_field(handle,self.velocities)
        if self.rgba_colors is not None: byte_size += self.write_vector_field(handle,self.rgba_colors)
        for field in self.fields: byte_size+= self.write_field(handle,field)

        return byte_size


if __name__ == '__main__':
    #print(np.arange(300).reshape(-1,3))
    my_writer = BinaryWriter('test.b',np.arange(300).reshape(-1,3),np.arange(300).reshape(-1,3))
    my_writer.add_field(np.arange(100,200),'my_field')
    my_writer.add_field(np.arange(100,200),'my_other_field')
    my_writer.write()