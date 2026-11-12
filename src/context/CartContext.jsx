import { createContext, useContext, useReducer, useEffect } from 'react'
import { apiFetch } from '../utils/api.js'

const CartContext = createContext(null)

// One cart line per product and variant: "12" or "12:34" (product 12, variant 34)
export const lineKey = i => i.lineKey || String(i.id)

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const key = action.product.optionId ? `${action.product.id}:${action.product.optionId}` : String(action.product.id)
      const existing = state.items.find(i => lineKey(i) === key)
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            lineKey(i) === key
              ? { ...i, quantity: Math.min(999, i.quantity + (action.quantity || 1)) }
              : i
          ),
        }
      }
      return {
        ...state,
        items: [...state.items, { ...action.product, lineKey: key, quantity: action.quantity || 1 }],
      }
    }
    // `id`: the line's key (lineKey), or the product id for a line without variant
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => lineKey(i) !== String(action.id)) }
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(i =>
          lineKey(i) === String(action.id) ? { ...i, quantity: Math.min(999, Math.max(1, action.quantity || 1)) } : i
        ),
      }
    case 'CLEAR_CART':
      return { ...state, items: [] }
    // Catalog refresh: live id/name/price by slug; null = no longer sold, dropped. A variant
    // line takes its variant's price, and is dropped if that variant is gone.
    case 'SYNC_ITEMS':
      return {
        ...state,
        items: state.items.flatMap(i => {
          if (!(i.slug in action.live)) return [i]
          const live = action.live[i.slug]
          if (!live) return []
          if (i.optionId) {
            const o = (live.options || []).find(x => x.id === i.optionId)
            return o ? [{ ...i, id: live.id, price: Number(o.price), name: `${live.name} (${o.label})` }] : []
          }
          if ((live.options || []).length) return [] // now sold by variant: choose one again
          return [{ ...i, id: live.id, name: live.name, price: live.price }]
        }),
      }
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem('botb_cart') || '{"items":[]}') }
    catch { return { items: [] } }
  })()

  const [state, dispatch] = useReducer(cartReducer, stored)

  useEffect(() => {
    localStorage.setItem('botb_cart', JSON.stringify(state))
  }, [state])

  // A stored cart can be stale (price changed, product removed, or an old static
  // id the API doesn't know): realign it with the live catalog. A network error
  // leaves the line untouched; the order endpoint reprices everything anyway.
  const syncCart = async () => {
    const slugs = [...new Set(state.items.map(i => i.slug).filter(Boolean))]
    if (!slugs.length) return
    const live = {}
    await Promise.all(slugs.map(slug => apiFetch(`/products/${slug}`)
      .then(p => { live[slug] = { id: p.id, name: p.name, price: Number(p.price), options: p.options || [] } })
      .catch(err => { if (err?.status === 404) live[slug] = null })))
    dispatch({ type: 'SYNC_ITEMS', live })
  }

  useEffect(() => { syncCart() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addItem = (product, quantity = 1) =>
    dispatch({ type: 'ADD_ITEM', product, quantity })
  const removeItem = (id) => dispatch({ type: 'REMOVE_ITEM', id })
  const updateQuantity = (id, quantity) =>
    dispatch({ type: 'UPDATE_QUANTITY', id, quantity })
  const clearCart = () => dispatch({ type: 'CLEAR_CART' })

  const itemCount = state.items.reduce((s, i) => s + i.quantity, 0)
  const subtotal = state.items.reduce((s, i) => s + i.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items: state.items, itemCount, subtotal, addItem, removeItem, updateQuantity, clearCart, syncCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
