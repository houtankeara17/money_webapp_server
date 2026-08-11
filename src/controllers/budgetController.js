const asyncHandler = require("express-async-handler");
const Budget = require("../models/Budget");
const { toUSD, toObjectId } = require("../utils/currency");
const { success, error } = require("../utils/response");

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const getBudgets = asyncHandler(async (req, res) => {
  const { year, monthNumber, page = 1, limit = 24 } = req.query;
  const query = { userId: toObjectId(req.user._id) };
  if (year) query.year = Number(year);
  if (monthNumber) query.monthNumber = Number(monthNumber);

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Budget.countDocuments(query);
  const items = await Budget.find(query)
    .sort("-year,-monthNumber")
    .skip(skip)
    .limit(Number(limit));

  return success(res, {
    items,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)) || 1,
    },
  });
});

const createBudget = asyncHandler(async (req, res) => {
  const {
    year,
    monthNumber,
    currency = "USD",
    plannedIncome = 0,
    savingsAmount = 0,
    remittanceAmount = 0,
    spendingAmount = 0,
    noted = "",
  } = req.body;

  if (!year || !monthNumber) {
    return error(res, "Year and month are required", 400);
  }

  const mn = Number(monthNumber);
  if (mn < 1 || mn > 12) return error(res, "Invalid month", 400);

  const exists = await Budget.findOne({
    userId: toObjectId(req.user._id),
    year: Number(year),
    monthNumber: mn,
  });
  if (exists) {
    return error(res, "Budget for this month already exists — edit it instead", 400);
  }

  const cur = currency || "USD";
  const budget = await Budget.create({
    userId: toObjectId(req.user._id),
    year: Number(year),
    monthNumber: mn,
    month: MONTH_NAMES[mn - 1],
    currency: cur,
    plannedIncome: Number(plannedIncome) || 0,
    plannedIncomeUSD: toUSD(plannedIncome || 0, cur, req.user),
    savingsAmount: Number(savingsAmount) || 0,
    savingsAmountUSD: toUSD(savingsAmount || 0, cur, req.user),
    remittanceAmount: Number(remittanceAmount) || 0,
    remittanceAmountUSD: toUSD(remittanceAmount || 0, cur, req.user),
    spendingAmount: Number(spendingAmount) || 0,
    spendingAmountUSD: toUSD(spendingAmount || 0, cur, req.user),
    noted: noted || "",
  });

  return success(res, budget, "Budget created successfully", 201);
});

const updateBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({
    _id: req.params.id,
    userId: toObjectId(req.user._id),
  });
  if (!budget) return error(res, "Budget not found", 404);

  const fields = [
    "year",
    "monthNumber",
    "currency",
    "plannedIncome",
    "savingsAmount",
    "remittanceAmount",
    "spendingAmount",
    "noted",
  ];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) budget[f] = req.body[f];
  });

  if (budget.monthNumber) {
    budget.month = MONTH_NAMES[Number(budget.monthNumber) - 1] || budget.month;
  }

  const cur = budget.currency || "USD";
  budget.plannedIncomeUSD = toUSD(budget.plannedIncome, cur, req.user);
  budget.savingsAmountUSD = toUSD(budget.savingsAmount, cur, req.user);
  budget.remittanceAmountUSD = toUSD(budget.remittanceAmount, cur, req.user);
  budget.spendingAmountUSD = toUSD(budget.spendingAmount, cur, req.user);

  const updated = await budget.save();
  return success(res, updated, "Budget updated successfully");
});

const deleteBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOneAndDelete({
    _id: req.params.id,
    userId: toObjectId(req.user._id),
  });
  if (!budget) return error(res, "Budget not found", 404);
  return success(res, null, "Budget deleted successfully");
});

const deleteAllBudgets = asyncHandler(async (req, res) => {
  const result = await Budget.deleteMany({ userId: toObjectId(req.user._id) });
  return success(
    res,
    { deletedCount: result.deletedCount },
    `Deleted ${result.deletedCount} budgets`
  );
});

module.exports = {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  deleteAllBudgets,
};
