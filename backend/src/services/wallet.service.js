import { prisma } from '../db.js';
import { cryptoService } from './crypto.service.js';
import { notificationService } from './notification.service.js';
import { formatTxnId, getUserTier, getCashbackRate, appError } from '../utils/formatters.js';

export const walletService = {
  async getWalletInfo(userId) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const settings = await prisma.siteSetting.findMany({
      where: { key: { in: ['points_rate'] } },
    });
    const pointsRate = parseFloat(settings.find(s => s.key === 'points_rate')?.value || '0.5');

    const tier         = getUserTier(user.totalSpent);
    const cashbackRate = getCashbackRate(tier);

    const tierLimits = { basic: 1000, preferred: 2000, gold: 5000, platinum: null };
    const limit      = tierLimits[tier];
    const remaining  = limit !== null ? Math.max(0, limit - Number(user.totalSpent)) : null;

    return {
      balance:    Number(user.balance),
      points:     user.points,
      totalSpent: Number(user.totalSpent),
      tier,
      cashback:   cashbackRate * 100,
      pointsRate,
      remaining,
    };
  },

  async createDeposit(userId, currency) {
    const validCurrencies = ['BTC', 'LTC', 'DOGE', 'ETH', 'XMR'];
    if (!validCurrencies.includes(currency)) throw appError('Unsupported currency', 400);

    const settings = await prisma.siteSetting.findMany({
      where: { key: { in: ['deposit_expiry_hours'] } },
    });
    const expiryHours = parseInt(settings.find(s => s.key === 'deposit_expiry_hours')?.value || '12', 10);
    const expiresAt   = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    const deposit = await prisma.deposit.create({
      data: { userId, currency, expiresAt },
    });

    let addrResult;
    try {
      addrResult = await cryptoService.generateAddress(currency, deposit.id);
    } catch (err) {
      await prisma.deposit.delete({ where: { id: deposit.id } }).catch(() => {});
      throw err;
    }

    const { address, hookId = null, ethIndex = null } = addrResult;

    return prisma.deposit.update({
      where: { id: deposit.id },
      data:  { address, hookId, ethIndex },
    });
  },

  async confirmDeposit(depositId, usdAmount, note = null) {
    const deposit = await prisma.deposit.findUniqueOrThrow({ where: { id: depositId } });

    if (deposit.status === 'confirmed') throw appError('This deposit is already confirmed', 409);
    if (usdAmount <= 0) throw appError('USD amount must be positive', 400);

    return prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.create({
        data: {
          frontendId: formatTxnId(),
          userId:     deposit.userId,
          type:       'deposit',
          amount:     usdAmount,
          currency:   'USD',
          status:     'confirmed',
          note:       note || `${deposit.currency} deposit confirmed`,
        },
      });

      await tx.deposit.update({
        where: { id: depositId },
        data: {
          status:        'confirmed',
          usdCredited:   usdAmount,
          confirmedAt:   new Date(),
          transactionId: txn.id,
        },
      });

      await tx.user.update({
        where: { id: deposit.userId },
        data:  { balance: { increment: usdAmount } },
      });

      return txn;
    }).then(async (txn) => {
      await notificationService.notifyDeposit(deposit.userId, deposit.currency, usdAmount);
      return txn;
    });
  },

  async cleanupExpiredDeposits() {
    const toExpire = await prisma.deposit.findMany({
      where: {
        status:    { in: ['awaiting', 'partial'] },
        expiresAt: { lt: new Date() },
      },
    });

    if (toExpire.length === 0) return { cleaned: 0 };

    // Delete BlockCypher forwards for BTC/LTC/DOGE (fire-and-forget, errors are logged internally)
    await Promise.allSettled(
      toExpire
        .filter(d => d.hookId && ['BTC', 'LTC', 'DOGE'].includes(d.currency))
        .map(d => cryptoService.deleteBlockcypherHook(d.hookId, d.currency))
    );

    await prisma.deposit.updateMany({
      where: { id: { in: toExpire.map(d => d.id) } },
      data:  { status: 'expired' },
    });

    return { cleaned: toExpire.length };
  },

  async adjustBalance(userId, type, amount, reason) {
    if (!['credit', 'debit'].includes(type)) throw appError('Invalid type: use "credit" or "debit"', 400);
    if (!reason || !reason.trim())           throw appError('Reason is required', 400);
    if (amount <= 0)                          throw appError('Amount must be positive', 400);

    if (type === 'debit') {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      if (Number(user.balance) < amount) throw appError('Insufficient balance for this debit', 400);
    }

    const signedAmount = type === 'credit' ? amount : -amount;

    return prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data:  { balance: { increment: signedAmount } },
      });

      return tx.transaction.create({
        data: {
          frontendId: formatTxnId(),
          userId,
          type:       'adjustment',
          amount:     signedAmount,
          currency:   'USD',
          status:     'confirmed',
          note:       reason.trim(),
        },
      });
    });
  },
};
