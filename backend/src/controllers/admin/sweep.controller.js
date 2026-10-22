import { isAddress } from 'ethers';
import { prisma } from '../../db.js';
import { cryptoService } from '../../services/crypto.service.js';
import { ok } from '../../utils/response.js';
import { appError } from '../../utils/formatters.js';

// Every sweep splits the swept funds: `pct`% to the reserve fund (expansion &
// maintenance) address of the currency, the rest to the site's destination address
// (Settings → Crypto). Reserve settings live in SiteSetting under "super_" keys,
// which the generic settings endpoints never expose or accept — only the super
// admin can change them. Admins see the rate and the amounts; the reserve
// addresses and the reserve transfer hashes are returned to the super admin only.

const DEFAULT_PCT = 10;

const COMMISSION_KEYS = {
  pct:  'super_sweep_commission_pct',
  BTC:  'super_btc_commission_address',
  LTC:  'super_ltc_commission_address',
  DOGE: 'super_doge_commission_address',
  ETH:  'super_eth_commission_address',
};

// Request body field → currency
const BODY_FIELDS = {
  btcCommissionAddress:  'BTC',
  ltcCommissionAddress:  'LTC',
  dogeCommissionAddress: 'DOGE',
  ethCommissionAddress:  'ETH',
};

const UTXO_CURRENCIES = ['BTC', 'LTC', 'DOGE'];

// One sweep per currency at a time: a double click must not build two
// transactions spending the same outputs.
const running = new Set();

async function readCommission() {
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: Object.values(COMMISSION_KEYS) } } });
  const map  = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const pct  = map[COMMISSION_KEYS.pct] != null ? Number(map[COMMISSION_KEYS.pct]) : DEFAULT_PCT;
  return {
    commissionPct:         Number.isFinite(pct) ? pct : DEFAULT_PCT,
    btcCommissionAddress:  map[COMMISSION_KEYS.BTC]  || '',
    ltcCommissionAddress:  map[COMMISSION_KEYS.LTC]  || '',
    dogeCommissionAddress: map[COMMISSION_KEYS.DOGE] || '',
    ethCommissionAddress:  map[COMMISSION_KEYS.ETH]  || '',
  };
}

const isSuper = req => req.user.role === 'superadmin';

// Admin view: the rate and which currencies have a reserve address, never the address itself
function publicCommission(c) {
  return {
    commissionPct: c.commissionPct,
    configured: Object.fromEntries(
      Object.entries(BODY_FIELDS).map(([field, currency]) => [currency, !!c[field]])
    ),
  };
}

const redactLog = ({ commissionAddress, commissionTxHash, ...log }) => log;
// Error messages (ethers copies the whole transaction) may contain the reserve address
const redactReason = (reason, addr) => !addr ? reason
  : String(reason).split(addr).join('[reserve fund]').split(addr.toLowerCase()).join('[reserve fund]');
function redactSummary(summary, addr) {
  return {
    ...summary,
    results: summary.results.map(redactResult),
    skipped: summary.skipped.map(s => ({ ...s, reason: redactReason(s.reason, addr) })),
  };
}
const redactResult = ({ commissionTxHash, commissionError, ...r }) =>
  (commissionError ? { ...r, commissionError: 'reserve transfer failed — it will go out with the next sweep' } : r);

async function getSweepConfig(currency) {
  const commission = await readCommission();
  const pct = commission.commissionPct;
  const commissionAddress = commission[`${currency.toLowerCase()}CommissionAddress`];
  if (pct > 0 && !commissionAddress) {
    throw appError(`${currency} reserve fund address not configured — sweep disabled until the super admin sets it.`, 400);
  }

  const setting = await prisma.siteSetting.findUnique({ where: { key: `${currency.toLowerCase()}_address` } });
  const destination = setting?.value?.trim();
  if (!destination) throw appError(`${currency} destination address not configured (Admin → Settings → Crypto)`, 400);

  return { pct, commissionAddress, destination };
}

async function withLock(currency, fn) {
  if (running.has(currency)) throw appError(`A ${currency} sweep is already running — wait for it to finish.`, 409);
  running.add(currency);
  try { return await fn(); }
  finally { running.delete(currency); }
}

async function logSweeps(currency, swept, { pct, destination, commissionAddress }, userId) {
  for (const r of swept) {
    const main       = Number(r.amountMain);
    const commission = Number(r.amountCommission);
    await prisma.sweepLog.create({
      data: {
        currency,
        commissionPct:     pct,
        totalAmount:       main + commission,
        mainAmount:        main,
        mainAddress:       destination,
        mainTxHash:        r.txHash || null,
        commissionAmount:  commission,
        commissionAddress: commissionAddress || '',
        // UTXO: same transaction (second output). ETH: separate transaction.
        commissionTxHash:  currency === 'ETH' ? r.commissionTxHash : (commission > 0 ? r.txHash : null),
        addressCount:      1,
        triggeredBy:       userId,
      },
    }).catch(err => console.error(`[Sweep] Failed to log ${currency} sweep ${r.txHash}:`, err.message));
  }
}

function summarize(currency, results, pct) {
  const swept   = results.filter(r => r.status === 'swept');
  const skipped = results.filter(r => r.status !== 'swept');
  const sum = key => swept.reduce((s, r) => s + Number(r[key] || 0), 0);
  return {
    currency,
    commissionPct:   pct,
    swept:           swept.length,
    results:         swept,
    skipped,
    totalMain:       sum('amountMain').toFixed(8).replace(/\.?0+$/, '') || '0',
    totalCommission: sum('amountCommission').toFixed(8).replace(/\.?0+$/, '') || '0',
  };
}

export const sweepController = {
  async getCommission(req, res) {
    const commission = await readCommission();
    res.json(ok(isSuper(req) ? commission : publicCommission(commission)));
  },

  async updateCommission(req, res) {
    const { commissionPct } = req.body;
    const updates = {};

    if (commissionPct !== undefined) {
      const pct = Number(commissionPct);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw appError('commissionPct must be a number between 0 and 100', 400);
      updates[COMMISSION_KEYS.pct] = String(pct);
    }

    for (const [field, currency] of Object.entries(BODY_FIELDS)) {
      if (req.body[field] === undefined) continue;
      const value = String(req.body[field]).trim();
      if (value) {
        const valid = currency === 'ETH' ? isAddress(value) : cryptoService.isValidUtxoAddress(currency, value);
        if (!valid) throw appError(`Invalid ${currency} commission address`, 400);
      }
      updates[COMMISSION_KEYS[currency]] = value;
    }

    await prisma.$transaction(
      Object.entries(updates).map(([key, value]) =>
        prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
      )
    );
    res.json(ok(await readCommission()));
  },

  async listLogs(req, res) {
    const logs = await prisma.sweepLog.findMany({
      orderBy: { createdAt: 'desc' },
      take:    200,
      include: { triggeredByUser: { select: { id: true, username: true } } },
    });
    res.json(ok({ logs: isSuper(req) ? logs : logs.map(redactLog) }));
  },

  async sweepUtxo(req, res) {
    const currency = req.params.currency?.toUpperCase();
    if (!UTXO_CURRENCIES.includes(currency)) throw appError('Unsupported currency for sweep', 400);

    const config  = await getSweepConfig(currency);
    const results = await withLock(currency, () =>
      cryptoService.sweepUtxoWithCommission(currency, config.destination, config)
    );
    const summary = summarize(currency, results, config.pct);
    await logSweeps(currency, summary.results, config, req.user.sub);
    res.json(ok(isSuper(req) ? summary : redactSummary(summary, config.commissionAddress)));
  },

  async sweepEth(req, res) {
    const config  = await getSweepConfig('ETH');
    const results = await withLock('ETH', () =>
      cryptoService.sweepEthWithCommission(config.destination, config)
    );
    const summary = summarize('ETH', results, config.pct);
    await logSweeps('ETH', summary.results, config, req.user.sub);
    res.json(ok(isSuper(req) ? summary : redactSummary(summary, config.commissionAddress)));
  },
};
