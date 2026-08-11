const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  getExchangeLogs,
  createExchangeLog,
  updateExchangeLog,
  deleteExchangeLog,
  deleteAllExchangeLogs,
  exportExchangeLogs,
} = require("../controllers/exchangeLogController");

router.use(protect);

router.route("/")
  .get(getExchangeLogs)
  .post(createExchangeLog)
  .delete(deleteAllExchangeLogs);

router.get("/export", exportExchangeLogs);

router.route("/:id")
  .put(updateExchangeLog)
  .delete(deleteExchangeLog);

module.exports = router;
