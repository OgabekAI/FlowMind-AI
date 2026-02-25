import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import BlobBackground from '../components/BlobBackground'

const GLASS = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', borderRadius: 24 }
const INPUT_STYLE = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 16px', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit' }

export default function Profile() {
  const { t } = useTranslation()
  const { user, fetchProfile } = useAuth()

  const [profileForm, setProfileForm] = useState({ username: user?.username || '', occupation: user?.occupation || '', bio: user?.bio || '' })
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setSavingProfile(true); setProfileSuccess(''); setProfileError('')
    try {
      await api.patch('/api/auth/profile/', profileForm)
      await fetchProfile()
      setProfileSuccess('Profile updated successfully!')
    } catch (err) {
      const data = err.response?.data
      if (data) { const firstError = Object.values(data)[0]; setProfileError(Array.isArray(firstError) ? firstError[0] : firstError) }
      else setProfileError('Something went wrong. Try again.')
    } finally { setSavingProfile(false) }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordSuccess(''); setPasswordError('')
    if (passwordForm.new_password !== passwordForm.confirm_password) { setPasswordError('New passwords do not match.'); return }
    if (passwordForm.new_password.length < 8) { setPasswordError('Password must be at least 8 characters.'); return }
    setSavingPassword(true)
    try {
      await api.post('/api/auth/change-password/', { current_password: passwordForm.current_password, new_password: passwordForm.new_password })
      setPasswordSuccess('Password changed successfully!')
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      const data = err.response?.data
      if (data) { const firstError = Object.values(data)[0]; setPasswordError(Array.isArray(firstError) ? firstError[0] : firstError) }
      else setPasswordError('Something went wrong. Try again.')
    } finally { setSavingPassword(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#06060d', padding: '40px 32px', position: 'relative' }}>
      <BlobBackground />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 780, margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>{t('profile.title')}</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 6 }}>{t('profile.subtitle')}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* AVATAR CARD */}
          <div style={{ ...GLASS, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{
              width: 96, height: 96, borderRadius: 24,
              background: 'linear-gradient(135deg, #7c6aff, #ff6b6b)',
              boxShadow: '0 0 40px rgba(124,106,255,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 38, fontWeight: 700, flexShrink: 0,
            }}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 24, marginBottom: 6 }}>{user?.username}</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{user?.email}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 2 }}>{user?.occupation || t('profile.noOccupation')}</p>
            </div>
          </div>


          {/* EDIT PROFILE */}
          <div style={{ ...GLASS, padding: 24 }}>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>✏️ {t('profile.editProfile')}</h2>

            {profileSuccess && (
              <div style={{ background: 'rgba(67,233,123,0.1)', border: '1px solid rgba(67,233,123,0.25)', color: '#43e97b', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>✅ {profileSuccess}</div>
            )}
            {profileError && (
              <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)', color: '#ff6b6b', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>⚠️ {profileError}</div>
            )}

            <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 6 }}>{t('profile.username')}</label>
                <input type="text" value={profileForm.username} onChange={e => setProfileForm({ ...profileForm, username: e.target.value })} required style={INPUT_STYLE}
                  onFocus={e => { e.target.style.borderColor = 'rgba(124,106,255,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,106,255,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }} />
              </div>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 6 }}>{t('profile.occupation')} <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>({t('auth.optional')})</span></label>
                <input type="text" value={profileForm.occupation} onChange={e => setProfileForm({ ...profileForm, occupation: e.target.value })} placeholder="Student, Developer, Designer..." style={INPUT_STYLE}
                  onFocus={e => { e.target.style.borderColor = 'rgba(124,106,255,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,106,255,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }} />
              </div>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 6 }}>{t('profile.bio')} <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>({t('auth.optional')})</span></label>
                <textarea value={profileForm.bio} onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })} placeholder={t('profile.bioPlaceholder')} rows={3} style={{ ...INPUT_STYLE, resize: 'none' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(124,106,255,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,106,255,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }} />
              </div>
              <button type="submit" disabled={savingProfile} style={{ width: '100%', padding: '12px 0', borderRadius: 12, background: '#7c6aff', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,106,255,0.35)', opacity: savingProfile ? 0.5 : 1 }}
                onMouseEnter={e => { if (!savingProfile) e.currentTarget.style.background = '#6a58ee' }}
                onMouseLeave={e => e.currentTarget.style.background = '#7c6aff'}
              >{savingProfile ? t('profile.saving') : t('profile.saveProfile')}</button>
            </form>
          </div>

          {/* CHANGE PASSWORD */}
          <div style={{ ...GLASS, padding: 24 }}>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>🔒 {t('profile.changePassword')}</h2>

            {passwordSuccess && (
              <div style={{ background: 'rgba(67,233,123,0.1)', border: '1px solid rgba(67,233,123,0.25)', color: '#43e97b', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>✅ {passwordSuccess}</div>
            )}
            {passwordError && (
              <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)', color: '#ff6b6b', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>⚠️ {passwordError}</div>
            )}

            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: t('profile.currentPassword'), field: 'current_password' },
                { label: t('profile.newPassword'), field: 'new_password' },
                { label: t('profile.confirmNewPassword'), field: 'confirm_password' },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 6 }}>{label}</label>
                  <input type="password" value={passwordForm[field]} onChange={e => setPasswordForm({ ...passwordForm, [field]: e.target.value })} required placeholder="••••••••" style={INPUT_STYLE}
                    onFocus={e => { e.target.style.borderColor = 'rgba(124,106,255,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,106,255,0.1)' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }} />
                </div>
              ))}
              <button type="submit" disabled={savingPassword} style={{ width: '100%', padding: '12px 0', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: savingPassword ? 0.5 : 1 }}
                onMouseEnter={e => { if (!savingPassword) e.currentTarget.style.background = 'rgba(255,255,255,0.09)' }}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >{savingPassword ? t('profile.changing') : t('profile.changePasswordBtn')}</button>
            </form>
          </div>

        </div>
      </div>
    </div>
  )
}