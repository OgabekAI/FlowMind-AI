import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const navItems = [
    { path: '/', icon: '🏠', label: t('nav.dashboard') },
    { path: '/planner', icon: '📅', label: t('nav.planner') },
    { path: '/goals', icon: '🎯', label: t('nav.goals') },
    { path: '/pomodoro', icon: '🍅', label: t('nav.pomodoro') },
    { path: '/chat', icon: '💬', label: t('nav.aiChat') },
    { path: '/analytics', icon: '📊', label: t('nav.analytics') },
    { path: '/profile', icon: '👤', label: t('nav.profile') },
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside style={{
      width: 280, minHeight: '100vh', position: 'sticky', top: 0,
      background: 'rgba(8,8,15,0.95)', backdropFilter: 'blur(30px)',
      WebkitBackdropFilter: 'blur(30px)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column', padding: '28px 16px', flexShrink: 0, overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 8px', marginBottom: 36 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: '#7c6aff',
          boxShadow: '0 0 20px rgba(124,106,255,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0
        }}>🧠</div>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 19 }}>
          Flow<span style={{ color: '#7c6aff' }}>Mind</span>
        </span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '13px 16px', borderRadius: 14,
                textDecoration: 'none', fontSize: 14, fontWeight: 500,
                transition: 'all 0.2s',
                background: isActive ? 'rgba(124,106,255,0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(124,106,255,0.2)' : '1px solid transparent',
                color: isActive ? '#7c6aff' : 'rgba(255,255,255,0.45)',
                boxShadow: isActive ? 'inset 0 0 14px rgba(124,106,255,0.15)' : 'none',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff' } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' } }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 18,
        padding: '12px 8px 8px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,106,255,0.4), transparent)' }} />

        <div style={{ marginBottom: 10 }}>
          <LanguageSwitcher />
        </div>

        <Link
          to="/profile"
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 10px', borderRadius: 12, textDecoration: 'none',
            marginBottom: 2, transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c6aff, #ff6b6b)',
            boxShadow: '0 0 14px rgba(124,106,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 15, fontWeight: 700, flexShrink: 0,
          }}>
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.username}</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.occupation || 'FlowMind User'}</div>
          </div>
        </Link>

        <button
          onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 10px', borderRadius: 12, background: 'transparent',
            border: 'none', cursor: 'pointer', fontSize: 14,
            color: 'rgba(255,255,255,0.35)', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.1)'; e.currentTarget.style.color = '#ff6b6b' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
        >
          <span style={{ fontSize: 20 }}>🚪</span> {t('common.logout')}
        </button>
      </div>
    </aside>
  )
}