import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../../context/AppContext.jsx'
import { apiFetch } from '../../utils/api.js'
import styles from './LoginPage.module.css'

function EyeIcon({ open }) {
  return open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function AgeGate({ onVerify }) {
  return (
    <div className={styles.ageOverlay}>
      <div className={styles.ageModal}>
        <div className={styles.ageLogo}>BOTB</div>
        <h2 className={styles.ageTitle}>Age Verification Required</h2>
        <p className={styles.ageMsg}>
          You must be 21 or older to enter this site. By clicking "I am 21 or older", you confirm that you meet the minimum age requirement.
        </p>
        <div className={styles.ageBtns}>
          <button className={styles.ageBtnPrimary} onClick={onVerify}>
            I am 21 or older
          </button>
          <button
            className={styles.ageBtnSecondary}
            onClick={() => { window.location.href = 'https://www.google.com' }}
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const { login, loadUserData } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [ageVerified, setAgeVerified] = useState(() => localStorage.getItem('age_verified') === 'true')
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  function handleVerify() {
    localStorage.setItem('age_verified', 'true')
    setAgeVerified(true)
  }

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setFieldErrors(fe => ({ ...fe, [e.target.name]: '' }))
    setError('')
  }

  function validate() {
    const errs = {}
    if (!form.username.trim()) errs.username = 'Username is required'
    if (!form.password || form.password.length < 6) errs.password = 'Password must be at least 6 characters'
    return errs
  }

  async function handleLogin(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setLoading(true)
    setError('')
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: form.username, password: form.password }),
      })
      login(data.accessToken, data.refreshToken, data.user)
      await loadUserData()
      const from = location.state?.from?.pathname || '/'
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setLoading(true)
    setError('')
    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: form.username, password: form.password }),
      })
      login(data.accessToken, data.refreshToken, data.user)
      await loadUserData()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      {!ageVerified && <AgeGate onVerify={handleVerify} />}
      <div className={styles.pageInner}>
        <div className={styles.card}>
          <div className={styles.logo}>BOTB</div>
          <p className={styles.subtitle}>Best of the Bay</p>

          <div className={styles.tabs}>
            <button
              className={styles.tab + (tab === 'login' ? ' ' + styles.active : '')}
              onClick={() => { setTab('login'); setError(''); setFieldErrors({}) }}
            >
              Sign In
            </button>
            <button
              className={styles.tab + (tab === 'register' ? ' ' + styles.active : '')}
              onClick={() => { setTab('register'); setError(''); setFieldErrors({}) }}
            >
              Register
            </button>
          </div>

          <form
            className={styles.form}
            onSubmit={tab === 'login' ? handleLogin : handleRegister}
            noValidate
          >
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                className={styles.input}
                value={form.username}
                onChange={handleChange}
                autoComplete="username"
                placeholder="Enter your username"
              />
              {fieldErrors.username && <span className={styles.fieldError}>{fieldErrors.username}</span>}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="password">Password</label>
              <div className={styles.inputWrap}>
                <input
                  id="password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  className={styles.input + ' ' + styles.hasToggle}
                  value={form.password}
                  onChange={handleChange}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPass(p => !p)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPass} />
                </button>
              </div>
              {fieldErrors.password && <span className={styles.fieldError}>{fieldErrors.password}</span>}
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className={styles.switch}>
            {tab === 'login' ? (
              <>Don&apos;t have an account?{' '}
                <span className={styles.switchLink} onClick={() => { setTab('register'); setError(''); setFieldErrors({}) }}>
                  Register
                </span>
              </>
            ) : (
              <>Already have an account?{' '}
                <span className={styles.switchLink} onClick={() => { setTab('login'); setError(''); setFieldErrors({}) }}>
                  Sign In
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
