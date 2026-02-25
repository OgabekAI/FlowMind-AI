import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/axios'

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
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'personal',
    deadline: '',
  })

  useEffect(() => {
    fetchGoals()
  }, [])

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
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const deadlineDate = form.deadline ? new Date(form.deadline) : null
    if (deadlineDate && deadlineDate <= new Date()) {
      setDeadlineError('Deadline must be in the future.')
      return
    }

    const payload = {
      ...form,
      deadline: deadlineDate ? deadlineDate.toISOString() : null
    }

    try {
      if (selectedGoal) {
        const res = await api.put(`/api/goals/${selectedGoal.id}/`, payload)
        setGoals(goals.map(g => g.id === selectedGoal.id ? res.data : g))
      } else {
        const res = await api.post('/api/goals/', { ...payload, progress: 0 })
        setGoals([res.data, ...goals])
      }
      closeModal()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/goals/${id}/`)
      setGoals(goals.filter(g => g.id !== id))
      setDeleteId(null)
    } catch (err) {
      console.error(err)
    }
  }

  const handleProgressUpdate = async (id, progress) => {
    try {
      const res = await api.patch(`/api/goals/${id}/progress/`, { progress })
      setGoals(goals.map(g => g.id === id ? res.data : g))
    } catch (err) {
      console.error(err)
    }
  }

  const getAiFeedback = async (goalId) => {
    setLoadingFeedback(prev => ({ ...prev, [goalId]: true }))
    try {
      const res = await api.get(`/api/ai/goals/${goalId}/feedback/`)
      setAiFeedback(prev => ({ ...prev, [goalId]: res.data.feedback }))
    } catch {
      setAiFeedback(prev => ({ ...prev, [goalId]: 'Could not get feedback. Try again.' }))
    } finally {
      setLoadingFeedback(prev => ({ ...prev, [goalId]: false }))
    }
  }

  const openModal = (goal = null) => {
    if (goal) {
      setForm({
        title: goal.title,
        description: goal.description,
        category: goal.category,
        deadline: toDateTimeLocal(goal.deadline),
        progress: goal.progress,
      })
      setSelectedGoal(goal)
    } else {
      setForm({ title: '', description: '', category: 'personal', deadline: '' })
      setSelectedGoal(null)
    }
    setDeadlineError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedGoal(null)
    setDeadlineError('')
  }

  const categoryColors = {
    study: { bg: 'bg-[#7c6aff]/15', text: 'text-[#7c6aff]', bar: '#7c6aff' },
    fitness: { bg: 'bg-[#43e97b]/15', text: 'text-[#43e97b]', bar: '#43e97b' },
    personal: { bg: 'bg-[#f7b731]/15', text: 'text-[#f7b731]', bar: '#f7b731' },
    work: { bg: 'bg-[#45aaf2]/15', text: 'text-[#45aaf2]', bar: '#45aaf2' },
    health: { bg: 'bg-[#ff6b6b]/15', text: 'text-[#ff6b6b]', bar: '#ff6b6b' },
    finance: { bg: 'bg-[#26de81]/15', text: 'text-[#26de81]', bar: '#26de81' },
    other: { bg: 'bg-white/10', text: 'text-white/50', bar: '#aaa' },
  }

  const categoryIcons = {
    study: '📚', fitness: '💪', personal: '⭐',
    work: '💼', health: '❤️', finance: '💰', other: '🎯'
  }

  const statusColors = {
    active: 'bg-[#43e97b]/15 text-[#43e97b]',
    completed: 'bg-[#7c6aff]/15 text-[#7c6aff]',
    paused: 'bg-[#f7b731]/15 text-[#f7b731]',
    cancelled: 'bg-[#ff6b6b]/15 text-[#ff6b6b]',
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-[#7c6aff]">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6 md:p-8">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{t('goals.title')}</h1>
          <p className="text-[#6666aa] text-sm mt-1">{goals.length} {t('goals.title', 'goals').toLowerCase()} {t('common.total', 'total')}</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-[#7c6aff] hover:bg-[#6a58ee] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-[#7c6aff]/25"
        >
          + {t('goals.addGoal')}
        </button>
      </div>

      {/* GOALS GRID */}
      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="text-6xl mb-4">🎯</div>
          <p className="text-white font-bold text-xl mb-2">{t('goals.noGoals')}</p>
          <p className="text-[#6666aa] text-sm mb-6">{t('goals.noGoalsDesc')}</p>
          <button
            onClick={() => openModal()}
            className="bg-[#7c6aff] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#6a58ee] transition-all"
          >
            + {t('goals.addGoal')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {goals.map(goal => {
            const colors = categoryColors[goal.category] || categoryColors.other
            return (
              <div key={goal.id} className="bg-[#12121a] border border-white/10 rounded-2xl p-5 flex flex-col gap-4 hover:border-white/20 transition-all">

                {/* GOAL HEADER */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center text-xl flex-shrink-0`}>
                      {categoryIcons[goal.category]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-sm truncate">{goal.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-lg ${colors.bg} ${colors.text} font-medium`}>
                        {t(`goals.categories.${goal.category}`)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openModal(goal)}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#6666aa] hover:text-white transition-all text-xs"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setDeleteId(goal.id)}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-[#6666aa] hover:text-red-400 transition-all text-xs"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* DESCRIPTION */}
                {goal.description && (
                  <p className="text-[#6666aa] text-xs leading-relaxed line-clamp-2">{goal.description}</p>
                )}

                {/* PROGRESS */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-[#6666aa]">{t('goals.progress')}</span>
                    <span className="text-sm font-bold" style={{ color: colors.bar }}>{goal.progress}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${goal.progress}%`, background: colors.bar }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={goal.progress}
                    onChange={(e) => handleProgressUpdate(goal.id, parseInt(e.target.value))}
                    className="w-full h-1 accent-[#7c6aff] cursor-pointer"
                  />
                </div>

                {/* STATUS + DEADLINE */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-lg font-medium ${statusColors[goal.status]}`}>
                    {t(`goals.status.${goal.status}`)}
                  </span>
                  {goal.deadline && (
                    <span className={`text-xs ${goal.is_overdue ? 'text-red-400' : 'text-[#6666aa]'}`}>
                      {goal.is_overdue ? '⚠️ Overdue' : `📅 ${goal.days_remaining}d left`}
                    </span>
                  )}
                </div>

                {/* AI FEEDBACK */}
                {aiFeedback[goal.id] ? (
                  <div className="bg-[#7c6aff]/10 border border-[#7c6aff]/20 rounded-xl p-3">
                    <p className="text-[#9090c0] text-xs leading-relaxed">{aiFeedback[goal.id]}</p>
                  </div>
                ) : (
                  <button
                    onClick={() => getAiFeedback(goal.id)}
                    disabled={loadingFeedback[goal.id]}
                    className="w-full py-2 rounded-xl border border-white/10 text-[#6666aa] hover:border-[#7c6aff]/30 hover:text-[#7c6aff] text-xs font-medium transition-all disabled:opacity-50"
                  >
                    {loadingFeedback[goal.id] ? '🤖 Thinking...' : `🤖 ${t('goals.getAiFeedback')}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-white font-bold text-lg mb-5">
              {selectedGoal ? t('common.edit') : t('goals.addGoal')}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-[#6666aa] mb-1.5 block">{t('common.title', 'Title')}</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="e.g. Learn React in 30 days"
                  className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-[#444466] focus:outline-none focus:border-[#7c6aff] transition-colors"
                />
              </div>

              <div>
                <label className="text-sm text-[#6666aa] mb-1.5 block">{t('goals.description', 'Description')}</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="What does success look like?"
                  rows={3}
                  className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-[#444466] focus:outline-none focus:border-[#7c6aff] transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#6666aa] mb-1.5 block">{t('planner.category')}</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#7c6aff] transition-colors"
                  >
                    {Object.keys(categoryIcons).map(cat => (
                      <option key={cat} value={cat}>{t(`goals.categories.${cat}`)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-[#6666aa] mb-1.5 block">
                    {t('goals.deadline')} <span className="text-[#444466] text-xs">({t('auth.optional')})</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.deadline}
                    min={getMinDeadlineValue()}
                    onChange={e => {
                      setForm({ ...form, deadline: e.target.value })
                      if (deadlineError) setDeadlineError('')
                    }}
                    className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#7c6aff] transition-colors"
                  />
                  {deadlineError && (
                    <p className="text-red-400 text-xs mt-1">{deadlineError}</p>
                  )}
                </div>
              </div>

              {/* Only show progress when EDITING */}
              {selectedGoal && (
                <div>
                  <label className="text-sm text-[#6666aa] mb-1.5 block">
                    {t('goals.progress')}: {form.progress}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={form.progress}
                    onChange={e => setForm({ ...form, progress: parseInt(e.target.value) })}
                    className="w-full accent-[#7c6aff]"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-[#6666aa] hover:text-white text-sm font-medium transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#7c6aff] hover:bg-[#6a58ee] text-white text-sm font-semibold transition-all"
                >
                  {selectedGoal ? t('common.save') : t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🗑️</div>
              <h2 className="text-white font-bold text-lg mb-2">{t('delete.goalTitle')}</h2>
              <p className="text-[#6666aa] text-sm">
                {t('delete.goalDesc')}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-[#6666aa] hover:text-white text-sm font-medium transition-all"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-sm font-semibold transition-all"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
