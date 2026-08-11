const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  getRemittances,
  createRemittance,
  updateRemittance,
  deleteRemittance,
  deleteAllRemittances,
  exportRemittances,
} = require("../controllers/remittanceController");

router.use(protect);

router.route("/")
  .get(getRemittances)
  .post(createRemittance)
  .delete(deleteAllRemittances);

router.get("/export", exportRemittances);

router.route("/:id")
  .put(updateRemittance)
  .delete(deleteRemittance);

module.exports = router;
