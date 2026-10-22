import axios from 'axios';
import { HDNodeWallet, JsonRpcProvider, formatEther, isAddress } from 'ethers';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import { mnemonicToSeedSync } from 'bip39';
import { env } from '../config/env.js';
import { prisma } from '../db.js';
import { appError } from '../utils/formatters.js';
import { getUsdPrice } from './price.service.js';

const bip32 = BIP32Factory(ecc);

const CHAIN_MAP = { BTC: 'btc/main', LTC: 'ltc/main', DOGE: 'doge/main' };

// BIP44 coin types — https://github.com/satoshilabs/slips/blob/master/slip-0044.md
const BIP44_COIN = { BTC: 0, LTC: 2, DOGE: 3 };

// Network params for bitcoinjs-lib (P2PKH addresses)
const BTC_NETWORKS = {
  BTC: bitcoin.networks.bitcoin,
  LTC: {
    messagePrefix: '\x19Litecoin Signed Message:\n',
    bech32: 'ltc',
    bip32: { public: 0x019da462, private: 0x019d9cfe },
    pubKeyHash: 0x30,
    scriptHash: 0x32,
    wif: 0xb0,
  },
  DOGE: {
    messagePrefix: '\x19Dogecoin Signed Message:\n',
    bech32: 'doge',
    bip32: { public: 0x02facafd, private: 0x02fac398 },
    pubKeyHash: 0x1e,
    scriptHash: 0x16,
    wif: 0x9e,
  },
};

// Smallest output each network relays — a commission output below this is dropped
// (100% goes to the main address) rather than producing a transaction nodes reject.
const DUST_SATS = { BTC: 546, LTC: 5460, DOGE: 1_000_000 };

const trimAmount = sats => (sats / 1e8).toFixed(8).replace(/\.?0+$/, '') || '0';

async function getHdMnemonic() {
  // Seed: DB setting takes priority over env var
  const dbSetting = await prisma.siteSetting.findUnique({ where: { key: 'btc_hd_seed' } });
  const mnemonic  = dbSetting?.value?.trim() || env.btcHdSeed;
  if (!mnemonic) throw appError('BTC/LTC/DOGE HD seed not configured. Set it in Admin → Settings → Crypto.', 500);
  return mnemonic;
}

export const cryptoService = {
  async generateAddress(currency, depositId) {
    switch (currency) {
      case 'BTC':
      case 'LTC':
      case 'DOGE':
        return this._hdBitcoin(currency, depositId);
      case 'ETH':
        return this._alchemy(depositId);
      case 'XMR':
        return this._xmr();
      default:
        throw appError(`Unsupported currency: ${currency}`, 400);
    }
  },

  // Derive the key and P2PKH address of a deposit: m/44'/{coin}'/0'/0/{depositId}.
  // Single source of truth for address generation, sweep signing and verification.
  async deriveUtxoKey(currency, depositId, mnemonic) {
    const network = BTC_NETWORKS[currency];
    if (!network) throw appError(`Unsupported currency: ${currency}`, 400);

    const root  = bip32.fromSeed(mnemonicToSeedSync(mnemonic || await getHdMnemonic()), network);
    const child = root.derivePath(`m/44'/${BIP44_COIN[currency]}'/0'/0/${depositId}`);
    const { address } = bitcoin.payments.p2pkh({ pubkey: Buffer.from(child.publicKey), network });
    return { child, address, network };
  },

  isValidUtxoAddress(currency, address) {
    try { bitcoin.address.toOutputScript(address, BTC_NETWORKS[currency]); return true; }
    catch { return false; }
  },

  // HD wallet address derivation — same pattern as ETH, no BlockCypher payment forward needed
  async _hdBitcoin(currency, depositId) {
    const { address } = await this.deriveUtxoKey(currency, depositId);

    // Register BlockCypher webhook only if PUBLIC_URL is set (optional — polling works without it)
    const hookId = env.publicUrl && env.blockcypherToken
      ? await this._registerAddressWebhook(CHAIN_MAP[currency], address)
      : null;

    return { address, hookId };
  },

  // Register a confirmed-tx webhook on a specific address
  async _registerAddressWebhook(chain, address) {
    try {
      const { data } = await axios.post(
        `https://api.blockcypher.com/v1/${chain}/hooks?token=${env.blockcypherToken}`,
        {
          event:         'confirmed-tx',
          address,
          url:           `${env.publicUrl}/api/webhooks/blockcypher`,
          confirmations: 1,
        }
      );
      return data.id || null;
    } catch (err) {
      // Non-fatal: the address is still valid — admin can confirm manually if webhook fails
      console.warn(`[BlockCypher] Failed to register webhook for ${address}:`, err.message);
      return null;
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
          webhook_id:          env.alchemy.webhookId,
          addresses_to_add:    [address],
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

  // Delete a BlockCypher address webhook (hookId stored on deposit)
  async deleteBlockcypherHook(hookId, currency) {
    const chain = CHAIN_MAP[currency];
    if (!chain || !hookId || !env.blockcypherToken) return;
    try {
      await axios.delete(
        `https://api.blockcypher.com/v1/${chain}/hooks/${hookId}?token=${env.blockcypherToken}`
      );
    } catch (err) {
      // Try as a legacy payment forward (backward compat with deposits created before this change)
      try {
        await axios.delete(
          `https://api.blockcypher.com/v1/${chain}/forwards/${hookId}?token=${env.blockcypherToken}`
        );
      } catch {
        console.warn(`[BlockCypher] Could not delete hook/forward ${hookId}:`, err.message);
      }
    }
  },

  // List all address webhooks registered on BlockCypher
  async _listHooks(chain) {
    if (!env.blockcypherToken) return [];
    try {
      const { data } = await axios.get(
        `https://api.blockcypher.com/v1/${chain}/hooks?token=${env.blockcypherToken}`
      );
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn(`[BlockCypher] Failed to list hooks for ${chain}:`, err.message);
      return [];
    }
  },

  // List all legacy payment forwards (for purge backward compat)
  async _listForwards(chain) {
    if (!env.blockcypherToken) return [];
    try {
      const { data } = await axios.get(
        `https://api.blockcypher.com/v1/${chain}/forwards?token=${env.blockcypherToken}`
      );
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn(`[BlockCypher] Failed to list forwards for ${chain}:`, err.message);
      return [];
    }
  },

  // Purge ALL webhooks and legacy forwards for BTC/LTC/DOGE on BlockCypher
  async purgeAllBlockcypherForwards(currencies = ['BTC', 'LTC', 'DOGE']) {
    const results = { deleted: 0, failed: 0 };

    for (const currency of currencies) {
      const chain = CHAIN_MAP[currency];
      if (!chain || !env.blockcypherToken) continue;

      // Delete address webhooks (new approach)
      for (const hook of await this._listHooks(chain)) {
        try {
          await axios.delete(
            `https://api.blockcypher.com/v1/${chain}/hooks/${hook.id}?token=${env.blockcypherToken}`
          );
          results.deleted++;
        } catch { results.failed++; }
      }

      // Delete legacy payment forwards (old approach)
      for (const fwd of await this._listForwards(chain)) {
        try {
          await axios.delete(
            `https://api.blockcypher.com/v1/${chain}/forwards/${fwd.id}?token=${env.blockcypherToken}`
          );
          results.deleted++;
        } catch { results.failed++; }
      }
    }

    return results;
  },

  // Poll blockchain directly to check if a deposit has been received
  async checkDepositOnChain(deposit) {
    const fetchPrice = getUsdPrice;

    if (['BTC', 'LTC', 'DOGE'].includes(deposit.currency)) {
      if (!env.blockcypherToken) throw appError('BLOCKCYPHER_TOKEN not configured', 500);
      const chain = CHAIN_MAP[deposit.currency];

      const { data } = await axios.get(
        `https://api.blockcypher.com/v1/${chain}/addrs/${deposit.address}?token=${env.blockcypherToken}`,
        { timeout: 8000 }
      );

      const totalReceivedSats = data.total_received || 0;
      const pendingSats       = data.unconfirmed_balance || 0;

      if (totalReceivedSats === 0) {
        return { confirmed: false, pending: pendingSats > 0, pendingSats };
      }

      const cryptoAmount = totalReceivedSats / 1e8;
      const usdPrice     = await fetchPrice(deposit.currency);
      if (!usdPrice) return { confirmed: false, pending: false, error: 'price_unavailable' };

      return { confirmed: true, cryptoAmount, usdAmount: parseFloat((cryptoAmount * usdPrice).toFixed(2)), usdPrice };

    } else if (deposit.currency === 'ETH') {
      if (!env.alchemy.apiKey) throw appError('ALCHEMY_API_KEY not configured', 500);

      const provider   = new JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${env.alchemy.apiKey}`);
      const balance    = await provider.getBalance(deposit.address);
      const balanceEth = parseFloat(formatEther(balance));

      if (balanceEth <= 0.0001) return { confirmed: false, pending: false };

      const usdPrice = await fetchPrice('ETH');
      if (!usdPrice) return { confirmed: false, pending: false, error: 'price_unavailable' };

      return { confirmed: true, cryptoAmount: balanceEth, usdAmount: parseFloat((balanceEth * usdPrice).toFixed(2)), usdPrice };
    }

    return { confirmed: false, pending: false }; // XMR — manual only
  },

  // Sweeps every BTC/LTC/DOGE deposit address. Each transaction has two outputs:
  // (100 - pct)% to the site's destination address and pct% to the commission
  // address. Below the network dust limit the commission output is dropped.
  async sweepUtxoWithCommission(currency, destinationAddress, { pct, commissionAddress }) {
    const chain = CHAIN_MAP[currency];
    if (!chain) throw appError(`Unsupported currency: ${currency}`, 400);
    if (!env.blockcypherToken) throw appError('BLOCKCYPHER_TOKEN not configured', 500);

    const network  = BTC_NETWORKS[currency];
    const dust     = DUST_SATS[currency];
    const mnemonic = await getHdMnemonic();

    // Reject bad addresses before touching any deposit — never build a tx to an unknown script
    if (!this.isValidUtxoAddress(currency, destinationAddress)) {
      throw appError(`Invalid ${currency} destination address: ${destinationAddress}`, 400);
    }
    if (pct > 0 && !this.isValidUtxoAddress(currency, commissionAddress)) {
      throw appError(`Invalid ${currency} reserve fund address`, 400);
    }

    const deposits = await prisma.deposit.findMany({ where: { currency }, orderBy: { id: 'asc' } });

    // Fetch live fee rate from BlockCypher (low_fee_per_kb = economy rate)
    let feePerByte = { BTC: 10, LTC: 10, DOGE: 1000 }[currency]; // fallback sats/byte
    try {
      const { data: chainInfo } = await axios.get(
        `https://api.blockcypher.com/v1/${chain}?token=${env.blockcypherToken}`
      );
      feePerByte = Math.ceil((chainInfo.low_fee_per_kb || feePerByte * 1000) / 1000);
    } catch { /* use fallback */ }

    // P2PKH tx size: 10 (overhead) + inputs*148 + outputs*34
    const feeFor = (inputs, outputs) => feePerByte * (10 + inputs * 148 + outputs * 34);

    const results = [];

    for (const dep of deposits) {
      const { child, address } = await this.deriveUtxoKey(currency, dep.id, mnemonic);

      let utxos = [];
      try {
        const { data } = await axios.get(
          `https://api.blockcypher.com/v1/${chain}/addrs/${address}?unspentOnly=true&token=${env.blockcypherToken}`
        );
        utxos = data.txrefs || [];
      } catch (err) {
        results.push({ depositId: dep.id, address, status: 'error', reason: 'UTXO fetch failed: ' + err.message });
        continue;
      }

      if (utxos.length === 0) continue;

      const totalSats = utxos.reduce((sum, u) => sum + u.value, 0);

      // Two outputs cost 34 bytes more than one; if the commission share would be
      // dust, fall back to a single output so the whole amount still moves.
      let fee        = feeFor(utxos.length, 2);
      let sendAmount = totalSats - fee;
      let commission = pct > 0 ? Math.floor(sendAmount * pct / 100) : 0;
      let main       = sendAmount - commission;
      if (commission > 0 && (commission < dust || main < dust)) {
        fee        = feeFor(utxos.length, 1);
        sendAmount = totalSats - fee;
        commission = 0;
        main       = sendAmount;
      } else if (commission === 0) {
        fee        = feeFor(utxos.length, 1);
        sendAmount = totalSats - fee;
        main       = sendAmount;
      }

      if (main < dust) {
        results.push({ depositId: dep.id, address, status: 'skipped', reason: `Balance (${totalSats} sats) too low to cover fee (${fee} sats @ ${feePerByte} sat/byte)`, balanceSats: totalSats });
        continue;
      }

      try {
        const psbt = new bitcoin.Psbt({ network });

        for (const utxo of utxos) {
          const { data: txData } = await axios.get(
            `https://api.blockcypher.com/v1/${chain}/txs/${utxo.tx_hash}?includeHex=true&token=${env.blockcypherToken}`
          );
          psbt.addInput({
            hash:           utxo.tx_hash,
            index:          utxo.tx_output_n,
            nonWitnessUtxo: Buffer.from(txData.hex, 'hex'),
          });
        }

        psbt.addOutput({ address: destinationAddress, value: main });
        if (commission > 0) psbt.addOutput({ address: commissionAddress, value: commission });

        for (let i = 0; i < utxos.length; i++) psbt.signInput(i, child);
        psbt.finalizeAllInputs();

        const txHex = psbt.extractTransaction().toHex();
        const { data: broadcast } = await axios.post(
          `https://api.blockcypher.com/v1/${chain}/txs/push?token=${env.blockcypherToken}`,
          { tx: txHex }
        );

        results.push({
          depositId: dep.id, address, status: 'swept', txHash: broadcast.tx?.hash,
          mainSats: main, commissionSats: commission,
          amountMain: trimAmount(main), amountCommission: trimAmount(commission),
        });
      } catch (err) {
        const reason = err.response?.data?.error || err.message;
        results.push({ depositId: dep.id, address, status: 'error', reason });
      }
    }

    return results;
  },

  // Sweeps every confirmed ETH deposit address. An Ethereum transfer has a single
  // recipient, so the commission share is sent as a second transaction (explicit
  // consecutive nonces, so neither has to wait for the other to be mined).
  async sweepEthWithCommission(destinationAddress, { pct, commissionAddress }) {
    if (!env.ethHdSeed)      throw appError('ETH_HD_SEED not configured', 500);
    if (!env.alchemy.apiKey) throw appError('ALCHEMY_API_KEY not configured', 500);
    if (!isAddress(destinationAddress)) throw appError(`Invalid ETH destination address: ${destinationAddress}`, 400);
    if (pct > 0 && !isAddress(commissionAddress)) throw appError(`Invalid ETH reserve fund address`, 400);

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
    const gasCost   = GAS_LIMIT * gasPrice;
    const pctBasis  = BigInt(Math.round(pct * 100)); // pct in hundredths of a percent

    const results = [];

    for (const dep of deposits) {
      const wallet  = HDNodeWallet.fromPhrase(env.ethHdSeed, undefined, `m/44'/60'/0'/0/${dep.ethIndex}`)
                                  .connect(provider);
      const balance = await provider.getBalance(wallet.address);
      if (balance === 0n) continue;

      // Gas for the second transfer only when there is a commission to send
      let spendable  = balance - gasCost * 2n;
      let commission = pctBasis > 0n && spendable > 0n ? (spendable * pctBasis) / 10000n : 0n;
      if (commission === 0n) spendable = balance - gasCost;
      const main = spendable - commission;

      if (main <= 0n) {
        results.push({ depositId: dep.id, address: wallet.address, status: 'skipped', reason: 'Balance too low to cover gas' });
        continue;
      }

      let nonce, mainTx;
      try {
        nonce  = await provider.getTransactionCount(wallet.address, 'pending');
        mainTx = await wallet.sendTransaction({
          to: destinationAddress, value: main, gasLimit: GAS_LIMIT, gasPrice, nonce,
        });
      } catch (err) {
        results.push({ depositId: dep.id, address: wallet.address, status: 'error', reason: err.shortMessage || err.message });
        continue;
      }

      // The main transfer is already broadcast: a failure here must not hide it.
      // The unsent commission stays on the deposit address and goes out with the next sweep.
      let commissionTxHash = null, commissionError = null;
      if (commission > 0n) {
        try {
          const commissionTx = await wallet.sendTransaction({
            to: commissionAddress, value: commission, gasLimit: GAS_LIMIT, gasPrice, nonce: nonce + 1,
          });
          commissionTxHash = commissionTx.hash;
        } catch (err) {
          commissionError = err.shortMessage || err.message;
        }
      }

      results.push({
        depositId: dep.id, address: wallet.address, status: 'swept',
        txHash: mainTx.hash, commissionTxHash, commissionError,
        amountMain: formatEther(main), amountCommission: commissionTxHash ? formatEther(commission) : '0',
      });
    }

    return results;
  },
};
