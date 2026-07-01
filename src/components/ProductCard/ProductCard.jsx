import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext.jsx'
import { getThumb, formatPrice } from '../../data/products.js'
import styles from './ProductCard.module.css'

export default function ProductCard({ product }) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)

  function handleAddToCart(e) {
    e.preventDefault()
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <li className={styles.card}>
      {/* Image */}
      <div className={styles.imageWrap}>
        <Link to={`/product/${product.slug}`}>
          <img
            src={getThumb(product)}
            alt={product.name}
            width={300}
            height={300}
            className={styles.image}
            loading="lazy"
            decoding="async"
            onError={e => { e.currentTarget.src = 'https://bestofthebay.net/wp-content/uploads/woocommerce-placeholder.webp' }}
          />
        </Link>
      </div>

      {/* Title */}
      <h2 className={styles.title}>
        <Link to={`/product/${product.slug}`}>{product.name}</Link>
      </h2>

      {/* Price */}
      <div className={styles.price}>
        <span>{formatPrice(product.price)}</span>
      </div>

      {/* Add to cart */}
      <div className={styles.buttonWrap}>
        {added ? (
          <Link to="/cart" className={styles.viewCartBtn + ' wp-element-button'}>
            View cart
          </Link>
        ) : (
          <button
            className={styles.addBtn + ' wp-element-button'}
            onClick={handleAddToCart}
            aria-label={`Add to cart: "${product.name}"`}
          >
            Add to cart
          </button>
        )}
      </div>
    </li>
  )
}
