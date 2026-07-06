import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { apiFetch } from '../../utils/api.js'
import ProductCard from '../../components/ProductCard/ProductCard.jsx'
import styles from './HomePage.module.css'

const PER_PAGE = 16

const SORT_OPTIONS = [
  { value: 'menu_order', label: 'Default sorting' },
  { value: 'popularity', label: 'Sort by popularity' },
  { value: 'date',       label: 'Sort by latest' },
  { value: 'price',      label: 'Sort by price: low to high' },
  { value: 'price-desc', label: 'Sort by price: high to low' },
]

const SORT_MAP = {
  popularity:   'popularity',
  date:         'latest',
  price:        'price_asc',
  'price-desc': 'price_desc',
}

export default function HomePage() {
  const { search } = useLocation()
  const query = new URLSearchParams(search).get('s') || ''
  const [sort, setSort]           = useState('menu_order')
  const [page, setPage]           = useState(1)
  const [products, setProducts]   = useState([])
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 })
  const [loading, setLoading]     = useState(true)

  // Reset page when search query changes
  useEffect(() => { setPage(1) }, [query])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ page, limit: PER_PAGE })
    if (query)         params.set('search', query)
    if (SORT_MAP[sort]) params.set('sort', SORT_MAP[sort])
    apiFetch(`/products?${params}`)
      .then(data => {
        if (cancelled) return
        setProducts(data.products || [])
        setPagination(data.pagination || { total: 0, totalPages: 1 })
      })
      .catch(() => { if (!cancelled) setProducts([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [query, sort, page])

  function handleSort(e) {
    setSort(e.target.value)
    setPage(1)
  }

  const { total, totalPages } = pagination
  const from = (page - 1) * PER_PAGE + 1
  const to   = Math.min(page * PER_PAGE, total)

  return (
    <main className="site-main">
      <div className="alignwide">
        <h1 className={styles.pageTitle}>Shop</h1>

        <div className={styles.controls}>
          <p className={styles.resultsCount} role="status" aria-relevant="all">
            {loading
              ? 'Loading…'
              : query
                ? `Showing ${products.length} result${products.length !== 1 ? 's' : ''} for "${query}"`
                : `Showing ${from}–${to} of ${total} results`
            }
          </p>
          <form className={styles.sortForm}>
            <select
              value={sort}
              onChange={handleSort}
              className={styles.sortSelect}
              aria-label="Shop order"
              name="orderby"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </form>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>Loading…</p>
        ) : products.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>No products found.</p>
        ) : (
          <ul className={styles.grid}>
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <nav className={styles.pagination} aria-label="Product pages">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={styles.pageBtn}
              aria-label="Previous products"
            >← Previous</button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={styles.pageBtn + (n === page ? ' ' + styles.pageBtnActive : '')}
                aria-current={n === page ? 'page' : undefined}
              >{n}</button>
            ))}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={styles.pageBtn}
              aria-label="Next products"
            >Next →</button>
          </nav>
        )}
      </div>
    </main>
  )
}
