const asyncHandler = require("express-async-handler");
const Remittance = require("../models/Remittance");
const { toUSD, getDateParts, toObjectId } = require("../utils/currency");
const { success, error } = require("../utils/response");

const RELATIONS = [
  "Mother", "Father", "Sibling", "Spouse",
  "Child", "Relative", "Friend", "Other",
];
const PAYMENTS = [
  "Cash", "ABA Bank", "ACLEDA Bank", "Wing", "Transfer", "Other",
];

const getRemittances = asyncHandler(async (req, res) => {
  const {
    page = 1, limit = 20, year, monthNumber, recipientRelation, sort = "-remittanceDate",
  } = req.query;

  const query = { userId: toObjectId(req.user._id) };
  if (year) query.year = Number(year);
  if (monthNumber) query.monthNumber = Number(monthNumber);
  if (recipientRelation) query.recipientRelation = recipientRelation;

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Remittance.countDocuments(query);
  const items = await Remittance.find(query).sort(sort).skip(skip).limit(Number(limit));

  const totals = await Remittance.aggregate([
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

  const yearsAgg = await Remittance.aggregate([
    { $match: { userId: toObjectId(req.user._id) } },
    { $group: { _id: "$year" } },
    { $sort: { _id: -1 } },
  ]);
  const availableYears = yearsAgg.map((y) => y._id);

  const yearQuery = { userId: toObjectId(req.user._id) };
  if (year) yearQuery.year = Number(year);

  const yearSummary = await Remittance.aggregate([
    { $match: yearQuery },
    {
      $group: {
        _id: null,
        totalUSD: { $sum: "$amountUSD" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Unique recipients count
  const uniqueRecipients = await Remittance.distinct("recipient", yearQuery);

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
    yearSummary: yearSummary[0] || { totalUSD: 0, count: 0 },
    uniqueRecipients: uniqueRecipients.length,
    relations: RELATIONS,
  });
});

const createRemittance = asyncHandler(async (req, res) => {
  const {
    amount, currency, recipient, recipientRelation, paymentMethod,
    remittanceDate, noted, images,
  } = req.body;

  if (!amount || !currency || !recipient || !paymentMethod) {
    return error(res, "Amount, currency, recipient and payment method are required", 400);
  }

  const date = remittanceDate ? new Date(remittanceDate) : new Date();
  const parts = getDateParts(date);
  const amountUSD = toUSD(amount, currency, req.user);

  const remittance = await Remittance.create({
    userId: toObjectId(req.user._id),
    amount: Number(amount),
    currency,
    amountUSD,
    recipient: recipient.trim(),
    recipientRelation: recipientRelation || "Other",
    paymentMethod,
    remittanceDate: date,
    ...parts,
    noted: noted || "",
    images: images || [],
  });

  return success(res, remittance, "Remittance added successfully", 201);
});

const updateRemittance = asyncHandler(async (req, res) => {
  const remittance = await Remittance.findOne({
    _id: req.params.id,
    userId: toObjectId(req.user._id),
  });
  if (!remittance) return error(res, "Remittance not found", 404);

  const fields = [
    "amount", "currency", "recipient", "recipientRelation",
    "paymentMethod", "remittanceDate", "noted", "images",
  ];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) remittance[f] = req.body[f];
  });
  if (req.body.amount !== undefined) remittance.amount = Number(req.body.amount);

  if (req.body.amount !== undefined || req.body.currency) {
    remittance.amountUSD = toUSD(remittance.amount, remittance.currency, req.user);
  }
  if (req.body.remittanceDate) {
    remittance.remittanceDate = new Date(req.body.remittanceDate);
    Object.assign(remittance, getDateParts(remittance.remittanceDate));
  }

  const updated = await remittance.save();
  return success(res, updated, "Remittance updated successfully");
});

const deleteRemittance = asyncHandler(async (req, res) => {
  const remittance = await Remittance.findOneAndDelete({
    _id: req.params.id,
    userId: toObjectId(req.user._id),
  });
  if (!remittance) return error(res, "Remittance not found", 404);
  return success(res, null, "Remittance deleted successfully");
});

const deleteAllRemittances = asyncHandler(async (req, res) => {
  const result = await Remittance.deleteMany({ userId: toObjectId(req.user._id) });
  return success(
    res,
    { deletedCount: result.deletedCount },
    `Deleted ${result.deletedCount} remittances`
  );
});

const exportRemittances = asyncHandler(async (req, res) => {
  const items = await Remittance.find({ userId: toObjectId(req.user._id) }).sort("-remittanceDate");
  return success(res, items, "Export ready");
});

module.exports = {
  getRemittances,
  createRemittance,
  updateRemittance,
  deleteRemittance,
  deleteAllRemittances,
  exportRemittances,
};
