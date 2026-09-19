const { Schema, model } = require('mongoose');
const PolicyCarrierSchema = new Schema(
  { companyName: { type: String, required: true, unique: true, trim: true } },
  { timestamps: true }
);
module.exports = model('PolicyCarrier', PolicyCarrierSchema);
