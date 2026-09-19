/**
 * Pagination helper.
 *
 * Reads `page` and `limit` from a request query string and clamps them to the
 * API's contract: at least 10 and at most 100 records per page, defaulting to 10.
 * Invalid or missing values fall back to the defaults rather than erroring.
 */
function getPagination(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const raw = parseInt(query.limit, 10) || 10;
  const limit = Math.min(100, Math.max(10, raw));
  return { page, limit, skip: (page - 1) * limit };
}

/** Builds the `pagination` object returned alongside `data`. */
function buildMeta(page, limit, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

module.exports = { getPagination, buildMeta };
