'use strict';

var Defs = require('./bluez-defs.js');

var pathBase = '/org/bluez/external/';

function getPaths(objs, parentPath) {
    return objs.map(function(obj) {
        return obj.getPath(parentPath);
    });
}

function buffer2Bytes(buf) {
    //Somehow Buffer does not work so had to do it this way
    var bytes = [];
    for (var i = 0; i < buf.length; ++i) {
        bytes.push(buf[i]);
    }
    return bytes;
}

function Descriptor(name, UUID, flags, options) {
    this.name = name;
    this.UUID = UUID;
    this.flags = flags;
    this.options = options;
}

Descriptor.prototype._getProperties = function _getProperties(charPath) {
  return [this.getPath(charPath),
    [
      [Defs.Dbus.GATT_DESC_IFACE,
        [
          ['Characteristic', ['o', charPath]],
          ['UUID', ['s', this.UUID]],
          ['Flags', ['as', [this.flags]]]
        ]
      ]
    ]
  ];
};

Descriptor.prototype.getPath = function getPath(charPath) {
    return charPath + '/' + this.name;
};

Descriptor.prototype.ReadValue = function ReadValue() {
    var cb = this.options.ReadValue ?
              this.options.ReadValue.bind(this.options) :
              function() {};
    return buffer2Bytes(cb());
};

Descriptor.prototype.WriteValue = function WriteValue(value) {
    var dataBuf = new Buffer(value);
    var cb = this.options.WriteValue ? this.options.WriteValue.bind(this.options) : function() {};
    return cb(dataBuf);
};

function Characteristic(name, UUID, flags, descriptors, options) {
    this.name = name;
    this.UUID = UUID;
    this.flags = flags;
    this.options = options;

    this.isNotifying = false;

    this.descriptors = descriptors;

    this.emit = function() {
    };
}

Characteristic.prototype.getPath = function getPath(servicePath) {
    return servicePath + '/' + this.name;
};

Characteristic.prototype.addDescriptor = function addDescriptor(desc) {
    this.descriptors.push(desc);
};

Characteristic.prototype._getProperties = function _getProperties(servicePath) {
    return [this.getPath(servicePath),
    [
        [Defs.Dbus.GATT_CHRC_IFACE,
        [
            ['Service', ['o', servicePath]],
            ['UUID', ['s', this.UUID]],
            ['Flags', ['as', [this.flags]]],
            ['Descriptors', ['ao', [getPaths(this.descriptors, this.getPath(servicePath))]]],
        ]]
    ]];
};

Characteristic.prototype.ReadValue = function ReadValue() {
    var cb = this.options.ReadValue ?
            this.options.ReadValue.bind(this.options) :
            function() {};
    return buffer2Bytes(cb());
};

Characteristic.prototype.WriteValue = function WriteValue(value) {
    var dataBuf = new Buffer(value);
    var cb = this.options.WriteValue ? this.options.WriteValue.bind(this.options) : function() {};
    return cb(dataBuf);
};

Characteristic.prototype.StartNotify = function StartNotify() {
    var self = this;
    self.isNotifying = true;
    this.notifIntervalId = setInterval(function(){
        self.emit(
          'PropertiesChanged',
          Defs.Dbus.GATT_CHRC_IFACE,
          [['Value', ['ay', [self.ReadValue()]]]], []);
    }, 3000);
};

Characteristic.prototype.StopNotify = function StopNotify() {
    if (this.isNotifying) {
        clearInterval(this.notifIntervalId);
        this.isNotifying = false;
    }
};

function Service(name, UUID, Primary, characteristics) {
    this.name = name;
    this.UUID = UUID;
    this.Primary = Primary;
    this.characteristics = characteristics;
}

Service.prototype.getPath = function getPath() {
    return pathBase + this.name;
};

Service.prototype.addCharacteristic = function addCharacteristic(char) {
    this.characteristics.push(char);
};

Service.prototype._getProperties = function _getProperties() {
    return [this.getPath(),
    [
        [Defs.Dbus.GATT_SERVICE_IFACE,
        [
            ['UUID', ['s', this.UUID]],
            ['Primary', ['b', this.Primary]],
            ['Characteristics', ['ao', [getPaths(this.characteristics, this.getPath())]]],
        ]]
    ]];
};

//service cleanup in case no device is connected
Service.prototype.onDisconnect = function onDisconnect() {
    this.characteristics.forEach(function(char) {
        char.StopNotify();
    });
};

Service.prototype.GetManagedObjects = function GetManagedObjects() {
    var self = this;
    var objs = [this._getProperties()];

    this.characteristics.forEach(function(char){
        objs.push(char._getProperties(self.getPath()));
        char.descriptors.forEach(function(desc){
            objs.push(desc._getProperties(char.getPath(self.getPath())));
        });
    });

    return objs;
};


module.exports = {
    Service: Service,
    Characteristic: Characteristic,
    Descriptor: Descriptor,
};
