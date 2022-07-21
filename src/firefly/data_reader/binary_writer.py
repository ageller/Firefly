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
        
    def write(self,handle=None):
        if handle is None:
            with open(self.fname,'wb') as handle:
                byte_size = 0
                byte_size += self.write_header(handle)
                byte_size += self.write_particle_data(handle)
        else:
            byte_size = 0
            byte_size += self.write_header(handle)
            byte_size += self.write_particle_data(handle)

        return byte_size

    def write_header(self,handle):

        header_size = self.calculate_header_size()

        byte_size = 0
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
        if len(self.filter_flags) > 0: byte_size += self.write_flag(handle,self.filter_flags)
        ## write the colormap flag array
        if len(self.colormap_flags) > 0: byte_size += self.write_flag(handle,self.colormap_flags)
        ## write the scale-by radius flag array
        if len(self.radius_flags) > 0: byte_size += self.write_flag(handle,self.radius_flags)

        if header_size != byte_size: 
            raise IOError(
                f"We did not count our bytes correctly predicted:{header_size:d} counted:{byte_size:d}")
        return byte_size 

    def write_particle_data(self,handle):
        byte_size = 0

        byte_size += self.write_vector_field(handle,self.coordinates)
        if self.velocities is not None: byte_size += self.write_vector_field(handle,self.velocities)
        if self.rgba_colors is not None: byte_size += self.write_vector_field(handle,self.rgba_colors)
        for field in self.fields: byte_size+= self.write_field(handle,field)

        return byte_size
 
    def write_int(self,handle,integer):
        arr = np.array(integer,dtype=np.int32)
        handle.write(arr)
        return 4*arr.size

    def write_flag(self,handle,flag):
        ##allow overload-- can send in and integer and/or an array of integers
        flag = np.array(flag,dtype=bool)
        handle.write(flag)
        return flag.size
                
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
      
    def calculate_header_size(self):
        header_size = 0
        header_size += 4 ## this integer we're predicting
        header_size += 1 ## velocity flag
        header_size += 1 ## rgba_color flag
        header_size += 4 ## nparts 
        header_size += 4 ## nfields

        ## length of string (int) followed by the string
        ## each char gets 4 bytes for UTF-8 
        header_size += 4*np.sum([1+len(field_name) for field_name in self.field_names]) 

        ## filter, colormap, and radius flags, each a single byte boolean
        if len(self.filter_flags) > 0: header_size += self.nfields
        if len(self.colormap_flags) > 0: header_size += self.nfields
        if len(self.radius_flags) > 0: header_size += self.nfields

        return header_size

    def calculate_array_offsets(self):
        header_size = self.calculate_header_size()

        byte_lengths = np.array(
            [header_size, 4*self.nparts * 3] + 
            [4*self.nparts * 3]*(self.velocities is not None) +
            [4*self.nparts * 4]*(self.rgba_colors is not None) + 
            [4*self.nparts for i in range(len(self.fields))] )

        ## don't need the last entry-- that will be the entire length
        ##  of the byte string
        return np.cumsum(byte_lengths)[:-1]

class RawBinaryWriter(BinaryWriter):

    def write(self,handle=None):
        if handle is None:
            with open(self.fname,'wb') as handle:
                byte_size = 0
                byte_size += self.write_header(handle)
                byte_size += self.write_field(handle,self.data)
        else:
            byte_size = 0
            byte_size += self.write_header(handle)
            byte_size += self.write_field(handle,self.data)
        return byte_size

    def write_header(self,handle):
        byte_size = 0
        byte_size += self.write_int(handle,self.nparts)
        return byte_size

    def __init__(self,fname,data):

        self.fname = fname
        self.data = data
        self.nparts = data.shape[0]
        self.shuffle_indices = None
    
    def read(self,byte_offset=0,count=None):

        with open(self.fname,'rb') as handle:
            binary_string = handle.read()
            nparts = int.from_bytes(binary_string[:4],byteorder='little', signed=False)
            if count is None: count = nparts
            try: arr = np.frombuffer(binary_string[4+byte_offset:], dtype=np.float32, count=int(count))
            except: 
                print(f'{self.fname}: {len(binary_string)} bytes.',
                '\nheader:',nparts,
                'requesting:',count,
                "at offset:",byte_offset)
                raise
        self.data[...] = arr