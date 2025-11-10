const express = require("express");
const router = express.Router();
const linkController = require("../controllers/linkController");
const statsController = require("../controllers/statsController");
const { isAuthenticated } = require("../middlewares/authGuard");
const { createLinkLimiter } = require("../middlewares/rateLimit");

// POST /api/links (Create shortlink)
// Public (anon) creation is rate-limited
// Logged-in creation is not (skipped by middleware)
router.post("/", createLinkLimiter, linkController.createLink);

// GET /api/links/me (List my links)
router.get("/me", isAuthenticated, linkController.getMyLinks);

// PATCH /api/links/:id (Update/Renew link)
router.patch("/:id", isAuthenticated, linkController.updateLink);

// DELETE /api/links/:id (Delete link)
router.delete("/:id", isAuthenticated, linkController.deleteLink);

// GET /api/links/:id/stats (Get stats for a link)
router.get("/:id/stats", isAuthenticated, statsController.getLinkStats);

module.exports = router;
