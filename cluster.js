var app = require('./app');
var cluster = require('cluster');

if (cluster.isMaster) {
	var totalWorkers = require('os').cpus().length;

	console.log('Running %d total workers', totalWorkers);

	for (var i = 0; i < totalWorkers; i++) {
		cluster.fork();
	}

	cluster.on('exit', function (worker) {
		console.log('Worker PID:', worker.id);
		cluster.fork();
	});
} else {
	console.log('Worker PID: ', process.pid);
	app.listen(process.env.PORT || 80);
}