const { prisma } = require("../config/prisma");
const bcrypt = require("bcrypt");

const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || user.provider !== "LOCAL" || !user.passwordHash) {
    throw new Error("User not found or not a local user.");
  }

  const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isMatch) {
    throw new Error("Incorrect old password.");
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  return { message: "Password changed successfully." };
};

const getSafeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

// Function for registering a new user +++
const registerUser = async (email, password) => {
  // 1. Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("Email address is already in use.");
  }

  // 2. Hash the new password
  const passwordHash = await bcrypt.hash(password, 10);

  // 3. Create the new user
  const newUser = await prisma.user.create({
    data: {
      email,
      passwordHash,
      provider: "LOCAL", // Mark as a local account
      role: "USER",
    },
  });

  return newUser;
};

module.exports = {
  changePassword,
  getSafeUser,
  registerUser,
};
