'use strict';

var util = require('util');
var nybluez = require('nybluez');

var Service = nybluez.Service;
var Characteristic = nybluez.Characteristic;
var Descriptor = nybluez.Descriptor;
var Advertisement = nybluez.Advertisement;
var Defs = nybluez.Defs;
var bluezManager = nybluez.CreateBluezManager({legacyAdvertising: false});

function BleConfig(confManager) {
    var bleconfig = this;
    bleconfig.confManager = confManager;

    var wifiCharUserDescriptorImpl = {
        ReadValue: function() {
            return new Buffer('Wifi');
        }
    };

    var wifiCharImpl = {
        lastError: '',

        ReadValue: function() {
            var summary = bleconfig.confManager.getWifiSummary();

            //If wifi is not already connected and there is an error then add it to summary
            if (bleconfig.confManager.getWifiStatus() !== 'ACTIVATED' && this.lastError) {
                summary = util.format('%s - %s', summary, this.lastError);
            }
            return new Buffer(summary);
        },

        WriteValue: function(value) {
            var self = this;
            this.lastError = '';
            bleconfig.confManager.set('wifi', value.toString(), function(err, data) {
                if (err) {
                    console.error('Wifi setting failed', err);
                    self.lastError = err;
                    return;
                }

                console.log('Wifi ok', data);
            });
        }
    };

    var urlCharUserDescriptorImpl = {
        ReadValue: function() {
            return new Buffer('Url');
        }
    };

    var urlCharImpl = {
        ReadValue: function() {
            return new Buffer(bleconfig.confManager.getAppUrl());
        }
    };

    var wifiCharUserDescriptor = new Descriptor(
                                    'wifiCharUserDescriptor',
                                    Defs.UUIDs.CharacteristicUserDescription,
                                    ['read'],
                                    wifiCharUserDescriptorImpl);

    var wifiChar = new Characteristic(
                    'wifiChar',
                    'dddd5678-1234-5678-1234-56789dddddd1',
                    ['read', 'write', 'notify'],
                    [wifiCharUserDescriptor],
                    wifiCharImpl);

    var urlCharUserDescriptor = new Descriptor(
                                    'urlCharUserDescriptor',
                                    Defs.UUIDs.CharacteristicUserDescription,
                                    ['read'],
                                    urlCharUserDescriptorImpl);
    var urlChar = new Characteristic(
                    'urlChar',
                    'dddd5678-1234-5678-1234-56789dddddd2',
                    ['read', 'notify'],
                    [urlCharUserDescriptor],
                    urlCharImpl);

    var confService = new Service(
                        'confService',
                        'dddd5678-1234-5678-1234-56789dddddd0',
                        true,
                        [wifiChar, urlChar]);

    var bleConfig = {
        services: [confService],
        advertisement: new Advertisement('advertisement', 'peripheral', {
                            service_uuids: ['dddd5678-1234-5678-1234-56789dddddd0']})
    };

    this.bleConfig = bleConfig;
}

BleConfig.prototype.start = function start(cb) {
    bluezManager.start(this.bleConfig, function(err) {
        if (err) {
            console.error('BLE configuration err', err);
            return cb(err);
        }
        cb(null);
        console.log('Services Registered & Advertising!');
    });
};

BleConfig.prototype.close = function close(cb) {
    bluezManager.close(cb);
};

module.exports = new BleConfig();
