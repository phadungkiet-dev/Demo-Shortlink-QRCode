const { nanoid } = require("nanoid");

// Generates a 7-character slug
const generateSlug = (size = 7) => {
  return nanoid(size);
};

module.exports = {
  generateSlug,
};
