/*
  Warnings:

  - The primary key for the `user_sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `user_sessions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "user_sessions" DROP CONSTRAINT "user_sessions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");
