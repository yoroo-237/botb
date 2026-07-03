import { useState } from 'react'
import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext.jsx'
import './admin.css'

const NAV_ITEMS = [
  { section: 'Overview' },
  { label: 'Dashboard', path: '/mario-dashboard', end: true },
  { section: 'Commerce' },
  { label: 'Orders', path: '/mario-dashboard/orders' },
  { label: 'Products', path: '/mario-dashboard/products' },
  { label: 'Categories', path: '/mario-dashboard/categories' },
  { label: 'Brands', path: '/mario-dashboard/brands' },
  { section: 'Users & Finance' },
  { label: 'Users', path: '/mario-dashboard/users' },
  { label: 'Deposits', path: '/mario-dashboard/deposits' },
  { label: 'Transactions', path: '/mario-dashboard/transactions' },
  { section: 'Support' },
  { label: 'Support Tickets', path: '/mario-dashboard/support' },
  { label: 'Reviews', path: '/mario-dashboard/reviews' },
  { section: 'Content' },
  { label: 'News', path: '/mario-dashboard/news' },
  { label: 'FAQ', path: '/mario-dashboard/faq' },
  { label: 'Giveaways', path: '/mario-dashboard/giveaways' },
  { section: 'System' },
  { label: 'Analytics', path: '/mario-dashboard/analytics' },
  { label: 'Settings', path: '/mario-dashboard/settings' },
]

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload))
  } catch {
    return {}
  }
}

export default function AdminLayout() {
  const { user, logout, loadingAuth } = useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loadingAuth) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Loading…</div>

  // Derive username from JWT if user not loaded yet
  const token = localStorage.getItem('token')
  let username = user?.username || ''
  if (!username && token) {
    const payload = decodeJwt(token)
    username = payload.username || payload.sub || 'Admin'
  }

  const initial = username?.charAt(0)?.toUpperCase() || 'A'

  return (
    <div className="admin-layout">
      {/* Overlay for mobile */}
      <div
        className={'admin-sidebar-overlay' + (sidebarOpen ? ' open' : '')}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={'admin-sidebar' + (sidebarOpen ? ' open' : '')}>
        <span className="admin-sidebar-logo">Admin Dashboard</span>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item, i) =>
            item.section ? (
              <div key={i} className="admin-nav-section">{item.section}</div>
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => 'admin-nav-link' + (isActive ? ' active' : '')}
                onClick={() => setSidebarOpen(false)}
              >
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-btn admin-btn-danger" style={{ width: '100%' }} onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        <header className="admin-header">
          <button
            className="admin-burger"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle sidebar"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <div className="admin-user-chip">
            <div className="admin-avatar">{initial}</div>
            <span>{username}</span>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
