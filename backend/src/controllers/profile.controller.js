import { prisma } from '../db.js';
import { ok } from '../utils/response.js';
import { getUserTier } from '../utils/formatters.js';

const PROFILE_SELECT = {
  id: true, username: true, role: true, bio: true,
  telegramHandle: true, signalDetails: true, sessionDetails: true,
  btcRefundAddress: true, xmrRefundAddress: true,
  balance: true, points: true, totalSpent: true, markupPct: true,
  avatarUrl: true, hidePrices: true,
  notifOrders: true, notifDeposits: true, notifTickets: true,
  notifNewProducts: true, notifLogins: true,
  tourCompleted: true, lastLoginAt: true, createdAt: true,
};

const EDITABLE_FIELDS = [
  'bio', 'telegramHandle', 'signalDetails', 'sessionDetails',
  'btcRefundAddress', 'xmrRefundAddress',
  'hidePrices', 'notifOrders', 'notifDeposits', 'notifTickets',
  'notifNewProducts', 'notifLogins', 'tourCompleted',
];

export const profileController = {
  async get(req, res) {
    const user = await prisma.user.findUniqueOrThrow({
      where:  { id: req.user.sub },
      select: PROFILE_SELECT,
    });
    res.json(ok({ ...user, tier: getUserTier(user.totalSpent) }));
  },

  async update(req, res) {
    const data = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => EDITABLE_FIELDS.includes(k)),
    );
    await prisma.user.update({ where: { id: req.user.sub }, data });
    res.json(ok({ message: 'Profil mis à jour' }));
  },
};
