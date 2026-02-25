import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/axios'
import BlobBackground from '../components/BlobBackground'

const GLASS = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(30px)',
  WebkitBackdropFilter: 'blur(30px)',
  borderRadius: 24,
}
const GLASS_PURPLE = {
  background: 'rgba(124,106,255,0.06)',
  border: '1px solid rgba(124,106,255,0.15)',
  backdropFilter: 'blur(30px)',
  WebkitBackdropFilter: 'blur(30px)',
  borderRadius: 24,
  position: 'relative',
  overflow: 'hidden',
}
const INPUT_STYLE = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 14,
  padding: '12px 16px',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
}

export default function Goals() {
  const { t } = useTranslation()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [aiFeedback, setAiFeedback] = useState({})
  const [loadingFeedback, setLoadingFeedback] = useState({})
  const [deadlineError, setDeadlineError] = useState('')
  const [form, setForm] = useState({ title: '', description: '', category: 'personal', deadline: '' })

  useEffect(() => { fetchGoals() }, [])

  const toDateTimeLocal = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
    return localDate.toISOString().slice(0, 16)
  }

  const getMinDeadlineValue = () => {
    const now = new Date()
    now.setSeconds(0, 0)
    const localNow = new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
    return localNow.toISOString().slice(0, 16)
  }

  const fetchGoals = async () => {
    try {
      const res = await api.get('/api/goals/')
      setGoals(res.data.results || res.data)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const deadlineDate = form.deadline ? new Date(form.deadline) : null
    if (deadlineDate && deadlineDate <= new Date()) { setDeadlineError('Deadline must be in the future.'); return }
    const payload = { ...form, deadline: deadlineDate ? deadlineDate.toISOString() : null }
    try {
      if (selectedGoal) {
        const res = await api.put(`/api/goals/${selectedGoal.id}/`, payload)
        setGoals(goals.map(g => g.id === selectedGoal.id ? res.data : g))
      } else {
        const res = await api.post('/api/goals/', { ...payload, progress: 0 })
        setGoals([res.data, ...goals])
      }
      closeModal()
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (id) => {
    try { await api.delete(`/api/goals/${id}/`); setGoals(goals.filter(g => g.id !== id)); setDeleteId(null) }
    catch (err) { console.error(err) }
  }

  const handleProgressUpdate = async (id, progress) => {
    try {
      const res = await api.patch(`/api/goals/${id}/progress/`, { progress })
      setGoals(goals.map(g => g.id === id ? res.data : g))
    } catch (err) { console.error(err) }
  }

  const getAiFeedback = async (goalId) => {
    setLoadingFeedback(prev => ({ ...prev, [goalId]: true }))
    try {
      const res = await api.get(`/api/ai/goals/${goalId}/feedback/`)
      setAiFeedback(prev => ({ ...prev, [goalId]: res.data.feedback }))
    } catch { setAiFeedback(prev => ({ ...prev, [goalId]: 'Could not get feedback. Try again.' })) }
    finally { setLoadingFeedback(prev => ({ ...prev, [goalId]: false })) }
  }

  const openModal = (goal = null) => {
    if (goal) { setForm({ title: goal.title, description: goal.description, category: goal.category, deadline: toDateTimeLocal(goal.deadline), progress: goal.progress }); setSelectedGoal(goal) }
    else { setForm({ title: '', description: '', category: 'personal', deadline: '' }); setSelectedGoal(null) }
    setDeadlineError(''); setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setSelectedGoal(null); setDeadlineError('') }

  const cats = {
    study: { bg: 'rgba(124,106,255,0.15)', color: '#7c6aff', bar: '#7c6aff' },
    fitness: { bg: 'rgba(67,233,123,0.15)', color: '#43e97b', bar: '#43e97b' },
    personal: { bg: 'rgba(247,183,49,0.15)', color: '#f7b731', bar: '#f7b731' },
    work: { bg: 'rgba(69,170,242,0.15)', color: '#45aaf2', bar: '#45aaf2' },
    health: { bg: 'rgba(255,107,107,0.15)', color: '#ff6b6b', bar: '#ff6b6b' },
    finance: { bg: 'rgba(38,222,129,0.15)', color: '#26de81', bar: '#26de81' },
    other: { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', bar: '#aaa' },
  }
  const icons = { study: '📚', fitness: '💪', personal: '⭐', work: '💼', health: '❤️', finance: '💰', other: '🎯' }
  const statColors = {
    active: { bg: 'rgba(67,233,123,0.15)', color: '#43e97b' },
    completed: { bg: 'rgba(124,106,255,0.15)', color: '#7c6aff' },
    paused: { bg: 'rgba(247,183,49,0.15)', color: '#f7b731' },
    cancelled: { bg: 'rgba(255,107,107,0.15)', color: '#ff6b6b' },
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#06060d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <BlobBackground /><div style={{ color: '#7c6aff', position: 'relative', zIndex: 1 }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#06060d', padding: 32, position: 'relative' }}>
      <BlobBackground />
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{t('goals.title')}</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>{goals.length} {t('goals.title', 'goals').toLowerCase()} {t('common.total', 'total')}</p>
          </div>
          <button onClick={() => openModal()} style={{ background: '#7c6aff', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '10px 18px', borderRadius: 12, boxShadow: '0 4px 16px rgba(124,106,255,0.35)' }}
            onMouseEnter={e => e.currentTarget.style.background = '#6a58ee'}
            onMouseLeave={e => e.currentTarget.style.background = '#7c6aff'}
          >+ {t('goals.addGoal')}</button>
        </div>

        {/* GOALS GRID */}
        {goals.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0' }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🎯</div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>{t('goals.noGoals')}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24 }}>{t('goals.noGoalsDesc')}</p>
            <button onClick={() => openModal()} style={{ background: '#7c6aff', color: '#fff', border: 'none', cursor: 'pointer', padding: '12px 24px', borderRadius: 12, fontWeight: 700 }}>+ {t('goals.addGoal')}</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {goals.map(goal => {
              const c = cats[goal.category] || cats.other
              const sc = statColors[goal.status] || statColors.active
              return (
                <div key={goal.id} style={{ ...GLASS, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  {/* GOAL HEADER */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                        {icons[goal.category]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ color: '#fff', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.title}</h3>
                        <span style={{ background: c.bg, color: c.color, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6 }}>{t(`goals.categories.${goal.category}`)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => openModal(goal)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}>✏️</button>
                      <button onClick={() => setDeleteId(goal.id)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.15)'; e.currentTarget.style.color = '#ff6b6b' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}>🗑️</button>
                    </div>
                  </div>

                  {goal.description && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{goal.description}</p>}

                  {/* PROGRESS */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{t('goals.progress')}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: c.bar }}>{goal.progress}%</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ height: '100%', width: `${goal.progress}%`, background: c.bar, borderRadius: 999, boxShadow: `0 0 8px ${c.bar}80`, transition: 'width 0.7s ease' }} />
                    </div>
                    <input type="range" min="0" max="100" value={goal.progress}
                      onChange={e => handleProgressUpdate(goal.id, parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: '#7c6aff', cursor: 'pointer', height: 4 }} />
                  </div>

                  {/* STATUS + DEADLINE */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 8 }}>{t(`goals.status.${goal.status}`)}</span>
                    {goal.deadline && (
                      <span style={{ fontSize: 11, color: goal.is_overdue ? '#ff6b6b' : 'rgba(255,255,255,0.4)' }}>
                        {goal.is_overdue ? '⚠️ Overdue' : `📅 ${goal.days_remaining}d left`}
                      </span>
                    )}
                  </div>

                  {/* AI FEEDBACK */}
                  {aiFeedback[goal.id] ? (
                    <div style={{ ...GLASS_PURPLE, padding: 12 }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(124,106,255,0.5),transparent)' }} />
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 1.5, position: 'relative', zIndex: 1 }}>{aiFeedback[goal.id]}</p>
                    </div>
                  ) : (
                    <button onClick={() => getAiFeedback(goal.id)} disabled={loadingFeedback[goal.id]}
                      style={{ width: '100%', padding: '8px 0', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', opacity: loadingFeedback[goal.id] ? 0.5 : 1 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,106,255,0.3)'; e.currentTarget.style.color = '#7c6aff' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
                    >{loadingFeedback[goal.id] ? '🤖 Thinking...' : `🤖 ${t('goals.getAiFeedback')}`}</button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ADD/EDIT MODAL */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <div style={{ ...GLASS, padding: 24, width: '100%', maxWidth: 480 }}>
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 20 }}>{selectedGoal ? t('common.edit') : t('goals.addGoal')}</h2>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 6 }}>{t('common.title', 'Title')}</label>
                  <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Learn React in 30 days" style={INPUT_STYLE} />
                </div>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 6 }}>{t('goals.description', 'Description')}</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does success look like?" rows={3} style={{ ...INPUT_STYLE, resize: 'none' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 6 }}>{t('planner.category')}</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={INPUT_STYLE}>
                      {Object.keys(icons).map(cat => (<option key={cat} value={cat}>{t(`goals.categories.${cat}`)}</option>))}
                    </select>
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 6 }}>{t('goals.deadline')} <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>({t('auth.optional')})</span></label>
                    <input type="datetime-local" value={form.deadline} min={getMinDeadlineValue()} onChange={e => { setForm({ ...form, deadline: e.target.value }); if (deadlineError) setDeadlineError('') }} style={{ ...INPUT_STYLE, colorScheme: 'dark' }} />
                    {deadlineError && <p style={{ color: '#ff6b6b', fontSize: 11, marginTop: 4 }}>{deadlineError}</p>}
                  </div>
                </div>
                {selectedGoal && (
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 6 }}>{t('goals.progress')}: {form.progress}%</label>
                    <input type="range" min="0" max="100" value={form.progress} onChange={e => setForm({ ...form, progress: parseInt(e.target.value) })} style={{ width: '100%', accentColor: '#7c6aff' }} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={closeModal} style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{t('common.cancel')}</button>
                  <button type="submit" style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: '#7c6aff', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,106,255,0.35)' }}>{selectedGoal ? t('common.save') : t('common.add')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE MODAL */}
        {deleteId && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <div style={{ ...GLASS, padding: 24, width: '100%', maxWidth: 380, textAlign: 'center' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🗑️</div>
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{t('delete.goalTitle')}</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24 }}>{t('delete.goalDesc')}</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{t('common.cancel')}</button>
                <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.3)', color: '#ff6b6b', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{t('common.delete')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
