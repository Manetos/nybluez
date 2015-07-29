'use strict';
var nybluez = require('../');
var bluezManager = nybluez.CreateBluezManager();
var Defs = nybluez.Defs;

var dbusSupport = {
    adapters: [],
    bluez: 4,
    advertising: false,
};

function handleCrawledObject(objPath, current) {
    var interfaceName = current[0];
    console.log('Found', objPath, interfaceName);
    if (interfaceName === Defs.Dbus.BLUEZ_ADAPTER_INTERFACE) {
        dbusSupport.adapters.push(objPath);
    } else if (interfaceName === Defs.Dbus.LE_ADVERTISING_MANAGER_IFACE) {
        dbusSupport.advertising = true;
    }
}

function detect(cb) {
    bluezManager.init(handleCrawledObject, function(err) {
        if (err) {
            console.error(err);
        }

        //If this succeds then there is 'org.freedesktop.DBus.ObjectManager' interface
        //which means this is bluez v5
        dbusSupport.bluez = 5;

        bluezManager.closeDbus();
        cb(null, dbusSupport);
    });
}

detect(function(err, status) {
    console.log(status);
});
