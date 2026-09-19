const os = require('os');

/**
 * Real-time CPU monitor.
 * Samples process-wide CPU usage every `intervalMs`; if it stays at/above
 * `threshold` %, the process exits with code 1 so the supervisor
 * (cluster.js primary, PM2, or Docker restart policy) restarts it.
 */
function startCpuMonitor({ threshold = 70, intervalMs = 5000, onRestart } = {}) {
  let prev = cpuSnapshot();

  const timer = setInterval(() => {
    const cur = cpuSnapshot();
    const idle = cur.idle - prev.idle;
    const total = cur.total - prev.total;
    prev = cur;
    const usage = total === 0 ? 0 : Math.round((1 - idle / total) * 1000) / 10;

    console.log(`[cpu] ${usage}% (threshold ${threshold}%)`);
    if (usage >= threshold) {
      console.error(`[cpu] usage ${usage}% >= ${threshold}% — restarting server`);
      clearInterval(timer);
      if (typeof onRestart === 'function') onRestart(usage);
      else process.exit(1);
    }
  }, intervalMs);

  timer.unref(); // don't keep the process alive on its own
  return timer;
}

function cpuSnapshot() {
  let idle = 0, total = 0;
  for (const cpu of os.cpus()) {
    for (const type in cpu.times) total += cpu.times[type];
    idle += cpu.times.idle;
  }
  return { idle, total };
}

module.exports = { startCpuMonitor };
