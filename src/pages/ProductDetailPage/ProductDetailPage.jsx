import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getProduct, products, formatPrice } from '../../data/products.js'
import { useCart } from '../../context/CartContext.jsx'
import ProductCard from '../../components/ProductCard/ProductCard.jsx'
import styles from './ProductDetailPage.module.css'

export default function ProductDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const product = getProduct(slug)
  const { addItem } = useCart()
  const [activeImg, setActiveImg] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const related = useMemo(() => {
    if (!product) return []
    return products
      .filter(p => p.id !== product.id && p.category === product.category)
      .slice(0, 4)
  }, [product])

  if (!product) {
    return (
      <main className="site-main">
        <div className="alignwide">
          <h1>Product not found</h1>
          <Link to="/">← Back to shop</Link>
        </div>
      </main>
    )
  }

  function handleAddToCart() {
    addItem(product, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const thumb = product.images?.[activeImg]
  const fullSrc  = thumb?.src || thumb?.thumbnail || ''
  const thumbSrc = thumb?.thumbnail || thumb?.src || ''

  return (
    <main className="site-main">
      <div className="alignwide">
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          {' / '}
          <Link to="/shop">Shop</Link>
          {' / '}
          <span>{product.name}</span>
        </nav>

        {/* Product layout */}
        <div className={styles.productLayout}>
          {/* Gallery */}
          <div className={styles.gallery}>
            <div className={styles.mainImgWrap}>
              <img
                src={fullSrc}
                alt={product.name}
                className={styles.mainImg}
                onError={e => { e.currentTarget.src = 'https://bestofthebay.net/wp-content/uploads/woocommerce-placeholder.webp' }}
              />
            </div>
            {product.images.length > 1 && (
              <div className={styles.thumbRow}>
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={styles.thumbBtn + (i === activeImg ? ' ' + styles.thumbBtnActive : '')}
                    aria-label={`View image ${i + 1}`}
                  >
                    <img
                      src={img.thumbnail || img.src}
                      alt={`${product.name} ${i + 1}`}
                      width={80} height={80}
                      className={styles.thumbImg}
                      onError={e => { e.currentTarget.src = 'https://bestofthebay.net/wp-content/uploads/woocommerce-placeholder.webp' }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className={styles.summary}>
            <h1 className={styles.productTitle}>{product.name}</h1>
            <p className={styles.price}>{formatPrice(product.price)}</p>

            {product.description && product.description.startsWith('https://t.me') && (
              <div className={styles.description}>
                <a href={product.description} target="_blank" rel="noreferrer" className={styles.telegramLink}>
                  Order via Telegram
                </a>
              </div>
            )}

            <div className={styles.addToCartWrap}>
              <div className={styles.qtySelector}>
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className={styles.qtyBtn}
                  disabled={qty <= 1}
                  aria-label="Reduce quantity"
                >−</button>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className={styles.qtyInput}
                  aria-label="Quantity"
                />
                <button
                  onClick={() => setQty(q => q + 1)}
                  className={styles.qtyBtn}
                  aria-label="Increase quantity"
                >＋</button>
              </div>

              <button
                onClick={handleAddToCart}
                className={'wp-element-button ' + styles.addBtn}
              >
                {added ? 'Added!' : 'Add to cart'}
              </button>
            </div>

            {added && (
              <p className={styles.addedMsg}>
                ✓ Added to cart.{' '}
                <Link to="/cart">View cart →</Link>
              </p>
            )}

            <div className={styles.meta}>
              <span className={styles.metaLabel}>Category:</span>{' '}
              <Link to={`/product-category/${product.category}`} className={styles.metaLink}>
                {product.category}
              </Link>
            </div>
          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div className={styles.related}>
            <h2 className={styles.relatedTitle}>Related products</h2>
            <ul className={styles.relatedGrid}>
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}
