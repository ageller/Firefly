## TODO:
## load test data alongside real data (from JSON) in firefly using Javascript loader
## field filter flags
## field filter lims/vals
## field colorbar flags
## field colorbar lims/vals
meta:
  id: firefly_format1
  endian: le
  ks-opaque-types: true
  imports:
    - my_array_buffer
seq:
  - id: firefly_header
    type: header
  - id: coordinates
    type: vector_field('f4')
  - id: velocities
    type: vector_field('f4')
    if: _root.firefly_header.has_velocities != 0
  - id: scalar_fields
    type: particle_field('f4')
    repeat: expr
    repeat-expr: _root.firefly_header.nfields
types:
  header:
    seq:
      - id: header_size ## it's tradition for the opener of the file to be the size in bytes of the header
        type: u4
      - id: has_velocities
        type: u1
        doc: A flag for whether this file contains vector velocities
      - id: npart
        type: u4
      - id: nfields ## fields which are tracked in addition to velocities and coordinates
        type: u4
  vector_field:
    params:
      - id: field_type # format, like float or int or whatever. 'f4' or 'u4' usually
        type: str
    seq:
      - id: field_data
        type: field(field_type)
        repeat: expr
        repeat-expr: 3 ## x,y,z
  particle_field:
    params:
      - id: field_type # format, like float or int or whatever. 'f4' or 'u4' usually
        type: str 
    seq:
      - id: field_data
        type: field(field_type)
  field:
    params:
      - id: field_type
        type: str
    seq:
      - id: str_len
        type: u4
      - id: field_name
        type: str
        size: str_len
        encoding: UTF-8
      - id: data
        size: _root.firefly_header.npart * 4
        type: my_array_buffer(field_type)