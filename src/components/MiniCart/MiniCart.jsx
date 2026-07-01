import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext.jsx'
import { getThumb, formatPrice } from '../../data/products.js'
import styles from './MiniCart.module.css'

export default function MiniCart({ isOpen, onClose }) {
  const { items, itemCount, subtotal, removeItem, updateQuantity } = useCart()

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <>
      {/* Overlay */}
      <div
        className={styles.overlay + (isOpen ? ' ' + styles.overlayOpen : '')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={styles.drawer + (isOpen ? ' ' + styles.drawerOpen : '')}
        aria-modal="true"
        role="dialog"
        aria-label="Cart"
      >
        {/* Close */}
        <div className={styles.closeWrap}>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path d="M13 11.8l6.1-6.3-1-1-6.1 6.2-6.1-6.2-1 1 6.1 6.3-6.5 6.7 1 1 6.5-6.6 6.5 6.6 1-1z"/>
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          /* Empty state */
          <div className={styles.empty}>
            <p><strong>Your cart is currently empty!</strong></p>
            <button onClick={onClose} className={'wp-element-button ' + styles.shopBtn}>
              Start shopping
            </button>
          </div>
        ) : (
          /* Filled state */
          <>
            <h2 className={styles.cartTitle}>
              Your cart <span className={styles.itemsCount}>(items: {itemCount})</span>
            </h2>

            <div className={styles.items}>
              <table className={styles.table}>
                <caption className="screen-reader-text"><h2>Products in cart</h2></caption>
                <thead>
                  <tr>
                    <th><span>Product</span></th>
                    <th><span>Details</span></th>
                    <th><span>Total</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className={styles.row}>
                      <td className={styles.imgCell} aria-hidden="true">
                        <Link to={`/product/${item.slug}`} tabIndex="-1" onClick={onClose}>
                          <img
                            src={getThumb(item)}
                            alt={item.name}
                            width={60} height={60}
                            className={styles.itemImg}
                            onError={e => { e.currentTarget.src = 'https://bestofthebay.net/wp-content/uploads/woocommerce-placeholder.webp' }}
                          />
                        </Link>
                      </td>
                      <td className={styles.detailCell}>
                        <Link to={`/product/${item.slug}`} className={styles.itemName} onClick={onClose}>
                          {item.name}
                        </Link>
                        <div className={styles.itemPrice}>{formatPrice(item.price)}</div>
                        <div className={styles.qty}>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className={styles.qtyBtn}
                            aria-label={"Reduce quantity of " + item.name}
                          >−</button>
                          <input
                            type="number"
                            className={styles.qtyInput}
                            value={item.quantity}
                            min={1}
                            onChange={e => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                            aria-label={"Quantity of " + item.name}
                          />
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className={styles.qtyBtn}
                            aria-label={"Increase quantity of " + item.name}
                          >＋</button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className={styles.removeBtn}
                            aria-label={"Remove " + item.name + " from cart"}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                              <path fillRule="evenodd" clipRule="evenodd" d="M12 5.5A2.25 2.25 0 0 0 9.878 7h4.244A2.251 2.251 0 0 0 12 5.5ZM12 4a3.751 3.751 0 0 0-3.675 3H5v1.5h1.27l.818 8.997a2.75 2.75 0 0 0 2.739 2.501h4.347a2.75 2.75 0 0 0 2.738-2.5L17.73 8.5H19V7h-3.325A3.751 3.751 0 0 0 12 4Zm4.224 4.5H7.776l.806 8.861a1.25 1.25 0 0 0 1.245 1.137h4.347a1.25 1.25 0 0 0 1.245-1.137l.805-8.861Z"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className={styles.totalCell}>
                        {formatPrice(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              <div className={styles.subtotalRow}>
                <span className={styles.subtotalLabel}>Subtotal</span>
                <span className={styles.subtotalValue}>{formatPrice(subtotal)}</span>
              </div>
              <p className={styles.shippingNote}>Shipping and discounts calculated at checkout.</p>
              <div className={styles.footerActions}>
                <Link to="/cart" onClick={onClose} className={'wp-element-button ' + styles.cartBtn} style={{background:'transparent',color:'var(--color-contrast)',border:'2px solid var(--color-contrast)'}}>
                  View my cart
                </Link>
                <Link to="/checkout" onClick={onClose} className={'wp-element-button ' + styles.checkoutBtn}>
                  Go to checkout
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
