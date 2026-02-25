import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import api from '../api/axios'
import BlobBackground from '../components/BlobBackground'

// ─── helpers ─────────────────────────────────────────────────────────────────

const catColors = {
  study: { dot: '#7c6aff', bg: 'rgba(124,106,255,0.15)', color: '#7c6aff' },
  fitness: { dot: '#43e97b', bg: 'rgba(67,233,123,0.15)', color: '#43e97b' },
  personal: { dot: '#f7b731', bg: 'rgba(247,183,49,0.15)', color: '#f7b731' },
  work: { dot: '#45aaf2', bg: 'rgba(69,170,242,0.15)', color: '#45aaf2' },
  health: { dot: '#ff6b6b', bg: 'rgba(255,107,107,0.15)', color: '#ff6b6b' },
  finance: { dot: '#26de81', bg: 'rgba(38,222,129,0.15)', color: '#26de81' },
  break: { dot: '#666', bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' },
  other: { dot: '#666', bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' },
}

const priorityConfig = {
  high: { labelKey: 'planner.priorities.high', bg: 'rgba(255,107,107,0.15)', color: '#ff6b6b' },
  medium: { labelKey: 'planner.priorities.medium', bg: 'rgba(247,183,49,0.15)', color: '#f7b731' },
  low: { labelKey: 'planner.priorities.low', bg: 'rgba(67,233,123,0.15)', color: '#43e97b' },
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

function toISO(date) { return date.toISOString().slice(0, 10) }

function getWeekDays() {
  const today = new Date()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const EMPTY_FORM = { title: '', description: '', category: 'personal', priority: 'medium', start_time: '', end_time: '', goal: '' }

const GLASS = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', borderRadius: 24 }
const GLASS_PURPLE = { background: 'rgba(124,106,255,0.06)', border: '1px solid rgba(124,106,255,0.15)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', borderRadius: 20, position: 'relative', overflow: 'hidden' }
const INPUT = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '11px 14px', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit' }

// ══════════════════════════════════════════════════════════════════════════════
export default function Planner() {
  const { t } = useTranslation()

  const [activeTab, setActiveTab] = useState('today')
  const [plan, setPlan] = useState(null)
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [modalDate, setModalDate] = useState(null)
  const [aiFeedback, setAiFeedback] = useState('')
  const [loadingAi, setLoadingAi] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [weekPlans, setWeekPlans] = useState({})
  const [weekLoading, setWeekLoading] = useState(false)
  const [expandedDay, setExpandedDay] = useState(null)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [planRes, goalsRes] = await Promise.all([
        api.get('/api/planner/today/'),
        api.get('/api/goals/?status=active'),
      ])
      setPlan(planRes.data)
      setGoals(goalsRes.data.results || goalsRes.data)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const fetchWeek = useCallback(async () => {
    setWeekLoading(true)
    try {
      const days = getWeekDays()
      const results = await Promise.all(days.map(d => api.get(`/api/planner/${toISO(d)}/`).then(r => r.data)))
      const map = {}
      days.forEach((d, i) => { map[toISO(d)] = results[i] })
      setWeekPlans(map)
      setExpandedDay(toISO(new Date()))
    } catch (err) { console.error(err) } finally { setWeekLoading(false) }
  }, [])

  useEffect(() => { if (activeTab === 'week') fetchWeek() }, [activeTab, fetchWeek])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.start_time && form.end_time) {
      const [sh, sm] = form.start_time.split(':').map(Number)
      const [eh, em] = form.end_time.split(':').map(Number)
      if ((eh * 60 + em) <= (sh * 60 + sm)) { alert(t('planner.endTimeError', 'End time must be after start time')); return }
    }
    const payload = { ...form, goal: form.goal || null }
    try {
      if (editTask) {
        const res = await api.put(`/api/planner/tasks/${editTask.id}/`, payload)
        const updated = res.data
        if (plan) setPlan(prev => ({ ...prev, tasks: prev.tasks.map(tk => tk.id === editTask.id ? updated : tk) }))
        setWeekPlans(prev => {
          const newMap = { ...prev }
          Object.keys(newMap).forEach(dk => {
            if (newMap[dk]?.tasks?.find(tk => tk.id === editTask.id))
              newMap[dk] = { ...newMap[dk], tasks: newMap[dk].tasks.map(tk => tk.id === editTask.id ? updated : tk) }
          })
          return newMap
        })
      } else {
        const targetDate = modalDate || toISO(new Date())
        const isToday = targetDate === toISO(new Date())
        const endpoint = isToday ? '/api/planner/today/tasks/' : `/api/planner/${targetDate}/tasks/`
        const res = await api.post(endpoint, payload)
        const created = res.data
        if (isToday && plan) setPlan(prev => ({ ...prev, tasks: [...(prev.tasks || []), created] }))
        setWeekPlans(prev => {
          if (!prev[targetDate]) return prev
          return { ...prev, [targetDate]: { ...prev[targetDate], tasks: [...(prev[targetDate].tasks || []), created] } }
        })
      }
      closeModal()
    } catch (err) { console.error(err) }
  }

  const handleToggle = async (taskId, dateKey) => {
    try {
      const res = await api.patch(`/api/planner/tasks/${taskId}/toggle/`)
      const updated = res.data
      if (plan) setPlan(prev => ({ ...prev, tasks: prev.tasks.map(tk => tk.id === taskId ? updated : tk) }))
      if (dateKey) setWeekPlans(prev => ({ ...prev, [dateKey]: { ...prev[dateKey], tasks: prev[dateKey].tasks.map(tk => tk.id === taskId ? updated : tk) } }))
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/planner/tasks/${id}/`)
      if (plan) setPlan(prev => ({ ...prev, tasks: prev.tasks.filter(tk => tk.id !== id) }))
      setWeekPlans(prev => {
        const newMap = { ...prev }
        Object.keys(newMap).forEach(dk => { if (newMap[dk]?.tasks) newMap[dk] = { ...newMap[dk], tasks: newMap[dk].tasks.filter(tk => tk.id !== id) } })
        return newMap
      })
      setDeleteId(null)
    } catch (err) { console.error(err) }
  }

  const getAiFeedback = async () => {
    setLoadingAi(true)
    try { const res = await api.get('/api/ai/plan/feedback/'); setAiFeedback(res.data.feedback) }
    catch { setAiFeedback(t('planner.noTasksAiFeedback')) } finally { setLoadingAi(false) }
  }

  const calculateCompletion = (tasks) => {
    if (!tasks?.length) return 0
    return Math.round((tasks.filter(tk => tk.is_done).length / tasks.length) * 100)
  }

  const openModal = (task = null, date = null) => {
    if (task) {
      setForm({ title: task.title, description: task.description || '', category: task.category, priority: task.priority, start_time: task.start_time || '', end_time: task.end_time || '', goal: task.goal || '' })
      setEditTask(task)
    } else { setForm(EMPTY_FORM); setEditTask(null) }
    setModalDate(date || toISO(new Date()))
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditTask(null); setModalDate(null) }

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
    if (i18n.language === 'uz') { const engDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; return i18n.t(`daysFull.${engDays[date.getDay()]}`, engDays[date.getDay()]) }
    const locale = { ru: 'ru-RU', en: 'en-US' }[i18n.language] || 'en-US'
    return date.toLocaleDateString(locale, { weekday: 'long' })
  }

  const formatShortDate = (date) => {
    if (i18n.language === 'uz') { const month = i18n.t(`months.${date.getMonth()}`, date.getMonth() + 1); return `${date.getDate()} ${month}` }
    const locale = { ru: 'ru-RU', en: 'en-US' }[i18n.language] || 'en-US'
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  }

  const today = formatDate()
  const durationText = calcDurationText(form.start_time, form.end_time)
  const doneTasks = plan?.tasks?.filter(tk => tk.is_done).length || 0
  const totalTasks = plan?.tasks?.length || 0
  const completion = calculateCompletion(plan?.tasks)
  const sortedTasks = plan?.tasks?.slice().sort((a, b) => {
    if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time)
    if (a.start_time) return -1; if (b.start_time) return 1; return 0
  }) || []
  const todayISO = toISO(new Date())
  const weekDays = getWeekDays()

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#06060d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <BlobBackground /><div style={{ color: '#7c6aff', position: 'relative', zIndex: 1 }}>{t('common.loading')}</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#06060d', padding: 32, position: 'relative' }}>
      <BlobBackground />
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{t('planner.title')}</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>{today}</p>
          </div>
          <button
            onClick={() => openModal(null, activeTab === 'today' ? todayISO : (expandedDay || todayISO))}
            style={{ background: '#7c6aff', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '10px 18px', borderRadius: 12, boxShadow: '0 4px 16px rgba(124,106,255,0.35)' }}
            onMouseEnter={e => e.currentTarget.style.background = '#6a58ee'}
            onMouseLeave={e => e.currentTarget.style.background = '#7c6aff'}
          >+ {t('planner.addTask')}</button>
        </div>

        {/* TAB SWITCHER */}
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 4, display: 'inline-flex', gap: 4, marginBottom: 24 }}>
          {[['today', t('planner.todayView')], ['week', t('planner.weeklyView')]].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
              background: activeTab === tab ? '#7c6aff' : 'transparent',
              color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.4)',
              boxShadow: activeTab === tab ? '0 2px 10px rgba(124,106,255,0.4)' : 'none',
            }}>{label}</button>
          ))}
        </div>

        {/* ══════════════ TODAY TAB ══════════════ */}
        {activeTab === 'today' && (
          <>
            {/* PROGRESS CARD */}
            <div style={{ ...GLASS, padding: '18px 22px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{doneTasks} / {totalTasks} {t('planner.tasksDone')}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginLeft: 8 }}>{t('planner.today')}</span>
                </div>
                <span style={{ color: '#7c6aff', fontWeight: 800, fontSize: 18 }}>{completion}%</span>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${completion}%`, background: 'linear-gradient(90deg, #7c6aff, #a855f7)', borderRadius: 999, boxShadow: '0 0 8px rgba(124,106,255,0.6)', transition: 'width 0.7s ease' }} />
              </div>
            </div>

            {/* AI FEEDBACK */}
            {aiFeedback ? (
              <div style={{ ...GLASS_PURPLE, padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(124,106,255,0.5),transparent)' }} />
                <div style={{ display: 'flex', gap: 14, position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: 22, flexShrink: 0 }}>🤖</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.6 }}>{aiFeedback}</p>
                    <button onClick={() => setAiFeedback('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 8, cursor: 'pointer', padding: 0 }}>{t('planner.dismiss')}</button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={getAiFeedback}
                disabled={loadingAi || totalTasks === 0}
                style={{ width: '100%', ...GLASS, borderRadius: 16, padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', opacity: (loadingAi || totalTasks === 0) ? 0.4 : 1 }}
                onMouseEnter={e => { if (!loadingAi && totalTasks > 0) { e.currentTarget.style.borderColor = 'rgba(124,106,255,0.3)'; e.currentTarget.style.color = '#7c6aff' } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
              >{loadingAi ? '🤖 Thinking...' : `🤖 ${t('planner.getAiFeedback')}`}</button>
            )}

            {/* TASKS LIST */}
            {totalTasks === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
                <div style={{ fontSize: 60, marginBottom: 16 }}>📋</div>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>{t('planner.noTasks')}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24 }}>{t('planner.noTasksDesc')}</p>
                <button onClick={() => openModal()} style={{ background: '#7c6aff', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>+ {t('planner.addTask')}</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sortedTasks.map(task => {
                  const c = catColors[task.category] || catColors.other
                  const p = priorityConfig[task.priority]
                  const dur = calcDurationText(task.start_time, task.end_time)
                  return (
                    <div
                      key={task.id}
                      style={{
                        ...GLASS, borderRadius: 18, padding: '14px 18px',
                        display: 'flex', alignItems: 'center', gap: 14,
                        opacity: task.is_done ? 0.6 : 1, transition: 'all 0.2s',
                        borderColor: task.is_done ? 'rgba(255,255,255,0.04)' : undefined,
                      }}
                      onMouseEnter={e => { if (!task.is_done) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)'; e.currentTarget.style.transform = 'translateX(2px)' } }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateX(0)' }}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggle(task.id, null)}
                        style={{
                          width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: task.is_done ? 'linear-gradient(135deg,#43e97b,#26de81)' : 'transparent',
                          border: task.is_done ? 'none' : '2px solid rgba(255,255,255,0.2)',
                          boxShadow: task.is_done ? '0 0 12px rgba(67,233,123,0.4)' : 'none',
                          cursor: 'pointer', transition: 'all 0.2s', color: '#fff', fontSize: 11, fontWeight: 700,
                        }}
                        onMouseEnter={e => { if (!task.is_done) e.currentTarget.style.borderColor = '#7c6aff' }}
                        onMouseLeave={e => { if (!task.is_done) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
                      >{task.is_done && '✓'}</button>

                      {/* Category strip */}
                      <div style={{ width: 3, height: 36, borderRadius: 4, background: c.dot, flexShrink: 0, boxShadow: `0 0 8px ${c.dot}60` }} />

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: task.is_done ? 'rgba(255,255,255,0.3)' : '#fff', textDecoration: task.is_done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.title}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                          {task.start_time && task.end_time ? <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>🕐 {task.start_time.slice(0, 5)} → {task.end_time.slice(0, 5)}</span> :
                            task.start_time ? <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>🕐 {task.start_time.slice(0, 5)}</span> : null}
                          {dur && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>⏱ {dur}</span>}
                          {task.goal_title && <span style={{ color: '#7c6aff', fontSize: 11 }}>🎯 {task.goal_title}</span>}
                        </div>
                      </div>

                      {/* Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{ background: c.bg, color: c.color, fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 8 }}>{t(`goals.categories.${task.category}`) || task.category}</span>
                        <span style={{ background: p.bg, color: p.color, fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 8 }}>{t(p.labelKey)}</span>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => openModal(task)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}>✏️</button>
                        <button onClick={() => setDeleteId(task.id)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.15)'; e.currentTarget.style.color = '#ff6b6b' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}>🗑️</button>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
                <div style={{ color: '#7c6aff' }}>{t('common.loading')}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                    if (a.start_time) return -1; if (b.start_time) return 1; return 0
                  })

                  return (
                    <div key={dateKey} style={{
                      ...GLASS, borderRadius: 20, overflow: 'hidden', transition: 'all 0.2s', opacity: isPast ? 0.7 : 1,
                      borderColor: isToday ? 'rgba(124,106,255,0.4)' : undefined,
                      background: isToday ? 'rgba(124,106,255,0.05)' : undefined,
                    }}>
                      {/* DAY HEADER */}
                      <div
                        onClick={() => setExpandedDay(isExpanded ? null : dateKey)}
                        style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: isToday ? '#7c6aff' : '#fff' }}>{formatDayLabel(date)}</span>
                            {isToday && <span style={{ fontSize: 10, fontWeight: 700, background: '#7c6aff', color: '#fff', padding: '2px 8px', borderRadius: 6 }}>{t('planner.today').toUpperCase()}</span>}
                          </div>
                          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{formatShortDate(date)}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                          {total > 0 ? (
                            <>
                              <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: pct >= 70 ? '#43e97b' : pct >= 40 ? '#f7b731' : '#7c6aff', borderRadius: 999, transition: 'width 0.5s ease' }} />
                              </div>
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', width: 36, textAlign: 'right' }}>{pct}%</span>
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', width: 40, textAlign: 'right' }}>{done}/{total}</span>
                            </>
                          ) : (
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{t('planner.noTasksDay')}</span>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); openModal(null, dateKey) }}
                            style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(124,106,255,0.15)', border: 'none', cursor: 'pointer', color: '#7c6aff', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,106,255,0.3)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(124,106,255,0.15)'}
                          >+</button>
                          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, transition: 'transform 0.2s', display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                        </div>
                      </div>

                      {/* EXPANDED */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 20px 16px' }}>
                          {sortedDay.length === 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>{t('planner.noTasksDay')}</p>
                              <button onClick={() => openModal(null, dateKey)} style={{ color: '#7c6aff', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>+ {t('planner.addTaskDay')}</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {sortedDay.map(task => {
                                const c = catColors[task.category] || catColors.other
                                const p = priorityConfig[task.priority]
                                return (
                                  <div
                                    key={task.id}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: 10,
                                      padding: '10px 12px', borderRadius: 14,
                                      opacity: task.is_done ? 0.5 : 1, transition: 'background 0.2s',
                                    }}
                                    onMouseEnter={e => { if (!task.is_done) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <button
                                      onClick={() => handleToggle(task.id, dateKey)}
                                      style={{
                                        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: task.is_done ? 'linear-gradient(135deg,#43e97b,#26de81)' : 'transparent',
                                        border: task.is_done ? 'none' : '2px solid rgba(255,255,255,0.2)',
                                        boxShadow: task.is_done ? '0 0 10px rgba(67,233,123,0.4)' : 'none',
                                        cursor: 'pointer', color: '#fff', fontSize: 10, fontWeight: 700,
                                      }}
                                    >{task.is_done && '✓'}</button>
                                    <div style={{ width: 3, height: 30, borderRadius: 4, background: c.dot, flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <p style={{ fontSize: 13, fontWeight: 500, color: task.is_done ? 'rgba(255,255,255,0.3)' : '#fff', textDecoration: task.is_done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {task.title}
                                      </p>
                                      {(task.start_time || task.goal_title) && (
                                        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                                          {task.start_time && task.end_time ? <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>🕐 {task.start_time.slice(0, 5)} → {task.end_time.slice(0, 5)}</span> :
                                            task.start_time ? <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>🕐 {task.start_time.slice(0, 5)}</span> : null}
                                          {task.goal_title && <span style={{ color: '#7c6aff', fontSize: 11 }}>🎯 {task.goal_title}</span>}
                                        </div>
                                      )}
                                    </div>
                                    <span style={{ background: c.bg, color: c.color, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, flexShrink: 0 }}>{t(`goals.categories.${task.category}`) || task.category}</span>
                                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                      <button onClick={() => openModal(task, dateKey)} style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
                                      <button onClick={() => setDeleteId(task.id)} style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑️</button>
                                    </div>
                                  </div>
                                )
                              })}
                              <button onClick={() => openModal(null, dateKey)} style={{ width: '100%', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#7c6aff'}
                                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                              >+ {t('planner.addTaskDay')}</button>
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
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <div style={{ ...GLASS, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 17, marginBottom: 20 }}>{editTask ? t('common.edit') : t('planner.addTask')}</h2>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 6 }}>{t('common.title', 'Title')}</label>
                  <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. University lecture" style={INPUT}
                    onFocus={e => { e.target.style.borderColor = 'rgba(124,106,255,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,106,255,0.1)' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 6 }}>{t('planner.category')}</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={INPUT}>
                      {['study', 'fitness', 'personal', 'work', 'health', 'finance', 'break', 'other'].map(cat => (<option key={cat} value={cat}>{t(`goals.categories.${cat}`) || cat}</option>))}
                    </select>
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 6 }}>{t('planner.priority')}</label>
                    <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={INPUT}>
                      <option value="high">{t('planner.priorities.high')}</option>
                      <option value="medium">{t('planner.priorities.medium')}</option>
                      <option value="low">{t('planner.priorities.low')}</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 6 }}>{t('planner.startTime')} <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>({t('auth.optional')})</span></label>
                    <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} style={{ ...INPUT, colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 6 }}>{t('planner.endTime')} <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>({t('auth.optional')})</span></label>
                    <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} style={{ ...INPUT, colorScheme: 'dark' }} />
                  </div>
                </div>
                {durationText ? (
                  <div style={{ background: 'rgba(124,106,255,0.1)', border: '1px solid rgba(124,106,255,0.2)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#7c6aff' }}>⏱ {t('planner.duration')}: {durationText}</div>
                ) : form.start_time && form.end_time ? (
                  <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#ff6b6b' }}>⚠️ {t('planner.endTimeError', 'End time must be after start time')}</div>
                ) : null}
                {goals.length > 0 && (
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 6 }}>{t('planner.linkGoal')} <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>({t('auth.optional')})</span></label>
                    <select value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} style={INPUT}>
                      <option value="">{t('planner.noGoal')}</option>
                      {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
                  <button type="button" onClick={closeModal} style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{t('common.cancel')}</button>
                  <button type="submit" style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: '#7c6aff', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,106,255,0.35)' }}>{editTask ? t('common.save') : t('common.add')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════ DELETE MODAL ══════════════ */}
        {deleteId && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <div style={{ ...GLASS, padding: 24, width: '100%', maxWidth: 360, textAlign: 'center' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🗑️</div>
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 17, marginBottom: 8 }}>{t('delete.taskTitle')}</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24 }}>{t('delete.taskDesc')}</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{t('common.cancel')}</button>
                <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.3)', color: '#ff6b6b', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{t('common.delete')}</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}