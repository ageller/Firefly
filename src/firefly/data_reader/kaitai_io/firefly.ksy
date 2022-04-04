meta:
  id: firefly_format1
  endian: le
  ks-opaque-types: true
  imports:
    - my_array_buffer
seq:
  - id: firefly_header
    type: header
  - id: coordinates_flat
    type: vector_field('f4')
  - id: velocities_flat
    type: vector_field('f4')
    if: _root.firefly_header.has_velocities != 0
  - id: rgba_colors_flat
    type: vector4_field('f4')
    if: _root.firefly_header.has_rgba_colors != 0
  - id: scalar_fields
    type: scalar_field('f4')
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
      - id: has_rgba_colors
        type: u1
        doc: A flag for whether this file contains rgba tuples for each particle
      - id: npart
        type: u4
        doc: number of particles in this dataset
      - id: nfields 
        type: u4
        doc: number of scalar fields which are tracked alongside coordinates and velocities
      - id: field_names
        type: field_name
        repeat: expr
        repeat-expr: nfields
      - id: filter_flags
        size: nfields ## 1 byte for each field
        type: my_array_buffer("u1")
        doc: array of filter flags, whether the field at this position should be filtered
      - id: colormap_flags
        size: nfields ## 1 byte for each field
        type: my_array_buffer("u1")
        doc: array of colormap flags, whether the field at this position should be colormapped
      - id: radius_flags
        size: nfields ## 1 byte for each field
        type: my_array_buffer("u1")
        doc: array of scale-by radius flags, whether the field at this position should be allowed to scale the particles
  field_name:
    seq:
      - id: str_len
        type: u4
      - id: field_name
        type: str
        size: str_len
        encoding: UTF-8 
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
        size: _root.firefly_header.npart * 4 * components
        type: my_array_buffer(field_type)