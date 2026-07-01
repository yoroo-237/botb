import { useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { products } from '../../data/products.js'
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

function sortProducts(list, order) {
  const copy = [...list]
  if (order === 'price')      return copy.sort((a, b) => a.price - b.price)
  if (order === 'price-desc') return copy.sort((a, b) => b.price - a.price)
  if (order === 'date')       return copy.sort((a, b) => b.id - a.id)
  return copy.sort((a, b) => a.name.localeCompare(b.name)) // menu_order / default
}

export default function HomePage() {
  const { search } = useLocation()
  const query = new URLSearchParams(search).get('s') || ''
  const [sort, setSort] = useState('menu_order')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let list = products
    if (query) list = list.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    return sortProducts(list, sort)
  }, [query, sort])

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function handleSort(e) {
    setSort(e.target.value)
    setPage(1)
  }

  return (
    <main className="site-main">
      <div className="alignwide">
        <h1 className={styles.pageTitle}>Shop</h1>

        {/* Controls */}
        <div className={styles.controls}>
          <p className={styles.resultsCount} role="status" aria-relevant="all">
            {query
              ? `Showing ${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${query}"`
              : `Showing ${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, filtered.length)} of ${filtered.length} results`
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

        {/* Product grid */}
        <ul className={styles.grid}>
          {visible.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ul>

        {/* Pagination */}
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
              >
                {n}
              </button>
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
