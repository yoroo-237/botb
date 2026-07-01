import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext.jsx'
import MiniCart from '../MiniCart/MiniCart.jsx'
import styles from './Header.module.css'

const NAV = [
  {
    label: 'Flower', path: '/product-category/flower',
    children: [
      { label: 'Exotics',         path: '/product-category/exo' },
      { label: 'Indoors',         path: '/product-category/indo' },
      { label: 'AAA Mixed Lights',path: '/product-category/mix' },
      { label: 'Light Deps',      path: '/product-category/flower/deps' },
    ],
  },
  {
    label: 'Concentrates', path: '/product-category/conc',
    children: [
      { label: 'In-House',  path: '/product-category/conc/inhouse' },
      { label: 'Authentic', path: '/product-category/conc/authenconc' },
    ],
  },
  {
    label: 'Dispos', path: '/product-category/dispos',
    children: [
      { label: 'Authentic', path: '/product-category/dispos/authendispos' },
      { label: 'Replicas',  path: '/product-category/dispos/reps' },
    ],
  },
  {
    label: 'Edibles', path: '/product-category/edibles', children: [],
  },
]

export default function Header() {
  const { itemCount } = useCart()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [openSubmenu, setOpenSubmenu] = useState(null)
  const navigate = useNavigate()
  const searchRef = useRef()

  function handleSearch(e) {
    e.preventDefault()
    const q = searchRef.current?.value?.trim()
    if (q) navigate(`/?s=${encodeURIComponent(q)}`)
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          {/* Logo + site title */}
          <div className={styles.logoGroup}>
            <Link to="/" className={styles.logoLink}>
              <img
                src="https://bestofthebay.net/wp-content/uploads/2026/03/BOTB.jpg"
                alt="BOTB"
                width={40} height={40}
                className={styles.logoImg}
              />
            </Link>
            <Link to="/" className={styles.siteTitle}>BOTB</Link>
          </div>

          {/* Desktop nav */}
          <nav className={styles.nav} aria-label="Navigation">
            <ul className={styles.navList}>
              {NAV.map(item => (
                <li
                  key={item.label}
                  className={styles.navItem + (item.children.length ? ' ' + styles.hasChildren : '')}
                  onMouseEnter={() => item.children.length && setOpenSubmenu(item.label)}
                  onMouseLeave={() => setOpenSubmenu(null)}
                >
                  <Link to={item.path} className={styles.navLink}>
                    {item.label}
                    {item.children.length > 0 && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" focusable="false" className={styles.chevron}>
                        <path d="M1.5 4L6 8L10.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </Link>
                  {item.children.length > 0 && (
                    <ul className={styles.submenu + (openSubmenu === item.label ? ' ' + styles.submenuOpen : '')}>
                      {item.children.map(child => (
                        <li key={child.label}>
                          <Link to={child.path} className={styles.submenuLink} onClick={() => setOpenSubmenu(null)}>
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Search */}
          <form role="search" onSubmit={handleSearch} className={styles.searchForm}>
            <input
              ref={searchRef}
              type="search"
              placeholder="Search products…"
              className={styles.searchInput}
            />
          </form>

          {/* Cart button */}
          <button
            onClick={() => setCartOpen(true)}
            className={styles.cartButton}
            aria-label={`Number of items in the cart: ${itemCount}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 32 32" width="24" height="24" aria-hidden="true">
              <circle cx="12.667" cy="24.667" r="2"/>
              <circle cx="23.333" cy="24.667" r="2"/>
              <path fillRule="evenodd" d="M9.285 10.036a1 1 0 0 1 .776-.37h15.272a1 1 0 0 1 .99 1.142l-1.333 9.333A1 1 0 0 1 24 21H12a1 1 0 0 1-.98-.797L9.083 10.87a1 1 0 0 1 .203-.834m2.005 1.63L12.814 19h10.319l1.047-7.333z" clipRule="evenodd"/>
              <path fillRule="evenodd" d="M5.667 6.667a1 1 0 0 1 1-1h2.666a1 1 0 0 1 .984.82l.727 4a1 1 0 1 1-1.967.359l-.578-3.18H6.667a1 1 0 0 1-1-1" clipRule="evenodd"/>
            </svg>
            {itemCount > 0 && <span className={styles.badge}>{itemCount}</span>}
          </button>

          {/* Mobile hamburger */}
          <button
            className={styles.hamburger}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7.5h16v1.5H4z"/><path d="M4 15h16v1.5H4z"/>
            </svg>
          </button>
        </div>

        {/* Mobile nav overlay */}
        {mobileOpen && (
          <div className={styles.mobileOverlay}>
            <div className={styles.mobileDialog}>
              <button
                className={styles.mobileClose}
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                  <path d="m13.06 12 6.47-6.47-1.06-1.06L12 10.94 5.53 4.47 4.47 5.53 10.94 12l-6.47 6.47 1.06 1.06L12 13.06l6.47 6.47 1.06-1.06z"/>
                </svg>
              </button>
              <ul className={styles.mobileNavList}>
                {NAV.map(item => (
                  <li key={item.label} className={styles.mobileNavItem}>
                    <Link to={item.path} className={styles.mobileNavLink} onClick={() => setMobileOpen(false)}>
                      {item.label}
                    </Link>
                    {item.children.length > 0 && (
                      <ul className={styles.mobileSubmenu}>
                        {item.children.map(child => (
                          <li key={child.label}>
                            <Link to={child.path} className={styles.mobileSubmenuLink} onClick={() => setMobileOpen(false)}>
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </header>

      <MiniCart isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}
