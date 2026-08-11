const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  getSalaries,
  getSalaryBonusHistory,
  createSalary,
  updateSalary,
  deleteSalary,
  deleteAllSalaries,
  exportSalaries,
} = require("../controllers/salaryController");

router.use(protect);

router.route("/")
  .get(getSalaries)
  .post(createSalary)
  .delete(deleteAllSalaries);

router.get("/export", exportSalaries);
router.get("/history", getSalaryBonusHistory);

router.route("/:id")
  .put(updateSalary)
  .delete(deleteSalary);

module.exports = router;
