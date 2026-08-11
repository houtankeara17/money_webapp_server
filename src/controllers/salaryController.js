const asyncHandler = require("express-async-handler");
const Salary = require("../models/Salary");
const Bonus = require("../models/Bonus");
const SalaryBonusHistory = require("../models/SalaryBonusHistory");
const { toUSD, getDateParts, toObjectId } = require("../utils/currency");
const { success, error } = require("../utils/response");

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// GET /api/salaries
const getSalaries = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    year,
    monthNumber,
    status,
    sort = "-year,-monthNumber",
  } = req.query;

  const query = { userId: toObjectId(req.user._id) };
  if (year) query.year = Number(year);
  if (monthNumber) query.monthNumber = Number(monthNumber);
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Salary.countDocuments(query);
  const items = await Salary.find(query)
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  // Totals by currency for current query
  const totals = await Salary.aggregate([
    { $match: query },
    {
      $group: {
        _id: "$currency",
        total: { $sum: "$amount" },
        totalUSD: { $sum: "$amountUSD" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Available years for prev/next navigation
  const yearsAgg = await Salary.aggregate([
    { $match: { userId: toObjectId(req.user._id) } },
    { $group: { _id: "$year" } },
    { $sort: { _id: -1 } },
  ]);
  const availableYears = yearsAgg.map((y) => y._id);

  // Summary for selected year (or all)
  const yearQuery = { userId: toObjectId(req.user._id) };
  if (year) yearQuery.year = Number(year);
  const yearSummary = await Salary.aggregate([
    { $match: yearQuery },
    {
      $group: {
        _id: null,
        totalUSD: { $sum: "$amountUSD" },
        confirmedUSD: {
          $sum: {
            $cond: [
              { $in: ["$status", ["Confirmed", "Disbursed"]] },
              "$amountUSD",
              0,
            ],
          },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  return success(res, {
    items,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)) || 1,
    },
    totals,
    availableYears,
    yearSummary: yearSummary[0] || { totalUSD: 0, confirmedUSD: 0, count: 0 },
  });
});

// POST /api/salaries
const createSalary = asyncHandler(async (req, res) => {
  const { amount, currency, year, monthNumber, status, paymentMethod, noted, image } =
    req.body;

  if (!amount || !currency || !year || !monthNumber) {
    return error(res, "Amount, currency, year and month are required", 400);
  }

  const mn = Number(monthNumber);
  if (mn < 1 || mn > 12) {
    return error(res, "Invalid month number", 400);
  }

  const amountUSD = toUSD(amount, currency, req.user);

  const salary = await Salary.create({
    userId: toObjectId(req.user._id),
    amount: Number(amount),
    currency,
    amountUSD,
    originalAmount: Number(amount),
    year: Number(year),
    month: MONTH_NAMES[mn - 1],
    monthNumber: mn,
    status: status || "Confirmed",
    paymentMethod: paymentMethod || "ABA Bank",
    noted: noted || "",
    image: image || "",
  });

  return success(res, salary, "Salary added successfully", 201);
});

// PUT /api/salaries/:id
const updateSalary = asyncHandler(async (req, res) => {
  const salary = await Salary.findOne({
    _id: req.params.id,
    userId: toObjectId(req.user._id),
  });

  if (!salary) {
    return error(res, "Salary not found", 404);
  }

  const fields = [
    "amount", "currency", "year", "monthNumber", "status",
    "paymentMethod", "noted", "image",
  ];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) salary[f] = req.body[f];
  });

  if (req.body.monthNumber) {
    salary.month = MONTH_NAMES[Number(req.body.monthNumber) - 1];
  }
  if (req.body.amount !== undefined || req.body.currency) {
    salary.amountUSD = toUSD(salary.amount, salary.currency, req.user);
  }

  const updated = await salary.save();
  return success(res, updated, "Salary updated successfully");
});

// DELETE /api/salaries/:id
const deleteSalary = asyncHandler(async (req, res) => {
  const salary = await Salary.findOneAndDelete({
    _id: req.params.id,
    userId: toObjectId(req.user._id),
  });
  if (!salary) {
    return error(res, "Salary not found", 404);
  }
  return success(res, null, "Salary deleted successfully");
});

// DELETE /api/salaries
const deleteAllSalaries = asyncHandler(async (req, res) => {
  const result = await Salary.deleteMany({ userId: toObjectId(req.user._id) });
  return success(
    res,
    { deletedCount: result.deletedCount },
    `Deleted ${result.deletedCount} salaries`
  );
});

// GET /api/salaries/export
const exportSalaries = asyncHandler(async (req, res) => {
  const items = await Salary.find({ userId: toObjectId(req.user._id) }).sort(
    "-year,-monthNumber"
  );
  return success(res, items, "Export ready");
});


// GET /api/salaries/history?year=&monthNumber=
const getSalaryBonusHistory = asyncHandler(async (req, res) => {
  const { year, monthNumber, page = 1, limit = 50 } = req.query;
  const query = { userId: toObjectId(req.user._id) };
  if (year) query.year = Number(year);
  if (monthNumber) query.monthNumber = Number(monthNumber);

  const skip = (Number(page) - 1) * Number(limit);
  const total = await SalaryBonusHistory.countDocuments(query);
  const items = await SalaryBonusHistory.find(query)
    .sort("-createdAt")
    .skip(skip)
    .limit(Number(limit))
    .populate("bonusId", "amount tag status currency")
    .populate("salaryId", "amount originalAmount currency status");

  // Snapshot for selected month: salary + bonuses
  let snapshot = null;
  if (year && monthNumber) {
    const salary = await Salary.findOne({
      userId: toObjectId(req.user._id),
      year: Number(year),
      monthNumber: Number(monthNumber),
    });
    const bonuses = await Bonus.find({
      userId: toObjectId(req.user._id),
      year: Number(year),
      monthNumber: Number(monthNumber),
    }).sort("-createdAt");
    const bonusTotal = bonuses.reduce((s, b) => s + Number(b.amount || 0), 0);
    snapshot = {
      salary: salary
        ? {
            _id: salary._id,
            amount: salary.amount,
            originalAmount: salary.originalAmount ?? salary.amount,
            currency: salary.currency,
            amountUSD: salary.amountUSD,
            status: salary.status,
          }
        : null,
      bonuses,
      bonusTotal,
      remaining:
        salary != null
          ? Number(salary.amount)
          : null,
    };
  }

  return success(res, {
    items,
    snapshot,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)) || 1,
    },
  });
});

module.exports = {
  getSalaries,
  getSalaryBonusHistory,
  createSalary,
  updateSalary,
  deleteSalary,
  deleteAllSalaries,
  exportSalaries,
};
