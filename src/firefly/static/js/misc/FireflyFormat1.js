// This is a generated file! Please edit source .ksy file and use kaitai-struct-compiler to rebuild

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['kaitai-struct/KaitaiStream', './MyArrayBuffer'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('kaitai-struct/KaitaiStream'), require('./MyArrayBuffer'));
  } else {
    root.FireflyFormat1 = factory(root.KaitaiStream, root.MyArrayBuffer);
  }
}(this, function (KaitaiStream, MyArrayBuffer) {
var FireflyFormat1 = (function() {
  function FireflyFormat1(_io, _parent, _root) {
    this._io = _io;
    this._parent = _parent;
    this._root = _root || this;

    this._read();
  }
  FireflyFormat1.prototype._read = function() {
    this.fireflyHeader = new Header(this._io, this, this._root);
    this.coordinates = new ParticleFields(this._io, this, this._root, "f4", 3);
    this.velocities = new ParticleFields(this._io, this, this._root, "f4", 3);
    this.scalarFields = new Array(this._root.fireflyHeader.nfields);
    for (var i = 0; i < this._root.fireflyHeader.nfields; i++) {
      this.scalarFields[i] = new ParticleFields(this._io, this, this._root, "f4", 1);
    }
  }

  var Header = FireflyFormat1.Header = (function() {
    function Header(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    Header.prototype._read = function() {
      this.recsize0 = this._io.readU4le();
      this.npart = this._io.readU4le();
      this.nfields = this._io.readU4le();
    }

    return Header;
  })();

  var ParticleFields = FireflyFormat1.ParticleFields = (function() {
    function ParticleFields(_io, _parent, _root, fieldType, components) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;
      this.fieldType = fieldType;
      this.components = components;

      this._read();
    }
    ParticleFields.prototype._read = function() {
      this.fieldData = new Field(this._io, this, this._root, this.components, this.fieldType);
    }

    return ParticleFields;
  })();

  var Field = FireflyFormat1.Field = (function() {
    function Field(_io, _parent, _root, components, fieldType) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;
      this.components = components;
      this.fieldType = fieldType;

      this._read();
    }
    Field.prototype._read = function() {
      this.strLen = this._io.readU4le();
      this.fieldName = KaitaiStream.bytesToStr(this._io.readBytes(this.strLen), "UTF-8");
      this._raw_data = this._io.readBytes(((this._root.fireflyHeader.npart * this.components) * 4));
      var _io__raw_data = new KaitaiStream(this._raw_data);
      this.data = new MyArrayBuffer(_io__raw_data, this, null, this.fieldType);
    }

    return Field;
  })();

  return FireflyFormat1;
})();
return FireflyFormat1;
}));
