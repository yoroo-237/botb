const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token')
  const hadToken = !!token
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res = await fetch(`${BASE}/api${endpoint}`, { ...options, headers })

  if (res.status === 401 && hadToken) {
    const refreshToken = localStorage.getItem('refreshToken')
    try {
      const rr = await fetch(`${BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      const rd = await rr.json()
      if (rd.success) {
        localStorage.setItem('token', rd.data.accessToken)
        headers['Authorization'] = `Bearer ${rd.data.accessToken}`
        res = await fetch(`${BASE}/api${endpoint}`, { ...options, headers })
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return
      }
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
      return
    }
  }

  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data
}
