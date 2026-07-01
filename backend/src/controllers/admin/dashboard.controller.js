import { prisma } from '../../db.js';
import { ok } from '../../utils/response.js';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const dashboardController = {
  async get(req, res) {
    const today   = startOfToday();
    const month   = startOfMonth();
    const week    = daysAgo(7);
    const days30  = daysAgo(30);
    const days7   = daysAgo(7);

    const [
      totalRev, todayRev, weekRev, monthRev,
      totalOrders, todayOrders, pendingOrders, shippedOrders,
      totalUsers, todayUsers,
      totalProducts, lowStockCount,
      openTickets, urgentTickets,
      recentOrders, lowStockProducts, recentTickets,
      ordersStatusRaw, topProductsRaw,
    ] = await Promise.all([
      prisma.transaction.aggregate({ where: { type: 'purchase', status: 'confirmed' },                               _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: 'purchase', status: 'confirmed', createdAt: { gte: today  } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: 'purchase', status: 'confirmed', createdAt: { gte: week   } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: 'purchase', status: 'confirmed', createdAt: { gte: month  } }, _sum: { amount: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { placedAt: { gte: today } } }),
      prisma.order.count({ where: { status: 'processing'  } }),
      prisma.order.count({ where: { status: 'shipped'     } }),
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true, stock: { lte: 10, gt: 0 } } }),
      prisma.supportTicket.count({ where: { status: { in: ['open', 'in_progress'] } } }),
      prisma.supportTicket.count({ where: { status: { in: ['open', 'in_progress'] }, priority: 'urgent' } }),
      prisma.order.findMany({
        take:    10,
        orderBy: { placedAt: 'desc' },
        include: { user: { select: { username: true } } },
      }),
      prisma.product.findMany({
        where:   { isActive: true, stock: { lte: 10, gt: 0 } },
        take:    5,
        orderBy: { stock: 'asc' },
        select:  { id: true, name: true, stock: true, images: { take: 1, orderBy: { position: 'asc' } } },
      }),
      prisma.supportTicket.findMany({
        where:   { status: 'open', assignedTo: null },
        take:    5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { username: true } } },
      }),
      prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.orderItem.groupBy({
        by:     ['productId', 'name'],
        _sum:   { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take:   5,
      }),
    ]);

    // Revenue chart — 30 derniers jours
    const revenueChart = await prisma.$queryRaw`
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date,
             ABS(SUM(amount))::float           as revenue
      FROM   "Transaction"
      WHERE  type = 'purchase'
        AND  created_at >= ${days30}
      GROUP  BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER  BY date
    `;

    // New users — 7 derniers jours
    const newUsersChart = await prisma.$queryRaw`
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date,
             COUNT(*)::int                      as count
      FROM   "User"
      WHERE  created_at >= ${days7}
      GROUP  BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER  BY date
    `;

    const ordersStatusChart = Object.fromEntries(
      ordersStatusRaw.map(s => [s.status, s._count.id]),
    );

    res.json(ok({
      stats: {
        revenue: {
          total:     Math.abs(Number(totalRev._sum.amount  || 0)),
          today:     Math.abs(Number(todayRev._sum.amount  || 0)),
          thisWeek:  Math.abs(Number(weekRev._sum.amount   || 0)),
          thisMonth: Math.abs(Number(monthRev._sum.amount  || 0)),
        },
        orders:   { total: totalOrders, today: todayOrders, pending: pendingOrders, shipped: shippedOrders },
        users:    { total: totalUsers,  newToday: todayUsers },
        products: { total: totalProducts, lowStock: lowStockCount },
        tickets:  { open: openTickets,   urgent: urgentTickets },
      },
      charts: {
        revenueChart,
        ordersStatusChart,
        newUsersChart,
        topProducts: topProductsRaw.map(p => ({
          name:      p.name,
          totalSold: Number(p._sum.quantity || 0),
        })),
      },
      recentOrders,
      lowStockProducts,
      recentUnassignedTickets: recentTickets,
    }));
  },
};
