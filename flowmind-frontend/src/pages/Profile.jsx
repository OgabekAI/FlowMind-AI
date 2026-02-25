import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function Profile() {
  const { t } = useTranslation()
  const { user, fetchProfile } = useAuth()

  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    occupation: user?.occupation || '',
    bio: user?.bio || '',
  })

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileSuccess('')
    setProfileError('')
    try {
      await api.patch('/api/auth/profile/', profileForm)
      await fetchProfile()
      setProfileSuccess('Profile updated successfully!')
    } catch (err) {
      const data = err.response?.data
      if (data) {
        const firstError = Object.values(data)[0]
        setProfileError(Array.isArray(firstError) ? firstError[0] : firstError)
      } else {
        setProfileError('Something went wrong. Try again.')
      }
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordSuccess('')
    setPasswordError('')

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New passwords do not match.')
      return
    }

    if (passwordForm.new_password.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }

    setSavingPassword(true)
    try {
      await api.post('/api/auth/change-password/', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      setPasswordSuccess('Password changed successfully!')
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
    } catch (err) {
      const data = err.response?.data
      if (data) {
        const firstError = Object.values(data)[0]
        setPasswordError(Array.isArray(firstError) ? firstError[0] : firstError)
      } else {
        setPasswordError('Something went wrong. Try again.')
      }
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6 md:p-8">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white">{t('profile.title')}</h1>
        <p className="text-[#6666aa] text-sm mt-1">{t('profile.subtitle')}</p>
      </div>

      <div className="max-w-2xl space-y-6">

        {/* AVATAR + INFO */}
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#7c6aff] to-[#ff6b6b] flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 shadow-lg shadow-[#7c6aff]/30">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-white font-bold text-xl">{user?.username}</h2>
            <p className="text-[#6666aa] text-sm">{user?.email}</p>
            <p className="text-[#6666aa] text-sm">{user?.occupation || t('profile.noOccupation')}</p>
          </div>
        </div>

        {/* EDIT PROFILE */}
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-5">✏️ {t('profile.editProfile')}</h2>

          {profileSuccess && (
            <div className="bg-[#43e97b]/10 border border-[#43e97b]/30 text-[#43e97b] rounded-xl px-4 py-3 mb-4 text-sm">
              ✅ {profileSuccess}
            </div>
          )}
          {profileError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-4 text-sm">
              ⚠️ {profileError}
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-[#6666aa] mb-1.5 block">{t('profile.username')}</label>
              <input
                type="text"
                value={profileForm.username}
                onChange={e => setProfileForm({ ...profileForm, username: e.target.value })}
                required
                className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-[#444466] focus:outline-none focus:border-[#7c6aff] transition-colors"
              />
            </div>

            <div>
              <label className="text-sm text-[#6666aa] mb-1.5 block">
                {t('profile.occupation')} <span className="text-[#444466] text-xs">({t('auth.optional')})</span>
              </label>
              <input
                type="text"
                value={profileForm.occupation}
                onChange={e => setProfileForm({ ...profileForm, occupation: e.target.value })}
                placeholder="Student, Developer, Designer..."
                className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-[#444466] focus:outline-none focus:border-[#7c6aff] transition-colors"
              />
            </div>

            <div>
              <label className="text-sm text-[#6666aa] mb-1.5 block">
                {t('profile.bio')} <span className="text-[#444466] text-xs">({t('auth.optional')})</span>
              </label>
              <textarea
                value={profileForm.bio}
                onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })}
                placeholder={t('profile.bioPlaceholder')}
                rows={3}
                className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-[#444466] focus:outline-none focus:border-[#7c6aff] transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full bg-[#7c6aff] hover:bg-[#6a58ee] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-[#7c6aff]/25"
            >
              {savingProfile ? t('profile.saving') : t('profile.saveProfile')}
            </button>
          </form>
        </div>

        {/* CHANGE PASSWORD */}
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-5">🔒 {t('profile.changePassword')}</h2>

          {passwordSuccess && (
            <div className="bg-[#43e97b]/10 border border-[#43e97b]/30 text-[#43e97b] rounded-xl px-4 py-3 mb-4 text-sm">
              ✅ {passwordSuccess}
            </div>
          )}
          {passwordError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-4 text-sm">
              ⚠️ {passwordError}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-[#6666aa] mb-1.5 block">{t('profile.currentPassword')}</label>
              <input
                type="password"
                value={passwordForm.current_password}
                onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                required
                placeholder="••••••••"
                className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-[#444466] focus:outline-none focus:border-[#7c6aff] transition-colors"
              />
            </div>

            <div>
              <label className="text-sm text-[#6666aa] mb-1.5 block">{t('profile.newPassword')}</label>
              <input
                type="password"
                value={passwordForm.new_password}
                onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                required
                placeholder="••••••••"
                className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-[#444466] focus:outline-none focus:border-[#7c6aff] transition-colors"
              />
            </div>

            <div>
              <label className="text-sm text-[#6666aa] mb-1.5 block">{t('profile.confirmNewPassword')}</label>
              <input
                type="password"
                value={passwordForm.confirm_password}
                onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                required
                placeholder="••••••••"
                className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-[#444466] focus:outline-none focus:border-[#7c6aff] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all"
            >
              {savingPassword ? t('profile.changing') : t('profile.changePasswordBtn')}
            </button>
          </form>
        </div>

        {/* APP INFO */}
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-4">📱 {t('profile.appInfo')}</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#6666aa] text-sm">{t('profile.version')}</span>
              <span className="text-white text-sm font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#6666aa] text-sm">{t('profile.aiModel')}</span>
              <span className="text-white text-sm font-medium">Llama 3.3 70B</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#6666aa] text-sm">{t('profile.languages')}</span>
              <span className="text-white text-sm font-medium">🇬🇧 EN · 🇺🇿 UZ · 🇷🇺 RU</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}