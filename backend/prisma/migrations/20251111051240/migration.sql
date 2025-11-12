/*
  Warnings:

  - The primary key for the `user_sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "user_sessions" DROP CONSTRAINT "user_sessions_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");
