/*
  Warnings:

  - Added the required column `originalAmount` to the `Refund` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `refund` ADD COLUMN `originalAmount` DECIMAL(10, 2) NOT NULL;
