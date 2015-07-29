'use strict';

var dbus = require('dbus-native');
var debug = require('debug')('dbus-utils');

function Dbus(serviceName) {
    this.sysbus = dbus.systemBus();
    this.dbusService = this.sysbus.getService(serviceName);

    this.sysbus.connection.on('error', function (err) {
        debug('Dbus error', err);
        throw err;
    });

    this.sysbus.connection.on('end', function () {
        debug('Dbus end');
    });
}

Dbus.prototype.exportInterface = function exportInterface(obj, path, iface) {
    return this.sysbus.exportInterface(obj, path, iface);
};

Dbus.prototype.getInterface = function getInterface(path, iface, cb) {
    this.dbusService.getInterface(path, iface, cb);
};

Dbus.prototype.close = function close() {
    this.sysbus.connection.end();
};

module.exports = Dbus;
