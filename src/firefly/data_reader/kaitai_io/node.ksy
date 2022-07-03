meta:
  id: firefly_octnode_substring
  endian: le
  ks-opaque-types: true
  imports:
    - my_array_buffer
seq:
  - id: octnode_header
    type: header
  - id: node
    type: node_data 
types:
  header:
    seq:
      - id: header_size 
        type: u4
      - id: has_velocities
        type: u1
        doc: A flag for whether this file contains vector velocities
      - id: has_rgba_colors
        type: u1
        doc: A flag for whether this file contains rgba_colors
      - id: node_size
        type: u4
        doc: the number of particles in this file
      - id: nfields 
        type: u4
        doc: number of scalar fields which are tracked alongside coordinates and velocities
  node_data:
    seq:
      - id: coordinates_flat
        type: vector_field('f4')
      - id: velocities_flat
        type: vector_field('f4')
        if: _root.octnode_header.has_velocities != 0
      - id: rgba_colors_flat
        type: vector4_field('f4')
        if: _root.octnode_header.has_rgba_colors != 0
      - id: scalar_fields
        type: scalar_field('f4')
        repeat: expr
        repeat-expr: _root.octnode_header.nfields
  vector_field:
    params:
      - id: field_type # format, like float or int or whatever. 'f4' or 'u4' usually
        type: str
    seq:
      - id: flat_vector_data
        type: field(field_type,3)
  vector4_field:
    params:
      - id: field_type # format, like float or int or whatever. 'f4' or 'u4' usually
        type: str
    seq:
      - id: flat_vector4_data
        type: field(field_type,4)
  scalar_field:
    params:
      - id: field_type # format, like float or int or whatever. 'f4' or 'u4' usually
        type: str 
    seq:
      - id: field_data
        type: field(field_type,1) 
  field:
    params:
      - id: field_type
        type: str 
      - id: components
        type: u1
    seq:
      - id: data
        size: _root.octnode_header.node_size * 4 * components
        type: my_array_buffer(field_type)