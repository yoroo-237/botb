import crypto from 'crypto';
import { prisma } from '../db.js';
import { walletService } from '../services/wallet.service.js';
import { ok } from '../utils/response.js';
import { env } from '../config/env.js';

export const webhookController = {
  // Webhook BlockCypher — BTC, LTC, DOGE
  async blockcypher(req, res) {
    const body = req.body;

    // BlockCypher envoie plusieurs événements — on ne traite que les confirmations
    const { address, confirmations, outputs } = body;

    if (!address) return res.json(ok('Pas d\'adresse dans le payload'));
    if ((confirmations || 0) < 1) return res.json(ok('En attente de confirmation'));

    const deposit = await prisma.deposit.findFirst({
      where: { address, status: { in: ['awaiting', 'partial'] } },
    });

    if (!deposit) return res.json(ok('Dépôt non trouvé pour cette adresse'));

    // BlockCypher ne donne pas directement le montant USD
    // L'admin confirme manuellement le montant USD via /api/admin/deposits/:id/confirm
    // On marque juste le dépôt comme "partial" pour signaler la réception
    await prisma.deposit.update({
      where: { id: deposit.id },
      data:  { status: 'partial' },
    });

    console.log(`[Webhook BlockCypher] Fonds reçus sur ${address} — dépôt #${deposit.id} → partial`);
    res.json(ok('Réception enregistrée, confirmation manuelle requise pour le montant USD'));
  },

  // Webhook Alchemy — ETH
  async alchemy(req, res) {
    // Vérification de la signature Alchemy
    const sigHeader = req.headers['x-alchemy-signature'];
    if (env.alchemy.signingKey && sigHeader) {
      const hmac     = crypto.createHmac('sha256', env.alchemy.signingKey);
      const rawBody  = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
      hmac.update(rawBody);
      const expected = hmac.digest('hex');
      if (sigHeader !== expected) {
        console.warn('[Webhook Alchemy] Signature invalide');
        return res.status(401).json({ error: 'Signature invalide' });
      }
    }

    let body;
    try {
      body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
    } catch {
      return res.status(400).json({ error: 'Payload invalide' });
    }

    const activities = body?.event?.activity || [];

    for (const transfer of activities) {
      const toAddress = transfer.toAddress?.toLowerCase();
      if (!toAddress) continue;

      const deposit = await prisma.deposit.findFirst({
        where: { address: { equals: toAddress, mode: 'insensitive' }, currency: 'ETH', status: { in: ['awaiting', 'partial'] } },
      });

      if (!deposit) continue;

      // Alchemy fournit la valeur USD si disponible
      const usdValue = parseFloat(transfer.value || 0);
      if (usdValue > 0) {
        await walletService.confirmDeposit(deposit.id, usdValue, `Auto-confirmé ETH via Alchemy`);
        console.log(`[Webhook Alchemy] Dépôt #${deposit.id} confirmé: $${usdValue}`);
      } else {
        await prisma.deposit.update({ where: { id: deposit.id }, data: { status: 'partial' } });
      }
    }

    res.json(ok('Traité'));
  },
};
