const { Schema, model } = require('mongoose');
const UserSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true, index: true },
    dob: { type: Date },
    address: { type: String },
    phone: { type: String },
    state: { type: String },
    zipCode: { type: String },
    city: { type: String },
    email: { type: String, lowercase: true, trim: true, index: true },
    gender: { type: String },
    userType: { type: String },
  },
  { timestamps: true }
);
// A user is identified by firstName + email (email may be blank in source data)
UserSchema.index({ firstName: 1, email: 1 }, { unique: true });
module.exports = model('User', UserSchema);
