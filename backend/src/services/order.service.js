import { prisma } from '../db.js';
import { notificationService } from './notification.service.js';
import { formatTxnId, formatOrderNumber, appError } from '../utils/formatters.js';
import * as balanceService from './balance.service.js';
import { getCachedUsdPrices, getCachedUsdPrice } from './price.service.js';
import { sendOrderInvoice } from './telegram.service.js';
import { walletService } from './wallet.service.js';
import { cryptoService } from './crypto.service.js';
import { orderRefundService } from './orderRefund.service.js';
import { isPgpMessage } from './pgp.service.js';
import { REFUND_COINS, validRefund, refundNote, keepRefundOnAccount } from './refund.service.js';

// Minutes a customer has to pay an order straight in crypto
export const PAY_WINDOW_MIN = 30;
// A payment within 1% of what was asked settles the order (rate or fee moved a little)
const TOLERANCE = 0.99;

// The optional refund address of a checkout: checked, kept on the account (BTC / XMR),
// returned as the line written in the order's notes. `coin`: it must be this coin's.
async function readRefund(userId, refund, coin = null) {
  if (!refund?.address) return null;
  const c = String(refund.currency || coin || '').toUpperCase();
  if (coin && c !== coin) throw appError(`The refund address must be a ${coin} address, the coin you pay with.`, 400);
  const address = String(refund.address).trim();
  if (!validRefund(c, address)) throw appError(`This does not look like a ${REFUND_COINS[c] || 'crypto'} refund address.`, 400);
  await keepRefundOnAccount(userId, c, address);
  return refundNote(c, address);
}

// Delivery is an option. Without it nothing is asked, no shipping is charged and the shop
// arranges it on Telegram. With it: a US address, or that address encrypted in the
// customer's browser to the shop's PGP key (only the shop can read it).
function readDelivery(delivery) {
  if (!delivery) return null;
  if (delivery.pgp) {
    const message = String(delivery.pgp).trim();
    if (message.length > 6000 || !isPgpMessage(message)) throw appError('The encrypted address is not a valid PGP message. Please try again.', 400);
    return { name: 'PGP encrypted', address: message };
  }
  const d = Object.fromEntries(['name', 'street', 'apt', 'city', 'state', 'zip'].map(k => [k, String(delivery[k] || '').trim().slice(0, 120)]));
  if (!d.name || !d.street || !d.city || !/^[A-Z]{2}$/.test(d.state) || !/^\d{5}(-\d{4})?$/.test(d.zip)) {
    throw appError('Please complete the delivery address (code name, street, city, state and 5-digit ZIP).', 400);
  }
  return { name: d.name, address: `${d.street}${d.apt ? `, ${d.apt}` : ''}, ${d.city}, ${d.state} ${d.zip}, US` };
}

// Prices a cart server-side (the client's prices are never trusted). A product sold by
// variant needs its variant: its own price and stock. Shipping only with delivery.
async function priceCart(items, { delivery = false } = {}) {
  if (!Array.isArray(items) || !items.length) throw appError('Cart is empty', 400);
  if (items.length > 50) throw appError('Too many lines in one order.', 400);

  const settings = await prisma.siteSetting.findMany({ where: { key: { in: ['shipping_cost', 'shipping_free_threshold'] } } });
  const shippingCost  = parseFloat(settings.find(s => s.key === 'shipping_cost')?.value || '0');
  const freeThreshold = parseFloat(settings.find(s => s.key === 'shipping_free_threshold')?.value || '0');

  const productIds = [...new Set(items.map(i => Number(i.productId)))];
  if (!productIds.every(Number.isInteger)) throw appError('One or more products are no longer available. Please review your cart.', 400);
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, isActive: true }, include: { options: true } });
  if (products.length !== productIds.length) throw appError('One or more products are no longer available. Please review your cart.', 400);
  const byId = Object.fromEntries(products.map(p => [p.id, p]));

  let subtotal = 0;
  const lines = items.map(item => {
    const product  = byId[Number(item.productId)];
    const quantity = parseInt(item.quantity, 10);
    if (!(quantity >= 1 && quantity <= 999)) throw appError('Invalid quantity.', 400);
    let option = null;
    if (product.options.length) {
      option = product.options.find(o => o.id === Number(item.optionId));
      if (!option) throw appError(`Please choose an option for "${product.name}".`, 400);
      if (option.stock < quantity) throw appError(`Only ${option.stock} left of "${product.name} (${option.label})".`, 409);
    } else if (product.stock < quantity) {
      throw appError(`Only ${product.stock} left of "${product.name}".`, 409);
    }
    const price = Number(option ? option.price : product.price);
    subtotal += price * quantity;
    return { productId: product.id, optionId: option?.id ?? null, name: option ? `${product.name} (${option.label})` : product.name, price, quantity };
  });

  subtotal = Math.round(subtotal * 100) / 100;
  const shippingFee = !delivery || (freeThreshold > 0 && subtotal >= freeThreshold) ? 0 : shippingCost;
  return { lines, subtotal, shippingFee, total: Math.round((subtotal + shippingFee) * 100) / 100 };
}

// Takes the stock of each line (product, and its variant); the guards make two concurrent
// orders unable to oversell
async function takeStock(tx, lines) {
  for (const l of lines) {
    if (l.optionId) {
      const { count } = await tx.productOption.updateMany({ where: { id: l.optionId, stock: { gte: l.quantity } }, data: { stock: { decrement: l.quantity } } });
      if (count === 0) throw appError(`"${l.name}" just sold out. Please review your cart.`, 409);
      await tx.product.updateMany({ where: { id: l.productId }, data: { stock: { decrement: l.quantity } } });
    } else {
      const { count } = await tx.product.updateMany({ where: { id: l.productId, stock: { gte: l.quantity } }, data: { stock: { decrement: l.quantity } } });
      if (count === 0) throw appError(`"${l.name}" just sold out. Please review your cart.`, 409);
    }
  }
}

// Gives an order's stock back (cancelled before shipping)
export async function giveStock(tx, items) {
  for (const i of items) {
    if (i.productId) await tx.product.updateMany({ where: { id: i.productId }, data: { stock: { increment: i.quantity } } });
    if (i.optionId) await tx.productOption.updateMany({ where: { id: i.optionId }, data: { stock: { increment: i.quantity } } });
  }
}

const orderLines = lines => lines.map(({ productId, optionId, name, price, quantity }) => ({ productId, optionId, name, price, quantity }));
const shipLine = o => (o.name === 'PGP encrypted' ? 'PGP encrypted address (see the order in the admin)' : `Code name: ${o.name}\n${o.shippingAddress || o.address}`);

export const orderService = {
  // Paid from the wallet balance. No customer details are required: the Telegram
  // username/ID is optional (saved to the profile when given at checkout). Delivery and
  // the refund address are options too.
  async createOrder(userId, { items, paymentMethod, payCurrency, telegram, delivery, refund }) {
    const shipTo = readDelivery(delivery);
    const refundLine = await readRefund(userId, refund);

    const handle = String(telegram || '').trim().replace(/^@/, '').slice(0, 64);
    if (handle) await prisma.user.updateMany({ where: { id: userId, telegramHandle: null }, data: { telegramHandle: handle } });

    const { lines, shippingFee, total: totalAmount } = await priceCart(items, { delivery: !!shipTo });

    // Freeze the conversion now: these prices and quantities are what the order
    // costs in crypto, whatever the market does afterwards.
    const holdings = await balanceService.getHoldings(userId);
    const prices   = await getCachedUsdPrices(holdings.map(h => h.currency));
    if (holdings.length && !holdings.some(h => prices[h.currency])) {
      throw appError('Live prices are unavailable right now. Please try again in a minute.', 503);
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
      await takeStock(tx, lines);
      await tx.user.update({ where: { id: userId }, data: { totalSpent: { increment: totalAmount } } });

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
          note:            refundLine,
          payments,
          items:           { create: orderLines(lines) },
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
        shipTo:      shipTo && shipLine(shipTo),
      }),
      balanceService.getUserBalance(userId),
    ]);
    return { order: result, payments, newBalance: balance, invoice };
  },

  // ── Paid straight in crypto, no wallet balance needed ─────────────────────────
  // The order is created "awaiting_payment" (stock held) with its own deposit address and
  // the exact amount to send: the price, frozen in that coin, plus the deposit commission,
  // taken when the payment lands. 30 minutes to pay; payments add up.
  async placePendingOrder(userId, { items, coin, telegram, delivery, refund, note }) {
    coin = String(coin || '').toUpperCase();
    if (!(await cryptoService.payableCoins()).includes(coin)) throw appError(`${coin || 'This coin'} is not accepted right now.`, 400);
    const shipTo = readDelivery(delivery);
    const refundLine = await readRefund(userId, refund, coin);
    const notes = [note ? String(note).slice(0, 2000) : null, refundLine].filter(Boolean).join('\n') || null;
    const handle = String(telegram || '').trim().replace(/^@/, '').slice(0, 64);
    if (handle) await prisma.user.updateMany({ where: { id: userId, telegramHandle: null }, data: { telegramHandle: handle } });

    const { lines, shippingFee, total: totalAmount } = await priceCart(items, { delivery: !!shipTo });
    if (!(totalAmount > 0)) throw appError('Nothing to pay in crypto: place this order from your wallet.', 400);

    const [price, pct] = await Promise.all([getCachedUsdPrice(coin), balanceService.getCommissionPct()]);
    if (!price) throw appError(`The ${coin} price is unavailable right now. Please try again in a minute.`, 503);
    if (pct >= 100) throw appError('Payments are unavailable right now.', 503);
    // What the order costs in crypto (frozen), and what to send so that it is left after the commission
    const netNeeded = Math.ceil(totalAmount / price * 1e8 - 1e-6) / 1e8;
    const gross = Math.ceil(netNeeded / (1 - pct / 100) * 1e8 - 1e-6) / 1e8;
    const expiresAt = new Date(Date.now() + PAY_WINDOW_MIN * 60 * 1000);

    const order = await prisma.$transaction(async (tx) => {
      await takeStock(tx, lines);
      const created = await tx.order.create({
        data: {
          orderNumber: 'TEMP', userId, status: 'awaiting_payment', expiresAt,
          paymentMethod: `crypto:${coin}`, totalAmount, shippingFee,
          shippingAddress: shipTo?.address || '', name: shipTo?.name || '', email: null,
          note: notes,
          payments: [{ currency: coin, amount: netNeeded, rate: price, usd: totalAmount }],
          items: { create: orderLines(lines) },
        },
      });
      return tx.order.update({ where: { id: created.id }, data: { orderNumber: formatOrderNumber(created.id) }, include: { items: true } });
    });

    try {
      const deposit = await walletService.createDeposit(userId, coin, { orderId: order.id, minutes: PAY_WINDOW_MIN, expected: gross });
      return { order, deposit, gross, price, pct, expiresAt };
    } catch (err) {
      await this.cancelPendingOrder(order.id, null).catch(() => {});
      throw err;
    }
  },

  // An unpaid order is released: stock back on the shelf. `why` null = silent. What was
  // already received is refunded (a request an admin approves); the deposit address keeps
  // being watched 24 hours, so a payment arriving later is seen and refunded too.
  async cancelPendingOrder(orderId, why = 'expired') {
    const done = await prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({ where: { id: orderId, status: 'awaiting_payment' }, data: { status: 'cancelled' } });
      if (!count) return null;
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      await giveStock(tx, order.items);
      const dep = await tx.deposit.findUnique({ where: { orderId } });
      if (dep && ['awaiting', 'partial'].includes(dep.status)) {
        await tx.deposit.update({ where: { id: dep.id }, data: { expiresAt: new Date(Date.now() + 24 * 3600 * 1000) } });
      }
      return { order, dep };
    });
    if (!done) return false;
    const { order, dep } = done;
    if (dep && Number(dep.netAmount) > 0) {
      await orderRefundService.request({ userId: order.userId, orderId, depositId: dep.id, currency: dep.currency, amount: Number(dep.netAmount), reason: `payment short when the order was ${why === 'expired' ? 'expired' : 'cancelled'}` }).catch(() => {});
    }
    if (why === 'expired') {
      await notificationService.create(order.userId, {
        type: 'order', title: `Order ${order.orderNumber} expired`, link: '/orders',
        message: `No full payment arrived within ${PAY_WINDOW_MIN} minutes, so the order was cancelled. A payment detected after this is refunded.`,
      }).catch(() => {});
    }
    return true;
  },

  // Cancels every awaiting order whose payment window is over (run each minute)
  async expirePendingOrders() {
    const due = await prisma.order.findMany({ where: { status: 'awaiting_payment', expiresAt: { lt: new Date() } }, select: { id: true } });
    let expired = 0;
    for (const { id } of due) {
      const ok = await this.cancelPendingOrder(id).catch(err => { console.error(`[Orders] Could not cancel unpaid order #${id}:`, err.message); return false; });
      if (ok) expired++;
    }
    return { expired };
  },

  // A payment reached the order's deposit (commission taken, credited to the customer's
  // holding). `net` = everything received so far, `deltaNet` = this payment. Once the order
  // has what it costs it goes to processing; a payment on a closed order, or a surplus, is
  // refunded (a request an admin approves).
  async settlePendingOrder(orderId, { currency, net, deltaNet, depositId }) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return;
    if (order.status !== 'awaiting_payment') {
      await orderRefundService.request({ userId: order.userId, orderId, depositId, currency, amount: deltaNet, reason: 'payment after the order was closed' }).catch(() => {});
      return;
    }
    const due = Array.isArray(order.payments) ? order.payments[0] : null;
    if (!due) return;
    if (net + 1e-9 < due.amount * TOLERANCE) {
      const pct = await balanceService.getCommissionPct();
      const rest = Math.ceil((due.amount - net) / (1 - pct / 100) * 1e8) / 1e8;
      await notificationService.create(order.userId, {
        type: 'order', title: `Partial payment for ${order.orderNumber}`, link: `/orders/${order.id}/pay`,
        message: `${net} ${currency} received after the fee. Send the rest, ${rest.toFixed(8)} ${currency}, to the same address before the order expires.`,
      }).catch(() => {});
      return;
    }
    const pay = { ...due, amount: balanceService.round8(Math.min(due.amount, net)) };
    const settled = await prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({ where: { id: orderId, status: 'awaiting_payment' }, data: { status: 'processing', expiresAt: null, payments: [pay] } });
      if (!count) return false;
      await balanceService.debit(tx, order.userId, currency, pay.amount);
      await tx.user.update({ where: { id: order.userId }, data: { totalSpent: { increment: order.totalAmount } } });
      await tx.deposit.updateMany({ where: { orderId }, data: { status: 'confirmed', confirmedAt: new Date() } });
      await tx.transaction.create({
        data: {
          frontendId: formatTxnId(), userId: order.userId, type: 'purchase', amount: -order.totalAmount,
          currency, cryptoAmount: -pay.amount, rate: pay.rate, status: 'confirmed',
          note: `Order ${order.orderNumber} — ${pay.amount} ${currency} @ $${pay.rate}`, orderId: order.id,
        },
      });
      return true;
    });
    if (!settled) return;
    const surplus = balanceService.round8(net - pay.amount);
    if (surplus > due.amount * (1 - TOLERANCE)) {
      await orderRefundService.request({ userId: order.userId, orderId, depositId, currency, amount: surplus, reason: 'surplus paid on the order' }).catch(() => {});
    }
    await notificationService.notifyOrder(order.userId, order.orderNumber);
    const buyer = await prisma.user.findUnique({ where: { id: order.userId }, select: { username: true, telegramHandle: true } });
    await sendOrderInvoice({
      orderNumber: order.orderNumber,
      lines:       order.items.map(i => ({ name: i.name, quantity: i.quantity, total: Number(i.price) * i.quantity })),
      shipping:    order.shippingAddress ? order.shippingFee : null,
      total:       order.totalAmount,
      payments:    [pay], user: buyer,
      shipTo:      order.shippingAddress ? shipLine(order) : null,
    }).catch(() => null);
  },

  // What the customer needs to pay an awaiting order (address, amount, deadline, received)
  async paymentView(orderId, userId) {
    const order = await prisma.order.findFirst({ where: { id: orderId, userId }, include: { items: true } });
    if (!order) throw appError('Order not found', 404);
    const deposit = await prisma.deposit.findUnique({ where: { orderId } });
    const due = Array.isArray(order.payments) ? order.payments[0] : null;
    const pct = await balanceService.getCommissionPct();
    const netReceived = deposit ? Number(deposit.netAmount) : 0;
    const remainingNet = due ? Math.max(0, due.amount - netReceived) : 0;
    const remaining = remainingNet > 0 && pct < 100 ? Math.ceil(remainingNet / (1 - pct / 100) * 1e8 - 1e-6) / 1e8 : 0;
    return {
      order: {
        id: order.id, orderNumber: order.orderNumber, status: order.status, expiresAt: order.expiresAt,
        totalAmount: Number(order.totalAmount), shippingFee: Number(order.shippingFee),
        name: order.name, shippingAddress: order.shippingAddress,
        items: order.items.map(i => ({ id: i.id, name: i.name, price: Number(i.price), quantity: i.quantity })),
      },
      deposit: deposit && {
        id: deposit.id, currency: deposit.currency, address: deposit.address, status: deposit.status,
        amountExpected: deposit.amountExpected != null ? Number(deposit.amountExpected) : null,
        amountReceived: Number(deposit.amountReceived), netAmount: Number(deposit.netAmount),
      },
      currency: due?.currency || deposit?.currency || null,
      amountDue: deposit?.amountExpected != null ? Number(deposit.amountExpected) : null,
      remaining,
      commissionPct: pct,
      payWindowMinutes: PAY_WINDOW_MIN,
    };
  },

  // Reads the blockchain for an awaiting order's payments (each transaction counted once);
  // XMR is checked by hand.
  async checkOrderPayment(orderId, userId) {
    const order = await prisma.order.findFirst({ where: { id: orderId, userId }, select: { id: true, status: true } });
    if (!order) throw appError('Order not found', 404);
    const deposit = await prisma.deposit.findUnique({ where: { orderId } });
    let pending = false;
    if (order.status === 'awaiting_payment' && deposit && ['awaiting', 'partial'].includes(deposit.status)) {
      ({ pending } = await walletService.syncDeposit(deposit));
    }
    return { ...(await this.paymentView(orderId, userId)), unconfirmed: pending };
  },

  // The customer cancels an order still waiting for its payment (anything received is refunded)
  async cancelOwnPendingOrder(orderId, userId) {
    const order = await prisma.order.findFirst({ where: { id: orderId, userId }, select: { status: true } });
    if (!order) throw appError('Order not found', 404);
    if (order.status !== 'awaiting_payment') throw appError('Only an order waiting for its payment can be cancelled here.', 409);
    await this.cancelPendingOrder(orderId, 'customer');
    return { cancelled: true };
  },
};
