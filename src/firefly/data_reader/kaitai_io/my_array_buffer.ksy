meta:
  id: my_array_buffer
  endian: le
params:
  - id: field_type
    type: str
seq:
  - id: buffer
    size-eos: true
instances:
  values:
    pos: 0
    size-eos: true
    id: entries
    type:
      switch-on: field_type
      cases:
        '"u1"': u1
        '"f4"': f4
        '"u4"': u4
        '"f8"': f8
        '"u8"': u8
        _ : f4
    repeat: eos