import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../utils/api.js'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [loadingAuth, setLoadingAuth] = useState(true)

  const loadUserData = useCallback(async () => {
    try {
      const [meData, walletData] = await Promise.allSettled([
        apiFetch('/auth/me'),
        apiFetch('/wallet/balance'),
      ])

      if (meData.status === 'fulfilled' && meData.value) {
        setUser(meData.value.user || meData.value)
      }
      if (walletData.status === 'fulfilled' && walletData.value) {
        const bal = walletData.value.balance ?? walletData.value
        setBalance(typeof bal === 'number' ? bal : 0)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      loadUserData().finally(() => setLoadingAuth(false))
    } else {
      setLoadingAuth(false)
    }
  }, [loadUserData])

  function login(token, refreshToken, userData) {
    localStorage.setItem('token', token)
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
    setUser(userData)
    if (userData?.balance != null) setBalance(userData.balance)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    setUser(null)
    setBalance(0)
    window.location.href = '/login'
  }

  return (
    <AppContext.Provider value={{ user, balance, loadingAuth, login, logout, loadUserData }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
