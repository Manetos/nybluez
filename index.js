'use strict';
var service = require('./lib/service.js');
var manager = require('./lib/bluez-mgr.js');
var Defs = require('./lib/bluez-defs.js');

function CreateBluezManager(config) {
    return new manager.BluezManager(config);
}

module.exports = {
    Service: service.Service,
    Characteristic: service.Characteristic,
    Descriptor: service.Descriptor,
    CreateBluezManager: CreateBluezManager,
    Defs: Defs
};
