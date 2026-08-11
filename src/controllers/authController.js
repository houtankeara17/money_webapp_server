const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const User = require("../models/User");
const { generateToken } = require("../utils/jwt");
const { success, error } = require("../utils/response");

// @desc    Register new user
// @route   POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return error(res, "Please provide name, email and password", 400);
  }

  const exists = await User.findOne({ email });
  if (exists) {
    return error(res, "User already exists with this email", 400);
  }

  const user = await User.create({
    name,
    email,
    password,
    authProvider: "local",
  });

  if (user) {
    return success(
      res,
      {
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
        theme: user.theme,
        language: user.language,
        currency: user.currency,
        exchangeRateKhr: user.exchangeRateKhr,
        exchangeRateThb: user.exchangeRateThb,
      },
      "Registration successful! Welcome to MoneyFlow.",
      201
    );
  } else {
    return error(res, "Invalid user data", 400);
  }
});

// @desc    Login user
// @route   POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return error(res, "Please provide email and password", 400);
  }

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    return success(
      res,
      {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        token: generateToken(user._id),
        theme: user.theme,
        language: user.language,
        currency: user.currency,
        exchangeRateKhr: user.exchangeRateKhr,
        exchangeRateThb: user.exchangeRateThb,
      },
      "Login successful! Welcome back."
    );
  } else {
    return error(res, "Invalid email or password", 401);
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  return success(res, req.user, "User profile retrieved");
});

// @desc    Update profile / preferences
// @route   PUT /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return error(res, "User not found", 404);
  }

  user.name = req.body.name || user.name;
  user.avatar = req.body.avatar || user.avatar;
  user.theme = req.body.theme || user.theme;
  user.language = req.body.language || user.language;
  user.currency = req.body.currency || user.currency;
  if (req.body.exchangeRateKhr !== undefined)
    user.exchangeRateKhr = req.body.exchangeRateKhr;
  if (req.body.exchangeRateThb !== undefined)
    user.exchangeRateThb = req.body.exchangeRateThb;

  const updated = await user.save();
  return success(res, updated, "Profile updated successfully");
});

// @desc    Update password
// @route   PUT /api/auth/password
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (!user || user.authProvider !== "local") {
    return error(res, "Password change not available for this account", 400);
  }

  if (!(await user.matchPassword(currentPassword))) {
    return error(res, "Current password is incorrect", 401);
  }

  user.password = newPassword;
  await user.save();
  return success(res, null, "Password updated successfully");
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return error(res, "Email is required", 400);

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  // Always return same message (security)
  if (!user || user.authProvider !== "local") {
    return success(res, null, "If that email exists, a reset code has been sent");
  }

  // 6-digit code for easy entry + long token for links
  const resetCode = String(Math.floor(100000 + Math.random() * 900000));
  const resetToken = crypto.randomBytes(32).toString("hex");

  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetCode)
    .digest("hex");
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 min
  await user.save({ validateBeforeSave: false });

  // Production: send email with resetCode
  // Dev: return code so you can test without email
  const payload =
    process.env.NODE_ENV === "development"
      ? { resetCode, message: "Use this code on the reset page (dev only)" }
      : null;

  console.log(`[forgot-password] code for ${email}: ${resetCode}`);

  return success(
    res,
    payload,
    "If that email exists, a reset code has been sent"
  );
});

// @desc    Reset password
// @route   PUT /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, code, password, newPassword } = req.body;
  const plain = code || token;
  const pwd = password || newPassword;
  if (!plain) return error(res, "Reset code is required", 400);
  if (!pwd || String(pwd).length < 6) return error(res, "Password must be at least 6 characters", 400);

  const hashed = crypto.createHash("sha256").update(String(plain).trim()).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return error(res, "Invalid or expired reset code", 400);
  }

  user.password = pwd;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  return success(res, null, "Password reset successful. You can now login.");
});

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
};
