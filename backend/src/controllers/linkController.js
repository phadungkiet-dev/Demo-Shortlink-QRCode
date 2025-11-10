const linkService = require("../services/linkService");
const {
  createLinkSchema,
  updateLinkSchema,
} = require("../utils/validationSchemas");
const logger = require("../utils/logger");

// 1. Create Shortlink
const createLink = async (req, res, next) => {
  try {
    // Validate input
    const { targetUrl } = createLinkSchema.parse(req.body);

    // Check for self-redirect
    if (targetUrl.includes(process.env.BASE_URL)) {
      return res
        .status(400)
        .json({ message: "Cannot create a shortlink that points to itself." });
    }

    // Get ownerId (null if not logged in)
    const ownerId = req.user ? req.user.id : null;

    const link = await linkService.createLink(targetUrl, ownerId);

    // Add base URL to slug
    const shortUrl = `${process.env.BASE_URL}/r/${link.slug}`;

    res.status(201).json({ ...link, shortUrl });
  } catch (error) {
    next(error);
  }
};

// 2. Get My Links
const getMyLinks = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const links = await linkService.findLinksByOwner(ownerId);

    const linksWithUrl = links.map((link) => ({
      ...link,
      shortUrl: `${process.env.BASE_URL}/r/${link.slug}`,
    }));

    res.json(linksWithUrl);
  } catch (error) {
    next(error);
  }
};

// 3. Update Link (e.g., Renew)
const updateLink = async (req, res, next) => {
  try {
    const linkId = parseInt(req.params.id);
    if (isNaN(linkId)) {
      return res.status(400).json({ message: "Invalid Link ID." });
    }

    const ownerId = req.user.id;
    const updateData = updateLinkSchema.parse(req.body);

    const updatedLink = await linkService.updateLink(
      linkId,
      ownerId,
      updateData
    );

    res.json({
      ...updatedLink,
      shortUrl: `${process.env.BASE_URL}/r/${updatedLink.slug}`,
    });
  } catch (error) {
    if (error.message.includes("not found or user does not have permission")) {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

// 4. Delete Link
const deleteLink = async (req, res, next) => {
  try {
    const linkId = parseInt(req.params.id);
    if (isNaN(linkId)) {
      return res.status(400).json({ message: "Invalid Link ID." });
    }

    const ownerId = req.user.id;

    const result = await linkService.deleteLink(linkId, ownerId);
    res.json(result);
  } catch (error) {
    if (error.message.includes("not found or user does not have permission")) {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

module.exports = {
  createLink,
  getMyLinks,
  updateLink,
  deleteLink,
};
