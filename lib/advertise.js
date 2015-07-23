'use strict';

var Defs = require('./bluez-defs.js');
var debug = require('debug')('advertise');

var pathBase = '/org/bluez/external/advertisements/';


var AdvertisementIface = {
    name: Defs.Dbus.LE_ADVERTISEMENT_IFACE,
    methods: {
      Release: ['', '']
    },
    signals: {
    },
    properties: {
        Type: 's',
        ServiceUUIDs: 'as',
        ManufacturerData: 'a{qay}',
        ServiceData: 'a{say}',
        IncludeTxPower: 'b'
    }
};

//Difference from Bluez example is that dbus-native lib does not call GetAll
//method, instead it gets the properties that are defined in the interface.properties
//that is exported via exportInterface method.
function Advertisement(name, advertising_type, impl) {
    this.name = name;
    this.ad_type = advertising_type;
    this.service_uuids = impl.service_uuids || [];
    this.manufacturer_data = impl.manufacturer_data;
    this.service_data = impl.service_data;

    this.include_tx_power = true;
    if (impl.include_tx_power !== undefined) {
        this.include_tx_power = impl.include_tx_power;
    }

    this._setDbusProperties();
}

//Set properties as defined in the interface so that
//org.freedesktop.DBus.Properties.GetAll function can access them.
//Also they need to be formatted as dbus-native expects them.
Advertisement.prototype._setDbusProperties = function _setDbusProperties() {
    this.Type = this.ad_type;
    this.ServiceUUIDs = [this.service_uuids];

    this.ManufacturerData = this.manufacturer_data ? [[this.manufacturer_data]] : [[]];
    this.ServiceData = this.service_data ? [[this.service_data]] : [[]];

    this.IncludeTxPower = this.include_tx_power;
};

Advertisement.prototype.getPath = function getPath() {
    debug('Advertising getPath');
    return pathBase + this.name;
};

Advertisement.prototype.Release = function Release() {
    debug('Advertising Released', this.getPath());
};

module.exports = {
    Advertisement: Advertisement,
    AdvertisementIface: AdvertisementIface
};
