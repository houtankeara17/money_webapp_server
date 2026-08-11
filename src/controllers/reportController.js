const asyncHandler = require("express-async-handler");
const Expense = require("../models/Expense");
const Salary = require("../models/Salary");
const Bonus = require("../models/Bonus");
const Saving = require("../models/Saving");
const Remittance = require("../models/Remittance");
const Plan = require("../models/Plan");
const Note = require("../models/Note");
const ExchangeLog = require("../models/ExchangeLog");
const { success } = require("../utils/response");
const { toObjectId } = require("../utils/currency");

const getSummary = asyncHandler(async (req, res) => {
  const userId = toObjectId(req.user._id);
  const now = new Date();
  const year = Number(req.query.year) || now.getFullYear();
  const month = Number(req.query.monthNumber) || now.getMonth() + 1;

  const [
    expenseTotal,
    salaryTotal,
    bonusTotal,
    savingTotal,
    remittanceTotal,
    planCount,
    noteCount,
    exchangeCount,
  ] = await Promise.all([
    Expense.aggregate([
      { $match: { userId, year, monthNumber: month } },
      { $group: { _id: null, totalUSD: { $sum: "$amountUSD" }, count: { $sum: 1 } } },
    ]),
    Salary.aggregate([
      { $match: { userId, year, monthNumber: month, status: { $in: ["Confirmed", "Disbursed"] } } },
      { $group: { _id: null, totalUSD: { $sum: "$amountUSD" } } },
    ]),
    Bonus.aggregate([
      { $match: { userId, year, monthNumber: month, status: { $in: ["Confirmed", "Disbursed"] } } },
      { $group: { _id: null, totalUSD: { $sum: "$amountUSD" } } },
    ]),
    Saving.aggregate([
      { $match: { userId, year, monthNumber: month } },
      { $group: { _id: null, totalUSD: { $sum: "$amountUSD" } } },
    ]),
    Remittance.aggregate([
      { $match: { userId, year, monthNumber: month } },
      { $group: { _id: null, totalUSD: { $sum: "$amountUSD" } } },
    ]),
    Plan.countDocuments({ userId, status: { $ne: "Accomplished" } }),
    Note.countDocuments({ userId }),
    ExchangeLog.countDocuments({ userId, year, monthNumber: month }),
  ]);

  return success(res, {
    month,
    year,
    expenses: {
      totalUSD: expenseTotal[0]?.totalUSD || 0,
      count: expenseTotal[0]?.count || 0,
    },
    salary: { totalUSD: salaryTotal[0]?.totalUSD || 0 },
    bonus: { totalUSD: bonusTotal[0]?.totalUSD || 0 },
    savings: { totalUSD: savingTotal[0]?.totalUSD || 0 },
    remittances: { totalUSD: remittanceTotal[0]?.totalUSD || 0 },
    activePlans: planCount,
    notes: noteCount,
    exchangesThisMonth: exchangeCount,
  });
});

const getCharts = asyncHandler(async (req, res) => {
  const userId = toObjectId(req.user._id);
  const year = Number(req.query.year) || new Date().getFullYear();
  const matchYear = { userId, year };

  const expensesByMonth = await Expense.aggregate([
    { $match: matchYear },
    { $group: { _id: "$monthNumber", totalUSD: { $sum: "$amountUSD" }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const expensesByCategory = await Expense.aggregate([
    { $match: matchYear },
    { $group: { _id: "$category", totalUSD: { $sum: "$amountUSD" }, count: { $sum: 1 } } },
    { $sort: { totalUSD: -1 } },
  ]);

  const salaryByMonth = await Salary.aggregate([
    { $match: { ...matchYear, status: { $in: ["Confirmed", "Disbursed"] } } },
    { $group: { _id: "$monthNumber", totalUSD: { $sum: "$amountUSD" } } },
    { $sort: { _id: 1 } },
  ]);

  const bonusByMonth = await Bonus.aggregate([
    { $match: { ...matchYear, status: { $in: ["Confirmed", "Disbursed"] } } },
    { $group: { _id: "$monthNumber", totalUSD: { $sum: "$amountUSD" } } },
    { $sort: { _id: 1 } },
  ]);

  const savingsByMonth = await Saving.aggregate([
    { $match: matchYear },
    { $group: { _id: "$monthNumber", totalUSD: { $sum: "$amountUSD" } } },
    { $sort: { _id: 1 } },
  ]);

  const remittancesByMonth = await Remittance.aggregate([
    { $match: matchYear },
    { $group: { _id: "$monthNumber", totalUSD: { $sum: "$amountUSD" } } },
    { $sort: { _id: 1 } },
  ]);

  const [expYear, salYear, bonYear, savYear, remYear] = await Promise.all([
    Expense.aggregate([
      { $match: matchYear },
      { $group: { _id: null, totalUSD: { $sum: "$amountUSD" }, count: { $sum: 1 } } },
    ]),
    Salary.aggregate([
      { $match: { ...matchYear, status: { $in: ["Confirmed", "Disbursed"] } } },
      { $group: { _id: null, totalUSD: { $sum: "$amountUSD" } } },
    ]),
    Bonus.aggregate([
      { $match: { ...matchYear, status: { $in: ["Confirmed", "Disbursed"] } } },
      { $group: { _id: null, totalUSD: { $sum: "$amountUSD" } } },
    ]),
    Saving.aggregate([
      { $match: matchYear },
      { $group: { _id: null, totalUSD: { $sum: "$amountUSD" } } },
    ]),
    Remittance.aggregate([
      { $match: matchYear },
      { $group: { _id: null, totalUSD: { $sum: "$amountUSD" } } },
    ]),
  ]);

  const yearsFrom = await Promise.all([
    Expense.distinct("year", { userId }),
    Salary.distinct("year", { userId }),
    Bonus.distinct("year", { userId }),
  ]);
  const availableYears = [
    ...new Set([...yearsFrom[0], ...yearsFrom[1], ...yearsFrom[2], year]),
  ].sort((a, b) => b - a);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const toMap = (arr) => {
    const m = {};
    arr.forEach((x) => { m[x._id] = x.totalUSD || 0; });
    return m;
  };

  const expMap = toMap(expensesByMonth);
  const salMap = toMap(salaryByMonth);
  const bonMap = toMap(bonusByMonth);
  const savMap = toMap(savingsByMonth);
  const remMap = toMap(remittancesByMonth);

  const monthlyTrend = monthNames.map((name, i) => {
    const m = i + 1;
    const income = (salMap[m] || 0) + (bonMap[m] || 0);
    const expense = expMap[m] || 0;
    return {
      month: name,
      monthNumber: m,
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      savings: Math.round((savMap[m] || 0) * 100) / 100,
      remittances: Math.round((remMap[m] || 0) * 100) / 100,
      net: Math.round((income - expense) * 100) / 100,
    };
  });

  const incomeTotal = (salYear[0]?.totalUSD || 0) + (bonYear[0]?.totalUSD || 0);
  const expenseTotal = expYear[0]?.totalUSD || 0;

  return success(res, {
    year,
    availableYears,
    monthlyTrend,
    expensesByCategory: expensesByCategory.map((c) => ({
      name: c._id,
      value: Math.round((c.totalUSD || 0) * 100) / 100,
      count: c.count,
    })),
    yearTotals: {
      income: Math.round(incomeTotal * 100) / 100,
      expenses: Math.round(expenseTotal * 100) / 100,
      savings: Math.round((savYear[0]?.totalUSD || 0) * 100) / 100,
      remittances: Math.round((remYear[0]?.totalUSD || 0) * 100) / 100,
      net: Math.round((incomeTotal - expenseTotal) * 100) / 100,
      expenseCount: expYear[0]?.count || 0,
    },
  });
});

module.exports = { getSummary, getCharts };
