-- Customer balances become crypto quantities (net of the deposit commission),
-- valued in USD at the live price. Purely additive: no existing column changes.

-- CreateTable
CREATE TABLE "WalletHolding" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletHolding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletHolding_userId_currency_key" ON "WalletHolding"("userId", "currency");

-- AddForeignKey
ALTER TABLE "WalletHolding" ADD CONSTRAINT "WalletHolding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "payments" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "cryptoAmount" DECIMAL(18,8),
ADD COLUMN "rate" DECIMAL(18,8);

-- AlterTable
ALTER TABLE "Deposit" ADD COLUMN "commissionPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN "commissionAmount" DECIMAL(18,8) NOT NULL DEFAULT 0,
ADD COLUMN "netAmount" DECIMAL(18,8) NOT NULL DEFAULT 0,
ADD COLUMN "shopSweptAt" TIMESTAMP(3),
ADD COLUMN "shopSweepTx" TEXT,
ADD COLUMN "reserveSweptAt" TIMESTAMP(3),
ADD COLUMN "reserveSweepTx" TEXT;

-- AlterTable
ALTER TABLE "SweepLog" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'legacy';
