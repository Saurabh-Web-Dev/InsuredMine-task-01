const cron = require('node-cron');
const { ScheduledMessage, Message } = require('../models');

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Accepts:
 *   day:  "2026-09-20" | "20/09/2026" | "Monday" | "today" | "tomorrow"
 *   time: "14:30" | "14:30:00" | "2:30 PM"
 * Returns a Date or null.
 */
function parseDayTime(day, time) {
  const t = parseTime(time);
  if (!t) return null;

  const dayStr = String(day).trim().toLowerCase();
  let base;

  if (dayStr === 'today') base = new Date();
  else if (dayStr === 'tomorrow') { base = new Date(); base.setDate(base.getDate() + 1); }
  else if (WEEKDAYS.includes(dayStr)) {
    base = new Date();
    const target = WEEKDAYS.indexOf(dayStr);
    let diff = (target - base.getDay() + 7) % 7;
    // If it's today but the time has already passed, roll to next week
    const candidate = new Date(base); candidate.setHours(t.h, t.m, t.s, 0);
    if (diff === 0 && candidate <= new Date()) diff = 7;
    base.setDate(base.getDate() + diff);
  } else {
    const m = dayStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/); // DD/MM/YYYY
    base = m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : new Date(dayStr);
    if (isNaN(base)) return null;
  }

  base.setHours(t.h, t.m, t.s, 0);
  return base;
}

function parseTime(time) {
  const s = String(time).trim().toLowerCase();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const sec = Number(m[3] || 0);
  if (m[4] === 'pm' && h < 12) h += 12;
  if (m[4] === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59 || sec > 59) return null;
  return { h, m: min, s: sec };
}

/** Every minute: move due messages from the schedule queue into the messages collection. */
function startScheduler() {
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const due = await ScheduledMessage.find({ status: 'pending', scheduledAt: { $lte: now } });
    for (const item of due) {
      try {
        await Message.create({ message: item.message, scheduledFor: item.scheduledAt, sourceId: item._id });
        item.status = 'inserted';
        item.insertedAt = new Date();
        await item.save();
        console.log(`[scheduler] inserted message ${item._id} scheduled for ${item.scheduledAt.toISOString()}`);
      } catch (err) {
        item.status = 'failed';
        item.error = err.message;
        await item.save();
        console.error(`[scheduler] failed for ${item._id}: ${err.message}`);
      }
    }
  });
  console.log('[scheduler] message scheduler running (checks every minute)');
}

module.exports = { startScheduler, parseDayTime };
