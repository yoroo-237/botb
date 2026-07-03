import { walletService } from '../services/wallet.service.js';
import { prisma } from '../db.js';
import { ok } from '../utils/response.js';
import { parsePaginationParams, buildPagination } from '../utils/pagination.js';

export const walletController = {
  async getWallet(req, res) {
    const data = await walletService.getWalletInfo(req.user.sub);
    res.json(ok(data));
  },

  async getBalance(req, res) {
    const user = await prisma.user.findUniqueOrThrow({
      where:  { id: req.user.sub },
      select: { balance: true },
    });
    res.json(ok({ balance: Number(user.balance) }));
  },

  async getDeposits(req, res) {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const [deposits, total] = await Promise.all([
      prisma.deposit.findMany({
        where:   { userId: req.user.sub },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.deposit.count({ where: { userId: req.user.sub } }),
    ]);
    res.json(ok({ deposits, pagination: buildPagination(page, limit, total) }));
  },

  async getDeposit(req, res) {
    const deposit = await prisma.deposit.findFirstOrThrow({
      where: { id: parseInt(req.params.id, 10), userId: req.user.sub },
    });
    res.json(ok(deposit));
  },

  async createDeposit(req, res) {
    const { currency } = req.body;
    if (!currency) {
      return res.status(400).json({ success: false, error: 'currency is required' });
    }
    const deposit = await walletService.createDeposit(req.user.sub, currency.toUpperCase());
    res.status(201).json(ok(deposit));
  },

  async getTransactions(req, res) {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where:   { userId: req.user.sub },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transaction.count({ where: { userId: req.user.sub } }),
    ]);
    res.json(ok({ transactions, pagination: buildPagination(page, limit, total) }));
  },
};
