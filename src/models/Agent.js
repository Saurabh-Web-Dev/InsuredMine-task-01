const { Schema, model } = require('mongoose');
const AgentSchema = new Schema(
  { agentName: { type: String, required: true, unique: true, trim: true } },
  { timestamps: true }
);
module.exports = model('Agent', AgentSchema);
