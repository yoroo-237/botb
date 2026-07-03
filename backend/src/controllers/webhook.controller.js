import crypto from 'crypto';
import { prisma } from '../db.js';
import { walletService } from '../services/wallet.service.js';
import { ok } from '../utils/response.js';
import { env } from '../config/env.js';

export const webhookController = {
  // BlockCypher webhook — BTC, LTC, DOGE
  async blockcypher(req, res) {
    const body = req.body;
    const { address, confirmations } = body;

    if (!address) return res.json(ok('No address in payload'));
    if ((confirmations || 0) < 1) return res.json(ok('Awaiting confirmation'));

    const deposit = await prisma.deposit.findFirst({
      where: { address, status: { in: ['awaiting', 'partial'] } },
    });

    if (!deposit) return res.json(ok('No deposit found for this address'));

    // BlockCypher does not provide USD amount directly.
    // Admin must confirm the USD amount manually via /api/admin/deposits/:id/confirm.
    await prisma.deposit.update({
      where: { id: deposit.id },
      data:  { status: 'partial' },
    });

    console.log(`[Webhook BlockCypher] Funds received on ${address} — deposit #${deposit.id} → partial`);
    res.json(ok('Receipt recorded, manual USD confirmation required'));
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

    const activities = body?.event?.activity || [];

    for (const transfer of activities) {
      const toAddress = transfer.toAddress?.toLowerCase();
      if (!toAddress) continue;

      const deposit = await prisma.deposit.findFirst({
        where: { address: { equals: toAddress, mode: 'insensitive' }, currency: 'ETH', status: { in: ['awaiting', 'partial'] } },
      });

      if (!deposit) continue;

      const usdValue = parseFloat(transfer.value || 0);
      if (usdValue > 0) {
        await walletService.confirmDeposit(deposit.id, usdValue, `Auto-confirmed ETH via Alchemy`);
        console.log(`[Webhook Alchemy] Deposit #${deposit.id} confirmed: $${usdValue}`);
      } else {
        await prisma.deposit.update({ where: { id: deposit.id }, data: { status: 'partial' } });
      }
    }

    res.json(ok('Processed'));
  },
};
