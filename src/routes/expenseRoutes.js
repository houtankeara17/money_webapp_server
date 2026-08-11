const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  deleteAllExpenses,
  exportExpenses,
} = require("../controllers/expenseController");

router.use(protect);

router.route("/")
  .get(getExpenses)
  .post(createExpense)
  .delete(deleteAllExpenses);

router.get("/export", exportExpenses);

router.route("/:id")
  .put(updateExpense)
  .delete(deleteExpense);

module.exports = router;
