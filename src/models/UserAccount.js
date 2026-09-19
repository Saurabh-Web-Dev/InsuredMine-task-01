const { Schema, model } = require('mongoose');
const UserAccountSchema = new Schema(
  {
    accountName: { type: String, required: true, trim: true },
    accountType: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);
UserAccountSchema.index({ accountName: 1, userId: 1 }, { unique: true });
module.exports = model('UserAccount', UserAccountSchema);
