-- CreateTable
CREATE TABLE "SweepLog" (
    "id" SERIAL NOT NULL,
    "currency" TEXT NOT NULL,
    "commissionPct" DECIMAL(5,2) NOT NULL,
    "totalAmount" DECIMAL(18,8) NOT NULL,
    "mainAmount" DECIMAL(18,8) NOT NULL,
    "mainAddress" TEXT NOT NULL,
    "mainTxHash" TEXT,
    "commissionAmount" DECIMAL(18,8) NOT NULL,
    "commissionAddress" TEXT NOT NULL,
    "commissionTxHash" TEXT,
    "addressCount" INTEGER NOT NULL DEFAULT 0,
    "triggeredBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SweepLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SweepLog_currency_idx" ON "SweepLog"("currency");

-- CreateIndex
CREATE INDEX "SweepLog_createdAt_idx" ON "SweepLog"("createdAt");

-- AddForeignKey
ALTER TABLE "SweepLog" ADD CONSTRAINT "SweepLog_triggeredBy_fkey" FOREIGN KEY ("triggeredBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
