import { prisma } from '../../db.js';
import { walletService } from '../../services/wallet.service.js';
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
      throw appError('usdAmount doit être un nombre positif', 400);
    }

    const txn = await walletService.confirmDeposit(id, parseFloat(usdAmount), note?.trim() || null);
    res.json(ok({ message: 'Dépôt confirmé et solde crédité', transaction: txn }));
  },

  async expire(req, res) {
    const id = parseInt(req.params.id, 10);
    const deposit = await prisma.deposit.findUniqueOrThrow({ where: { id } });

    if (deposit.status === 'confirmed') {
      throw appError('Impossible d\'expirer un dépôt déjà confirmé', 409);
    }

    const updated = await prisma.deposit.update({
      where: { id },
      data:  { status: 'expired' },
    });
    res.json(ok(updated));
  },
};
