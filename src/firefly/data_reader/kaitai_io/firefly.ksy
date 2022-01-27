meta:
  id: firefly_format1
  endian: le
  ks-opaque-types: true
  imports:
    - array_buffer
seq:
  - id: firefly_header
    type: header
  - id: coordinates
    type: particle_fields('f4', 3)
  - id: velocities
    type: particle_fields('f4', 3)
  - id: scalar_fields
    type: particle_fields('f4',1)
    repeat: expr
    repeat-expr: _root.firefly_header.nfields
types:
  header:
    seq:
      - id: recsize_0
        type: u4
      - id: npart
        type: u4
      - id: nfields ## should only be scalar fields in addition to coordinates and velocities
        type: u4
  particle_fields:
    params:
      - id: field_type # format, like float or int or whatever. 'f4' or 'u4' usually
        type: str 
      - id: components # dimensions, i.e. 3 for coords and vels otherwise 1
        type: u1
    seq:
      - id: fields
        type: field(components, field_type)
  field:
    params:
      - id: components
        type: u1
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
        size: _root.firefly_header.npart * components * 4
        type: array_buffer(field_type)