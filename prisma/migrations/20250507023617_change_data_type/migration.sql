/*
  Warnings:

  - You are about to alter the column `type` on the `packageimage` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(2))` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `packageimage` MODIFY `type` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `payment` MODIFY `method` ENUM('bank_transfer', 'e_wallet', 'credit_card', 'qris') NOT NULL;
