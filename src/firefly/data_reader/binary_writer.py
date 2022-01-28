import numpy as np

class BinaryWriter(object):
    
    def __init__(
        self,
        fname,
        coordinates,
        velocities=None):
        
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

        ## now that we've confirmed we were passed appropriately shaped arrays
        ##  let's bind them
        self.nparts = coordinates.shape[0]
        self.coordinates = coordinates
        self.velocities = velocities
        
        ## initialize scalar field variables
        self.nfields = 0
        self.fields = []
        self.field_names = []
        self.filter_flags = []
        self.colorbar_flags = []
        self.radius_flags = []
    
    def write(self):
        with open(self.fname,'wb') as handle:
            self.__write_header(handle)
            self.__write_vector_field(handle,self.coordinates)
            if self.velocities is not None:
                self.__write_vector_field(handle,self.velocities)
            for field in self.fields: 
                self.__write_field(handle,field)

    def __write_header(self,handle):
        ## size of the header, 2 32 bit ints and a 1 bit boolean
        header_size = 32*2 ## nparts and nfields
        header_size += 8 ## velocity flag
        ## each char gets 32 bits for UTF-8 (ascii is just 1 byte tho)
        header_size += 32*np.sum([len(field_name) for field_name in self.field_names]) 
        header_size += 3*8*self.nfields ## filter, colorbar, and radius flags
        handle.write(np.array(header_size).astype(np.int32)) 
        ## boolean flag for whether there are velocities
        self.__write_flag(handle,self.velocities is not None)
        ## number of particles
        handle.write(np.array(self.nparts).astype(np.int32)) 
        ## number of scalar fields
        handle.write(np.array(self.nfields).astype(np.int32))
        ## write each field name as a variable byte-length string
        for field_name in self.field_names:
            self.__write_field_name(handle,field_name)
        ## write the filter flag array
        handle.write(np.array(self.filter_flags).astype(bool))
        ## write the colorbar flag array
        handle.write(np.array(self.colorbar_flags).astype(bool))
        ## write the scale-by radius flag array
        handle.write(np.array(self.radius_flags).astype(bool))

    def __write_flag(self,handle,flag):
        handle.write(np.array(flag).astype(bool))
                
    def __write_field_name(self,handle,field_name):
        str_len = len(field_name)
        ## write the length of the string
        handle.write(np.int32(str_len))
        handle.write(field_name.encode('UTF-8'))
        
    def __write_vector_field(self,handle,field):
        ## write each component in turn
        for i in range(field.shape[-1]):
            self.__write_field(handle,field[:,i])

    def __write_field(
        self,
        handle,
        field):
        handle.write(field.astype(np.float32))
     
    def add_field(
        self,
        field,
        field_name,
        filter_flag=True,
        colorbar_flag=True,
        radius_flag=False):

        if field.size != self.nparts: 
            raise ValueError("Field must have %d particles, not %d"%(self.nparts,field.size))

        self.fields += [field]
        self.field_names += [field_name]
        self.nfields+=1

        self.filter_flags+=[filter_flag]
        self.colorbar_flags+=[colorbar_flag]
        self.radius_flags+=[radius_flag]
        
if __name__ == '__main__':
    my_writer = BinaryWriter('test.b',np.arange(300).reshape(-1,3),np.arange(300).reshape(-1,3))
    my_writer.add_field(np.arange(100,200),'my_field')
    my_writer.add_field(np.arange(100,200),'my_other_field')
    print(my_writer.filter_flags)
    my_writer.write()