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

function Advertisement(name, advertising_type, impl) {
    this.name = name;
    //Difference from Bluez example is that dbus-native lib does not call GetAll
    //method, instead it gets the properties that are defined in the interface.properties
    //that is exported via exportInterface method.
    this.Type = advertising_type;
    this.ServiceUUIDs = [['180D']]; //impl.service_uuids || [];
    this.ManufacturerData = [[ [0xffff, [0x00, 0x01, 0x02, 0x03, 0x04]] ]]; //impl.manufacturer_data || [];

    this.ServiceData = [ [ ['9999', [0x00, 0x01, 0x02, 0x03, 0x04]] ] ];

    this.IncludeTxPower = true; //impl.include_tx_power || true;
}

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
