# This is a generated file! Please edit source .ksy file and use kaitai-struct-compiler to rebuild

from pkg_resources import parse_version
import kaitaistruct
from kaitaistruct import KaitaiStruct, KaitaiStream, BytesIO


if parse_version(kaitaistruct.__version__) < parse_version('0.9'):
    raise Exception("Incompatible Kaitai Struct Python API: 0.9 or later is required, but you have %s" % (kaitaistruct.__version__))

import array_buffer
class FireflyFormat1(KaitaiStruct):
    def __init__(self, _io, _parent=None, _root=None):
        self._io = _io
        self._parent = _parent
        self._root = _root if _root else self
        self._read()

    def _read(self):
        self.firefly_header = FireflyFormat1.Header(self._io, self, self._root)
        self.coordinates = FireflyFormat1.ParticleFields(u"f4", 3, self._io, self, self._root)
        self.velocities = FireflyFormat1.ParticleFields(u"f4", 3, self._io, self, self._root)
        self.scalar_fields = [None] * (self._root.firefly_header.nfields)
        for i in range(self._root.firefly_header.nfields):
            self.scalar_fields[i] = FireflyFormat1.ParticleFields(u"f4", 1, self._io, self, self._root)


    class Header(KaitaiStruct):
        def __init__(self, _io, _parent=None, _root=None):
            self._io = _io
            self._parent = _parent
            self._root = _root if _root else self
            self._read()

        def _read(self):
            self.recsize_0 = self._io.read_u4le()
            self.npart = self._io.read_u4le()
            self.nfields = self._io.read_u4le()


    class ParticleFields(KaitaiStruct):
        def __init__(self, field_type, components, _io, _parent=None, _root=None):
            self._io = _io
            self._parent = _parent
            self._root = _root if _root else self
            self.field_type = field_type
            self.components = components
            self._read()

        def _read(self):
            self.field_data = FireflyFormat1.Field(self.components, self.field_type, self._io, self, self._root)


    class Field(KaitaiStruct):
        def __init__(self, components, field_type, _io, _parent=None, _root=None):
            self._io = _io
            self._parent = _parent
            self._root = _root if _root else self
            self.components = components
            self.field_type = field_type
            self._read()

        def _read(self):
            self.str_len = self._io.read_u4le()
            self.field_name = (self._io.read_bytes(self.str_len)).decode(u"UTF-8")
            self._raw_data = self._io.read_bytes(((self._root.firefly_header.npart * self.components) * 4))
            _io__raw_data = KaitaiStream(BytesIO(self._raw_data))
            self.data = array_buffer.ArrayBuffer(self.field_type, _io__raw_data)



