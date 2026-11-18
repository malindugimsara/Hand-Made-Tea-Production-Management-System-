import { escapeRegex } from './sanitize.js';

/**
 * Reusable helper to handle pagination, date filtering, and query bounding for Mongoose queries.
 * Prevents Unbounded Query DoS / memory exhaustion (e.g. 10,000+ records freezing the browser).
 *
 * @param {import('mongoose').Model} model - Mongoose Model
 * @param {import('express').Request} req - Express Request
 * @param {import('express').Response} res - Express Response
 * @param {Object} options - Options (filter, sort, dateField, defaultLimit, maxLimit, safeUnpaginatedLimit)
 */
export const paginate = async (model, req, res, options = {}) => {
  const {
    filter = {},
    dateField = 'date',
    sort = { [options.dateField || 'date']: -1 },
    defaultLimit = 20,
    maxLimit = 100,
    safeUnpaginatedLimit = 1000,
    populate = null,
    select = null
  } = options;

  const query = { ...filter };

  // 1. Month filtering (?month=YYYY-MM)
  if (req.query.month) {
    const safeMonth = escapeRegex(req.query.month);
    query[dateField] = { $regex: `^${safeMonth}` };
  }

  // 2. Date filtering (?date=YYYY-MM-DD or ?startDate=...&endDate=...)
  if (req.query.startDate && req.query.endDate) {
    query[dateField] = {
      $gte: req.query.startDate,
      $lte: req.query.endDate
    };
  } else if (req.query.date) {
    query[dateField] = req.query.date;
  }

  // Count total matching documents
  const total = await model.countDocuments(query);

  // Check if pagination was explicitly requested (?page=... or ?limit=... or ?paginate=true)
  const isPaginationRequested = 
    req.query.page !== undefined || 
    req.query.limit !== undefined || 
    req.query.paginate === 'true';

  if (isPaginationRequested) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit, 10) || defaultLimit));
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit) || 1;

    let mongooseQuery = model.find(query).sort(sort).skip(skip).limit(limit);
    if (populate) mongooseQuery = mongooseQuery.populate(populate);
    if (select) mongooseQuery = mongooseQuery.select(select);

    const records = await mongooseQuery.lean();

    res.set('X-Total-Count', String(total));
    res.set('X-Page', String(page));
    res.set('X-Total-Pages', String(totalPages));

    return res.status(200).json({
      success: true,
      data: records,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  }

  // Unpaginated / Backward-compatible mode:
  // If ?all=true is explicitly requested, fetch entire collection without limit.
  // Otherwise, apply a safe default ceiling (default 1000) to protect Node memory.
  const fetchAll = req.query.all === 'true';
  let mongooseQuery = model.find(query).sort(sort);
  if (!fetchAll && safeUnpaginatedLimit) {
    mongooseQuery = mongooseQuery.limit(safeUnpaginatedLimit);
  }
  if (populate) mongooseQuery = mongooseQuery.populate(populate);
  if (select) mongooseQuery = mongooseQuery.select(select);

  const records = await mongooseQuery.lean();

  res.set('X-Total-Count', String(total));
  res.set('X-Page-Size', String(records.length));

  if (options.wrapSuccessData) {
    return res.status(200).json({ success: true, data: records });
  }

  return res.status(200).json(records);
};
