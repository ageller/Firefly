// This is a generated file! Please edit source .ksy file and use kaitai-struct-compiler to rebuild

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['kaitai-struct/KaitaiStream', './MyArrayBuffer'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('kaitai-struct/KaitaiStream'), require('./MyArrayBuffer'));
  } else {
    root.FireflyOctnodeSubstring = factory(root.KaitaiStream, root.MyArrayBuffer);
  }
}(this, function (KaitaiStream, MyArrayBuffer) {
var FireflyOctnodeSubstring = (function() {
  function FireflyOctnodeSubstring(_io, _parent, _root) {
    this._io = _io;
    this._parent = _parent;
    this._root = _root || this;

    this._read();
  }
  FireflyOctnodeSubstring.prototype._read = function() {
    this.octnodeHeader = new Header(this._io, this, this._root);
    this.node = new NodeData(this._io, this, this._root);
  }

  var Field = FireflyOctnodeSubstring.Field = (function() {
    function Field(_io, _parent, _root, fieldType, components) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;
      this.fieldType = fieldType;
      this.components = components;

      this._read();
    }
    Field.prototype._read = function() {
      this._raw_data = this._io.readBytes(((this._root.octnodeHeader.nodeSize * 4) * this.components));
      var _io__raw_data = new KaitaiStream(this._raw_data);
      this.data = new MyArrayBuffer(_io__raw_data, this, null, this.fieldType);
    }

    return Field;
  })();

  var Vector4Field = FireflyOctnodeSubstring.Vector4Field = (function() {
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

  var NodeData = FireflyOctnodeSubstring.NodeData = (function() {
    function NodeData(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    NodeData.prototype._read = function() {
      this.coordinatesFlat = new VectorField(this._io, this, this._root, "f4");
      if (this._root.octnodeHeader.hasVelocities != 0) {
        this.velocitiesFlat = new VectorField(this._io, this, this._root, "f4");
      }
      if (this._root.octnodeHeader.hasRgbaColors != 0) {
        this.rgbaColorsFlat = new Vector4Field(this._io, this, this._root, "f4");
      }
      this.scalarFields = new Array(this._root.octnodeHeader.nfields);
      for (var i = 0; i < this._root.octnodeHeader.nfields; i++) {
        this.scalarFields[i] = new ScalarField(this._io, this, this._root, "f4");
      }
    }

    return NodeData;
  })();

  var ScalarField = FireflyOctnodeSubstring.ScalarField = (function() {
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

  var VectorField = FireflyOctnodeSubstring.VectorField = (function() {
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

  var Header = FireflyOctnodeSubstring.Header = (function() {
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
      this.nodeSize = this._io.readU4le();
      this.nfields = this._io.readU4le();
    }

    /**
     * A flag for whether this file contains vector velocities
     */

    /**
     * A flag for whether this file contains rgba_colors
     */

    /**
     * the number of particles in this file
     */

    /**
     * number of scalar fields which are tracked alongside coordinates and velocities
     */

    return Header;
  })();

  return FireflyOctnodeSubstring;
})();
return FireflyOctnodeSubstring;
}));
