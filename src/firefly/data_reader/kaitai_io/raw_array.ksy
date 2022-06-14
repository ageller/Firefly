meta:
  id: firefly_raw_data
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
      - id: node_size
        type: u4
  node_data:
    seq:
      - id: scalar_field
        type: scalar_field('f4')
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
