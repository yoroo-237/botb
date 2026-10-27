import { prisma } from '../db.js';
import { notificationService } from './notification.service.js';
import { formatTxnId, formatOrderNumber, appError } from '../utils/formatters.js';
import * as balanceService from './balance.service.js';
import { getCachedUsdPrices } from './price.service.js';
import { sendOrderInvoice } from './telegram.service.js';

export const orderService = {
  // No customer details are required: the Telegram username/ID is optional (saved
  // to the profile when given at checkout). Delivery is an option: with it the
  // customer gives a US address, shipping is charged and the address goes on the
  // invoice; without it, nothing is asked and the shop arranges it on Telegram.
  async createOrder(userId, { items, paymentMethod, payCurrency, telegram, delivery }) {
    if (!Array.isArray(items) || !items.length) throw appError('Cart is empty', 400);
    if (items.length > 50) throw appError('Too many lines in one order.', 400);

    let shipTo = null;
    if (delivery) {
      const d = Object.fromEntries(['name', 'street', 'apt', 'city', 'state', 'zip'].map(k => [k, String(delivery[k] || '').trim().slice(0, 120)]));
      if (!d.name || !d.street || !d.city || !/^[A-Z]{2}$/.test(d.state) || !/^\d{5}(-\d{4})?$/.test(d.zip)) {
        throw appError('Please complete the delivery address (code name, street, city, state and 5-digit ZIP).', 400);
      }
      shipTo = { name: d.name, address: `${d.street}${d.apt ? `, ${d.apt}` : ''}, ${d.city}, ${d.state} ${d.zip}, US` };
    }

    const handle = String(telegram || '').trim().replace(/^@/, '').slice(0, 64);
    if (handle) {
      await prisma.user.updateMany({ where: { id: userId, telegramHandle: null }, data: { telegramHandle: handle } });
    }

    const settings = await prisma.siteSetting.findMany({
      where: { key: { in: ['shipping_cost', 'shipping_free_threshold'] } },
    });
    const shippingCost  = parseFloat(settings.find(s => s.key === 'shipping_cost')?.value  || '0');
    const freeThreshold = parseFloat(settings.find(s => s.key === 'shipping_free_threshold')?.value || '0');

    const productIds = [...new Set(items.map(i => Number(i.productId)))];
    if (!productIds.every(Number.isInteger)) throw appError('One or more products are no longer available. Please review your cart.', 400);
    const products   = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== productIds.length) {
      throw appError('One or more products are no longer available. Please review your cart.', 400);
    }

    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    let subtotal   = 0;
    const orderItems = items.map(item => {
      const product  = productMap[Number(item.productId)];
      const price    = Number(product.price);
      const quantity = parseInt(item.quantity, 10);
      if (!(quantity >= 1 && quantity <= 999)) throw appError('Invalid quantity.', 400);
      subtotal += price * quantity;
      return { productId: product.id, name: product.name, price, quantity };
    });

    // Shipping is only charged when the customer chose delivery
    subtotal = Math.round(subtotal * 100) / 100;
    const shippingFee = !shipTo || (freeThreshold > 0 && subtotal >= freeThreshold) ? 0 : shippingCost;
    const totalAmount = Math.round((subtotal + shippingFee) * 100) / 100;

    // Freeze the conversion now: these prices and quantities are what the order
    // costs in crypto, whatever the market does afterwards.
    const holdings = await balanceService.getHoldings(userId);
    const prices   = await getCachedUsdPrices(holdings.map(h => h.currency));
    if (holdings.length && !holdings.some(h => prices[h.currency])) {
      throw appError('Live prices are unavailable right now — please try again in a minute.', 503);
    }
    let payments;
    try {
      payments = balanceService.allocateUsd(holdings, prices, totalAmount, payCurrency || null);
    } catch {
      const { balance } = await balanceService.valueHoldings(holdings, prices);
      const scope = payCurrency ? `${payCurrency} ` : '';
      throw appError(`Insufficient ${scope}balance (available: $${balance.toFixed(2)}, required: $${totalAmount.toFixed(2)})`, 402);
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const p of payments) await balanceService.debit(tx, userId, p.currency, p.amount);
      await tx.user.update({
        where: { id: userId },
        data:  { totalSpent: { increment: totalAmount } },
      });

      const order = await tx.order.create({
        data: {
          orderNumber:    'TEMP',
          userId,
          paymentMethod:   paymentMethod || 'wallet',
          totalAmount,
          shippingFee,
          shippingAddress: shipTo?.address || '',
          name:            shipTo?.name || '',
          email:           null,
          payments,
          items:           { create: orderItems },
        },
        include: { items: true },
      });

      const updated = await tx.order.update({
        where: { id: order.id },
        data:  { orderNumber: formatOrderNumber(order.id) },
        include: { items: { include: { product: { select: { slug: true } } } } },
      });

      // One transaction per order (orderId is unique): the crypto side is set when
      // a single currency paid; the full split is on the order's `payments`.
      const single = payments.length === 1 ? payments[0] : null;
      await tx.transaction.create({
        data: {
          frontendId:   formatTxnId(),
          userId,
          type:         'purchase',
          amount:       -totalAmount,
          currency:     payments.map(p => p.currency).join('+') || 'USD',
          cryptoAmount: single ? -single.amount : null,
          rate:         single ? single.rate : null,
          status:       'confirmed',
          note:         `Order ${updated.orderNumber} — ${payments.map(p => `${p.amount} ${p.currency} @ $${p.rate}`).join(' + ')}`,
          orderId:      order.id,
        },
      });

      return updated;
    });

    await notificationService.notifyOrder(userId, result.orderNumber);

    // Paid in the app, invoiced on Telegram (best-effort: never fails the order)
    const buyer = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, telegramHandle: true } });
    const [invoice, { balance }] = await Promise.all([
      sendOrderInvoice({
        orderNumber: result.orderNumber,
        lines:       result.items.map(i => ({ name: i.name, quantity: i.quantity, total: Number(i.price) * i.quantity })),
        shipping:    shipTo ? result.shippingFee : null,
        total:       result.totalAmount,
        payments, user: buyer,
        shipTo:      shipTo && `Code name: ${shipTo.name}\n${shipTo.address}`,
      }),
      balanceService.getUserBalance(userId),
    ]);
    return { order: result, payments, newBalance: balance, invoice };
  },
};
