'use strict';
var nybluez = require('../');
var Service = nybluez.Service;
var Advertisement = nybluez.Advertisement;
var Characteristic = nybluez.Characteristic;
var Descriptor = nybluez.Descriptor;
var Defs = nybluez.Defs;
var bluezManager = nybluez.CreateBluezManager({legacyAdvertising: false});

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

var bleConfig = {
    services: [helloService],
    advertisement: new Advertisement('advertisement', 'peripheral', {
                        service_uuids: ['88888888-1111-2222-3333-56789dddddd0'],
                        manufacturer_data: [0xffff, [0x00]]})
};

bluezManager.start(bleConfig, function(err) {
    if (err) {
        return console.error(err);
    }
    console.log('Services Registered & Advertising!');
});

process.on('SIGINT', function() {
    bluezManager.close(function(err) {
        if (err) {
            console.log('Bluez Manager Close', err);
        }
        process.exit();
    });
});
