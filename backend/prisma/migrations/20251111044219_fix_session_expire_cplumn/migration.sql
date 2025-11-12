/*
  Warnings:

  - You are about to drop the column `expires` on the `user_sessions` table. All the data in the column will be lost.
  - Added the required column `expire` to the `user_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_sessions" DROP COLUMN "expires",
ADD COLUMN     "expire" TIMESTAMP(3) NOT NULL;
