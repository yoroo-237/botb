import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext.jsx'
import { getThumb, formatPrice } from '../../data/products.js'
import styles from './CartPage.module.css'

export default function CartPage() {
  const { items, itemCount, subtotal, removeItem, updateQuantity } = useCart()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <main className="site-main">
        <div className="alignwide">
          <h1 className={styles.pageTitle}>Cart</h1>
          <div className={styles.emptyCart}>
            <h2 className={styles.emptyTitle}>Your cart is currently empty!</h2>
            <hr className={styles.emptyDivider} />
            <h2 className={styles.newInStore}>New in store</h2>
            <p>
              <Link to="/shop" className={'wp-element-button ' + styles.shopBtn}>
                Return to shop
              </Link>
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="site-main">
      <div className="alignwide">
        <h1 className={styles.pageTitle}>Cart</h1>

        <div className={styles.cartLayout}>
          {/* Line items */}
          <div className={styles.cartItems}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thProduct} colSpan={2}>Product</th>
                  <th className={styles.thPrice}>Price</th>
                  <th className={styles.thQty}>Quantity</th>
                  <th className={styles.thTotal}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className={styles.row}>
                    {/* Remove button */}
                    <td className={styles.removeTd}>
                      <button
                        onClick={() => removeItem(item.id)}
                        className={styles.removeBtn}
                        aria-label={`Remove ${item.name}`}
                      >×</button>
                    </td>

                    {/* Image */}
                    <td className={styles.imgTd}>
                      <Link to={`/product/${item.slug}`}>
                        <img
                          src={getThumb(item)}
                          alt={item.name}
                          width={80} height={80}
                          className={styles.itemImg}
                          onError={e => { e.currentTarget.src = 'https://bestofthebay.net/wp-content/uploads/woocommerce-placeholder.webp' }}
                        />
                      </Link>
                    </td>

                    {/* Name */}
                    <td className={styles.nameTd}>
                      <Link to={`/product/${item.slug}`} className={styles.itemName}>
                        {item.name}
                      </Link>
                    </td>

                    {/* Price */}
                    <td className={styles.priceTd}>
                      {formatPrice(item.price)}
                    </td>

                    {/* Quantity */}
                    <td className={styles.qtyTd}>
                      <div className={styles.qtySelector}>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className={styles.qtyBtn}
                          aria-label={`Reduce quantity of ${item.name}`}
                        >−</button>
                        <input
                          type="number"
                          className={styles.qtyInput}
                          value={item.quantity}
                          min={1}
                          onChange={e => updateQuantity(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                          aria-label={`Quantity of ${item.name}`}
                        />
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className={styles.qtyBtn}
                          aria-label={`Increase quantity of ${item.name}`}
                        >＋</button>
                      </div>
                    </td>

                    {/* Total */}
                    <td className={styles.totalTd}>
                      {formatPrice(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={styles.cartActions}>
              <Link to="/shop" className={styles.continueLink}>← Continue shopping</Link>
            </div>
          </div>

          {/* Order summary */}
          <aside className={styles.orderSummary}>
            <h2 className={styles.summaryTitle}>Cart totals</h2>

            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Subtotal</span>
              <span className={styles.summaryValue}>{formatPrice(subtotal)}</span>
            </div>

            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Shipping</span>
              <div className={styles.shippingInfo}>
                <span>Free shipping</span>
                <small className={styles.shippingNote}>Shipping to NY.</small>
              </div>
            </div>

            <div className={styles.summaryRow + ' ' + styles.totalRow}>
              <span className={styles.summaryLabel}>Total</span>
              <span className={styles.totalValue}>{formatPrice(subtotal)}</span>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className={'wp-element-button ' + styles.checkoutBtn}
            >
              Proceed to checkout
            </button>
          </aside>
        </div>
      </div>
    </main>
  )
}
