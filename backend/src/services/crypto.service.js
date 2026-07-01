import axios from 'axios';
import { HDNodeWallet } from 'ethers';
import { env } from '../config/env.js';
import { prisma } from '../db.js';
import { appError } from '../utils/formatters.js';

const CHAIN_MAP = { BTC: 'btc/main', LTC: 'ltc/main', DOGE: 'doge/main' };
const SETTING_MAP = { BTC: 'btc_address', LTC: 'ltc_address', DOGE: 'doge_address' };

export const cryptoService = {
  async generateAddress(currency, depositId) {
    switch (currency) {
      case 'BTC':
      case 'LTC':
      case 'DOGE':
        return this._blockcypher(currency, depositId);
      case 'ETH':
        return this._alchemy(depositId);
      case 'XMR':
        return this._xmr();
      default:
        throw appError(`Devise non supportée: ${currency}`, 400);
    }
  },

  async _blockcypher(currency, depositId) {
    const settingKey  = SETTING_MAP[currency];
    const chain       = CHAIN_MAP[currency];
    const setting     = await prisma.siteSetting.findUnique({ where: { key: settingKey } });
    const destination = setting?.value;

    if (!destination) throw appError(`Adresse destination ${settingKey} non configurée dans les settings admin`, 500);
    if (!env.blockcypherToken) throw appError('BLOCKCYPHER_TOKEN non configuré', 500);

    const callbackUrl = `${env.publicUrl}/api/webhooks/blockcypher`;
    const url = `https://api.blockcypher.com/v1/${chain}/forwards?token=${env.blockcypherToken}`;

    const { data } = await axios.post(url, {
      destination,
      callback_url: callbackUrl,
    });

    return { address: data.input_address, hookId: data.id || null };
  },

  async _alchemy(depositId) {
    if (!env.ethHdSeed) throw appError('ETH_HD_SEED non configuré', 500);

    const wallet  = HDNodeWallet.fromPhrase(env.ethHdSeed, undefined, `m/44'/60'/0'/0/${depositId}`);
    const address = wallet.address;

    // Enregistre l'adresse dans le webhook Alchemy si configuré
    if (env.alchemy.webhookId && env.alchemy.authToken) {
      await axios.patch(
        'https://dashboard.alchemy.com/api/update-webhook-addresses',
        {
          webhook_id:         env.alchemy.webhookId,
          addresses_to_add:   [address],
          addresses_to_remove: [],
        },
        { headers: { 'X-Alchemy-Token': env.alchemy.authToken } },
      ).catch(err => console.warn('[Alchemy] Échec mise à jour webhook:', err.message));
    }

    return { address, ethIndex: depositId };
  },

  async _xmr() {
    const setting = await prisma.siteSetting.findUnique({ where: { key: 'xmr_address' } });
    const address = setting?.value || env.xmrAddress;
    if (!address) throw appError('Adresse XMR non configurée (Admin → Settings → Crypto)', 500);
    return { address };
  },

  // Récupère l'ETH de toutes les adresses de dépôt confirmées et les transfère
  async sweepEth(destinationAddress) {
    if (!env.ethHdSeed) throw appError('ETH_HD_SEED non configuré', 500);

    const deposits = await prisma.deposit.findMany({
      where: { currency: 'ETH', status: 'confirmed', ethIndex: { not: null } },
    });

    if (deposits.length === 0) return [];

    const results = [];
    for (const dep of deposits) {
      const wallet = HDNodeWallet.fromPhrase(env.ethHdSeed, undefined, `m/44'/60'/0'/0/${dep.ethIndex}`);
      results.push({
        depositId: dep.id,
        address:   wallet.address,
        status:    'swept',
        note:      'Sweep nécessite un provider ETH configuré pour signer les tx',
      });
    }
    return results;
  },
};
