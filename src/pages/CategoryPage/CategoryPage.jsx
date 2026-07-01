import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { products } from '../../data/products.js'
import { getCategorySlugs, getCategoryLabel } from '../../data/categories.js'
import ProductCard from '../../components/ProductCard/ProductCard.jsx'
import styles from './CategoryPage.module.css'

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
  return copy.sort((a, b) => a.name.localeCompare(b.name))
}

export default function CategoryPage() {
  const { slug, parent } = useParams()
  const activeSlug = slug || parent
  const [sort, setSort] = useState('menu_order')
  const [page, setPage] = useState(1)

  const slugs = useMemo(() => getCategorySlugs(activeSlug), [activeSlug])
  const label = getCategoryLabel(activeSlug)

  const filtered = useMemo(() => {
    const list = products.filter(p => slugs.includes(p.category))
    return sortProducts(list, sort)
  }, [slugs, sort])

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <main className="site-main">
      <div className="alignwide">
        <h1 className={styles.pageTitle}>{label}</h1>

        {filtered.length === 0 ? (
          <p className={styles.noProducts}>No products found in this category.</p>
        ) : (
          <>
            <div className={styles.controls}>
              <p className={styles.resultsCount} role="status">
                Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} results
              </p>
              <select
                value={sort}
                onChange={e => { setSort(e.target.value); setPage(1) }}
                className={styles.sortSelect}
                aria-label="Shop order"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <ul className={styles.grid}>
              {visible.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ul>

            {totalPages > 1 && (
              <nav className={styles.pagination}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className={styles.pageBtn}>← Previous</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setPage(n)} className={styles.pageBtn + (n === page ? ' ' + styles.pageBtnActive : '')}>{n}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={styles.pageBtn}>Next →</button>
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  )
}
