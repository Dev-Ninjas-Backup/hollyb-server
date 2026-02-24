/*
  Warnings:

  - You are about to drop the column `Timezone` on the `system_settings` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `system_settings` table. All the data in the column will be lost.
  - You are about to drop the column `email_notifications_enabled` on the `system_settings` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `system_settings` table. All the data in the column will be lost.
  - You are about to drop the column `super_admin_email` on the `system_settings` table. All the data in the column will be lost.
  - You are about to drop the column `system_alerts_enabled` on the `system_settings` table. All the data in the column will be lost.
  - You are about to drop the column `two_factor_authentication_enabled` on the `system_settings` table. All the data in the column will be lost.
  - You are about to drop the column `workspaceName` on the `system_settings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[key]` on the table `system_settings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `key` to the `system_settings` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "system_settings_super_admin_email_key";

-- DropIndex
DROP INDEX "system_settings_updated_by_key";

-- AlterTable
ALTER TABLE "system_settings" DROP COLUMN "Timezone",
DROP COLUMN "created_at",
DROP COLUMN "email_notifications_enabled",
DROP COLUMN "name",
DROP COLUMN "super_admin_email",
DROP COLUMN "system_alerts_enabled",
DROP COLUMN "two_factor_authentication_enabled",
DROP COLUMN "workspaceName",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "key" TEXT NOT NULL,
ADD COLUMN     "value" TEXT;

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL,
    "workspaceName" TEXT DEFAULT 'Hollyb',
    "Timezone" TEXT DEFAULT 'UTC',
    "two_factor_authentication_enabled" BOOLEAN NOT NULL DEFAULT false,
    "system_alerts_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_notifications_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "settings_updated_by_key" ON "settings"("updated_by");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
