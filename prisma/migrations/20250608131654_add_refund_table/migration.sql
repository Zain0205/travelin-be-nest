-- AlterTable
ALTER TABLE `booking` ADD COLUMN `cancellationReason` VARCHAR(191) NULL,
    ADD COLUMN `cancelledAt` DATETIME(3) NULL,
    MODIFY `status` ENUM('pending', 'confirmed', 'rejected', 'cancelled', 'refunded', 'rescheduled') NOT NULL;

-- AlterTable
ALTER TABLE `notification` MODIFY `type` ENUM('booking', 'payment', 'review', 'chat') NOT NULL;

-- CreateTable
CREATE TABLE `Refund` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `status` ENUM('pending', 'approved', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
    `processedBy` INTEGER NULL,
    `processedAt` DATETIME(3) NULL,
    `refundMethod` ENUM('bank_transfer', 'e_wallet', 'credit_card', 'original_payment') NULL,
    `refundProof` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Refund_bookingId_key`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Refund` ADD CONSTRAINT `Refund_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Refund` ADD CONSTRAINT `Refund_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Refund` ADD CONSTRAINT `Refund_processedBy_fkey` FOREIGN KEY (`processedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
