const { Schema, model } = require('mongoose');
const PolicySchema = new Schema(
  {
    policyNumber: { type: String, required: true, unique: true, trim: true },
    policyStartDate: { type: Date },
    policyEndDate: { type: Date },
    policyCategoryId: { type: Schema.Types.ObjectId, ref: 'PolicyCategory' },
    companyId: { type: Schema.Types.ObjectId, ref: 'PolicyCarrier' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent' },
    accountId: { type: Schema.Types.ObjectId, ref: 'UserAccount' },
    premiumAmount: { type: Number },
    policyType: { type: String },
    policyMode: { type: String },
    premiumAmountWritten: { type: Number },
    producer: { type: String },
    csr: { type: String },
    primary: { type: String },
    applicantId: { type: String },
    agencyId: { type: String },
    hasActiveClientPolicy: { type: String },
  },
  { timestamps: true }
);
module.exports = model('Policy', PolicySchema);
