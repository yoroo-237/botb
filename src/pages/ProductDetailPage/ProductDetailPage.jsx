import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProduct, products as staticProducts, formatPrice } from '../../data/products.js'
import { apiFetch } from '../../utils/api.js'
import { useCart } from '../../context/CartContext.jsx'
import ProductCard from '../../components/ProductCard/ProductCard.jsx'
import styles from './ProductDetailPage.module.css'

const PLACEHOLDER = 'https://bestofthebay.net/wp-content/uploads/woocommerce-placeholder.webp'

function isVideoUrl(url = '') {
  return /\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/i.test(url)
}

// Normalize API images to a common format
function normalizeMedia(images = []) {
  return images.map(img => ({
    url:       img.url       || img.src || '',
    thumbnail: img.thumbnail || img.src || img.url || '',
    mediaType: img.mediaType || (isVideoUrl(img.url || img.src || '') ? 'video' : 'image'),
  }))
}

// Normalize static product images to the same format
function normalizeStaticMedia(images = []) {
  return images.map(img => ({
    url:       img.src       || img.thumbnail || '',
    thumbnail: img.thumbnail || img.src       || '',
    mediaType: 'image',
  }))
}

export default function ProductDetailPage() {
  const { slug }          = useParams()
  const { addItem }       = useCart()
  const [activeImg, setActiveImg] = useState(0)
  const [qty, setQty]     = useState(1)
  const [added, setAdded] = useState(false)

  // API product state
  const [apiProduct, setApiProduct] = useState(null)
  const [apiLoading, setApiLoading] = useState(true)

  // Static fallback
  const staticProduct = useMemo(() => getProduct(slug), [slug])

  // Try API first, fall back to static
  useEffect(() => {
    setApiLoading(true)
    setActiveImg(0)
    apiFetch(`/products/${slug}`)
      .then(data => setApiProduct(data))
      .catch(() => setApiProduct(null))
      .finally(() => setApiLoading(false))
  }, [slug])

  // Determine effective product data
  const product = useMemo(() => {
    if (apiProduct) {
      return {
        id:          apiProduct.id,
        name:        apiProduct.name,
        slug:        apiProduct.slug,
        price:       Number(apiProduct.price),
        description: apiProduct.description || '',
        category:    apiProduct.category?.slug || '',
        categoryName: apiProduct.category?.name || '',
        media:       normalizeMedia(apiProduct.images || []),
        fromApi:     true,
      }
    }
    if (staticProduct) {
      return {
        id:          staticProduct.id,
        name:        staticProduct.name,
        slug:        staticProduct.slug,
        price:       staticProduct.price,
        description: staticProduct.description || '',
        category:    staticProduct.category || '',
        categoryName: staticProduct.category || '',
        media:       normalizeStaticMedia(staticProduct.images || []),
        fromApi:     false,
      }
    }
    return null
  }, [apiProduct, staticProduct])

  // Related products from same category
  const related = useMemo(() => {
    if (!product) return []
    return staticProducts
      .filter(p => String(p.id) !== String(product.id) && p.category === product.category)
      .slice(0, 4)
  }, [product])

  if (apiLoading && !staticProduct) {
    return (
      <main className="site-main">
        <div className="alignwide">
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#888' }}>Loading…</div>
        </div>
      </main>
    )
  }

  if (!apiLoading && !product) {
    return (
      <main className="site-main">
        <div className="alignwide">
          <h1>Product not found</h1>
          <Link to="/">← Back to shop</Link>
        </div>
      </main>
    )
  }

  if (!product) return null

  const activeMedia = product.media[activeImg] || product.media[0]
  const isVideo     = activeMedia?.mediaType === 'video'

  function handleAddToCart() {
    const cartProduct = staticProduct || {
      id: product.id, name: product.name, slug: product.slug,
      price: product.price, images: [{ src: activeMedia?.url, thumbnail: activeMedia?.thumbnail }],
    }
    addItem(cartProduct, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <main className="site-main">
      <div className="alignwide">
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          {' / '}
          <Link to="/shop">Shop</Link>
          {product.category && (
            <>
              {' / '}
              <Link to={`/product-category/${product.category}`}>{product.categoryName || product.category}</Link>
            </>
          )}
          {' / '}
          <span>{product.name}</span>
        </nav>

        {/* Product layout */}
        <div className={styles.productLayout}>
          {/* Gallery */}
          <div className={styles.gallery}>
            <div className={styles.mainImgWrap}>
              {activeMedia ? (
                isVideo ? (
                  <video
                    key={activeMedia.url}
                    src={activeMedia.url}
                    poster={activeMedia.thumbnail || ''}
                    controls
                    className={styles.mainVideo}
                  />
                ) : (
                  <img
                    src={activeMedia.url || PLACEHOLDER}
                    alt={product.name}
                    className={styles.mainImg}
                    onError={e => { e.currentTarget.src = PLACEHOLDER }}
                  />
                )
              ) : (
                <img src={PLACEHOLDER} alt={product.name} className={styles.mainImg} />
              )}
            </div>

            {product.media.length > 1 && (
              <div className={styles.thumbRow}>
                {product.media.map((m, i) => {
                  const isThumbVideo = m.mediaType === 'video'
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={styles.thumbBtn + (i === activeImg ? ' ' + styles.thumbBtnActive : '')}
                      aria-label={`View ${isThumbVideo ? 'video' : 'image'} ${i + 1}`}
                    >
                      <div className={styles.thumbImgWrap}>
                        <img
                          src={m.thumbnail || (isThumbVideo ? '' : m.url)}
                          alt={`${product.name} ${i + 1}`}
                          width={80}
                          height={80}
                          className={styles.thumbImg}
                          onError={e => { e.currentTarget.src = PLACEHOLDER }}
                        />
                        {isThumbVideo && (
                          <div className={styles.thumbPlayOverlay}>
                            <svg width="10" height="12" viewBox="0 0 10 12" fill="white">
                              <polygon points="0,0 10,6 0,12" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className={styles.summary}>
            <h1 className={styles.productTitle}>{product.name}</h1>
            <p className={styles.price}>{formatPrice(product.price)}</p>

            {product.description && (
              product.description.startsWith('https://t.me') ? (
                <div className={styles.description}>
                  <a href={product.description} target="_blank" rel="noreferrer" className={styles.telegramLink}>
                    Order via Telegram
                  </a>
                </div>
              ) : (
                <div className={styles.description} style={{ color: '#555', fontSize: '15px', lineHeight: 1.6 }}>
                  {product.description}
                </div>
              )
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
              {product.category ? (
                <Link to={`/product-category/${product.category}`} className={styles.metaLink}>
                  {product.categoryName || product.category}
                </Link>
              ) : '—'}
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
