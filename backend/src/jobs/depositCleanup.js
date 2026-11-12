import { walletService } from '../services/wallet.service.js';
import { orderService } from '../services/order.service.js';

const INTERVAL_MS = 60 * 60 * 1000; // every hour

async function run() {
  try {
    const { cleaned } = await walletService.cleanupExpiredDeposits();
    if (cleaned > 0) {
      console.log(`[DepositCleanup] ${cleaned} expired deposit(s) cleaned up, BlockCypher forwards deleted`);
    }
  } catch (err) {
    console.error('[DepositCleanup] Error:', err.message);
  }
}

// Orders paid straight in crypto have 30 minutes: past that they are cancelled (stock given
// back, anything already received refunded). Each minute.
async function expireOrders() {
  try {
    const { expired } = await orderService.expirePendingOrders();
    if (expired > 0) console.log(`[Orders] ${expired} unpaid order(s) cancelled`);
  } catch (err) {
    console.error('[Orders] Expiry error:', err.message);
  }
}

export function startDepositCleanupJob() {
  setInterval(expireOrders, 60 * 1000);
  // Run once immediately at startup to catch anything missed while the server was down
  run();
  setInterval(run, INTERVAL_MS);
  console.log('[DepositCleanup] Job started — runs every hour');
}
