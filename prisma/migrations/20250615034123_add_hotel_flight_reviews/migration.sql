-- DropForeignKey
ALTER TABLE `review` DROP FOREIGN KEY `Review_packageId_fkey`;

-- AlterTable
ALTER TABLE `review` ADD COLUMN `flightId` INTEGER NULL,
    ADD COLUMN `hotelId` INTEGER NULL,
    MODIFY `packageId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Review_hotelId_idx` ON `Review`(`hotelId`);

-- CreateIndex
CREATE INDEX `Review_flightId_idx` ON `Review`(`flightId`);

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `TravelPackage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_flightId_fkey` FOREIGN KEY (`flightId`) REFERENCES `Flight`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `review` RENAME INDEX `Review_packageId_fkey` TO `Review_packageId_idx`;

-- RenameIndex
ALTER TABLE `review` RENAME INDEX `Review_userId_fkey` TO `Review_userId_idx`;
