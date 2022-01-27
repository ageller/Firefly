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
    this.coordinates = new VectorField(this._io, this, this._root, "f4");
    if (this._root.fireflyHeader.hasVelocities != 0) {
      this.velocities = new VectorField(this._io, this, this._root, "f4");
    }
    this.scalarFields = new Array(this._root.fireflyHeader.nfields);
    for (var i = 0; i < this._root.fireflyHeader.nfields; i++) {
      this.scalarFields[i] = new ParticleField(this._io, this, this._root, "f4");
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
      this.headerSize = this._io.readU4le();
      this.hasVelocities = this._io.readU1();
      this.npart = this._io.readU4le();
      this.nfields = this._io.readU4le();
    }

    /**
     * A flag for whether this file contains vector velocities
     */

    return Header;
  })();

  var VectorField = FireflyFormat1.VectorField = (function() {
    function VectorField(_io, _parent, _root, fieldType) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;
      this.fieldType = fieldType;

      this._read();
    }
    VectorField.prototype._read = function() {
      this.fieldData = new Array(3);
      for (var i = 0; i < 3; i++) {
        this.fieldData[i] = new Field(this._io, this, this._root, this.fieldType);
      }
    }

    return VectorField;
  })();

  var ParticleField = FireflyFormat1.ParticleField = (function() {
    function ParticleField(_io, _parent, _root, fieldType) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;
      this.fieldType = fieldType;

      this._read();
    }
    ParticleField.prototype._read = function() {
      this.fieldData = new Field(this._io, this, this._root, this.fieldType);
    }

    return ParticleField;
  })();

  var Field = FireflyFormat1.Field = (function() {
    function Field(_io, _parent, _root, fieldType) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;
      this.fieldType = fieldType;

      this._read();
    }
    Field.prototype._read = function() {
      this.strLen = this._io.readU4le();
      this.fieldName = KaitaiStream.bytesToStr(this._io.readBytes(this.strLen), "UTF-8");
      this._raw_data = this._io.readBytes((this._root.fireflyHeader.npart * 4));
      var _io__raw_data = new KaitaiStream(this._raw_data);
      this.data = new MyArrayBuffer(_io__raw_data, this, null, this.fieldType);
    }

    return Field;
  })();

  return FireflyFormat1;
})();
return FireflyFormat1;
}));
