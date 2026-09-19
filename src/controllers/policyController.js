const mongoose = require('mongoose');
const { User, Policy } = require('../models');
const { getPagination, buildMeta } = require('../utils/pagination');

const POPULATE = [
  { path: 'policyCategoryId', select: 'categoryName' },
  { path: 'companyId', select: 'companyName' },
  { path: 'agentId', select: 'agentName' },
  { path: 'accountId', select: 'accountName' },
];

// GET /api/policies/search?username=Alice&page=1&limit=10   (also accepts ?email=)
// Paginates over matching USERS. 10 <= limit <= 100.
async function searchByUsername(req, res, next) {
  try {
    const { username, email } = req.query;
    if (!username && !email) {
      return res.status(400).json({ success: false, message: 'Query param "username" (or "email") is required' });
    }

    const filter = {};
    if (username) filter.firstName = { $regex: `^${escapeRegex(username)}$`, $options: 'i' };
    if (email) filter.email = String(email).toLowerCase();

    const { page, limit, skip } = getPagination(req.query);

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      // Sort is required: without it skip/limit have no stable order and rows
      // can repeat or disappear between pages.
      User.find(filter).sort({ _id: 1 }).skip(skip).limit(limit).lean(),
    ]);

    if (!total) return res.status(404).json({ success: false, message: 'User not found' });

    const data = await Promise.all(
      users.map(async (u) => ({
        user: u,
        policies: await Policy.find({ userId: u._id }).populate(POPULATE).lean(),
      }))
    );

    res.json({
      success: true,
      count: data.length,
      data,
      pagination: buildMeta(page, limit, total),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/policies/aggregate?page=1&limit=10          -> all users
// GET /api/policies/aggregate/:userId?page=1&limit=10  -> one user
// Paginates inside the pipeline via $facet, so Mongo does not materialise every
// user's group just to throw most of it away.
async function aggregateByUser(req, res, next) {
  try {
    const match = {};
    if (req.params.userId) {
      if (!mongoose.isValidObjectId(req.params.userId)) {
        return res.status(400).json({ success: false, message: 'Invalid userId' });
      }
      match.userId = new mongoose.Types.ObjectId(req.params.userId);
    }

    const { page, limit, skip } = getPagination(req.query);

    const [result] = await Policy.aggregate([
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
      // userId is the tie-breaker so equal (totalPolicies, firstName) pairs keep
      // a stable order across pages.
      { $sort: { totalPolicies: -1, firstName: 1, userId: 1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          meta: [{ $count: 'total' }],
        },
      },
    ]);

    const data = result?.data ?? [];
    const total = result?.meta?.[0]?.total ?? 0;

    res.json({
      success: true,
      count: data.length,
      data,
      pagination: buildMeta(page, limit, total),
    });
  } catch (err) {
    next(err);
  }
}

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { searchByUsername, aggregateByUser };
