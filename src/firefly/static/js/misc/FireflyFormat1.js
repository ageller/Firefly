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
    this.coordinatesFlat = new VectorField(this._io, this, this._root, "f4");
    if (this._root.fireflyHeader.hasVelocities != 0) {
      this.velocitiesFlat = new VectorField(this._io, this, this._root, "f4");
    }
    if (this._root.fireflyHeader.hasRgbaColors != 0) {
      this.rgbaColorsFlat = new Vector4Field(this._io, this, this._root, "f4");
    }
    this.scalarFields = new Array(this._root.fireflyHeader.nfields);
    for (var i = 0; i < this._root.fireflyHeader.nfields; i++) {
      this.scalarFields[i] = new ScalarField(this._io, this, this._root, "f4");
    }
  }

  var Field = FireflyFormat1.Field = (function() {
    function Field(_io, _parent, _root, fieldType, components) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;
      this.fieldType = fieldType;
      this.components = components;

      this._read();
    }
    Field.prototype._read = function() {
      this._raw_data = this._io.readBytes(((this._root.fireflyHeader.npart * 4) * this.components));
      var _io__raw_data = new KaitaiStream(this._raw_data);
      this.data = new MyArrayBuffer(_io__raw_data, this, null, this.fieldType);
    }

    return Field;
  })();

  var Vector4Field = FireflyFormat1.Vector4Field = (function() {
    function Vector4Field(_io, _parent, _root, fieldType) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;
      this.fieldType = fieldType;

      this._read();
    }
    Vector4Field.prototype._read = function() {
      this.flatVector4Data = new Field(this._io, this, this._root, this.fieldType, 4);
    }

    return Vector4Field;
  })();

  var ScalarField = FireflyFormat1.ScalarField = (function() {
    function ScalarField(_io, _parent, _root, fieldType) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;
      this.fieldType = fieldType;

      this._read();
    }
    ScalarField.prototype._read = function() {
      this.fieldData = new Field(this._io, this, this._root, this.fieldType, 1);
    }

    return ScalarField;
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
      this.flatVectorData = new Field(this._io, this, this._root, this.fieldType, 3);
    }

    return VectorField;
  })();

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
      this.hasRgbaColors = this._io.readU1();
      this.npart = this._io.readU4le();
      this.nfields = this._io.readU4le();
      this.fieldNames = new Array(this.nfields);
      for (var i = 0; i < this.nfields; i++) {
        this.fieldNames[i] = new FieldName(this._io, this, this._root);
      }
      this._raw_filterFlags = this._io.readBytes(this.nfields);
      var _io__raw_filterFlags = new KaitaiStream(this._raw_filterFlags);
      this.filterFlags = new MyArrayBuffer(_io__raw_filterFlags, this, null, "u1");
      this._raw_colormapFlags = this._io.readBytes(this.nfields);
      var _io__raw_colormapFlags = new KaitaiStream(this._raw_colormapFlags);
      this.colormapFlags = new MyArrayBuffer(_io__raw_colormapFlags, this, null, "u1");
      this._raw_radiusFlags = this._io.readBytes(this.nfields);
      var _io__raw_radiusFlags = new KaitaiStream(this._raw_radiusFlags);
      this.radiusFlags = new MyArrayBuffer(_io__raw_radiusFlags, this, null, "u1");
    }

    /**
     * A flag for whether this file contains vector velocities
     */

    /**
     * A flag for whether this file contains rgba tuples for each particle
     */

    /**
     * number of particles in this dataset
     */

    /**
     * number of scalar fields which are tracked alongside coordinates and velocities
     */

    /**
     * array of filter flags, whether the field at this position should be filtered
     */

    /**
     * array of colormap flags, whether the field at this position should be colormapped
     */

    /**
     * array of scale-by radius flags, whether the field at this position should be allowed to scale the particles
     */

    return Header;
  })();

  var FieldName = FireflyFormat1.FieldName = (function() {
    function FieldName(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    FieldName.prototype._read = function() {
      this.strLen = this._io.readU4le();
      this.fieldName = KaitaiStream.bytesToStr(this._io.readBytes(this.strLen), "UTF-8");
    }

    return FieldName;
  })();

  return FireflyFormat1;
})();
return FireflyFormat1;
}));
