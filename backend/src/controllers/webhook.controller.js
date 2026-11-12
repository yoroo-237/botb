import crypto from 'crypto';
import { prisma } from '../db.js';
import { walletService } from '../services/wallet.service.js';
import { ok } from '../utils/response.js';
import { env } from '../config/env.js';

export const webhookController = {
  // A payment can reach a deposit address at any time, again and again (an order paid in
  // several goes, a customer paying the same top-up address twice). The webhooks only say
  // "something happened on this address": syncDeposit reads the address's payments and
  // credits each transaction once, by its hash.

  // BlockCypher webhook — BTC, LTC, DOGE (confirmed-tx on HD wallet address)
  async blockcypher(req, res) {
    const { address, confirmations } = req.body || {};
    if (!address) return res.json(ok('No address in payload'));
    if ((confirmations || 0) < 1) return res.json(ok('Awaiting confirmation'));

    const deposit = await prisma.deposit.findFirst({
      where: { address, status: { in: ['awaiting', 'partial', 'confirmed'] } },
      orderBy: { id: 'desc' },
    });
    if (!deposit) return res.json(ok('No deposit found for this address'));

    const r = await walletService.syncDeposit(deposit);
    res.json(ok(`${r.credited} payment(s) credited`));
  },

  // Alchemy webhook — ETH
  async alchemy(req, res) {
    const sigHeader = req.headers['x-alchemy-signature'];
    if (env.alchemy.signingKey && sigHeader) {
      const hmac     = crypto.createHmac('sha256', env.alchemy.signingKey);
      const rawBody  = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
      hmac.update(rawBody);
      const expected = hmac.digest('hex');
      if (sigHeader !== expected) {
        console.warn('[Webhook Alchemy] Invalid signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    let body;
    try {
      body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
    } catch {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Only native ETH — an ERC-20 transfer to the same address is not an ETH deposit
    const addresses = new Set((body?.event?.activity || [])
      .filter(t => t.toAddress && (!t.asset || t.asset === 'ETH'))
      .map(t => t.toAddress.toLowerCase()));

    for (const toAddress of addresses) {
      const deposit = await prisma.deposit.findFirst({
        where: { address: { equals: toAddress, mode: 'insensitive' }, currency: 'ETH', status: { in: ['awaiting', 'partial', 'confirmed'] } },
        orderBy: { id: 'desc' },
      });
      if (deposit) await walletService.syncDeposit(deposit);
    }

    res.json(ok('Processed'));
  },
};
