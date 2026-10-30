-- CreateTable
CREATE TABLE "Retailer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "homepage" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "shipping" JSONB NOT NULL,
    "shippingNote" TEXT,
    "noShipStates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastCrawlAt" TIMESTAMP(3),
    "lastCrawlOk" BOOLEAN,

    CONSTRAINT "Retailer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "groupKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "caliber" TEXT NOT NULL,
    "brand" TEXT,
    "grain" DOUBLE PRECISION,
    "bullet" TEXT,
    "casing" TEXT,
    "condition" TEXT NOT NULL,
    "shot" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" SERIAL NOT NULL,
    "retailerId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "rounds" INTEGER,
    "inStock" BOOLEAN NOT NULL,
    "purchaseLimit" INTEGER,
    "upc" TEXT,
    "caliber" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "grain" DOUBLE PRECISION,
    "bullet" TEXT,
    "casing" TEXT,
    "condition" TEXT NOT NULL,
    "shot" TEXT,
    "productId" INTEGER,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "lastChangedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "inStock" BOOLEAN NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlRun" (
    "id" SERIAL NOT NULL,
    "retailerId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "ok" BOOLEAN,
    "pages" INTEGER NOT NULL DEFAULT 0,
    "seen" INTEGER NOT NULL DEFAULT 0,
    "ammo" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "CrawlRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_groupKey_key" ON "Product"("groupKey");

-- CreateIndex
CREATE INDEX "Product_caliber_idx" ON "Product"("caliber");

-- CreateIndex
CREATE INDEX "Listing_caliber_inStock_idx" ON "Listing"("caliber", "inStock");

-- CreateIndex
CREATE INDEX "Listing_productId_idx" ON "Listing"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_retailerId_externalId_key" ON "Listing"("retailerId", "externalId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_listingId_at_idx" ON "PriceSnapshot"("listingId", "at");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawlRun" ADD CONSTRAINT "CrawlRun_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
