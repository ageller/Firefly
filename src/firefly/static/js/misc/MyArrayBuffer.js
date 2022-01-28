// This is a generated file! Please edit source .ksy file and use kaitai-struct-compiler to rebuild

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['kaitai-struct/KaitaiStream'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('kaitai-struct/KaitaiStream'));
  } else {
    root.MyArrayBuffer = factory(root.KaitaiStream);
  }
}(this, function (KaitaiStream) {
var MyArrayBuffer = (function() {
  function MyArrayBuffer(_io, _parent, _root, fieldType) {
    this._io = _io;
    this._parent = _parent;
    this._root = _root || this;
    this.fieldType = fieldType;

    this._read();
  }
  MyArrayBuffer.prototype._read = function() {
    this.buffer = this._io.readBytesFull();
  }
  Object.defineProperty(MyArrayBuffer.prototype, 'values', {
    get: function() {
      if (this._m_values !== undefined)
        return this._m_values;
      var _pos = this._io.pos;
      this._io.seek(0);
      this._m_values = [];
      var i = 0;
      while (!this._io.isEof()) {
        switch (this.fieldType) {
        case "u8":
          this._m_values.push(this._io.readU8le());
          break;
        case "u4":
          this._m_values.push(this._io.readU4le());
          break;
        case "f4":
          this._m_values.push(this._io.readF4le());
          break;
        case "u1":
          this._m_values.push(this._io.readU1());
          break;
        case "f8":
          this._m_values.push(this._io.readF8le());
          break;
        default:
          this._m_values.push(this._io.readF4le());
          break;
        }
        i++;
      }
      this._io.seek(_pos);
      return this._m_values;
    }
  });

  return MyArrayBuffer;
})();
return MyArrayBuffer;
}));
