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
  { path: '/profile', icon: '👤', label: t('Profile') },
]

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="w-60 h-screen sticky top-0 bg-[#12121a] border-r border-white/10 flex flex-col py-6 px-3 flex-shrink-0 overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 mb-8">
        <div className="w-9 h-9 bg-[#7c6aff] rounded-xl flex items-center justify-center text-lg shadow-lg shadow-[#7c6aff]/30">
          🧠
        </div>
        <span className="text-white font-bold text-lg">
          Flow<span className="text-[#7c6aff]">Mind</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[#7c6aff]/15 text-[#7c6aff]'
                  : 'text-[#6666aa] hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Language Switcher */}
      <div className="px-1 mb-4">
        <LanguageSwitcher />
      </div>

      {/* User */}
      <div className="border-t border-white/10 pt-4">
        <Link
          to="/profile"
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-all group mb-1"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7c6aff] to-[#ff6b6b] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-white text-sm font-medium truncate group-hover:text-[#7c6aff] transition-colors">{user?.username}</div>
            <div className="text-[#6666aa] text-xs truncate">{user?.occupation || 'FlowMind User'}</div>
          </div>
          <span className="text-[#6666aa] group-hover:text-[#7c6aff] text-xs transition-colors">⚙️</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#6666aa] hover:bg-white/5 hover:text-red-400 transition-all duration-200"
        >
          <span>🚪</span> {t('common.logout')}
        </button>
      </div>
    </aside>
  )
}