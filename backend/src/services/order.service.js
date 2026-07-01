import { prisma } from '../db.js';
import { notificationService } from './notification.service.js';
import { formatTxnId, formatOrderNumber, appError } from '../utils/formatters.js';

export const orderService = {
  async createOrder(userId, { items, shippingAddress, paymentMethod, name, email }) {
    if (!items?.length)     throw appError('Le panier est vide', 400);
    if (!shippingAddress)   throw appError('Adresse de livraison requise', 400);
    if (!paymentMethod)     throw appError('Méthode de paiement requise', 400);
    if (!name?.trim())      throw appError('Nom requis', 400);

    // Récupère les settings shipping
    const settings = await prisma.siteSetting.findMany({
      where: { key: { in: ['shipping_cost', 'shipping_free_threshold'] } },
    });
    const shippingCost  = parseFloat(settings.find(s => s.key === 'shipping_cost')?.value  || '0');
    const freeThreshold = parseFloat(settings.find(s => s.key === 'shipping_free_threshold')?.value || '0');

    // Résout les produits
    const productIds = [...new Set(items.map(i => Number(i.productId)))];
    const products   = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== productIds.length) {
      throw appError('Un ou plusieurs produits sont invalides ou indisponibles', 400);
    }

    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    let subtotal   = 0;
    const orderItems = items.map(item => {
      const product  = productMap[Number(item.productId)];
      const price    = Number(product.price);
      const quantity = Math.max(1, parseInt(item.quantity, 10));
      subtotal += price * quantity;
      return { productId: product.id, name: product.name, price, quantity };
    });

    const shippingFee = (freeThreshold > 0 && subtotal >= freeThreshold) ? 0 : shippingCost;
    const totalAmount = subtotal + shippingFee;

    // Vérifie le solde utilisateur
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (Number(user.balance) < totalAmount) {
      throw appError(`Solde insuffisant (disponible: $${Number(user.balance).toFixed(2)}, requis: $${totalAmount.toFixed(2)})`, 402);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Débite le solde et incrémente totalSpent
      await tx.user.update({
        where: { id: userId },
        data: {
          balance:    { decrement: totalAmount },
          totalSpent: { increment: totalAmount },
        },
      });

      // Crée la commande avec numéro temporaire
      const order = await tx.order.create({
        data: {
          orderNumber:    'TEMP',
          userId,
          paymentMethod,
          totalAmount,
          shippingFee,
          shippingAddress: shippingAddress.trim(),
          name:            name.trim(),
          email:           email?.trim() || null,
          items:           { create: orderItems },
        },
        include: { items: true },
      });

      // Numéro de commande définitif
      const updated = await tx.order.update({
        where: { id: order.id },
        data:  { orderNumber: formatOrderNumber(order.id) },
        include: { items: { include: { product: { select: { slug: true } } } } },
      });

      // Transaction financière
      await tx.transaction.create({
        data: {
          frontendId: formatTxnId(),
          userId,
          type:       'purchase',
          amount:     -totalAmount,
          currency:   'USD',
          status:     'confirmed',
          note:       `Commande ${updated.orderNumber}`,
          orderId:    order.id,
        },
      });

      return updated;
    });

    // Notification hors transaction
    await notificationService.notifyOrder(userId, result.orderNumber);

    const freshUser = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
    return { order: result, newBalance: Number(freshUser.balance) };
  },
};
