const mongoose = require('mongoose');
const { User, Policy } = require('../models');

const POPULATE = [
  { path: 'policyCategoryId', select: 'categoryName' },
  { path: 'companyId', select: 'companyName' },
  { path: 'agentId', select: 'agentName' },
  { path: 'accountId', select: 'accountName' },
];

// GET /api/policies/search?username=Alice   (also accepts ?email=)
async function searchByUsername(req, res, next) {
  try {
    const { username, email } = req.query;
    if (!username && !email) {
      return res.status(400).json({ success: false, message: 'Query param "username" (or "email") is required' });
    }
    const filter = {};
    if (username) filter.firstName = { $regex: `^${escapeRegex(username)}$`, $options: 'i' };
    if (email) filter.email = String(email).toLowerCase();

    const users = await User.find(filter).lean();
    if (!users.length) return res.status(404).json({ success: false, message: 'User not found' });

    const results = await Promise.all(
      users.map(async (u) => ({
        user: u,
        policies: await Policy.find({ userId: u._id }).populate(POPULATE).lean(),
      }))
    );
    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    next(err);
  }
}

// GET /api/policies/aggregate          -> all users
// GET /api/policies/aggregate/:userId  -> one user
async function aggregateByUser(req, res, next) {
  try {
    const match = {};
    if (req.params.userId) {
      if (!mongoose.isValidObjectId(req.params.userId)) {
        return res.status(400).json({ success: false, message: 'Invalid userId' });
      }
      match.userId = new mongoose.Types.ObjectId(req.params.userId);
    }

    const data = await Policy.aggregate([
      { $match: match },
      { $lookup: { from: 'policycategories', localField: 'policyCategoryId', foreignField: '_id', as: 'category' } },
      { $lookup: { from: 'policycarriers', localField: 'companyId', foreignField: '_id', as: 'carrier' } },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$carrier', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$userId',
          totalPolicies: { $sum: 1 },
          totalPremium: { $sum: { $ifNull: ['$premiumAmount', 0] } },
          policies: {
            $push: {
              policyNumber: '$policyNumber',
              policyStartDate: '$policyStartDate',
              policyEndDate: '$policyEndDate',
              category: '$category.categoryName',
              carrier: '$carrier.companyName',
              premiumAmount: '$premiumAmount',
            },
          },
        },
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          firstName: '$user.firstName',
          email: '$user.email',
          totalPolicies: 1,
          totalPremium: 1,
          policies: 1,
        },
      },
      { $sort: { totalPolicies: -1, firstName: 1 } },
    ]);

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
}

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { searchByUsername, aggregateByUser };
