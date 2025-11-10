// Set default timezone in app.js
// process.env.TZ = 'Asia/Bangkok';

/**
 * Adds a specified number of days to a date.
 * @param {Date} date The starting date.
 * @param {number} days The number of days to add.
 * @returns {Date} The new date.
 */
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getNow = () => {
  return new Date();
};

module.exports = {
  addDays,
  getNow,
};
