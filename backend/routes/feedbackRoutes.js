const express = require("express");
const { submitFeedback, getFeedback } = require("../controllers/feedbackController");
// Simplified auth for now as per previous demo mode instructions
const router = express.Router();

router.post("/", submitFeedback);
router.get("/", getFeedback);

module.exports = router;
