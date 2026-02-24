/*
  Warnings:

  - You are about to drop the column `description` on the `system_settings` table. All the data in the column will be lost.
  - You are about to drop the column `key` on the `system_settings` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `system_settings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[super_admin_email]` on the table `system_settings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[updated_by]` on the table `system_settings` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "system_settings_key_key";

-- AlterTable
ALTER TABLE "system_settings" DROP COLUMN "description",
DROP COLUMN "key",
DROP COLUMN "value",
ADD COLUMN     "Timezone" TEXT DEFAULT 'UTC',
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "super_admin_email" TEXT,
ADD COLUMN     "system_alerts_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "two_factor_authentication_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "workspaceName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_super_admin_email_key" ON "system_settings"("super_admin_email");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_updated_by_key" ON "system_settings"("updated_by");
