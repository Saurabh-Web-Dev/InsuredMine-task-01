const { Schema, model } = require('mongoose');
// Final destination collection: the message lands here at the scheduled day/time
const MessageSchema = new Schema(
  {
    message: { type: String, required: true },
    scheduledFor: { type: Date, required: true },
    sourceId: { type: Schema.Types.ObjectId, ref: 'ScheduledMessage' },
  },
  { timestamps: true }
);
module.exports = model('Message', MessageSchema);
