const { ScheduledMessage, Message } = require('../models');
const { parseDayTime } = require('../services/schedulerService');

// POST /api/messages   body: { message, day, time }
async function scheduleMessage(req, res, next) {
  try {
    const { message, day, time } = req.body || {};
    if (!message || !day || !time) {
      return res.status(400).json({ success: false, message: 'Body must include "message", "day" and "time"' });
    }
    const scheduledAt = parseDayTime(day, time);
    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        message: 'Invalid day/time. Use day as YYYY-MM-DD (or a weekday name like "Monday") and time as HH:mm (24h) or "2:30 PM".',
      });
    }
    if (scheduledAt.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: 'Scheduled day/time must be in the future' });
    }
    const doc = await ScheduledMessage.create({ message, day, time, scheduledAt });
    res.status(201).json({ success: true, message: 'Message scheduled', data: doc });
  } catch (err) {
    next(err);
  }
}

// GET /api/messages   -> scheduled queue + delivered messages
async function listMessages(req, res, next) {
  try {
    const [scheduled, delivered] = await Promise.all([
      ScheduledMessage.find().sort({ scheduledAt: 1 }).lean(),
      Message.find().sort({ scheduledFor: -1 }).lean(),
    ]);
    res.json({ success: true, scheduled, delivered });
  } catch (err) {
    next(err);
  }
}

module.exports = { scheduleMessage, listMessages };
