var ENDPOINT = 'tcp://127.0.0.1:12345';
var SERVER_NAME = 'test';

var cluster = require('cluster');
var hub = require('../lib');

if (cluster.isMaster) {
    for (var i = 0; i < 2; i++) {
        cluster.fork();
    }
    var master = new hub.Master(SERVER_NAME);
    master.bind(ENDPOINT);

    setInterval(function () {
        master.requestAllWorkers('test', 123, function (err, res) {
            console.log('response', res);
        });

    }, 1000);

} else {
    var worker = new hub.Worker(SERVER_NAME);
    worker.connect(ENDPOINT);

    worker._socket.on('test', function (data, callback) {
        console.log(data);
        callback(null, 456);
    });
}
