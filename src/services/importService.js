const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const { MONGO_URI } = require('../config/db');

/** Spawns a worker thread to import the file; resolves with the summary. */
function runImportWorker(filePath) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, '../workers/importWorker.js'), {
      workerData: { filePath, mongoUri: MONGO_URI },
    });

    worker.on('message', (msg) => {
      if (msg.type === 'progress') {
        console.log(`[import] ${msg.done}/${msg.total} rows`);
      } else if (msg.type === 'done') {
        resolve(msg.summary);
      } else if (msg.type === 'error') {
        reject(new Error(msg.error));
      }
    });
    worker.on('error', reject);
    worker.on('exit', (code) => {
      fs.unlink(filePath, () => {}); // clean up temp upload
      if (code !== 0) reject(new Error(`Import worker exited with code ${code}`));
    });
  });
}

module.exports = { runImportWorker };
