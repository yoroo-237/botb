import crypto from 'crypto';
import axios from 'axios';
import { prisma } from '../db.js';
import { walletService } from '../services/wallet.service.js';
import { ok } from '../utils/response.js';
import { env } from '../config/env.js';

const COINGECKO_IDS = { BTC: 'bitcoin', LTC: 'litecoin', DOGE: 'dogecoin' };

async function fetchUsdPrice(currency) {
  const id = COINGECKO_IDS[currency];
  if (!id) return null;
  try {
    const { data } = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
      { timeout: 6000 }
    );
    return data?.[id]?.usd ?? null;
  } catch {
    return null;
  }
}

export const webhookController = {
  // BlockCypher webhook — BTC, LTC, DOGE (confirmed-tx on HD wallet address)
  async blockcypher(req, res) {
    const body = req.body;
    const { address, confirmations } = body;

    if (!address) return res.json(ok('No address in payload'));
    if ((confirmations || 0) < 1) return res.json(ok('Awaiting confirmation'));

    const deposit = await prisma.deposit.findFirst({
      where: { address, status: { in: ['awaiting', 'partial'] } },
    });

    if (!deposit) return res.json(ok('No deposit found for this address'));

    // Sum satoshis received at our address from the transaction outputs
    const outputs = body.outputs || [];
    const satoshis = outputs
      .filter(o => Array.isArray(o.addresses) && o.addresses.includes(address))
      .reduce((sum, o) => sum + (o.value || 0), 0);

    const cryptoAmount = satoshis / 1e8; // satoshis → BTC/LTC/DOGE

    if (cryptoAmount <= 0) {
      console.warn(`[Webhook BlockCypher] Zero value for deposit #${deposit.id}`);
      return res.json(ok('Zero value received'));
    }

    // Fetch live USD price from CoinGecko
    const usdPrice = await fetchUsdPrice(deposit.currency);

    if (!usdPrice) {
      // Price fetch failed — mark partial for manual admin review
      await prisma.deposit.update({ where: { id: deposit.id }, data: { status: 'partial', amountReceived: cryptoAmount } });
      console.warn(`[Webhook BlockCypher] Price fetch failed for ${deposit.currency} — deposit #${deposit.id} → partial`);
      return res.json(ok('Price unavailable — marked partial for manual review'));
    }

    const usdAmount = parseFloat((cryptoAmount * usdPrice).toFixed(2));

    // Store crypto amount then auto-confirm
    await prisma.deposit.update({ where: { id: deposit.id }, data: { amountReceived: cryptoAmount } });
    await walletService.confirmDeposit(
      deposit.id,
      usdAmount,
      `Auto-confirmed ${cryptoAmount} ${deposit.currency} @ $${usdPrice} = $${usdAmount}`
    );

    console.log(`[Webhook BlockCypher] Deposit #${deposit.id} auto-confirmed: ${cryptoAmount} ${deposit.currency} → $${usdAmount}`);
    res.json(ok('Deposit auto-confirmed'));
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
