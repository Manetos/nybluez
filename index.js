'use strict';
var service = require('./lib/service.js');
var advertise = require('./lib/advertise.js');
var manager = require('./lib/bluez-mgr.js');
var Defs = require('./lib/bluez-defs.js');


function CreateBluezManager(config) {
    return new manager.BluezManager(config);
}

module.exports = {
    Service: service.Service,
    Characteristic: service.Characteristic,
    Descriptor: service.Descriptor,
    Advertisement: advertise.Advertisement,
    CreateBluezManager: CreateBluezManager,
    Defs: Defs
};
