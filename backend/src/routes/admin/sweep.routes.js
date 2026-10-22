import { Router } from 'express';
import { sweepController as c } from '../../controllers/admin/sweep.controller.js';
import { requireAdmin, requireSuperAdmin } from '../../middlewares/auth.js';

const r = Router();

// ─── Sweeps (admin) ───────────────────────────────────────────────────────────
// Every sweep applies the commission split. The rate, the commission addresses and
// the sweep history are readable by admins so the split is always shown before a
// sweep is confirmed; only the super admin can change them.
r.post('/eth/sweep',              requireAdmin, c.sweepEth);
r.post('/utxo/sweep/:currency',   requireAdmin, c.sweepUtxo);
r.get('/sweep/commission',        requireAdmin, c.getCommission);
r.get('/sweep/logs',              requireAdmin, c.listLogs);

// ─── Super admin — commission settings ────────────────────────────────────────
r.get('/superadmin/settings',                requireSuperAdmin, c.getCommission);
r.put('/superadmin/settings',                requireSuperAdmin, c.updateCommission);
r.get('/superadmin/sweep-logs',              requireSuperAdmin, c.listLogs);
r.post('/superadmin/eth/sweep',              requireSuperAdmin, c.sweepEth);
r.post('/superadmin/utxo/sweep/:currency',   requireSuperAdmin, c.sweepUtxo);

export default r;
