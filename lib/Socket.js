module.exports = Socket;

var util = require('util');
var events = require('events');
var crypto = require('crypto');

function Socket(zmqSocket) {
    this._zmqSocket = zmqSocket;

    var self = this;

    this._zmqSocket.on('message', function (envelope, message) {
        var msg = JSON.parse(message);

        self.emit(msg.type, envelope, msg.data);
    });

    this.on('_internal/request', function (envelope, data) {
        var handled = false;
        self.emit(data.type, data.data, function() {
            if (handled) {
                return;
            }
            handled = true;

            self.send(envelope, data.id, Array.prototype.slice.call(arguments))
        });
    });
}

util.inherits(Socket, events.EventEmitter);

Socket.prototype.REQUEST_TIMEOUT = 10000;

Socket.prototype.bind = function (endpoint) {
    this._zmqSocket.bindSync(endpoint);
};

Socket.prototype.connect = function (endpoint) {
    this._zmqSocket.connect(endpoint);
};

Socket.prototype.send = function (envelope, type, data) {
    this._zmqSocket.send([envelope, JSON.stringify({
        type: type,
        data: data
    })]);
};

Socket.prototype.request = function (envelope, type, data, callback) {
    var id = '_internal/request_' + crypto.randomBytes(32).toString('hex');
    var self = this;

    var handler = function (envelope, data) {
        clearTimeout(timeout);
        callback.apply(null, arguments[1]);
    };

    var timeout = setTimeout(function () {
        self.removeListener(id, handler);
        callback(new Error('Request timeout'));
    }, this.REQUEST_TIMEOUT);

    this.once(id, handler);

    this.send(envelope, '_internal/request', {
        id: id,
        type: type,
        data: data,
    });
};
