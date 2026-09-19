const { Schema, model } = require('mongoose');
const ScheduledMessageSchema = new Schema(
  {
    message: { type: String, required: true },
    day: { type: String, required: true },      // as received, e.g. "2026-09-20"
    time: { type: String, required: true },     // as received, e.g. "14:30"
    scheduledAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ['pending', 'inserted', 'failed'], default: 'pending', index: true },
    insertedAt: { type: Date },
    error: { type: String },
  },
  { timestamps: true }
);
module.exports = model('ScheduledMessage', ScheduledMessageSchema);
