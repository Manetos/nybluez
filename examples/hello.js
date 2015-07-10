'use strict';
var nybluez = require('../');
var Service = nybluez.Service;
var Characteristic = nybluez.Characteristic;
var Descriptor = nybluez.Descriptor;
var Defs = nybluez.Defs;
var bluezManager = nybluez.CreateBluezManager({legacyAdvertising: true});

var helloCharUserDescriptorImpl = {
    ReadValue: function() {
        return new Buffer('Wifi');
    }
};

var helloCharImpl = {
    localValue: 'NOT_INIT',

    ReadValue: function() {
        return new Buffer(this.localValue);
    },

    WriteValue: function(value) {
        this.localValue = value.toString();
    }
};

var helloCharUserDescriptor = new Descriptor(
                                'helloCharUserDescriptor',
                                Defs.UUIDs.CharacteristicUserDescription,
                                ['read'],
                                helloCharUserDescriptorImpl);

var helloChar = new Characteristic(
                'helloChar',
                'dddd5678-1234-5678-1234-56789dddddd1',
                ['read', 'write', 'notify'],
                [helloCharUserDescriptor],
                helloCharImpl);

var helloService = new Service(
                    'helloService',
                    '88888888-1111-2222-3333-56789dddddd0',
                    true,
                    [helloChar]);

bluezManager.init(function(err) {
    if (err) {
        throw err;
    }
    bluezManager.registerBleServices([helloService], function (err) {
        if (err) {
            console.log(err);
            return;
        }
        console.log('Services registered successfully!');
    });
});
