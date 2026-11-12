-- Orders paid straight in crypto, repeat payments on a deposit address, refunds, product variants
ALTER TABLE "Order" ADD COLUMN "expiresAt" TIMESTAMP(3);

ALTER TABLE "Deposit" ADD COLUMN "shopSweptAmount" DECIMAL(18,8) NOT NULL DEFAULT 0;
ALTER TABLE "Deposit" ADD COLUMN "reserveSweptAmount" DECIMAL(18,8) NOT NULL DEFAULT 0;
ALTER TABLE "Deposit" ADD COLUMN "orderId" INTEGER;
ALTER TABLE "Deposit" ADD COLUMN "txSeen" JSONB NOT NULL DEFAULT '[]';
CREATE UNIQUE INDEX "Deposit_orderId_key" ON "Deposit"("orderId");

ALTER TABLE "OrderItem" ADD COLUMN "optionId" INTEGER;

CREATE TABLE "ProductOption" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProductOption_productId_idx" ON "ProductOption"("productId");
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RefundRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "depositId" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "address" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "txHash" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RefundRequest_status_idx" ON "RefundRequest"("status");
CREATE INDEX "RefundRequest_depositId_idx" ON "RefundRequest"("depositId");
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
