const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  getPlans, createPlan, updatePlan, deletePlan, deleteAllPlans, exportPlans,
} = require("../controllers/planController");

router.use(protect);
router.route("/").get(getPlans).post(createPlan).delete(deleteAllPlans);
router.get("/export", exportPlans);
router.route("/:id").put(updatePlan).delete(deletePlan);
module.exports = router;
