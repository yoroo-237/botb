import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { adminFetch } from './utils/api.js'

const PERIODS = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
  { label: '1 Year', value: '1y' },
]

const PIE_COLORS = ['#4361ee', '#f7931a', '#28a745', '#dc3545', '#6f42c1', '#fd7e14']

function Skel({ w = '80px', h = '20px' }) {
  return <span className="admin-skel" style={{ width: w, height: h, display: 'inline-block' }} />
}

function StatCard({ label, value, loading }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-label">{label}</div>
      <div className="admin-stat-value">{loading ? <Skel w="100px" h="28px" /> : value}</div>
    </div>
  )
}

export default function AdminAnalytics() {
  const [period, setPeriod] = useState('30d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    adminFetch(`/admin/analytics?period=${period}`)
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [period])

  const summary = data?.summary || {}
  const charts = data?.charts || {}

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Analytics</h1>
          <p className="admin-page-subtitle">Performance metrics and insights</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {PERIODS.map(p => (
            <button
              key={p.value}
              className={'admin-btn admin-btn-sm ' + (period === p.value ? 'admin-btn-primary' : 'admin-btn-secondary')}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ color: '#dc3545', marginBottom: '16px' }}>{error}</div>}

      {/* Summary Cards */}
      <div className="admin-stat-grid">
        <StatCard label="Total Revenue" value={`$${(summary.totalRevenue || 0).toFixed(2)}`} loading={loading} />
        <StatCard label="Total Orders" value={summary.totalOrders ?? 0} loading={loading} />
        <StatCard label="New Users" value={summary.newUsers ?? 0} loading={loading} />
        <StatCard label="Avg Order Value" value={`$${(summary.avgOrderValue || 0).toFixed(2)}`} loading={loading} />
        <StatCard label="Conversion Rate" value={`${(summary.conversionRate || 0).toFixed(1)}%`} loading={loading} />
      </div>

      {!loading && (
        <div className="admin-charts-grid">
          {/* Revenue over time */}
          <div className="admin-chart-wrap" style={{ gridColumn: '1 / -1' }}>
            <div className="admin-chart-title">Revenue Over Time</div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={charts.revenue || []}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4361ee" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4361ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => typeof d === 'string' ? d.slice(5) : ''} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={v => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#4361ee" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Orders over time */}
          <div className="admin-chart-wrap">
            <div className="admin-chart-title">Orders Over Time</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.orders || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => typeof d === 'string' ? d.slice(5) : ''} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#4361ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* New Users over time */}
          <div className="admin-chart-wrap">
            <div className="admin-chart-title">New Users Over Time</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={charts.users || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => typeof d === 'string' ? d.slice(5) : ''} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#28a745" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by category */}
          <div className="admin-chart-wrap">
            <div className="admin-chart-title">Revenue by Category</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={charts.revenueByCategory || []}
                  cx="50%" cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {(charts.revenueByCategory || []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Products by revenue */}
          <div className="admin-chart-wrap">
            <div className="admin-chart-title">Top Products by Revenue</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.topProducts || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={v => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#f7931a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Deposits by currency */}
          <div className="admin-chart-wrap">
            <div className="admin-chart-title">Deposits by Currency</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={charts.depositsByCurrency || []} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label>
                  {(charts.depositsByCurrency || []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Order status distribution */}
          <div className="admin-chart-wrap">
            <div className="admin-chart-title">Order Status Distribution</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.orderStatus || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#6f42c1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* User tiers */}
          <div className="admin-chart-wrap">
            <div className="admin-chart-title">User Tiers Distribution</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={charts.userTiers || []} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label>
                  {(charts.userTiers || []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
