const { prisma } = require("../config/prisma");
const { generateSlug } = require("../utils/slug");
const { addDays, getNow } = require("../utils/time");
const { Prisma } = require("@prisma/client");
const logger = require("../utils/logger");
const useragent = require("useragent");

const MAX_SLUG_RETRIES = 5;

/**
 * Creates a short link.
 * @param {string} targetUrl The target URL.
 * @param {number|null} ownerId The user ID if logged in, null otherwise.
 * @returns {Promise<import('@prisma/client').Link>}
 */
const createLink = async (targetUrl, ownerId) => {
  const now = getNow();
  const isAnonymous = ownerId === null;

  const expiryDays = isAnonymous ? 7 : 30;
  const expiredAt = addDays(now, expiryDays);

  let slug;
  let retries = 0;
  let linkCreated = false;

  // Retry loop for unique slug generation
  while (!linkCreated) {
    if (retries >= MAX_SLUG_RETRIES) {
      throw new Error("Failed to generate a unique slug. Please try again.");
    }

    slug = generateSlug(isAnonymous ? 5 : 7); // Shorter slugs for anon?
    retries++;

    try {
      const link = await prisma.link.create({
        data: {
          slug,
          targetUrl,
          ownerId,
          expiredAt,
          isPublic: false,
          disabled: false,
        },
      });
      linkCreated = true;
      return link;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        // Unique constraint violation (slug already exists)
        logger.warn(`Slug collision: ${slug}. Retrying... (${retries})`);
      } else {
        throw e; // Re-throw other errors
      }
    }
  }
};

/**
 * Finds a link by slug, checks validity, and records the click.
 * @param {string} slug
 * @param {string} ip
 * @param {string} uaString
 * @param {string} referrer
 * @returns {Promise<string|null>} Target URL or null if not found/expired.
 */
const getAndRecordClick = async (slug, ip, uaString, referrer) => {
  const now = getNow();

  const link = await prisma.link.findUnique({
    where: { slug },
  });

  if (!link || link.disabled || link.expiredAt <= now) {
    logger.warn(
      `Link access failed: ${slug} (Found: ${!!link}, Disabled: ${
        link?.disabled
      }, Expired: ${link?.expiredAt <= now})`
    );
    return null;
  }

  // Record click asynchronously (don't make the user wait)
  prisma.click
    .create({
      data: {
        linkId: link.id,
        ip: ip,
        userAgent: uaString,
        referrer: referrer || null,
      },
    })
    .catch((err) => {
      logger.error(`Failed to record click for link ${link.id}:`, err);
    });

  return link.targetUrl;
};

/**
 * Finds links by owner ID.
 */
const findLinksByOwner = async (ownerId) => {
  return prisma.link.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { clicks: true },
      },
    },
  });
};

/**
 * Updates a link (e.g., renews).
 * @param {number} linkId
 * @param {number} ownerId
 * @param {object} data - e.g., { renew: true }
 * @returns {Promise<import('@prisma/client').Link>}
 */
const updateLink = async (linkId, ownerId, data) => {
  // Verify ownership
  const link = await prisma.link.findFirst({
    where: { id: linkId, ownerId },
  });

  if (!link) {
    throw new Error("Link not found or user does not have permission.");
  }

  let updateData = {};

  // Handle renewal
  if (data.renew === true) {
    const now = getNow();
    // Renew for 30 days from *now*
    updateData.expiredAt = addDays(now, 30);
    updateData.disabled = false; // Re-enable if it was disabled due to expiry
  }

  // TODO: Add logic for updating targetUrl, isPublic, etc.

  if (Object.keys(updateData).length === 0) {
    return link; // Nothing to update
  }

  return prisma.link.update({
    where: { id: linkId },
    data: updateData,
  });
};

/**
 * Deletes a link.
 * @param {number} linkId
 * @param {number} ownerId
 */
const deleteLink = async (linkId, ownerId) => {
  // Verify ownership
  const link = await prisma.link.findFirst({
    where: { id: linkId, ownerId },
  });

  if (!link) {
    throw new Error("Link not found or user does not have permission.");
  }

  // We use onDelete: Cascade in schema.prisma, so clicks are deleted too.
  await prisma.link.delete({
    where: { id: linkId },
  });

  return { message: "Link deleted successfully." };
};

/**
 * Deletes expired links that have no owner (anonymous).
 * @returns {Promise<number>} Count of deleted links.
 */
const deleteExpiredAnonymousLinks = async () => {
  const now = getNow();
  const result = await prisma.link.deleteMany({
    where: {
      ownerId: null,
      expiredAt: {
        lte: now, // Less than or equal to now
      },
    },
  });
  return result.count;
};

module.exports = {
  createLink,
  getAndRecordClick,
  findLinksByOwner,
  updateLink,
  deleteLink,
  deleteExpiredAnonymousLinks,
};
