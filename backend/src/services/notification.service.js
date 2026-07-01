import { prisma } from '../db.js';

export const notificationService = {
  async createWelcomeNotifications(userId) {
    await prisma.notification.createMany({
      data: [
        {
          userId,
          type:    'welcome',
          title:   'Bienvenue sur BOTB !',
          message: 'Votre compte a été créé avec succès. Explorez notre catalogue.',
          link:    '/',
        },
        {
          userId,
          type:    'welcome',
          title:   'Rechargez votre compte',
          message: 'Ajoutez des crédits via crypto pour passer votre première commande.',
          link:    '/wallet',
        },
        {
          userId,
          type:    'welcome',
          title:   'Livraison via Telegram',
          message: 'La livraison est coordonnée via Telegram après validation de votre commande.',
        },
      ],
    });
  },

  async create(userId, { type, title, message, link = null }) {
    return prisma.notification.create({
      data: { userId, type, title, message, link },
    });
  },

  async notifyOrder(userId, orderNumber) {
    await this.create(userId, {
      type:    'order',
      title:   'Commande confirmée',
      message: `Votre commande ${orderNumber} a été passée avec succès.`,
      link:    '/orders',
    });
  },

  async notifyDeposit(userId, currency, usdAmount) {
    await this.create(userId, {
      type:    'deposit',
      title:   'Dépôt confirmé',
      message: `Votre dépôt ${currency} de $${Number(usdAmount).toFixed(2)} a été crédité.`,
      link:    '/wallet',
    });
  },
};
