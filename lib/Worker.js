module.exports = Worker;

var Socket = require('./Socket');
var zmq = require('zmq');
var util = require('util');
var events = require('events');

function Worker(masterName) {
    this._masterName = masterName;
    this._heartBeatRunner = null;
    this._socket = new Socket(new zmq.socket('router'));
}

util.inherits(Worker, events.EventEmitter);

Worker.HEARTBEAT = 500;

Worker.prototype.connect = function (endpoint) {
    this._socket.connect(endpoint);
    clearInterval(this._heartBeatRunner);
    var self = this;
    this._heartBeatRunner = setInterval(function () {
        self.sendToMaster('_internal/heartbeat');
    }, Worker.HEARTBEAT);
};

Worker.prototype.sendToMaster = function (type, data) {
    this._socket.send(this._masterName, type, data);
};

Worker.prototype.requestMaster = function (type, data, callback) {
    this._socket.request(this._masterName, type, data, callback);
};
