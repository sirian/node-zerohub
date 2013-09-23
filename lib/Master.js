module.exports = Master;

var Socket = require('./Socket');
var Worker = require('./Worker');
var zmq = require('zmq');
var util = require('util');
var events = require('events');
var _ = require('underscore');

function Master(name) {
    this._name = name;
    this._workers = {};
    this._socket = new Socket(new zmq.socket('router'));
    this._socket._zmqSocket.identity = name;

    var self = this;

    this._socket.on('_internal/heartbeat', function (envelope, data) {
        if (!self._workers.hasOwnProperty(envelope)) {
            self._workers[envelope] = {
                envelope: envelope,
                heartbeat: Date.now(),
            }
        }

        var worker = self._workers[envelope];
        worker.heartbeat = Date.now();
    });

    setInterval(function () {
        var now = Date.now();
        self.eachWorker(function (worker, id) {
            if (now - worker.heartbeat > Worker.HEARTBEAT * 2) {
                delete self._workers[id];
            }
        });
    }, Worker.HEARTBEAT);
}

util.inherits(Master, events.EventEmitter);

Master.prototype.bind = function (endpoint) {
    this._socket.bind(endpoint);
};

Master.prototype.sendToWorker = function (worker, type, data) {
    this._socket.send(worker.envelope, type, data)
};

Master.prototype.eachWorker = function (callback) {
    _.each(this._workers, callback);
};

Master.prototype.requestWorker = function (worker, type, data, callback) {
    this._socket.request(worker.envelope, type, data, callback);
};

Master.prototype.requestAllWorkers = function (type, data, callback) {
    var responses = {};
    var self = this;
    var total = 0;
    var responseCount = 0;

    this.eachWorker(function (worker) {
        total++;

        self.requestWorker(worker, type, data, function () {
            responses[worker.envelope] = Array.prototype.slice.call(arguments);
            responseCount++;
            if (responseCount === total) {
                callback(null, responses);
            }
        });
    });
    if (total === 0) {
        callback(null, responses);
    }
};

Master.prototype.requestRandomWorker = function (type, data, callback) {
    var worker = this.getRandomWorker();
    if (!worker) {
        callback(new Error('No workers'));
        return;
    }

    this.requestWorker(worker, type, data, callback)
};
