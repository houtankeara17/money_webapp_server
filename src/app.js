const express = require("express");
const cors = require("cors");
const passport = require("./config/passport");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const salaryRoutes = require("./routes/salaryRoutes");
const bonusRoutes = require("./routes/bonusRoutes");
const savingRoutes = require("./routes/savingRoutes");
const planRoutes = require("./routes/planRoutes");
const remittanceRoutes = require("./routes/remittanceRoutes");
const exchangeLogRoutes = require("./routes/exchangeLogRoutes");
const noteRoutes = require("./routes/noteRoutes");
const reportRoutes = require("./routes/reportRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const budgetRoutes = require("./routes/budgetRoutes");

const app = express();

import express from 'express';
import cors from 'cors';

const app = express();

const allowedOrigins = [
  'https://money-webapp-client.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Crucial: Handle preflight (OPTIONS) requests explicitly
app.options('*', cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(passport.initialize());

app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/salaries", salaryRoutes);
app.use("/api/bonuses", bonusRoutes);
app.use("/api/savings", savingRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/remittances", remittanceRoutes);
app.use("/api/exchange-logs", exchangeLogRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/budgets", budgetRoutes);

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "MoneyFlow API is running" });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
