import bcrypt from 'bcrypt';
import { prisma } from '../../db.js';
import { walletService } from '../../services/wallet.service.js';
import { ok } from '../../utils/response.js';
import { parsePaginationParams, buildPagination } from '../../utils/pagination.js';
import { getUserTier, appError } from '../../utils/formatters.js';

export const adminUsersController = {
  async list(req, res) {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const { search, tier, role, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const where = {};
    if (search)               where.username = { contains: search.trim(), mode: 'insensitive' };
    if (role)                 where.role     = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    if (tier) {
      const ranges = {
        basic:     { gte: 0,    lte: 999.99  },
        preferred: { gte: 1000, lte: 1999.99 },
        gold:      { gte: 2000, lte: 4999.99 },
        platinum:  { gte: 5000             },
      };
      if (ranges[tier]) where.totalSpent = ranges[tier];
    }

    const VALID_SORTS = ['createdAt', 'username', 'balance', 'totalSpent', 'lastLoginAt'];
    const orderBy = {
      [VALID_SORTS.includes(sortBy) ? sortBy : 'createdAt']: sortOrder === 'asc' ? 'asc' : 'desc',
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: limit, orderBy,
        select: {
          id: true, username: true, role: true, isActive: true,
          balance: true, totalSpent: true, points: true,
          createdAt: true, lastLoginAt: true,
          _count: { select: { orders: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const mapped = users.map(u => ({ ...u, tier: getUserTier(u.totalSpent) }));
    res.json(ok({ users: mapped, pagination: buildPagination(page, limit, total) }));
  },

  async create(req, res) {
    const { username, password, role = 'customer' } = req.body;
    if (!username?.trim()) throw appError('Username is required', 400);
    if (!password || password.length < 6) throw appError('Password is required (min 6 characters)', 400);

    const exists = await prisma.user.findUnique({ where: { username: username.trim() } });
    if (exists) throw appError('Username already taken', 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { username: username.trim(), passwordHash, role },
    });
    res.status(201).json(ok({ id: user.id, username: user.username, role: user.role }));
  },

  async getOne(req, res) {
    const id = parseInt(req.params.id, 10);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id },
      include: {
        orders:       { take: 5, orderBy: { placedAt: 'desc' },    include: { items: true } },
        transactions: { take: 5, orderBy: { createdAt: 'desc' } },
        deposits:     { take: 5, orderBy: { createdAt: 'desc' } },
        tickets:      { take: 3, orderBy: { createdAt: 'desc' } },
        apiKeys:      {          orderBy: { createdAt: 'desc' } },
      },
    });
    const { passwordHash: _, ...safe } = user;
    res.json(ok({ ...safe, tier: getUserTier(user.totalSpent) }));
  },

  async update(req, res) {
    const id = parseInt(req.params.id, 10);
    const { username, role, isActive, markupPct } = req.body;
    const data = {};
    if (username  !== undefined) data.username  = username.trim();
    if (role      !== undefined) data.role      = role;
    if (isActive  !== undefined) data.isActive  = Boolean(isActive);
    if (markupPct !== undefined) data.markupPct = parseFloat(markupPct);
    const user = await prisma.user.update({ where: { id }, data });
    res.json(ok({ id: user.id, username: user.username, role: user.role }));
  },

  async ban(req, res) {
    const id   = parseInt(req.params.id, 10);
    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    const updated = await prisma.user.update({
      where: { id },
      data:  { isActive: !user.isActive },
    });
    res.json(ok({ isActive: updated.isActive, message: updated.isActive ? 'Account reactivated' : 'Account banned' }));
  },

  async setPassword(req, res) {
    const id = parseInt(req.params.id, 10);
    const { password } = req.body;
    if (!password || password.length < 6) throw appError('Password too short (min 6 characters)', 400);
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
    res.json(ok({ message: 'Password updated' }));
  },

  async adjustWallet(req, res) {
    const id = parseInt(req.params.id, 10);
    const { type, amount, reason } = req.body;
    const txn = await walletService.adjustBalance(id, type, parseFloat(amount), reason);
    const user = await prisma.user.findUnique({ where: { id }, select: { balance: true } });
    res.json(ok({ transaction: txn, newBalance: Number(user.balance) }));
  },

  async remove(req, res) {
    const id = parseInt(req.params.id, 10);

    await prisma.$transaction(async (tx) => {
      // Nullify Deposit→Transaction FK before deleting transactions
      await tx.deposit.updateMany({ where: { userId: id }, data: { transactionId: null } });

      await tx.ticketMessage.deleteMany({ where: { userId: id } });
      await tx.supportTicket.deleteMany({ where: { userId: id } });
      await tx.review.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.apiKey.deleteMany({ where: { userId: id } });
      await tx.deposit.deleteMany({ where: { userId: id } });
      await tx.transaction.deleteMany({ where: { userId: id } });
      await tx.order.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });

    res.json(ok({ message: 'User deleted' }));
  },
};
