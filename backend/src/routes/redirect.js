const express = require("express");
const router = express.Router();
const redirectController = require("../controllers/redirectController");

// GET /r/:slug
// This route is mounted *before* CSRF in app.js
router.get("/:slug", redirectController.handleRedirect);

module.exports = router;
