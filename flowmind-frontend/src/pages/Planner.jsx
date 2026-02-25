import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/axios'

export default function Planner() {
  const { t } = useTranslation()
  const [plan, setPlan] = useState(null)
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [aiFeedback, setAiFeedback] = useState('')
  const [loadingAi, setLoadingAi] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'personal',
    priority: 'medium',
    start_time: '',
    end_time: '',
    goal: '',
  })

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      const [planRes, goalsRes] = await Promise.all([
        api.get('/api/planner/today/'),
        api.get('/api/goals/?status=active'),
      ])
      setPlan(planRes.data)
      setGoals(goalsRes.data.results || goalsRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const calcDurationText = (start, end) => {
    if (!start || !end) return null
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const mins = (eh * 60 + em) - (sh * 60 + sm)
    if (mins <= 0) return null
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}min` : `${m}min`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate end time is after start time
    if (form.start_time && form.end_time) {
      const [sh, sm] = form.start_time.split(':').map(Number)
      const [eh, em] = form.end_time.split(':').map(Number)
      if ((eh * 60 + em) <= (sh * 60 + sm)) {
        alert('End time must be after start time!')
        return
      }
    }

    try {
      const payload = {
        ...form,
        goal: form.goal || null,
      }
      if (editTask) {
        const res = await api.put(`/api/planner/tasks/${editTask.id}/`, payload)
        setPlan(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => t.id === editTask.id ? res.data : t)
        }))
      } else {
        const res = await api.post('/api/planner/today/tasks/', payload)
        setPlan(prev => ({
          ...prev,
          tasks: [...(prev.tasks || []), res.data]
        }))
      }
      closeModal()
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggle = async (taskId) => {
    try {
      const res = await api.patch(`/api/planner/tasks/${taskId}/toggle/`)
      setPlan(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? res.data : t),
      }))
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/planner/tasks/${id}/`)
      setPlan(prev => ({
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== id)
      }))
      setDeleteId(null)
    } catch (err) {
      console.error(err)
    }
  }

  const getAiFeedback = async () => {
    setLoadingAi(true)
    try {
      const res = await api.get('/api/ai/plan/feedback/')
      setAiFeedback(res.data.feedback)
    } catch {
      setAiFeedback('Add some tasks first to get AI feedback!')
    } finally {
      setLoadingAi(false)
    }
  }

  const calculateCompletion = (tasks) => {
    if (!tasks?.length) return 0
    return Math.round((tasks.filter(t => t.is_done).length / tasks.length) * 100)
  }

  const openModal = (task = null) => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description || '',
        category: task.category,
        priority: task.priority,
        start_time: task.start_time || '',
        end_time: task.end_time || '',
        goal: task.goal || '',
      })
      setEditTask(task)
    } else {
      setForm({
        title: '',
        description: '',
        category: 'personal',
        priority: 'medium',
        start_time: '',
        end_time: '',
        goal: '',
      })
      setEditTask(null)
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditTask(null)
  }

  const categoryColors = {
    study: { bg: 'bg-[#7c6aff]/15', text: 'text-[#7c6aff]', dot: '#7c6aff' },
    fitness: { bg: 'bg-[#43e97b]/15', text: 'text-[#43e97b]', dot: '#43e97b' },
    personal: { bg: 'bg-[#f7b731]/15', text: 'text-[#f7b731]', dot: '#f7b731' },
    work: { bg: 'bg-[#45aaf2]/15', text: 'text-[#45aaf2]', dot: '#45aaf2' },
    health: { bg: 'bg-[#ff6b6b]/15', text: 'text-[#ff6b6b]', dot: '#ff6b6b' },
    finance: { bg: 'bg-[#26de81]/15', text: 'text-[#26de81]', dot: '#26de81' },
    break: { bg: 'bg-white/5', text: 'text-white/40', dot: '#666' },
    other: { bg: 'bg-white/5', text: 'text-white/40', dot: '#666' },
  }

  const priorityConfig = {
    high: { label: 'High', color: 'text-red-400', bg: 'bg-red-500/10' },
    medium: { label: 'Medium', color: 'text-[#f7b731]', bg: 'bg-[#f7b731]/10' },
    low: { label: 'Low', color: 'text-[#43e97b]', bg: 'bg-[#43e97b]/10' },
  }

  const doneTasks = plan?.tasks?.filter(t => t.is_done).length || 0
  const totalTasks = plan?.tasks?.length || 0
  const completion = calculateCompletion(plan?.tasks)

  const sortedTasks = plan?.tasks?.slice().sort((a, b) => {
    if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time)
    if (a.start_time) return -1
    if (b.start_time) return 1
    return 0
  }) || []

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const durationText = calcDurationText(form.start_time, form.end_time)

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-[#7c6aff]">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6 md:p-8">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{t('planner.title')}</h1>
          <p className="text-[#6666aa] text-sm mt-1">{today}</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-[#7c6aff] hover:bg-[#6a58ee] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-[#7c6aff]/25"
        >
          + {t('planner.addTask')}
        </button>
      </div>

      {/* PROGRESS BAR */}
      <div className="bg-[#12121a] border border-white/10 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-white font-semibold">{doneTasks} / {totalTasks} tasks done</span>
            <span className="text-[#6666aa] text-sm ml-2">today</span>
          </div>
          <span className="text-[#7c6aff] font-bold text-lg">{completion}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#7c6aff] to-[#a855f7] rounded-full transition-all duration-700"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      {/* AI FEEDBACK */}
      {aiFeedback ? (
        <div className="bg-[#7c6aff]/10 border border-[#7c6aff]/20 rounded-2xl p-5 mb-6 flex gap-4">
          <div className="text-2xl">🤖</div>
          <div className="flex-1">
            <p className="text-[#9090c0] text-sm leading-relaxed">{aiFeedback}</p>
            <button
              onClick={() => setAiFeedback('')}
              className="text-[#6666aa] text-xs mt-2 hover:text-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={getAiFeedback}
          disabled={loadingAi || totalTasks === 0}
          className="w-full bg-[#12121a] border border-white/10 hover:border-[#7c6aff]/30 rounded-2xl p-4 mb-6 flex items-center justify-center gap-2 text-[#6666aa] hover:text-[#7c6aff] text-sm font-medium transition-all disabled:opacity-40"
        >
          {loadingAi ? '🤖 Thinking...' : `🤖 ${t('planner.getAiFeedback')}`}
        </button>
      )}

      {/* TASKS LIST */}
      {totalTasks === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-white font-bold text-xl mb-2">{t('planner.noTasks')}</p>
          <p className="text-[#6666aa] text-sm mb-6">Plan your day by adding tasks below</p>
          <button
            onClick={() => openModal()}
            className="bg-[#7c6aff] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#6a58ee] transition-all"
          >
            + {t('planner.addTask')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTasks.map(task => {
            const colors = categoryColors[task.category] || categoryColors.other
            const priority = priorityConfig[task.priority]
            const taskDuration = calcDurationText(task.start_time, task.end_time)
            return (
              <div
                key={task.id}
                className={`bg-[#12121a] border rounded-2xl p-4 flex items-center gap-4 transition-all group ${
                  task.is_done ? 'border-white/5 opacity-60' : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* CHECKBOX */}
                <button
                  onClick={() => handleToggle(task.id)}
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    task.is_done
                      ? 'bg-[#43e97b] border-[#43e97b]'
                      : 'border-white/20 hover:border-[#7c6aff]'
                  }`}
                >
                  {task.is_done && <span className="text-white text-xs font-bold">✓</span>}
                </button>

                {/* COLOR DOT */}
                <div
                  className="w-2 h-10 rounded-full flex-shrink-0"
                  style={{ background: colors.dot }}
                />

                {/* TASK INFO */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${task.is_done ? 'line-through text-[#6666aa]' : 'text-white'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {task.start_time && task.end_time ? (
                      <span className="text-[#6666aa] text-xs">
                        🕐 {task.start_time.slice(0, 5)} → {task.end_time.slice(0, 5)}
                      </span>
                    ) : task.start_time ? (
                      <span className="text-[#6666aa] text-xs">
                        🕐 {task.start_time.slice(0, 5)}
                      </span>
                    ) : null}
                    {taskDuration && (
                      <span className="text-[#6666aa] text-xs">⏱ {taskDuration}</span>
                    )}
                    {task.goal_title && (
                      <span className="text-[#7c6aff] text-xs">🎯 {task.goal_title}</span>
                    )}
                  </div>
                </div>

                {/* BADGES */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${colors.bg} ${colors.text}`}>
                    {t(`goals.categories.${task.category}`) || task.category}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${priority.bg} ${priority.color}`}>
                    {priority.label}
                  </span>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => openModal(task)}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#6666aa] hover:text-white transition-all text-xs"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setDeleteId(task.id)}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-[#6666aa] hover:text-red-400 transition-all text-xs"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-white font-bold text-lg mb-5">
              {editTask ? t('common.edit') : t('planner.addTask')}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* TITLE */}
              <div>
                <label className="text-sm text-[#6666aa] mb-1.5 block">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="e.g. University lecture"
                  className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-[#444466] focus:outline-none focus:border-[#7c6aff] transition-colors"
                />
              </div>

              {/* CATEGORY + PRIORITY */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#6666aa] mb-1.5 block">{t('planner.category')}</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#7c6aff] transition-colors"
                  >
                    {['study', 'fitness', 'personal', 'work', 'health', 'finance', 'break', 'other'].map(cat => (
                      <option key={cat} value={cat}>{t(`goals.categories.${cat}`) || cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-[#6666aa] mb-1.5 block">{t('planner.priority')}</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#7c6aff] transition-colors"
                  >
                    <option value="high">{t('planner.priorities.high')}</option>
                    <option value="medium">{t('planner.priorities.medium')}</option>
                    <option value="low">{t('planner.priorities.low')}</option>
                  </select>
                </div>
              </div>

              {/* START + END TIME */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#6666aa] mb-1.5 block">
                    Start Time <span className="text-[#444466] text-xs">({t('auth.optional')})</span>
                  </label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={e => setForm({ ...form, start_time: e.target.value })}
                    className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#7c6aff] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#6666aa] mb-1.5 block">
                    End Time <span className="text-[#444466] text-xs">({t('auth.optional')})</span>
                  </label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={e => setForm({ ...form, end_time: e.target.value })}
                    className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#7c6aff] transition-colors"
                  />
                </div>
              </div>

              {/* DURATION PREVIEW */}
              {durationText ? (
                <div className="bg-[#7c6aff]/10 border border-[#7c6aff]/20 rounded-xl px-4 py-2.5 text-sm text-[#7c6aff]">
                  ⏱ Duration: {durationText}
                </div>
              ) : form.start_time && form.end_time ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-red-400">
                  ⚠️ End time must be after start time
                </div>
              ) : null}

              {/* LINK TO GOAL */}
              {goals.length > 0 && (
                <div>
                  <label className="text-sm text-[#6666aa] mb-1.5 block">
                    Link to Goal <span className="text-[#444466] text-xs">({t('auth.optional')})</span>
                  </label>
                  <select
                    value={form.goal}
                    onChange={e => setForm({ ...form, goal: e.target.value })}
                    className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#7c6aff] transition-colors"
                  >
                    <option value="">No goal</option>
                    {goals.map(goal => (
                      <option key={goal.id} value={goal.id}>{goal.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* BUTTONS */}
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
                  {editTask ? t('common.save') : t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🗑️</div>
              <h2 className="text-white font-bold text-lg mb-2">Delete Task?</h2>
              <p className="text-[#6666aa] text-sm">This will permanently delete this task.</p>
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