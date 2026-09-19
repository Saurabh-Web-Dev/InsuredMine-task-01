const { Schema, model } = require('mongoose');
// LOB = Line of Business
const PolicyCategorySchema = new Schema(
  { categoryName: { type: String, required: true, unique: true, trim: true } },
  { timestamps: true }
);
module.exports = model('PolicyCategory', PolicyCategorySchema);
