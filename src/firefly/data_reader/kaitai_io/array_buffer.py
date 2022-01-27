# This is a generated file! Please edit source .ksy file and use kaitai-struct-compiler to rebuild

from pkg_resources import parse_version
import kaitaistruct
from kaitaistruct import KaitaiStruct, KaitaiStream, BytesIO


if parse_version(kaitaistruct.__version__) < parse_version('0.9'):
    raise Exception("Incompatible Kaitai Struct Python API: 0.9 or later is required, but you have %s" % (kaitaistruct.__version__))

class ArrayBuffer(KaitaiStruct):
    def __init__(self, field_type, _io, _parent=None, _root=None):
        self._io = _io
        self._parent = _parent
        self._root = _root if _root else self
        self.field_type = field_type
        self._read()

    def _read(self):
        self.buffer = self._io.read_bytes_full()

    @property
    def values(self):
        if hasattr(self, '_m_values'):
            return self._m_values if hasattr(self, '_m_values') else None

        _pos = self._io.pos()
        self._io.seek(0)
        self._m_values = []
        i = 0
        while not self._io.is_eof():
            _on = self.field_type
            if _on == u"u8":
                self._m_values.append(self._io.read_u8le())
            elif _on == u"u4":
                self._m_values.append(self._io.read_u4le())
            elif _on == u"f4":
                self._m_values.append(self._io.read_f4le())
            elif _on == u"f8":
                self._m_values.append(self._io.read_f8le())
            else:
                self._m_values.append(self._io.read_f4le())
            i += 1

        self._io.seek(_pos)
        return self._m_values if hasattr(self, '_m_values') else None


