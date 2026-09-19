# Insurance Policy API (Node.js + MongoDB)

Implements both tasks in JavaScript:

| Task | Endpoint / Feature | Where |
|------|--------------------|-------|
| 1.1 | Upload XLSX/CSV → MongoDB using **worker threads** | `POST /api/upload` → `src/workers/importWorker.js` |
| 1.2 | Search policy info by username | `GET /api/policies/search?username=Lucy` |
| 1.3 | Aggregated policies per user | `GET /api/policies/aggregate` and `/api/policies/aggregate/:userId` |
| 1.4 | Six collections: Agent, User, UserAccount, PolicyCategory (LOB), PolicyCarrier, Policy | `src/models/` |

Expected result after importing `data/data-sheet.csv`: 3 agents, 1198 users, 1193 accounts, 19 LOB categories, 46 carriers, 1198 policies. Extra sheet columns (`producer`, `csr`, `premium_amount_written`, `city`, `account_type`, `primary`, `Applicant ID`, `agency_id`, `hasActive ClientPolicy`) are stored on the relevant collection too.
| 2.1 | Real-time CPU tracking, restart at 70% | `src/services/cpuMonitor.js` + `src/cluster.js` |
| 2.2 | Post-service: insert message at given day & time | `POST /api/messages` → `src/services/schedulerService.js` |

## Setup

```bash
npm install
cp .env.example .env        # edit MONGO_URI if needed
npm run cluster             # recommended: supervisor auto-restarts on CPU trigger
# or: npm start             # single process (relies on PM2 / Docker for restart)
```

## Task 1

### Upload (worker thread)
```bash
curl -F "file=@data/data-sheet.csv" http://localhost:3000/api/upload
```
The main thread spawns `importWorker.js`, which parses the sheet with `xlsx`, upserts Agents / Users / Accounts / LOBs / Carriers, then upserts Policies referencing them by ObjectId. Progress is posted back to the main thread; the response contains a summary (`counts`, `skipped`, `errors` by row).

Column headers are matched case-insensitively and ignore spaces/underscores (`policy_number`, `Policy Number`, `policyNumber` all work). Aliases live in `src/utils/columnMap.js` — extend if your sheet differs.

### Search by username
```bash
curl "http://localhost:3000/api/policies/search?username=test_name"
curl "http://localhost:3000/api/policies/search?email=test@test.com"
```
Returns the user plus their policies with category, carrier, agent and account populated.

### Aggregate by user
```bash
curl http://localhost:3000/api/policies/aggregate
curl http://localhost:3000/api/policies/aggregate/<userId>
```
Uses a MongoDB aggregation pipeline (`$lookup` + `$group`) to return `totalPolicies`, `totalPremium` and the policy list for each user.

## Task 2

### CPU monitor + restart
`cpuMonitor.js` samples `os.cpus()` every 5 s (configurable via `CPU_CHECK_INTERVAL_MS`) and computes live utilisation. When usage ≥ `CPU_THRESHOLD` (default 70) the process exits with code 1. `npm run cluster` runs a primary process that immediately forks a fresh server — that's the restart. With PM2 (`pm2 start src/server.js`) or Docker `restart: always`, the same exit triggers their restart instead.

Test it: hit the server with load (e.g. `npx autocannon -c 200 -d 30 http://localhost:3000/api/health`) and watch the `[cpu]` / `[cluster]` logs.

### Scheduled message post-service
```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"message":"Renewal reminder","day":"2026-09-20","time":"14:30"}'
```
`day` accepts `YYYY-MM-DD`, `DD/MM/YYYY`, a weekday name (`Monday`), `today`, `tomorrow`. `time` accepts `HH:mm`, `HH:mm:ss` or `2:30 PM`.
The request is stored in `scheduledmessages` (status `pending`); a cron job runs every minute and, at the scheduled moment, inserts the message into the `messages` collection and marks the source `inserted`. `GET /api/messages` shows both queues.

## Project layout
```
src/
  server.js            entry (DB, scheduler, CPU monitor, HTTP)
  cluster.js           supervisor that restarts the server
  app.js               express app
  routes/index.js
  controllers/         upload, policy, message
  services/            importService (spawns worker), schedulerService, cpuMonitor
  workers/importWorker.js
  models/              Agent, User, UserAccount, PolicyCategory, PolicyCarrier, Policy, ScheduledMessage, Message
  utils/               columnMap, parse
data/data-sheet.csv   (1,198 rows — the provided assessment data)
```
#
