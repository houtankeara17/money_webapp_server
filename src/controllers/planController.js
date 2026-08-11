const asyncHandler = require("express-async-handler");
const Plan = require("../models/Plan");
const { toUSD, toObjectId } = require("../utils/currency");
const { success, error } = require("../utils/response");

const getPlans = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, priority, sort = "-createdAt" } = req.query;
  const query = { userId: toObjectId(req.user._id) };
  if (status) query.status = status;
  if (priority) query.priority = priority;

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Plan.countDocuments(query);
  const items = await Plan.find(query).sort(sort).skip(skip).limit(Number(limit));

  const summary = await Plan.aggregate([
    { $match: { userId: toObjectId(req.user._id) } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalTargetUSD: { $sum: "$targetAmountUSD" },
        totalFunded: { $sum: "$currentFunding" },
      },
    },
  ]);

  return success(res, {
    items,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) || 1 },
    summary,
  });
});

const createPlan = asyncHandler(async (req, res) => {
  const { title, description, goalType, targetAmount, currency, currentFunding, targetDate, status, priority, noted, images } = req.body;
  if (!title || !targetAmount || !currency) {
    return error(res, "Title, target amount and currency are required", 400);
  }
  const targetAmountUSD = toUSD(targetAmount, currency, req.user);
  const funded = Number(currentFunding) || 0;
  const plan = await Plan.create({
    userId: toObjectId(req.user._id),
    title,
    description: description || "",
    goalType: goalType || "Other",
    targetAmount: Number(targetAmount),
    currency,
    targetAmountUSD,
    currentFunding: funded,
    currentFundingUSD: toUSD(funded, currency, req.user),
    targetDate: targetDate || null,
    status: status || "Planning",
    priority: priority || "Medium",
    noted: noted || "",
    images: images || [],
  });
  return success(res, plan, "Plan created successfully", 201);
});

const updatePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findOne({ _id: req.params.id, userId: toObjectId(req.user._id) });
  if (!plan) return error(res, "Plan not found", 404);

  const fields = ["title", "description", "goalType", "currency", "targetDate", "status", "priority", "noted", "images"];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) plan[f] = req.body[f];
  });
  if (req.body.targetAmount !== undefined) plan.targetAmount = Number(req.body.targetAmount);
  if (req.body.currentFunding !== undefined) plan.currentFunding = Number(req.body.currentFunding);
  if (req.body.targetAmount !== undefined || req.body.currency) {
    plan.targetAmountUSD = toUSD(plan.targetAmount, plan.currency, req.user);
  }
  if (req.body.currentFunding !== undefined || req.body.currency) {
    plan.currentFundingUSD = toUSD(plan.currentFunding, plan.currency, req.user);
  }
  const updated = await plan.save();
  return success(res, updated, "Plan updated successfully");
});

const deletePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findOneAndDelete({ _id: req.params.id, userId: toObjectId(req.user._id) });
  if (!plan) return error(res, "Plan not found", 404);
  return success(res, null, "Plan deleted successfully");
});

const deleteAllPlans = asyncHandler(async (req, res) => {
  const result = await Plan.deleteMany({ userId: toObjectId(req.user._id) });
  return success(res, { deletedCount: result.deletedCount }, `Deleted ${result.deletedCount} plans`);
});

const exportPlans = asyncHandler(async (req, res) => {
  const items = await Plan.find({ userId: toObjectId(req.user._id) }).sort("-createdAt");
  return success(res, items, "Export ready");
});

module.exports = { getPlans, createPlan, updatePlan, deletePlan, deleteAllPlans, exportPlans };
