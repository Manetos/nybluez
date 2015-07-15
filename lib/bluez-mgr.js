'use strict';

var util = require('util');
var events = require('events');
var dbus = require('dbus-native');
var async = require('async');
var debug = require('debug')('bluez-mgr');

var exec = require('child_process').exec;

var Defs = require('./bluez-defs.js');
var Advertise = require('./advertise.js');
var Advertisement = Advertise.Advertisement;
var AdvertisementIface = Advertise.AdvertisementIface;

var ObjectManagerIface = {
    name: Defs.Dbus.BLUEZ_OBJ_MANAGER_INTERFACE,
    methods: {
      GetManagedObjects: ['', 'a{oa{sa{sv}}}']
    },
    signals: {
    },
    properties: {
    }
};

var PropIface = {
    name: Defs.Dbus.DBUS_PROP_IFACE,
    methods: {
      GetAll: ['s', 'a{sv}']
    },
    signals: {
      PropertiesChanged: []
    },
    properties: {
    }
};

var CharIface = {
    name: Defs.Dbus.GATT_CHRC_IFACE,
    methods: {
      ReadValue: ['', 'ay'],
      WriteValue: ['ay', ''],
      StartNotify: ['', ''],
      StopNotify: ['', '']
    },
    signals: {
    },
    properties: {
    }
};

var DescIface = {
    name: Defs.Dbus.GATT_DESC_IFACE,
    methods: {
      ReadValue: ['', 'ay']
    },
    signals: {
    },
    properties: {
    }
};


var ServiceIface = {
    name: Defs.Dbus.GATT_SERVICE_IFACE,
    methods: {
    },
    signals: {
    },
    properties: {
      UUID: 's',
      Primary: 'b'
    }
};

function parseProps(rawProps) {
    var parsed = {};
    rawProps.forEach(function(prop) {
        var propName = prop[0];
        //TODO prop[1][0] has the type info, do we need it?
        var propValue = prop[1][1][0];

        parsed[propName] = propValue;
    });
    return parsed;
}

function BluezManager(configOptions) {
    this.objMng = null;
    this.adapterPaths = [];
    this.devices = Object.create(null);
    this.services = [];

    this.config = configOptions || {};

    this.advertisement = new Advertisement('advertisement', 'peripheral', {});

    events.EventEmitter.call(this);
}

util.inherits(BluezManager, events.EventEmitter);

BluezManager.prototype._handleInterfaceAdded = function _handleInterfaceAdded(path, interfaces) {
    debug('InterfacesAdded on', path, interfaces);
};

BluezManager.prototype._handleInterfaceRemoved =
    function _handleInterfaceRemoved(path, interfaces) {
    //TODO handle removal of ble adapter!
    debug('InterfacesRemoved', path, interfaces);
};

BluezManager.prototype._getAdapterPath = function _getAdapterPath() {
    return this.adapterPaths[0];
};

BluezManager.prototype._addDevice = function _addDevice(devicePath, cb) {
    var self = this;
    cb = cb || function(){};
    this.dbusService.getInterface(devicePath, Defs.Dbus.DBUS_PROP_IFACE, function(err, obj) {
        if (err) {
          return cb(err);
        }
        self.devices[devicePath] = obj;
        obj.on('PropertiesChanged', function(path, rawProps) {
            var props = parseProps(rawProps);
            debug('Properties changed in device %j', props);

            //TODO can actually emit any prop change here. Needed?
            if ('Connected' in props) {
                self.emit('device-connect', devicePath, props.Connected);
            }
        });
    });
};


BluezManager.prototype._advertise = function _advertise() {
    function legacyAdvertise() {
        //TODO Bluez does not support advertising via Dbus api yet (not on kernels < 4.1 anyway)
        //So this is just a hack

        //Sets the advertising packet
        //2=length, 1=ad type flags,
        //5=GAP_ADTYPE_FLAGS_LIMITED(1) | GAP_ADTYPE_FLAGS_BREDR_NOT_SUPPORTED(4)
        //(No classic only ble)
        //TODO assumes hci0 is the adapter
        exec('hcitool -i hci0 cmd 0x08 0x0008 3 02 01 05' +
          '&& hciconfig hci0 leadv', function (error, stdout, stderr) {
          debug('hciconfiguration error', error, 'stdout', stdout, 'stderr', stderr);
        });
    }

    if (this.config.legacyAdvertising) {
        legacyAdvertise();
    }
};

BluezManager.prototype._handleDeviceConn = function _handleDeviceConn(devicePath, isConnected) {
  if (!isConnected) {
      //TODO this is not the best approach now since we do not really know if the
      //disconnected device was a client to these services but bluez does not offer
      //a way to know that, i.e. device was a client of these services or it was a server.
      this.services.forEach(function(service) {
          service.onDisconnect();
      });

      //TODO - legacy needs to be enabled each time but this looks a bit weird. A better way?
      if (this.config.legacyAdvertising) {
          this._advertise();
      }
  }
};

BluezManager.prototype.init = function init(cb) {
    var self = this;

    this.sysbus = dbus.systemBus();
    this.dbusService = this.sysbus.getService(Defs.Dbus.BLUEZ_DBUS_SERVICE_NAME);

    this.sysbus.connection.on('error', function (err) {
        debug('Dbus error', err);
        throw err;
    });

    this.sysbus.connection.on('end', function () {
        debug('Dbus end');
    });

    self._crawl(function(err) {
        if (err) {
            return cb(err);
        }

        if (self.adapterPaths.length === 0) {
            return cb(new Error('No Adapter Found!'));
        }

        self.on('device-connect', self._handleDeviceConn.bind(self));
        self._advertise();
        cb();
    });
};

BluezManager.prototype.close = function close(cb) {
    var self = this;
    // It seems like services are unregistered automatically
    //so just unregistering the advertisement here
    self.dbusService.getInterface(
        self._getAdapterPath(),
        Defs.Dbus.LE_ADVERTISING_MANAGER_IFACE,
        function (err, adManager) {
            adManager.UnregisterAdvertisement(self.advertisement.getPath(), function(err) {
                cb(err);
            });
        });
};

BluezManager.prototype._crawl = function _crawl(cb) {
    var self = this;

    function crawlManagedObject(objPath, current) {
        var interfaceName = current[0];
        if (interfaceName === Defs.Dbus.BLUEZ_ADAPTER_INTERFACE) {
            self.adapterPaths.push(objPath);
        } else if (interfaceName === Defs.Dbus.BLUEZ_DEVICE_INTERFACE) {
            self._addDevice(objPath);
        }
    }

    this.dbusService.getInterface(
        Defs.Dbus.BLUEZ_ROOT_OBJ, Defs.Dbus.BLUEZ_OBJ_MANAGER_INTERFACE, function(err, obj) {
        if (err) {
            return cb(err);
        }

        self.objMng = obj;

        //Listeners for the signals.
        self.objMng.on('InterfacesAdded', self._handleInterfaceAdded.bind(self));
        self.objMng.on('InterfacesRemoved', self._handleInterfaceRemoved.bind(self));

        self.objMng.GetManagedObjects(function(err, objs) {
            if (err) {
                return cb(err);
            }

            // console.log("ManagedObjs %j", objs);

            for (var i = 0; i < objs.length; i++) {
                var currentObj = objs[i];
                var path = currentObj[0];
                var interfacesAndProps = currentObj[1];

                for (var j = 0; j < interfacesAndProps.length; j++) {
                    crawlManagedObject(path, interfacesAndProps[j]);
                }
            }
            cb();
        });
    });
};

BluezManager.prototype.createBleServiceObjects = function createBleServiceObjects(bleServices) {
    var self = this;
    bleServices.forEach(function(service){
        self.sysbus.exportInterface(service, service.getPath(), ObjectManagerIface);
        self.sysbus.exportInterface(service, service.getPath(), ServiceIface);

        service.characteristics.forEach(function(char){
            self.sysbus.exportInterface(char, char.getPath(service.getPath()), CharIface);
            //TODO not sure if this is really needed yet.
            self.sysbus.exportInterface(char, char.getPath(service.getPath()), PropIface);

            char.descriptors.forEach(function(desc){
                self.sysbus.exportInterface(
                    desc, desc.getPath(char.getPath(service.getPath())), DescIface);
            });
        });
    });
};

BluezManager.prototype.registerBleServices = function registerBleServices(bleServices, cb) {
    function registerService(gattManager, service, cb) {
        gattManager.RegisterService(service.getPath(), {}, function(err) {
            debug('RegisterService cb', err);
            return cb(err);
      });
    }

    var self = this;
    self.createBleServiceObjects(bleServices);

    this.dbusService.getInterface(
        self._getAdapterPath(), Defs.Dbus.BLUEZ_GATT_MANAGER_INTERFACE, function(err, gattManager) {
        if (err) {
            throw err;
        }

        async.each(bleServices, registerService.bind(self, gattManager), function(err) {
            if (err) {
                return cb(err);
            }
            //concat in place
            self.services.push.apply(self.services, bleServices);
            cb();

        });

        //ADVERTISEMENT
        //TODO Just to have for now, this should be integrated with advertise function somehow!
        self.sysbus.exportInterface(
            self.advertisement, self.advertisement.getPath(), AdvertisementIface);
        self.sysbus.exportInterface(
            self.advertisement, self.advertisement.getPath(), PropIface);
        // self.sysbus.exportInterface(self.advertisement, self.advertisement.getPath(), ObjectManagerIface);

        self.dbusService.getInterface(
            self._getAdapterPath(),
            Defs.Dbus.LE_ADVERTISING_MANAGER_IFACE,
            function (err, adManager) {

                process.on('SIGINT', function() {
                    // console.log('&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&');
                    adManager.UnregisterAdvertisement(self.advertisement.getPath(), function() {
                        process.exit();
                    });
                });

                adManager.RegisterAdvertisement(
                    self.advertisement.getPath(),
                    {},
                    function(err, data) {
                        console.log('BOOYA %j %j %j', adManager, err, data);
                    });
            }
        );
        ///////////////

    });
};

module.exports = {
    BluezManager: BluezManager
};
