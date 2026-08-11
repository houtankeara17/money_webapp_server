const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/password", protect, updatePassword);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password", resetPassword);

// Google OAuth (only works if credentials are set)
router.get("/google", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      message: "Google login is not configured on this server",
    });
  }
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

router.get(
  "/google/callback",
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect(
        `${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=oauth_not_configured`
      );
    }
    passport.authenticate("google", {
      failureRedirect: `${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=oauth_failed`,
      session: false,
    })(req, res, next);
  },
  (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(
          `${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=oauth_failed`
        );
      }
      const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      res.redirect(
        `${process.env.CLIENT_URL || "http://localhost:5173"}/oauth-callback?token=${token}`
      );
    } catch (error) {
      res.redirect(
        `${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=server_error`
      );
    }
  }
);

module.exports = router;
