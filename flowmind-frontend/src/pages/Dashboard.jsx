import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { Link } from 'react-router-dom'
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

export default function Dashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [plan, setPlan] = useState(null)
  const [goals, setGoals] = useState([])
  const [pomodoroStats, setPomodoroStats] = useState(null)
  const [weeklyStats, setWeeklyStats] = useState(null)
  const [aiMessage, setAiMessage] = useState('')
  const [loadingAi, setLoadingAi] = useState(false)
  const [loading, setLoading] = useState(true)

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t('dashboard.goodMorning')
    if (hour < 17) return t('dashboard.goodAfternoon')
    return t('dashboard.goodEvening')
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      const [planRes, goalsRes, pomodoroRes, weeklyRes] = await Promise.all([
        api.get('/api/planner/today/'),
        api.get('/api/goals/?status=active'),
        api.get('/api/pomodoro/stats/'),
        api.get('/api/analytics/weekly/'),
      ])
      setPlan(planRes.data)
      setGoals((goalsRes.data.results || goalsRes.data).slice(0, 3))
      setPomodoroStats(pomodoroRes.data)
      setWeeklyStats(weeklyRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getAiFeedback = async () => {
    setLoadingAi(true)
    try {
      const res = await api.get('/api/ai/plan/feedback/')
      setAiMessage(res.data.feedback)
    } catch {
      setAiMessage(t('planner.noTasksAiFeedback'))
    } finally {
      setLoadingAi(false)
    }
  }

  const toggleTask = async (taskId) => {
    try {
      const res = await api.patch(`/api/planner/tasks/${taskId}/toggle/`)
      setPlan(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? res.data : t)
      }))
    } catch (err) {
      console.error(err)
    }
  }

  const categoryBadge = {
    study: { bg: 'rgba(124,106,255,0.15)', color: '#7c6aff' },
    fitness: { bg: 'rgba(67,233,123,0.15)', color: '#43e97b' },
    personal: { bg: 'rgba(247,183,49,0.15)', color: '#f7b731' },
    work: { bg: 'rgba(69,170,242,0.15)', color: '#45aaf2' },
    health: { bg: 'rgba(255,107,107,0.15)', color: '#ff6b6b' },
    finance: { bg: 'rgba(38,222,129,0.15)', color: '#26de81' },
    break: { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' },
    other: { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' },
  }

  const goalColors = {
    study: '#7c6aff', fitness: '#43e97b', personal: '#f7b731',
    work: '#45aaf2', health: '#ff6b6b', finance: '#26de81', other: '#aaa',
  }

  const categoryIcons = {
    study: '📚', fitness: '💪', personal: '⭐',
    work: '💼', health: '❤️', finance: '💰', other: '🎯'
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#06060d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <BlobBackground />
      <div style={{ color: '#7c6aff', fontSize: 16, position: 'relative', zIndex: 1 }}>Loading...</div>
    </div>
  )

  const doneTasks = plan?.tasks?.filter(t => t.is_done).length || 0
  const totalTasks = plan?.tasks?.length || 0
  const completion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const displayName = user?.username || user?.email?.split('@')[0] || 'there'

  return (
    <div style={{ minHeight: '100vh', background: '#06060d', padding: '32px', position: 'relative' }}>
      <BlobBackground />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              {getGreeting()},{' '}
              <span style={{ background: 'linear-gradient(135deg, #7c6aff, #ff6b6b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {displayName}
              </span>{' '}👋
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 6 }}>
              {doneTasks} {t('dashboard.tasksCompleted')}
            </p>
          </div>
          <Link
            to="/planner"
            style={{
              background: '#7c6aff', color: '#fff', textDecoration: 'none',
              fontSize: 13, fontWeight: 700, padding: '10px 18px', borderRadius: 12,
              boxShadow: '0 4px 16px rgba(124,106,255,0.35)', display: 'inline-block',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#6a58ee'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#7c6aff'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            + {t('planner.addTask')}
          </Link>
        </div>

        {/* STATS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { icon: '🔥', value: `${weeklyStats?.summary?.completion_rate || 0}%`, label: t('dashboard.weeklyCompletion'), accent: '#7c6aff' },
            { icon: '🎯', value: goals.length, label: t('dashboard.activeGoals'), accent: '#43e97b' },
            { icon: '⏱️', value: `${pomodoroStats?.today?.focus_hours || 0}h`, label: t('dashboard.focusTime'), accent: '#ff6b6b' },
            { icon: '✅', value: `${doneTasks}/${totalTasks}`, label: t('dashboard.todayPlan'), accent: '#45aaf2' },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                ...GLASS,
                borderRadius: 20,
                padding: '20px 22px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.2s',
                cursor: 'default',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>{stat.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: stat.accent, borderRadius: '0 0 20px 20px' }} />
            </div>
          ))}
        </div>

        {/* AI COACH BANNER */}
        <div style={{ ...GLASS_PURPLE, padding: 20, marginBottom: 24 }}>
          {/* top shine line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,106,255,0.5), transparent)' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14,
              background: '#7c6aff',
              boxShadow: '0 0 24px rgba(124,106,255,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, flexShrink: 0
            }}>🤖</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{t('dashboard.aiCoach')}</h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.6 }}>
                {totalTasks === 0 ? t('planner.noTasksAiFeedback') : (aiMessage || t('dashboard.aiCoachDefault', 'Click the button to get personalized AI feedback on your plan!'))}
              </p>
            </div>
            {totalTasks > 0 && !aiMessage && (
              <button
                onClick={getAiFeedback}
                disabled={loadingAi}
                style={{
                  background: '#7c6aff', color: '#fff', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, padding: '10px 16px', borderRadius: 10,
                  flexShrink: 0, boxShadow: '0 4px 16px rgba(124,106,255,0.4)',
                  opacity: loadingAi ? 0.5 : 1, transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (!loadingAi) e.currentTarget.style.background = '#6a58ee' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#7c6aff' }}
              >
                {loadingAi ? '🤖 ...' : `🤖 ${t('dashboard.aiGetFeedback')}`}
              </button>
            )}
            {aiMessage && (
              <button
                onClick={() => setAiMessage('')}
                style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}
              >✕</button>
            )}
          </div>
        </div>

        {/* MAIN GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, marginBottom: 20 }}>

          {/* TODAY'S PLAN */}
          <div style={{ ...GLASS, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{t('dashboard.todayPlan')}</h2>
              <Link to="/planner" style={{ color: '#7c6aff', fontSize: 12, textDecoration: 'none' }}>{t('dashboard.openPlanner')}</Link>
            </div>

            {totalTasks > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                  <span>{doneTasks} {t('common.of', 'of')} {totalTasks} {t('planner.tasksDone')}</span>
                  <span>{completion}%</span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${completion}%`, background: '#7c6aff', borderRadius: 999, boxShadow: '0 0 8px rgba(124,106,255,0.6)', transition: 'width 0.5s ease' }} />
                </div>
              </div>
            )}

            {!plan?.tasks?.length ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{t('dashboard.noTasksToday')}</p>
                <Link to="/planner" style={{ display: 'inline-block', marginTop: 12, color: '#7c6aff', fontSize: 13 }}>{t('dashboard.addFirstTask')} →</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {plan.tasks.slice(0, 6).map(task => {
                  const badge = categoryBadge[task.category] || categoryBadge.other
                  return (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: 12, borderRadius: 14, cursor: 'pointer', transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: 7, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: task.is_done ? 'linear-gradient(135deg,#43e97b,#26de81)' : 'transparent',
                        border: task.is_done ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                        boxShadow: task.is_done ? '0 0 12px rgba(67,233,123,0.4)' : 'none',
                        transition: 'all 0.2s',
                        color: '#fff', fontSize: 10,
                      }}>
                        {task.is_done && '✓'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: task.is_done ? 'rgba(255,255,255,0.3)' : '#fff', textDecoration: task.is_done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.title}
                        </p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                          {task.start_time && `${task.start_time.slice(0, 5)}`}
                          {task.start_time && task.end_time && ` → ${task.end_time.slice(0, 5)}`}
                          {task.duration_minutes && ` · ${task.duration_minutes} min`}
                        </p>
                      </div>
                      <span style={{ background: badge.bg, color: badge.color, fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 8, flexShrink: 0 }}>
                        {task.category}
                      </span>
                    </div>
                  )
                })}
                {plan.tasks.length > 6 && (
                  <Link to="/planner" style={{ display: 'block', textAlign: 'center', color: '#7c6aff', fontSize: 12, padding: '8px 0', textDecoration: 'none' }}>
                    +{plan.tasks.length - 6} more tasks →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* ACTIVE GOALS */}
          <div style={{ ...GLASS_PURPLE, padding: 24 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,106,255,0.5), transparent)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{t('dashboard.activeGoals')}</h2>
                <Link to="/goals" style={{ color: '#7c6aff', fontSize: 12, textDecoration: 'none' }}>{t('dashboard.openGoals')}</Link>
              </div>

              {goals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{t('goals.noGoals')}</p>
                  <Link to="/goals" style={{ display: 'inline-block', marginTop: 12, color: '#7c6aff', fontSize: 13 }}>{t('goals.addGoal')} →</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {goals.map(goal => {
                    const color = goalColors[goal.category] || '#aaa'
                    return (
                      <div key={goal.id}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>{categoryIcons[goal.category] || '🎯'}</span>
                            <span style={{ color: '#fff', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{goal.title}</span>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color, flexShrink: 0 }}>{goal.progress}%</span>
                        </div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${goal.progress}%`, background: color, borderRadius: 999, boxShadow: `0 0 8px ${color}80`, transition: 'width 0.7s ease' }} />
                        </div>
                        {goal.days_remaining !== null && goal.days_remaining !== undefined && (
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
                            {goal.days_remaining > 0 ? `📅 ${goal.days_remaining} days remaining` : goal.days_remaining === 0 ? '⚡ Due today!' : '⚠️ Overdue!'}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* WEEKLY CHART + QUICK ACCESS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>

          {/* WEEKLY CHART */}
          <div style={{ ...GLASS, padding: 24 }}>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>{t('analytics.weeklyStats')}</h2>
            {!weeklyStats?.days?.length ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
                {t('analytics.completeTasksHint')}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
                  {weeklyStats.days.map((day, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: '100%', position: 'relative', borderRadius: '6px 6px 0 0', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', height: 80 }}>
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          background: '#7c6aff', borderRadius: '6px 6px 0 0',
                          height: `${day.completion_rate}%`,
                          boxShadow: day.completion_rate > 0 ? '0 0 8px rgba(124,106,255,0.4)' : 'none',
                          transition: 'height 0.7s ease',
                        }} />
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{day.day_name}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {[
                    { label: t('analytics.totalTasks'), value: weeklyStats.summary.total_tasks },
                    { label: t('analytics.focusHours'), value: `${weeklyStats.summary.total_focus_hours}h` },
                    { label: t('analytics.completionRate'), value: `${weeklyStats.summary.completion_rate}%` },
                  ].map((s, i) => (
                    <div key={i}>
                      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{s.label}</div>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* QUICK ACCESS */}
          <div style={{ ...GLASS, padding: 24 }}>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>{t('dashboard.quickAccess')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { to: '/pomodoro', icon: '🍅', label: t('pomodoro.title'), sub: `${pomodoroStats?.today?.sessions || 0} ${t('dashboard.sessionsToday')}`, accent: '#ff6b6b' },
                { to: '/chat', icon: '💬', label: t('chat.title'), sub: t('dashboard.aiCoach'), accent: '#7c6aff' },
                { to: '/goals', icon: '🎯', label: t('nav.goals'), sub: `${goals.length} active`, accent: '#43e97b' },
                { to: '/analytics', icon: '📊', label: t('nav.analytics'), sub: `${weeklyStats?.summary?.completion_rate || 0}% this week`, accent: '#45aaf2' },
              ].map((item, i) => (
                <Link
                  key={i}
                  to={item.to}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    padding: 16, borderRadius: 16, textDecoration: 'none',
                    background: `${item.accent}15`,
                    border: `1px solid ${item.accent}25`,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.3)` }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{item.sub}</span>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}