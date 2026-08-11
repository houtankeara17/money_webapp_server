const mongoose = require("mongoose");

/**
 * Life goals — save toward something in the future
 * e.g. buy item, travel, marriage, build/buy house
 */
const planSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    goalType: {
      type: String,
      required: true,
      enum: [
        "Buy Item",
        "Travel",
        "Marriage",
        "Build House",
        "Buy Home",
        "Education",
        "Emergency",
        "Vehicle",
        "Other",
      ],
      default: "Other",
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      enum: ["USD", "KHR", "THB"],
      default: "USD",
    },
    targetAmountUSD: {
      type: Number,
      required: true,
    },
    /** Money already saved toward this goal */
    currentFunding: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentFundingUSD: {
      type: Number,
      default: 0,
    },
    targetDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["Planning", "In Progress", "Paused", "Accomplished", "Cancelled"],
      default: "Planning",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    images: [{ type: String }],
    noted: { type: String, default: "" },
  },
  { timestamps: true }
);

planSchema.index({ userId: 1, status: 1 });
planSchema.index({ userId: 1, goalType: 1 });

module.exports = mongoose.model("Plan", planSchema);
