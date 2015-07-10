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
      UUID: 's',
      Primary: 'b'
    }
};

function Advertisement(name, advertising_type, impl) {
    this.name = name;
    this.ad_type = advertising_type;
    this.service_uuids = impl.service_uuids || [];
    this.manufacturer_data = impl.manufacturer_data || [];
    this.service_data = impl.service_data || [];
    this.include_tx_power = impl.include_tx_power || true;
}

Advertisement.prototype.getPath = function getPath() {
    debug('Advertising getPath');
    return pathBase + this.name;
};

Advertisement.prototype.Release = function Release() {
    debug('Advertising Released', this.getPath());
};

Advertisement.prototype.GetAll = function GetAll(iface) {
    debug('Advertising GetAll', iface, this.getPath());
    return this._getProperties();
};

Advertisement.prototype._getProperties = function _getProperties() {
    return [
        ['Type', ['s', this.ad_type]],
        ['ServiceUUIDs', ['as', [this.service_uuids]]],

        //TODO how to represent a dictionary?
        ['ManufacturerData', ['qay', [this.manufacturer_data]]],
        ['ServiceData', ['say', [this.service_data]]],

        ['IncludeTxPower', ['b', [this.include_tx_power]]],
    ];
};

module.exports = {
    Advertisement: Advertisement,
    AdvertisementIface: AdvertisementIface
};
