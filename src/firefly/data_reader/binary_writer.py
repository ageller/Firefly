import numpy as np

class BinaryWriter(object):
    
    def __init__(self,fname,nparts,coordinates,velocities):
        
        self.nparts = nparts
        self.fname = fname
        self.coordinates=coordinates
        self.velocities=velocities
        
        self.nfields = 0
        self.fields = []
        self.field_names = []
    
    def write(self):
        with open(self.fname,'wb') as handle:
            self.__write_header(handle)
            self.__write_coordinates_and_velocities(handle)
            for field,field_name in zip(self.fields,self.field_names): 
                self.__write_field(handle,field,field_name)


    def __write_header(self,handle):
        ## size of the header, 2 32 bit ints and a 1 bit boolean
        handle.write(np.array(32*2+1).astype(np.int32)) 
        ## boolean flag for whether there are velocities
        handle.write(np.array(1).astype(bool) if self.velocities is not None else np.array(0).astype(bool))
        ## number of particles
        handle.write(np.array(self.nparts).astype(np.int32)) 
        ## number of scalar fields
        handle.write(np.array(self.nfields).astype(np.int32))
                
    def __write_field_name(self,handle,field_name):
        str_len = len(field_name)
        ## write the length of the string
        handle.write(np.int32(str_len))
        handle.write(field_name.encode('UTF-8'))
        
    def __write_coordinates_and_velocities(self,handle):
        self.__write_vector_field(handle,self.coordinates,'') ## coordinates
        if self.velocities is not None:
            self.__write_vector_field(handle,self.velocities,'v') ## velocities
            
    def __write_vector_field(self,handle,field,field_name):
        labels = ['x','y','z']
        ## write each component in turn
        for i in range(field.shape[-1]):
            self.__write_field(handle,field[:,i],field_name+labels[i])

    def __write_field(self,handle,field,field_name):
        self.__write_field_name(handle,field_name)
        handle.write(field.astype(np.float32))
    
    def add_field(self,field,field_name):
        if field.size != self.nparts: 
            raise ValueError("Field must have %d particles, not %d"%(self.nparts,field.size))
        self.fields += [field]
        self.field_names += [field_name]
        self.nfields+=1

        
if __name__ == '__main__':
    my_writer = BinaryWriter('test.b',100,np.arange(300).reshape(-1,3),np.arange(300).reshape(-1,3))
    my_writer.add_field(np.arange(100,200),'my_field')
    my_writer.write()