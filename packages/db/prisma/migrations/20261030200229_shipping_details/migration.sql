-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "shipsFree" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Retailer" ADD COLUMN     "shippingUrl" TEXT;
