import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'
import BlobBackground from '../components/BlobBackground'

const TIMEZONES = [
  'UTC', 'Asia/Baku', 'Asia/Istanbul', 'Asia/Dubai', 'Asia/Karachi',
  'Asia/Kolkata', 'Asia/Tokyo', 'Asia/Shanghai', 'Europe/London',
  'Europe/Paris', 'Europe/Moscow', 'America/New_York', 'America/Chicago',
  'America/Denver', 'America/Los_Angeles', 'Australia/Sydney', 'Africa/Cairo',
]

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [form, setForm] = useState({
    email: '', username: '', password: '', password2: '', occupation: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.password2) { setError(t('auth.passwordMismatch')); return }
    setLoading(true)
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      const data = err.response?.data
      if (data) { const firstError = Object.values(data)[0]; setError(Array.isArray(firstError) ? firstError[0] : firstError) }
      else setError('Something went wrong. Please try again.')
    } finally { setLoading(false) }
  }

  const INPUT = {
    width: '100%', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
    padding: '12px 16px', color: '#fff', fontSize: 14,
    outline: 'none', fontFamily: 'inherit',
  }
  const focusIn = e => { e.target.style.borderColor = 'rgba(124,106,255,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,106,255,0.1)' }
  const focusOut = e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }

  return (
    <div style={{ minHeight: '100vh', background: '#06060d', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', position: 'relative' }}>
      <BlobBackground />

      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 2 }}>
        <LanguageSwitcher />
      </div>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 16, background: '#7c6aff',
            boxShadow: '0 0 24px rgba(124,106,255,0.5)', fontSize: 26, marginBottom: 16,
          }}>🧠</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0 }}>
            Flow<span style={{ color: '#7c6aff' }}>Mind</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 6 }}>{t('common.tagline')}</p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
          borderRadius: 24, padding: 32,
        }}>
          <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 24 }}>{t('auth.createAccount')}</h2>

          {error && (
            <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)', color: '#ff6b6b', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 6 }}>{t('auth.email')}</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required style={INPUT} onFocus={focusIn} onBlur={focusOut} />
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 6 }}>{t('auth.username')}</label>
              <input type="text" name="username" value={form.username} onChange={handleChange} placeholder="yourname" required style={INPUT} onFocus={focusIn} onBlur={focusOut} />
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 6 }}>
                {t('auth.occupation')} <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>({t('auth.optional')})</span>
              </label>
              <input type="text" name="occupation" value={form.occupation} onChange={handleChange} placeholder={t('auth.occupationPlaceholder')} style={INPUT} onFocus={focusIn} onBlur={focusOut} />
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 6 }}>{t('auth.password')}</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••" required style={INPUT} onFocus={focusIn} onBlur={focusOut} />
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 6 }}>{t('auth.confirmPassword')}</label>
              <input type="password" name="password2" value={form.password2} onChange={handleChange} placeholder="••••••••" required style={INPUT} onFocus={focusIn} onBlur={focusOut} />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', background: '#7c6aff', color: '#fff',
                border: 'none', borderRadius: 12, padding: '13px 0',
                fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 4,
                boxShadow: '0 4px 16px rgba(124,106,255,0.35)',
                opacity: loading ? 0.5 : 1, transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#6a58ee' }}
              onMouseLeave={e => e.currentTarget.style.background = '#7c6aff'}
            >
              {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 24, marginBottom: 0 }}>
            {t('auth.haveAccount')}{' '}
            <Link to="/login" style={{ color: '#7c6aff', fontWeight: 600, textDecoration: 'none' }}>{t('auth.signInLink')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}