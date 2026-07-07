import { prisma } from '../../db.js';
import { walletService } from '../../services/wallet.service.js';
import { cryptoService } from '../../services/crypto.service.js';
import { ok } from '../../utils/response.js';
import { parsePaginationParams, buildPagination } from '../../utils/pagination.js';
import { appError } from '../../utils/formatters.js';

export const adminDepositsController = {
  async list(req, res) {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const { status, currency } = req.query;

    const where = {};
    if (status)   where.status   = status;
    if (currency) where.currency = currency.toUpperCase();

    const [deposits, total] = await Promise.all([
      prisma.deposit.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true } } },
      }),
      prisma.deposit.count({ where }),
    ]);
    res.json(ok({ deposits, pagination: buildPagination(page, limit, total) }));
  },

  async confirm(req, res) {
    const id          = parseInt(req.params.id, 10);
    const { usdAmount, note } = req.body;

    if (!usdAmount || parseFloat(usdAmount) <= 0) {
      throw appError('usdAmount must be a positive number', 400);
    }

    const txn = await walletService.confirmDeposit(id, parseFloat(usdAmount), note?.trim() || null);
    res.json(ok({ message: 'Deposit confirmed and balance credited', transaction: txn }));
  },

  async expire(req, res) {
    const id = parseInt(req.params.id, 10);
    const deposit = await prisma.deposit.findUniqueOrThrow({ where: { id } });

    if (deposit.status === 'confirmed') {
      throw appError('Cannot expire an already confirmed deposit', 409);
    }

    const updated = await prisma.deposit.update({
      where: { id },
      data:  { status: 'expired' },
    });
    res.json(ok(updated));
  },

  async cleanup(req, res) {
    const result = await walletService.cleanupExpiredDeposits();
    res.json(ok({
      message: `${result.cleaned} expired deposit(s) cleaned up and BlockCypher forwards deleted`,
      cleaned: result.cleaned,
    }));
  },

  async purgeBlockcypher(req, res) {
    const result = await cryptoService.purgeAllBlockcypherForwards(['BTC', 'LTC', 'DOGE']);
    res.json(ok({
      message: `BlockCypher purge complete: ${result.deleted} forward(s) deleted, ${result.failed} failed`,
      ...result,
    }));
  },

  async reregisterWebhook(req, res) {
    const id      = parseInt(req.params.id, 10);
    const deposit = await prisma.deposit.findUniqueOrThrow({ where: { id } });

    if (!['BTC', 'LTC', 'DOGE'].includes(deposit.currency)) {
      throw appError('Webhook re-registration only applies to BTC/LTC/DOGE deposits', 400);
    }
    if (!deposit.address) throw appError('Deposit has no address yet', 400);

    const CHAIN_MAP = { BTC: 'btc/main', LTC: 'ltc/main', DOGE: 'doge/main' };
    const hookId = await cryptoService._registerAddressWebhook(CHAIN_MAP[deposit.currency], deposit.address);

    await prisma.deposit.update({ where: { id }, data: { hookId } });
    res.json(ok({ message: hookId ? 'Webhook registered' : 'BlockCypher registration failed (check PUBLIC_URL)', hookId }));
  },
};
