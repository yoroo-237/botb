import axios from 'axios';
import { HDNodeWallet, JsonRpcProvider, formatEther } from 'ethers';
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
        throw appError(`Unsupported currency: ${currency}`, 400);
    }
  },

  async _blockcypher(currency, depositId) {
    const settingKey  = SETTING_MAP[currency];
    const chain       = CHAIN_MAP[currency];
    const setting     = await prisma.siteSetting.findUnique({ where: { key: settingKey } });
    const destination = setting?.value;

    if (!destination) throw appError(`Destination address ${settingKey} not configured in admin settings`, 500);
    if (!env.blockcypherToken) throw appError('BLOCKCYPHER_TOKEN not configured', 500);

    const callbackUrl = `${env.publicUrl}/api/webhooks/blockcypher`;
    const url = `https://api.blockcypher.com/v1/${chain}/forwards?token=${env.blockcypherToken}`;

    try {
      const { data } = await axios.post(url, {
        destination,
        callback_url: callbackUrl,
      });
      return { address: data.input_address, hookId: data.id || null };
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) {
        throw appError('Too many deposit requests. Please wait a few minutes before trying again.', 503);
      }
      throw appError(`Failed to generate ${currency} address. Please try again later.`, 503);
    }
  },

  async _alchemy(depositId) {
    if (!env.ethHdSeed) throw appError('ETH_HD_SEED not configured', 500);

    const wallet  = HDNodeWallet.fromPhrase(env.ethHdSeed, undefined, `m/44'/60'/0'/0/${depositId}`);
    const address = wallet.address;

    if (env.alchemy.webhookId && env.alchemy.authToken) {
      await axios.patch(
        'https://dashboard.alchemy.com/api/update-webhook-addresses',
        {
          webhook_id:         env.alchemy.webhookId,
          addresses_to_add:   [address],
          addresses_to_remove: [],
        },
        { headers: { 'X-Alchemy-Token': env.alchemy.authToken } },
      ).catch(err => console.warn('[Alchemy] Failed to update webhook:', err.message));
    }

    return { address, ethIndex: depositId };
  },

  async _xmr() {
    const setting = await prisma.siteSetting.findUnique({ where: { key: 'xmr_address' } });
    const address = setting?.value || env.xmrAddress;
    if (!address) throw appError('XMR address not configured (Admin → Settings → Crypto)', 500);
    return { address };
  },

  async deleteBlockcypherForward(hookId, currency) {
    const chain = CHAIN_MAP[currency];
    if (!chain || !hookId || !env.blockcypherToken) return;
    const url = `https://api.blockcypher.com/v1/${chain}/forwards/${hookId}?token=${env.blockcypherToken}`;
    try {
      await axios.delete(url);
    } catch (err) {
      console.warn(`[BlockCypher] Failed to delete forward ${hookId}:`, err.message);
    }
  },

  async sweepEth(destinationAddress) {
    if (!env.ethHdSeed)       throw appError('ETH_HD_SEED not configured', 500);
    if (!env.alchemy.apiKey)  throw appError('ALCHEMY_API_KEY not configured', 500);

    const provider = new JsonRpcProvider(
      `https://eth-mainnet.g.alchemy.com/v2/${env.alchemy.apiKey}`
    );

    const deposits = await prisma.deposit.findMany({
      where: { currency: 'ETH', status: 'confirmed', ethIndex: { not: null } },
    });

    if (deposits.length === 0) return [];

    const GAS_LIMIT = 21000n;
    const feeData   = await provider.getFeeData();
    const gasPrice  = feeData.gasPrice ?? feeData.maxFeePerGas;
    if (!gasPrice) throw appError('Could not fetch gas price from Alchemy', 500);

    const results = [];

    for (const dep of deposits) {
      const wallet  = HDNodeWallet.fromPhrase(env.ethHdSeed, undefined, `m/44'/60'/0'/0/${dep.ethIndex}`)
                                  .connect(provider);
      const balance = await provider.getBalance(wallet.address);
      const gasCost = GAS_LIMIT * gasPrice;

      if (balance <= gasCost) {
        results.push({
          depositId: dep.id,
          address:   wallet.address,
          status:    'skipped',
          balanceEth: formatEther(balance),
          reason:    'Balance too low to cover gas',
        });
        continue;
      }

      try {
        const tx = await wallet.sendTransaction({
          to:       destinationAddress,
          value:    balance - gasCost,
          gasLimit: GAS_LIMIT,
          gasPrice,
        });

        results.push({
          depositId: dep.id,
          address:   wallet.address,
          status:    'swept',
          txHash:    tx.hash,
          amountEth: formatEther(balance - gasCost),
        });
      } catch (err) {
        results.push({
          depositId: dep.id,
          address:   wallet.address,
          status:    'error',
          reason:    err.message,
        });
      }
    }

    return results;
  },
};
