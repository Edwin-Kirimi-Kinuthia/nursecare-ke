-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_order_id_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_product_id_fkey";

-- DropIndex
DROP INDEX "order_items_order_id_idx";

-- DropIndex
DROP INDEX "orders_patient_id_status_idx";

-- DropIndex
DROP INDEX "orders_status_created_at_idx";

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "order_id",
DROP COLUMN "product_id",
DROP COLUMN "product_name",
ADD COLUMN     "drug_name" TEXT NOT NULL,
ADD COLUMN     "listing_id" UUID NOT NULL,
ADD COLUMN     "vendor_order_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "delivered_at",
DROP COLUMN "dispatched_at",
DROP COLUMN "status";

-- DropTable
DROP TABLE "products";

-- CreateTable
CREATE TABLE "drugs" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "generic_name" TEXT,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "form" TEXT,
    "strength" TEXT,
    "image_url" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requires_prescription" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "drugs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "drug_id" UUID NOT NULL,
    "price_kes" INTEGER NOT NULL,
    "stock_qty" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_orders" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "branch_id" UUID,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "subtotal_kes" INTEGER NOT NULL,
    "delivery_fee_kes" INTEGER NOT NULL DEFAULT 0,
    "dispatched_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vendor_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "drugs_category_idx" ON "drugs"("category");

-- CreateIndex
CREATE INDEX "drugs_is_active_idx" ON "drugs"("is_active");

-- CreateIndex
CREATE INDEX "listings_drug_id_is_active_stock_qty_idx" ON "listings"("drug_id", "is_active", "stock_qty");

-- CreateIndex
CREATE UNIQUE INDEX "listings_org_id_drug_id_key" ON "listings"("org_id", "drug_id");

-- CreateIndex
CREATE INDEX "vendor_orders_order_id_idx" ON "vendor_orders"("order_id");

-- CreateIndex
CREATE INDEX "vendor_orders_org_id_status_idx" ON "vendor_orders"("org_id", "status");

-- CreateIndex
CREATE INDEX "order_items_vendor_order_id_idx" ON "order_items"("vendor_order_id");

-- CreateIndex
CREATE INDEX "orders_patient_id_idx" ON "orders"("patient_id");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_orders" ADD CONSTRAINT "vendor_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_orders" ADD CONSTRAINT "vendor_orders_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_vendor_order_id_fkey" FOREIGN KEY ("vendor_order_id") REFERENCES "vendor_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

