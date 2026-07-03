import { prisma } from '../db.js';
import { notificationService } from './notification.service.js';
import { formatTxnId, formatOrderNumber, appError } from '../utils/formatters.js';

export const orderService = {
  async createOrder(userId, { items, shippingAddress, paymentMethod, name, email }) {
    if (!items?.length)     throw appError('Cart is empty', 400);
    if (!shippingAddress)   throw appError('Shipping address is required', 400);
    if (!paymentMethod)     throw appError('Payment method is required', 400);
    if (!name?.trim())      throw appError('Name is required', 400);

    const settings = await prisma.siteSetting.findMany({
      where: { key: { in: ['shipping_cost', 'shipping_free_threshold'] } },
    });
    const shippingCost  = parseFloat(settings.find(s => s.key === 'shipping_cost')?.value  || '0');
    const freeThreshold = parseFloat(settings.find(s => s.key === 'shipping_free_threshold')?.value || '0');

    const productIds = [...new Set(items.map(i => Number(i.productId)))];
    const products   = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== productIds.length) {
      throw appError('One or more products are invalid or unavailable', 400);
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

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (Number(user.balance) < totalAmount) {
      throw appError(`Insufficient balance (available: $${Number(user.balance).toFixed(2)}, required: $${totalAmount.toFixed(2)})`, 402);
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          balance:    { decrement: totalAmount },
          totalSpent: { increment: totalAmount },
        },
      });

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

      const updated = await tx.order.update({
        where: { id: order.id },
        data:  { orderNumber: formatOrderNumber(order.id) },
        include: { items: { include: { product: { select: { slug: true } } } } },
      });

      await tx.transaction.create({
        data: {
          frontendId: formatTxnId(),
          userId,
          type:       'purchase',
          amount:     -totalAmount,
          currency:   'USD',
          status:     'confirmed',
          note:       `Order ${updated.orderNumber}`,
          orderId:    order.id,
        },
      });

      return updated;
    });

    await notificationService.notifyOrder(userId, result.orderNumber);

    const freshUser = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
    return { order: result, newBalance: Number(freshUser.balance) };
  },
};
