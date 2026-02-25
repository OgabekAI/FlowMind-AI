import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import api from '../api/axios'

// ─── helpers ─────────────────────────────────────────────────────────────────

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
  high: { labelKey: 'planner.priorities.high', color: 'text-red-400', bg: 'bg-red-500/10' },
  medium: { labelKey: 'planner.priorities.medium', color: 'text-[#f7b731]', bg: 'bg-[#f7b731]/10' },
  low: { labelKey: 'planner.priorities.low', color: 'text-[#43e97b]', bg: 'bg-[#43e97b]/10' },
}

function calcDurationText(start, end) {
  if (!start || !end) return null
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

function toISO(date) {
  return date.toISOString().slice(0, 10)
}

function getWeekDays() {
  const today = new Date()
  const dow = today.getDay()                  // 0=Sun
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7))  // rewind to Mon
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

// ─── shared empty form ────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: '', description: '', category: 'personal',
  priority: 'medium', start_time: '', end_time: '', goal: '',
}

// ══════════════════════════════════════════════════════════════════════════════
export default function Planner() {
  const { t } = useTranslation()

  // ── tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('today')   // 'today' | 'week'

  // ── today state ───────────────────────────────────────────────────────────
  const [plan, setPlan] = useState(null)
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [modalDate, setModalDate] = useState(null)   // for weekly add
  const [aiFeedback, setAiFeedback] = useState('')
  const [loadingAi, setLoadingAi] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  // ── weekly state ──────────────────────────────────────────────────────────
  const [weekPlans, setWeekPlans] = useState({})     // { 'YYYY-MM-DD': planObj }
  const [weekLoading, setWeekLoading] = useState(false)
  const [expandedDay, setExpandedDay] = useState(null)   // ISO string

  // ── fetch today on mount ───────────────────────────────────────────────────
  useEffect(() => { fetchAll() }, [])

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

  // ── fetch week ─────────────────────────────────────────────────────────────
  const fetchWeek = useCallback(async () => {
    setWeekLoading(true)
    try {
      const days = getWeekDays()
      const results = await Promise.all(
        days.map(d => api.get(`/api/planner/${toISO(d)}/`).then(r => r.data))
      )
      const map = {}
      days.forEach((d, i) => { map[toISO(d)] = results[i] })
      setWeekPlans(map)
      // expand today automatically
      setExpandedDay(toISO(new Date()))
    } catch (err) {
      console.error(err)
    } finally {
      setWeekLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'week') fetchWeek()
  }, [activeTab, fetchWeek])

  // ── handlers ──────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.start_time && form.end_time) {
      const [sh, sm] = form.start_time.split(':').map(Number)
      const [eh, em] = form.end_time.split(':').map(Number)
      if ((eh * 60 + em) <= (sh * 60 + sm)) {
        alert(t('planner.endTimeError', 'End time must be after start time'))
        return
      }
    }
    const payload = { ...form, goal: form.goal || null }
    try {
      if (editTask) {
        // editing existing task
        const res = await api.put(`/api/planner/tasks/${editTask.id}/`, payload)
        const updated = res.data
        // update today view
        if (plan) {
          setPlan(prev => ({
            ...prev,
            tasks: prev.tasks.map(tk => tk.id === editTask.id ? updated : tk)
          }))
        }
        // update week view
        setWeekPlans(prev => {
          const newMap = { ...prev }
          Object.keys(newMap).forEach(dateKey => {
            if (newMap[dateKey]?.tasks?.find(tk => tk.id === editTask.id)) {
              newMap[dateKey] = {
                ...newMap[dateKey],
                tasks: newMap[dateKey].tasks.map(tk => tk.id === editTask.id ? updated : tk)
              }
            }
          })
          return newMap
        })
      } else {
        // creating new task — use modalDate if in weekly tab
        const targetDate = modalDate || toISO(new Date())
        const isToday = targetDate === toISO(new Date())
        const endpoint = isToday ? '/api/planner/today/tasks/' : `/api/planner/${targetDate}/tasks/`
        const res = await api.post(endpoint, payload)
        const created = res.data
        // update today view
        if (isToday && plan) {
          setPlan(prev => ({ ...prev, tasks: [...(prev.tasks || []), created] }))
        }
        // update week view
        setWeekPlans(prev => {
          if (!prev[targetDate]) return prev
          return {
            ...prev,
            [targetDate]: {
              ...prev[targetDate],
              tasks: [...(prev[targetDate].tasks || []), created]
            }
          }
        })
      }
      closeModal()
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggle = async (taskId, dateKey) => {
    try {
      const res = await api.patch(`/api/planner/tasks/${taskId}/toggle/`)
      const updated = res.data
      // update today view
      if (plan) {
        setPlan(prev => ({
          ...prev,
          tasks: prev.tasks.map(tk => tk.id === taskId ? updated : tk)
        }))
      }
      // update week view
      if (dateKey) {
        setWeekPlans(prev => ({
          ...prev,
          [dateKey]: {
            ...prev[dateKey],
            tasks: prev[dateKey].tasks.map(tk => tk.id === taskId ? updated : tk)
          }
        }))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/planner/tasks/${id}/`)
      // update today view
      if (plan) {
        setPlan(prev => ({ ...prev, tasks: prev.tasks.filter(tk => tk.id !== id) }))
      }
      // update week view
      setWeekPlans(prev => {
        const newMap = { ...prev }
        Object.keys(newMap).forEach(dk => {
          if (newMap[dk]?.tasks) {
            newMap[dk] = { ...newMap[dk], tasks: newMap[dk].tasks.filter(tk => tk.id !== id) }
          }
        })
        return newMap
      })
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
      setAiFeedback(t('planner.noTasksAiFeedback'))
    } finally {
      setLoadingAi(false)
    }
  }

  const calculateCompletion = (tasks) => {
    if (!tasks?.length) return 0
    return Math.round((tasks.filter(tk => tk.is_done).length / tasks.length) * 100)
  }

  const openModal = (task = null, date = null) => {
    if (task) {
      setForm({
        title: task.title, description: task.description || '',
        category: task.category, priority: task.priority,
        start_time: task.start_time || '', end_time: task.end_time || '',
        goal: task.goal || '',
      })
      setEditTask(task)
    } else {
      setForm(EMPTY_FORM)
      setEditTask(null)
    }
    setModalDate(date || toISO(new Date()))
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditTask(null)
    setModalDate(null)
  }

  // ── date formatting ────────────────────────────────────────────────────────

  const formatDate = () => {
    const now = new Date()
    if (i18n.language === 'uz') {
      const engDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const dayKey = engDays[now.getDay()]
      const weekday = i18n.t(`daysFull.${dayKey}`, dayKey)
      const month = i18n.t(`months.${now.getMonth()}`, now.getMonth() + 1)
      return `${weekday}, ${now.getDate()} ${month} ${now.getFullYear()}`
    }
    const locale = { ru: 'ru-RU', en: 'en-US' }[i18n.language] || 'en-US'
    return now.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  const formatDayLabel = (date) => {
    if (i18n.language === 'uz') {
      const engDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const dayKey = engDays[date.getDay()]
      return i18n.t(`daysFull.${dayKey}`, dayKey)
    }
    const locale = { ru: 'ru-RU', en: 'en-US' }[i18n.language] || 'en-US'
    return date.toLocaleDateString(locale, { weekday: 'long' })
  }

  const formatShortDate = (date) => {
    if (i18n.language === 'uz') {
      const month = i18n.t(`months.${date.getMonth()}`, date.getMonth() + 1)
      return `${date.getDate()} ${month}`
    }
    const locale = { ru: 'ru-RU', en: 'en-US' }[i18n.language] || 'en-US'
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  }

  // ── computed ───────────────────────────────────────────────────────────────
  const today = formatDate()
  const durationText = calcDurationText(form.start_time, form.end_time)
  const doneTasks = plan?.tasks?.filter(tk => tk.is_done).length || 0
  const totalTasks = plan?.tasks?.length || 0
  const completion = calculateCompletion(plan?.tasks)
  const sortedTasks = plan?.tasks?.slice().sort((a, b) => {
    if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time)
    if (a.start_time) return -1
    if (b.start_time) return 1
    return 0
  }) || []

  const todayISO = toISO(new Date())
  const weekDays = getWeekDays()

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-[#7c6aff]">{t('common.loading')}</div>
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
          onClick={() => openModal(null, activeTab === 'today' ? todayISO : (expandedDay || todayISO))}
          className="bg-[#7c6aff] hover:bg-[#6a58ee] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-[#7c6aff]/25"
        >
          + {t('planner.addTask')}
        </button>
      </div>

      {/* TAB SWITCHER */}
      <div className="bg-[#12121a] border border-white/10 rounded-xl p-1 flex gap-1 mb-6 w-fit">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'today' ? 'bg-[#7c6aff] text-white' : 'text-[#6666aa] hover:text-white'
            }`}
        >
          {t('planner.todayView')}
        </button>
        <button
          onClick={() => setActiveTab('week')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'week' ? 'bg-[#7c6aff] text-white' : 'text-[#6666aa] hover:text-white'
            }`}
        >
          {t('planner.weeklyView')}
        </button>
      </div>

      {/* ══════════════ TODAY TAB ══════════════ */}
      {activeTab === 'today' && (
        <>
          {/* PROGRESS BAR */}
          <div className="bg-[#12121a] border border-white/10 rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-white font-semibold">{doneTasks} / {totalTasks} {t('planner.tasksDone')}</span>
                <span className="text-[#6666aa] text-sm ml-2">{t('planner.today')}</span>
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
                <button onClick={() => setAiFeedback('')} className="text-[#6666aa] text-xs mt-2 hover:text-white transition-colors">
                  {t('planner.dismiss')}
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
              <p className="text-[#6666aa] text-sm mb-6">{t('planner.noTasksDesc')}</p>
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
                const dur = calcDurationText(task.start_time, task.end_time)
                return (
                  <div
                    key={task.id}
                    className={`bg-[#12121a] border rounded-2xl p-4 flex items-center gap-4 transition-all group ${task.is_done ? 'border-white/5 opacity-60' : 'border-white/10 hover:border-white/20'
                      }`}
                  >
                    <button
                      onClick={() => handleToggle(task.id, null)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${task.is_done ? 'bg-[#43e97b] border-[#43e97b]' : 'border-white/20 hover:border-[#7c6aff]'
                        }`}
                    >
                      {task.is_done && <span className="text-white text-xs font-bold">✓</span>}
                    </button>
                    <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ background: colors.dot }} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${task.is_done ? 'line-through text-[#6666aa]' : 'text-white'}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {task.start_time && task.end_time
                          ? <span className="text-[#6666aa] text-xs">🕐 {task.start_time.slice(0, 5)} → {task.end_time.slice(0, 5)}</span>
                          : task.start_time
                            ? <span className="text-[#6666aa] text-xs">🕐 {task.start_time.slice(0, 5)}</span>
                            : null}
                        {dur && <span className="text-[#6666aa] text-xs">⏱ {dur}</span>}
                        {task.goal_title && <span className="text-[#7c6aff] text-xs">🎯 {task.goal_title}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${colors.bg} ${colors.text}`}>
                        {t(`goals.categories.${task.category}`) || task.category}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${priority.bg} ${priority.color}`}>
                        {t(priority.labelKey)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => openModal(task)}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#6666aa] hover:text-white transition-all text-xs"
                      >✏️</button>
                      <button
                        onClick={() => setDeleteId(task.id)}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-[#6666aa] hover:text-red-400 transition-all text-xs"
                      >🗑️</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════════ WEEKLY TAB ══════════════ */}
      {activeTab === 'week' && (
        <div>
          {weekLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-[#7c6aff]">{t('common.loading')}</div>
            </div>
          ) : (
            <div className="space-y-3">
              {weekDays.map((date) => {
                const dateKey = toISO(date)
                const dayPlan = weekPlans[dateKey]
                const tasks = dayPlan?.tasks || []
                const done = tasks.filter(tk => tk.is_done).length
                const total = tasks.length
                const pct = total > 0 ? Math.round((done / total) * 100) : 0
                const isToday = dateKey === todayISO
                const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))
                const isExpanded = expandedDay === dateKey
                const sortedDay = tasks.slice().sort((a, b) => {
                  if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time)
                  if (a.start_time) return -1
                  if (b.start_time) return 1
                  return 0
                })

                return (
                  <div
                    key={dateKey}
                    className={`bg-[#12121a] border rounded-2xl overflow-hidden transition-all ${isToday
                      ? 'border-[#7c6aff]/50 bg-[#7c6aff]/5'
                      : isPast
                        ? 'border-white/5 opacity-70'
                        : 'border-white/10'
                      }`}
                  >
                    {/* DAY HEADER — click to expand/collapse */}
                    <div
                      onClick={() => setExpandedDay(isExpanded ? null : dateKey)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-white/2 transition-all text-left cursor-pointer"
                    >
                      {/* Day name + date */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${isToday ? 'text-[#7c6aff]' : 'text-white'}`}>
                            {formatDayLabel(date)}
                          </span>
                          {isToday && (
                            <span className="text-[10px] font-semibold bg-[#7c6aff] text-white px-1.5 py-0.5 rounded-md">
                              {t('planner.today').toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="text-[#6666aa] text-xs">{formatShortDate(date)}</span>
                      </div>

                      {/* Mini progress bar */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {total > 0 ? (
                          <>
                            <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${pct}%`,
                                  background: pct >= 70 ? '#43e97b' : pct >= 40 ? '#f7b731' : '#7c6aff'
                                }}
                              />
                            </div>
                            <span className="text-xs text-[#6666aa] w-10 text-right">{pct}%</span>
                          </>
                        ) : (
                          <span className="text-xs text-[#444466]">{t('planner.noTasksDay')}</span>
                        )}
                        <span className="text-[#6666aa] text-xs w-14 text-right">
                          {total > 0 ? `${done}/${total}` : ''}
                        </span>
                        {/* Add task button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); openModal(null, dateKey) }}
                          className="w-7 h-7 rounded-lg bg-[#7c6aff]/15 hover:bg-[#7c6aff]/30 flex items-center justify-center text-[#7c6aff] text-sm font-bold transition-all"
                          title={t('planner.addTaskDay')}
                        >+</button>
                        {/* Chevron */}
                        <span className={`text-[#444466] text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          ▼
                        </span>
                      </div>
                    </div>

                    {/* EXPANDED TASK LIST */}
                    {isExpanded && (
                      <div className="border-t border-white/5 px-4 pb-4 pt-3">
                        {sortedDay.length === 0 ? (
                          <div className="flex items-center justify-between py-3">
                            <p className="text-[#444466] text-sm">{t('planner.noTasksDay')}</p>
                            <button
                              onClick={() => openModal(null, dateKey)}
                              className="text-[#7c6aff] text-xs hover:underline"
                            >
                              + {t('planner.addTaskDay')}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {sortedDay.map(task => {
                              const colors = categoryColors[task.category] || categoryColors.other
                              const priority = priorityConfig[task.priority]
                              return (
                                <div
                                  key={task.id}
                                  className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all group ${task.is_done ? 'opacity-50' : 'hover:bg-white/3'
                                    }`}
                                >
                                  {/* Checkbox */}
                                  <button
                                    onClick={() => handleToggle(task.id, dateKey)}
                                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${task.is_done ? 'bg-[#43e97b] border-[#43e97b]' : 'border-white/20 hover:border-[#7c6aff]'
                                      }`}
                                  >
                                    {task.is_done && <span className="text-white text-[10px] font-bold">✓</span>}
                                  </button>

                                  {/* Color dot */}
                                  <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: colors.dot }} />

                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${task.is_done ? 'line-through text-[#6666aa]' : 'text-white'}`}>
                                      {task.title}
                                    </p>
                                    {(task.start_time || task.goal_title) && (
                                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        {task.start_time && task.end_time
                                          ? <span className="text-[#6666aa] text-xs">🕐 {task.start_time.slice(0, 5)} → {task.end_time.slice(0, 5)}</span>
                                          : task.start_time
                                            ? <span className="text-[#6666aa] text-xs">🕐 {task.start_time.slice(0, 5)}</span>
                                            : null}
                                        {task.goal_title && <span className="text-[#7c6aff] text-xs">🎯 {task.goal_title}</span>}
                                      </div>
                                    )}
                                  </div>

                                  {/* Category badge */}
                                  <span className={`text-xs px-2 py-0.5 rounded-lg font-medium flex-shrink-0 ${colors.bg} ${colors.text}`}>
                                    {t(`goals.categories.${task.category}`) || task.category}
                                  </span>

                                  {/* Actions */}
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                                    <button
                                      onClick={() => openModal(task, dateKey)}
                                      className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#6666aa] hover:text-white transition-all text-xs"
                                    >✏️</button>
                                    <button
                                      onClick={() => setDeleteId(task.id)}
                                      className="w-6 h-6 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-[#6666aa] hover:text-red-400 transition-all text-xs"
                                    >🗑️</button>
                                  </div>
                                </div>
                              )
                            })}

                            {/* Add more link */}
                            <button
                              onClick={() => openModal(null, dateKey)}
                              className="w-full text-center text-[#6666aa] hover:text-[#7c6aff] text-xs py-2 transition-colors"
                            >
                              + {t('planner.addTaskDay')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ ADD / EDIT MODAL ══════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-white font-bold text-lg mb-5">
              {editTask ? t('common.edit') : t('planner.addTask')}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* TITLE */}
              <div>
                <label className="text-sm text-[#6666aa] mb-1.5 block">{t('common.title', 'Title')}</label>
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
                    {t('planner.startTime')} <span className="text-[#444466] text-xs">({t('auth.optional')})</span>
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
                    {t('planner.endTime')} <span className="text-[#444466] text-xs">({t('auth.optional')})</span>
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
                  ⏱ {t('planner.duration')}: {durationText}
                </div>
              ) : form.start_time && form.end_time ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-red-400">
                  ⚠️ {t('planner.endTimeError', 'End time must be after start time')}
                </div>
              ) : null}

              {/* LINK TO GOAL */}
              {goals.length > 0 && (
                <div>
                  <label className="text-sm text-[#6666aa] mb-1.5 block">
                    {t('planner.linkGoal')} <span className="text-[#444466] text-xs">({t('auth.optional')})</span>
                  </label>
                  <select
                    value={form.goal}
                    onChange={e => setForm({ ...form, goal: e.target.value })}
                    className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#7c6aff] transition-colors"
                  >
                    <option value="">{t('planner.noGoal')}</option>
                    {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
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

      {/* ══════════════ DELETE MODAL ══════════════ */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🗑️</div>
              <h2 className="text-white font-bold text-lg mb-2">{t('delete.taskTitle')}</h2>
              <p className="text-[#6666aa] text-sm">{t('delete.taskDesc')}</p>
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