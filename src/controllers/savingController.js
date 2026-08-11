const asyncHandler = require("express-async-handler");
const Saving = require("../models/Saving");
const { toUSD, toObjectId } = require("../utils/currency");
const { success, error } = require("../utils/response");

const CATEGORIES = [
  "Emergency", "Travel", "House",
  "Education", "Investment", "Other",
];

const getSavings = asyncHandler(async (req, res) => {
  const {
    page = 1, limit = 20, year, monthNumber, category, sort = "-year,-monthNumber",
  } = req.query;

  const query = { userId: toObjectId(req.user._id) };
  if (year) query.year = Number(year);
  if (monthNumber) query.monthNumber = Number(monthNumber);
  if (category) query.category = category;

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Saving.countDocuments(query);
  const items = await Saving.find(query).sort(sort).skip(skip).limit(Number(limit));

  const totals = await Saving.aggregate([
    { $match: query },
    { $group: { _id: "$currency", total: { $sum: "$amount" }, totalUSD: { $sum: "$amountUSD" }, count: { $sum: 1 } } },
  ]);

  const yearsAgg = await Saving.aggregate([
    { $match: { userId: toObjectId(req.user._id) } },
    { $group: { _id: "$year" } },
    { $sort: { _id: -1 } },
  ]);
  const availableYears = yearsAgg.map((y) => y._id);

  const yearQuery = { userId: toObjectId(req.user._id) };
  if (year) yearQuery.year = Number(year);
  const yearSummary = await Saving.aggregate([
    { $match: yearQuery },
    { $group: { _id: null, totalUSD: { $sum: "$amountUSD" }, count: { $sum: 1 } } },
  ]);

  // By category totals
  const byCategory = await Saving.aggregate([
    { $match: yearQuery },
    { $group: { _id: "$category", totalUSD: { $sum: "$amountUSD" }, count: { $sum: 1 } } },
    { $sort: { totalUSD: -1 } },
  ]);

  return success(res, {
    items,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) || 1 },
    totals,
    availableYears,
    yearSummary: yearSummary[0] || { totalUSD: 0, count: 0 },
    byCategory,
    categories: CATEGORIES,
  });
});

const createSaving = asyncHandler(async (req, res) => {
  const { amount, currency, year, monthNumber, category, noted, savingDate } = req.body;
  if (!amount || !currency || !category) {
    return error(res, "Amount, currency and category are required", 400);
  }

  // Prefer savingDate; fall back to year + monthNumber
  let y = year ? Number(year) : null;
  let mn = monthNumber ? Number(monthNumber) : null;
  let dateVal = savingDate ? new Date(savingDate) : null;

  if (dateVal && !Number.isNaN(dateVal.getTime())) {
    y = dateVal.getFullYear();
    mn = dateVal.getMonth() + 1;
  } else {
    dateVal = new Date();
    if (!y) y = dateVal.getFullYear();
    if (!mn) mn = dateVal.getMonth() + 1;
  }

  if (mn < 1 || mn > 12) return error(res, "Invalid month", 400);

  const amountUSD = toUSD(amount, currency, req.user);
  const saving = await Saving.create({
    userId: toObjectId(req.user._id),
    amount: Number(amount),
    currency,
    amountUSD,
    year: y,
    monthNumber: mn,
    category,
    noted: noted || "",
    savingDate: dateVal,
  });
  return success(res, saving, "Saving added successfully", 201);
});

const updateSaving = asyncHandler(async (req, res) => {
  const saving = await Saving.findOne({ _id: req.params.id, userId: toObjectId(req.user._id) });
  if (!saving) return error(res, "Saving not found", 404);

  ["currency", "category", "noted"].forEach((f) => {
    if (req.body[f] !== undefined) saving[f] = req.body[f];
  });
  if (req.body.amount !== undefined) saving.amount = Number(req.body.amount);
  if (req.body.year !== undefined) saving.year = Number(req.body.year);
  if (req.body.monthNumber !== undefined) saving.monthNumber = Number(req.body.monthNumber);
  if (req.body.savingDate) {
    const d = new Date(req.body.savingDate);
    if (!Number.isNaN(d.getTime())) {
      saving.savingDate = d;
      saving.year = d.getFullYear();
      saving.monthNumber = d.getMonth() + 1;
    }
  }
  if (req.body.amount !== undefined || req.body.currency || req.body.savingDate) {
    saving.amountUSD = toUSD(saving.amount, saving.currency, req.user);
  }
  const updated = await saving.save();
  return success(res, updated, "Saving updated successfully");
});

const deleteSaving = asyncHandler(async (req, res) => {
  const saving = await Saving.findOneAndDelete({ _id: req.params.id, userId: toObjectId(req.user._id) });
  if (!saving) return error(res, "Saving not found", 404);
  return success(res, null, "Saving deleted successfully");
});

const deleteAllSavings = asyncHandler(async (req, res) => {
  const result = await Saving.deleteMany({ userId: toObjectId(req.user._id) });
  return success(res, { deletedCount: result.deletedCount }, `Deleted ${result.deletedCount} savings`);
});

const exportSavings = asyncHandler(async (req, res) => {
  const items = await Saving.find({ userId: toObjectId(req.user._id) }).sort("-year,-monthNumber");
  return success(res, items, "Export ready");
});

module.exports = { getSavings, createSaving, updateSaving, deleteSaving, deleteAllSavings, exportSavings };
