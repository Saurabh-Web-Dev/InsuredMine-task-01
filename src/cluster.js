/**
 * Supervisor: forks one worker running server.js and re-forks it whenever it
 * exits (e.g. the CPU monitor triggered a restart). Run with `npm run cluster`.
 */
const cluster = require('cluster');

if (cluster.isPrimary) {
  cluster.setupPrimary({ exec: require('path').join(__dirname, 'server.js') });
  const fork = () => {
    const w = cluster.fork();
    console.log(`[cluster] started worker pid ${w.process.pid}`);
  };
  fork();
  cluster.on('exit', (worker, code, signal) => {
    console.warn(`[cluster] worker ${worker.process.pid} exited (code ${code}, signal ${signal}); restarting in 1s`);
    setTimeout(fork, 1000);
  });
} else {
  require('./server');
}
