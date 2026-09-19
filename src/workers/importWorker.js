/**
 * Worker thread: parses the uploaded XLSX/CSV and writes the six collections.
 * Runs off the main event loop so large files don't block HTTP handling.
 */
const { parentPort, workerData } = require('worker_threads');
const path = require('path');
const xlsx = require('xlsx');
const mongoose = require('mongoose');

const { mapRow } = require('../utils/columnMap');
const { toDate, toNumber, str } = require('../utils/parse');
const { Agent, User, UserAccount, PolicyCategory, PolicyCarrier, Policy } = require('../models');

const { filePath, mongoUri } = workerData;

const summary = {
  totalRows: 0,
  processed: 0,
  skipped: 0,
  errors: [],
  counts: { agents: 0, users: 0, accounts: 0, categories: 0, carriers: 0, policies: 0 },
};

function readSheet(fp) {
  const ext = path.extname(fp).toLowerCase();
  const wb = ext === '.csv' ? xlsx.readFile(fp, { raw: false }) : xlsx.readFile(fp, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet, { defval: '' });
}

// Simple in-memory caches so repeated names don't hit the DB again
const cache = { agent: new Map(), user: new Map(), account: new Map(), category: new Map(), carrier: new Map() };

async function upsertAgent(name) {
  if (!name) return null;
  if (cache.agent.has(name)) return cache.agent.get(name);
  const r = await Agent.findOneAndUpdate(
    { agentName: name }, { $setOnInsert: { agentName: name } },
    { upsert: true, new: true, includeResultMetadata: true }
  );
  if (!r.lastErrorObject.updatedExisting) summary.counts.agents++;
  cache.agent.set(name, r.value._id);
  return r.value._id;
}

async function upsertUser(rec) {
  const key = `${rec.firstName}|${rec.email}`;
  if (cache.user.has(key)) return cache.user.get(key);
  const r = await User.findOneAndUpdate(
    { firstName: rec.firstName, email: rec.email },
    {
      $setOnInsert: { firstName: rec.firstName, email: rec.email },
      $set: {
        dob: toDate(rec.dob), address: str(rec.address), phone: str(rec.phone),
        state: str(rec.state), zipCode: str(rec.zipCode), city: str(rec.city), gender: str(rec.gender),
        userType: str(rec.userType),
      },
    },
    { upsert: true, new: true, includeResultMetadata: true }
  );
  if (!r.lastErrorObject.updatedExisting) summary.counts.users++;
  cache.user.set(key, r.value._id);
  return r.value._id;
}

async function upsertAccount(name, userId, accountType) {
  if (!name) return null;
  const key = `${name}|${userId}`;
  if (cache.account.has(key)) return cache.account.get(key);
  const r = await UserAccount.findOneAndUpdate(
    { accountName: name, userId },
    { $setOnInsert: { accountName: name, userId }, $set: { accountType: accountType || '' } },
    { upsert: true, new: true, includeResultMetadata: true }
  );
  if (!r.lastErrorObject.updatedExisting) summary.counts.accounts++;
  cache.account.set(key, r.value._id);
  return r.value._id;
}

async function upsertCategory(name) {
  if (!name) return null;
  if (cache.category.has(name)) return cache.category.get(name);
  const r = await PolicyCategory.findOneAndUpdate(
    { categoryName: name }, { $setOnInsert: { categoryName: name } },
    { upsert: true, new: true, includeResultMetadata: true }
  );
  if (!r.lastErrorObject.updatedExisting) summary.counts.categories++;
  cache.category.set(name, r.value._id);
  return r.value._id;
}

async function upsertCarrier(name) {
  if (!name) return null;
  if (cache.carrier.has(name)) return cache.carrier.get(name);
  const r = await PolicyCarrier.findOneAndUpdate(
    { companyName: name }, { $setOnInsert: { companyName: name } },
    { upsert: true, new: true, includeResultMetadata: true }
  );
  if (!r.lastErrorObject.updatedExisting) summary.counts.carriers++;
  cache.carrier.set(name, r.value._id);
  return r.value._id;
}

async function processRow(raw, index) {
  const rec = mapRow(raw);
  rec.firstName = str(rec.firstName);
  rec.email = str(rec.email).toLowerCase();
  const policyNumber = str(rec.policyNumber);

  if (!rec.firstName || !policyNumber) {
    summary.skipped++;
    summary.errors.push({ row: index + 2, reason: 'missing firstName or policyNumber' });
    return;
  }

  const [agentId, userId, categoryId, carrierId] = await Promise.all([
    upsertAgent(str(rec.agentName)),
    upsertUser(rec),
    upsertCategory(str(rec.categoryName)),
    upsertCarrier(str(rec.companyName)),
  ]);
  const accountId = await upsertAccount(str(rec.accountName), userId, str(rec.accountType));

  const r = await Policy.findOneAndUpdate(
    { policyNumber },
    {
      $set: {
        policyNumber,
        policyStartDate: toDate(rec.policyStartDate),
        policyEndDate: toDate(rec.policyEndDate),
        policyCategoryId: categoryId,
        companyId: carrierId,
        userId,
        agentId,
        accountId,
        premiumAmount: toNumber(rec.premiumAmount),
        policyType: str(rec.policyType),
        policyMode: str(rec.policyMode),
        premiumAmountWritten: toNumber(rec.premiumAmountWritten),
        producer: str(rec.producer),
        csr: str(rec.csr),
        primary: str(rec.primary),
        applicantId: str(rec.applicantId),
        agencyId: str(rec.agencyId),
        hasActiveClientPolicy: str(rec.hasActiveClientPolicy),
      },
    },
    { upsert: true, new: true, includeResultMetadata: true }
  );
  if (!r.lastErrorObject.updatedExisting) summary.counts.policies++;
  summary.processed++;
}

(async () => {
  try {
    await mongoose.connect(mongoUri);
    const rows = readSheet(filePath);
    summary.totalRows = rows.length;

    // Process in small batches to keep memory and DB load steady
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      await Promise.all(
        slice.map((row, j) =>
          processRow(row, i + j).catch((err) => {
            summary.skipped++;
            summary.errors.push({ row: i + j + 2, reason: err.message });
          })
        )
      );
      parentPort.postMessage({ type: 'progress', done: Math.min(i + BATCH, rows.length), total: rows.length });
    }

    await mongoose.disconnect();
    parentPort.postMessage({ type: 'done', summary });
  } catch (err) {
    try { await mongoose.disconnect(); } catch (_) {}
    parentPort.postMessage({ type: 'error', error: err.message });
  }
})();
