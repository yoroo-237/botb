import { prisma } from '../../db.js';
import { cryptoService } from '../../services/crypto.service.js';
import { ok } from '../../utils/response.js';
import { appError } from '../../utils/formatters.js';

const ALLOWED_KEYS = new Set([
  'site_name', 'maintenance_mode', 'registration_open',
  'shipping_cost', 'shipping_free_threshold', 'shipping_deadline_h', 'shipping_deadline_m',
  'points_rate', 'deposit_expiry_hours', 'min_deposit', 'max_deposit',
  'btc_address', 'ltc_address', 'doge_address', 'eth_address', 'xmr_address',
  'btc_hd_seed',
]);

export const adminSettingsController = {
  async get(req, res) {
    const rows     = await prisma.siteSetting.findMany({ orderBy: { key: 'asc' } });
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json(ok({ settings }));
  },

  async update(req, res) {
    const entries = Object.entries(req.body).filter(([k]) => ALLOWED_KEYS.has(k));
    if (entries.length === 0) throw appError('No valid keys to update', 400);

    await Promise.all(entries.map(([key, value]) =>
      prisma.siteSetting.upsert({
        where:  { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      }),
    ));

    res.json(ok({ updated: entries.map(([k]) => k) }));
  },

  async sweepEth(req, res) {
    const setting = await prisma.siteSetting.findUnique({ where: { key: 'eth_address' } });
    if (!setting?.value?.trim()) throw appError('ETH destination address not configured (Admin → Settings → Crypto)', 400);

    const results = await cryptoService.sweepEth(setting.value.trim());
    res.json(ok({ swept: results.length, details: results }));
  },

  async sweepCrypto(req, res) {
    const currency = req.params.currency?.toUpperCase();
    if (!['BTC', 'LTC', 'DOGE'].includes(currency)) throw appError('Unsupported currency for sweep', 400);

    const key = `${currency.toLowerCase()}_address`;
    const setting = await prisma.siteSetting.findUnique({ where: { key } });
    if (!setting?.value?.trim()) throw appError(`${currency} destination address not configured (Admin → Settings → Crypto)`, 400);

    const results = await cryptoService.sweepBtcLike(currency, setting.value.trim());
    res.json(ok({ currency, swept: results.filter(r => r.status === 'swept').length, details: results }));
  },

  async getSystemStatus(req, res) {
    const checks = await Promise.allSettled([
      prisma.$queryRaw`SELECT 1`,
      prisma.siteSetting.count(),
      prisma.user.count(),
    ]);

    res.json(ok({
      database:   checks[0].status === 'fulfilled' ? 'ok' : 'error',
      settings:   checks[1].status === 'fulfilled' ? checks[1].value : 0,
      totalUsers: checks[2].status === 'fulfilled' ? checks[2].value : 0,
      uptime:     process.uptime(),
      nodeVersion: process.version,
      env:         process.env.NODE_ENV,
    }));
  },
};
