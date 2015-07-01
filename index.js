'use strict';
var service = require('./lib/service.js');
var manager = require('./lib/bluez-mgr.js');

module.exports = {
    Service: service.Service,
    Characteristic: service.Characteristic,
    Descriptor: service.Descriptor,
    bluezManager: new manager.BluezManager()
};
