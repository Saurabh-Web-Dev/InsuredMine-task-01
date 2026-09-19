require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');
const { startScheduler } = require('./services/schedulerService');
const { startCpuMonitor } = require('./services/cpuMonitor');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await connectDB();
    startScheduler();
    startCpuMonitor({
      threshold: Number(process.env.CPU_THRESHOLD || 70),
      intervalMs: Number(process.env.CPU_CHECK_INTERVAL_MS || 5000),
    });
    app.listen(PORT, () => console.log(`[server] pid ${process.pid} listening on http://localhost:${PORT}`));
  } catch (err) {
    console.error('[server] failed to start:', err);
    process.exit(1);
  }
})();
