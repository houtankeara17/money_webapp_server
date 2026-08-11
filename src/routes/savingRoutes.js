const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  getSavings, createSaving, updateSaving, deleteSaving, deleteAllSavings, exportSavings,
} = require("../controllers/savingController");

router.use(protect);
router.route("/").get(getSavings).post(createSaving).delete(deleteAllSavings);
router.get("/export", exportSavings);
router.route("/:id").put(updateSaving).delete(deleteSaving);
module.exports = router;
