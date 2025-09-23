/*
  Warnings:

  - A unique constraint covering the columns `[link]` on the table `Album` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `link` to the `Album` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Album" ADD COLUMN     "link" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Album_link_key" ON "public"."Album"("link");
