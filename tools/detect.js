'use strict';
var nybluez = require('../');
var async = require('async');
var Dbus = require('../lib/dbus.js');
var Defs = nybluez.Defs;

var BLUEZ4_MANAGER_INTERFACE = 'org.bluez.Manager';

function handleCrawledObjects(objs, dbusSupport) {
    function handleCrawledObject(objPath, current) {
        var interfaceName = current[0];
        console.log('Found', objPath, interfaceName);
        if (interfaceName === Defs.Dbus.BLUEZ_ADAPTER_INTERFACE) {
            dbusSupport.adapters.push(objPath);
        } else if (interfaceName === Defs.Dbus.LE_ADVERTISING_MANAGER_IFACE) {
            dbusSupport.advertising = true;
        }
    }

    for (var i = 0; i < objs.length; i++) {
        var currentObj = objs[i];
        var path = currentObj[0];
        var interfacesAndProps = currentObj[1];

        for (var j = 0; j < interfacesAndProps.length; j++) {
            handleCrawledObject(path, interfacesAndProps[j]);
        }
    }
}

function checkIface(dbus, iface, cb) {
    dbus.getInterface(Defs.Dbus.BLUEZ_ROOT_OBJ, iface, cb);
}

function detect(cb) {
    var dbus = new Dbus(Defs.Dbus.BLUEZ_DBUS_SERVICE_NAME);
    var objManager;
    var dbusSupport = {
        adapters: [],
        bluez: 'not_found',
        advertising: false,
    };

    async.series([
        //Check if it is bluez 5 or 4
        function(cb) {
            checkIface(dbus, Defs.Dbus.BLUEZ_OBJ_MANAGER_INTERFACE, function(err, obj) {
                if (err) {
                    checkIface(dbus, BLUEZ4_MANAGER_INTERFACE, function(err) {
                        if (!err) {
                            dbusSupport.bluez = 4;
                        }
                        return cb();
                    });
                    return;
                }
                objManager = obj;
                dbusSupport.bluez = 5;
                return cb();
            });
        },
        //Check the bluez 5 interfaces
        function(cb) {
            if (dbusSupport.bluez !== 5) {
                return cb();
            }
            objManager.GetManagedObjects(function(err, objs) {
                if (err) {
                    return cb(err);
                }

                handleCrawledObjects(objs, dbusSupport);

                cb();
            });
        }
    ], function (err) {
        dbus.close();
        cb(err, dbusSupport);
    });

}

detect(function(err, status) {
    console.log(status);
});
