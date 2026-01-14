/*
  Warnings:

  - You are about to drop the `user_sessions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[google_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "links" ALTER COLUMN "expired_at" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "google_id" TEXT;

-- DropTable
DROP TABLE "user_sessions";

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
