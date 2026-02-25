import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { Link } from 'react-router-dom'

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
      setAiMessage('Add some tasks to your plan first to get AI feedback!')
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

  const categoryColors = {
    study: 'bg-[#7c6aff]/15 text-[#7c6aff]',
    fitness: 'bg-[#43e97b]/15 text-[#43e97b]',
    personal: 'bg-[#f7b731]/15 text-[#f7b731]',
    work: 'bg-[#45aaf2]/15 text-[#45aaf2]',
    health: 'bg-[#ff6b6b]/15 text-[#ff6b6b]',
    finance: 'bg-[#26de81]/15 text-[#26de81]',
    break: 'bg-white/10 text-white/50',
    other: 'bg-white/10 text-white/50',
  }

  const goalColors = {
    study: '#7c6aff',
    fitness: '#43e97b',
    personal: '#f7b731',
    work: '#45aaf2',
    health: '#ff6b6b',
    finance: '#26de81',
    other: '#aaa',
  }

  const categoryIcons = {
    study: '📚', fitness: '💪', personal: '⭐',
    work: '💼', health: '❤️', finance: '💰', other: '🎯'
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-[#7c6aff] text-lg">Loading...</div>
    </div>
  )

  const doneTasks = plan?.tasks?.filter(t => t.is_done).length || 0
  const totalTasks = plan?.tasks?.length || 0
  const completion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  // Get display name — use username, not email
  const displayName = user?.username || user?.email?.split('@')[0] || 'there'

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6 md:p-8">

      {/* TOP BAR */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {getGreeting()}, {displayName} 👋
          </h1>
          <p className="text-[#6666aa] text-sm mt-1">
            {doneTasks} {t('dashboard.tasksCompleted')}
          </p>
        </div>
        <Link
          to="/planner"
          className="bg-[#7c6aff] hover:bg-[#6a58ee] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-[#7c6aff]/25"
        >
          + {t('planner.addTask')}
        </Link>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-5">
          <div className="text-2xl mb-2">🔥</div>
          <div className="text-2xl font-bold text-white">
            {weeklyStats?.summary?.completion_rate || 0}%
          </div>
          <div className="text-[#6666aa] text-xs mt-1">{t('dashboard.weeklyCompletion')}</div>
        </div>
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-5">
          <div className="text-2xl mb-2">🎯</div>
          <div className="text-2xl font-bold text-white">{goals.length}</div>
          <div className="text-[#6666aa] text-xs mt-1">{t('dashboard.activeGoals')}</div>
        </div>
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-5">
          <div className="text-2xl mb-2">⏱️</div>
          <div className="text-2xl font-bold text-white">
            {pomodoroStats?.today?.focus_hours || 0}h
          </div>
          <div className="text-[#6666aa] text-xs mt-1">{t('dashboard.focusTime')}</div>
        </div>
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-5">
          <div className="text-2xl mb-2">✅</div>
          <div className="text-2xl font-bold text-white">{doneTasks}/{totalTasks}</div>
          <div className="text-[#6666aa] text-xs mt-1">{t('dashboard.todayPlan')}</div>
        </div>
      </div>

      {/* AI COACH BANNER */}
      <div className="bg-gradient-to-r from-[#7c6aff]/10 to-[#ff6b6b]/5 border border-[#7c6aff]/20 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-[#7c6aff] rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-lg shadow-[#7c6aff]/30">
            🤖
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm mb-1">{t('dashboard.aiCoach')}</h3>
            <p className="text-[#9090c0] text-sm leading-relaxed">
              {aiMessage || t('dashboard.aiCoachDefault', 'Click the button to get personalized AI feedback on your plan!')}
            </p>
          </div>
          {!aiMessage && (
            <button
              onClick={getAiFeedback}
              disabled={loadingAi}
              className="bg-[#7c6aff] hover:bg-[#6a58ee] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all flex-shrink-0 disabled:opacity-50 shadow-lg shadow-[#7c6aff]/25"
            >
              {loadingAi ? '🤖 ...' : `🤖 ${t('dashboard.aiGetFeedback')}`}
            </button>
          )}
          {aiMessage && (
            <button
              onClick={() => setAiMessage('')}
              className="text-[#6666aa] hover:text-white text-xs flex-shrink-0 transition-all"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* TODAY'S PLAN */}
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-bold text-lg">{t('dashboard.todayPlan')}</h2>
            <Link to="/planner" className="text-[#7c6aff] text-xs hover:underline">
              {t('dashboard.openPlanner')}
            </Link>
          </div>

          {/* Progress bar */}
          {totalTasks > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-[#6666aa] mb-1.5">
                <span>{doneTasks} {t('common.of', 'of')} {totalTasks} {t('planner.tasksDone')}</span>
                <span>{completion}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#7c6aff] rounded-full transition-all duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>
          )}

          {!plan?.tasks?.length ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-[#6666aa] text-sm">{t('dashboard.noTasksToday')}</p>
              <Link
                to="/planner"
                className="inline-block mt-3 text-[#7c6aff] text-sm hover:underline"
              >
                {t('dashboard.addFirstTask')} →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {plan.tasks.slice(0, 6).map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all group"
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${task.is_done
                      ? 'bg-[#43e97b] border-[#43e97b]'
                      : 'border-white/20 group-hover:border-[#7c6aff]'
                    }`}>
                    {task.is_done && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${task.is_done ? 'line-through text-[#6666aa]' : 'text-white'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-[#6666aa] mt-0.5">
                      {task.start_time && `${task.start_time.slice(0, 5)}`}
                      {task.start_time && task.end_time && ` → ${task.end_time.slice(0, 5)}`}
                      {task.duration_minutes && ` · ${task.duration_minutes} min`}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-lg flex-shrink-0 ${categoryColors[task.category] || categoryColors.other}`}>
                    {task.category}
                  </span>
                </div>
              ))}
              {plan.tasks.length > 6 && (
                <Link to="/planner" className="block text-center text-[#7c6aff] text-xs py-2 hover:underline">
                  +{plan.tasks.length - 6} more tasks →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* ACTIVE GOALS */}
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-bold text-lg">{t('dashboard.activeGoals')}</h2>
            <Link to="/goals" className="text-[#7c6aff] text-xs hover:underline">
              {t('dashboard.openGoals')}
            </Link>
          </div>

          {goals.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🎯</div>
              <p className="text-[#6666aa] text-sm">{t('goals.noGoals')}</p>
              <Link
                to="/goals"
                className="inline-block mt-3 text-[#7c6aff] text-sm hover:underline"
              >
                {t('goals.addGoal')} →
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {goals.map(goal => (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {categoryIcons[goal.category] || '🎯'}
                      </span>
                      <span className="text-white text-sm font-medium truncate max-w-[180px]">
                        {goal.title}
                      </span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: goalColors[goal.category] || '#aaa' }}>
                      {goal.progress}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${goal.progress}%`,
                        background: goalColors[goal.category] || '#aaa'
                      }}
                    />
                  </div>
                  {goal.days_remaining !== null && goal.days_remaining !== undefined && (
                    <p className="text-xs text-[#6666aa] mt-1">
                      {goal.days_remaining > 0
                        ? `📅 ${goal.days_remaining} days remaining`
                        : goal.days_remaining === 0
                          ? '⚡ Due today!'
                          : '⚠️ Overdue!'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* WEEKLY CHART */}
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-5">{t('analytics.weeklyStats')}</h2>
          {!weeklyStats?.days?.length ? (
            <div className="text-center py-8 text-[#6666aa] text-sm">
              {t('analytics.completeTasksHint')}
            </div>
          ) : (
            <>
              <div className="flex items-end gap-2" style={{ height: '100px' }}>
                {weeklyStats.days.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full relative rounded-t-lg overflow-hidden bg-white/5" style={{ height: '80px' }}>
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-[#7c6aff] rounded-t-lg transition-all duration-700"
                        style={{ height: `${day.completion_rate}%` }}
                      />
                    </div>
                    <span className="text-[#6666aa] text-xs">{day.day_name}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 pt-4 border-t border-white/5">
                <div>
                  <div className="text-[#6666aa] text-xs">{t('analytics.totalTasks')}</div>
                  <div className="text-white font-bold">{weeklyStats.summary.total_tasks}</div>
                </div>
                <div>
                  <div className="text-[#6666aa] text-xs">{t('analytics.focusHours')}</div>
                  <div className="text-white font-bold">{weeklyStats.summary.total_focus_hours}h</div>
                </div>
                <div>
                  <div className="text-[#6666aa] text-xs">{t('analytics.completionRate')}</div>
                  <div className="text-white font-bold">{weeklyStats.summary.completion_rate}%</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* QUICK ACCESS */}
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-5">{t('dashboard.quickAccess')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/pomodoro" className="flex flex-col items-center gap-2 p-4 bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 rounded-xl hover:bg-[#ff6b6b]/15 transition-all">
              <span className="text-2xl">🍅</span>
              <span className="text-white text-sm font-medium">{t('pomodoro.title')}</span>
              <span className="text-[#6666aa] text-xs">{pomodoroStats?.today?.sessions || 0} {t('dashboard.sessionsToday')}</span>
            </Link>
            <Link to="/chat" className="flex flex-col items-center gap-2 p-4 bg-[#7c6aff]/10 border border-[#7c6aff]/20 rounded-xl hover:bg-[#7c6aff]/15 transition-all">
              <span className="text-2xl">💬</span>
              <span className="text-white text-sm font-medium">{t('chat.title')}</span>
              <span className="text-[#6666aa] text-xs">{t('dashboard.aiCoach')}</span>
            </Link>
            <Link to="/goals" className="flex flex-col items-center gap-2 p-4 bg-[#43e97b]/10 border border-[#43e97b]/20 rounded-xl hover:bg-[#43e97b]/15 transition-all">
              <span className="text-2xl">🎯</span>
              <span className="text-white text-sm font-medium">{t('nav.goals')}</span>
              <span className="text-[#6666aa] text-xs">{goals.length} active</span>
            </Link>
            <Link to="/analytics" className="flex flex-col items-center gap-2 p-4 bg-[#45aaf2]/10 border border-[#45aaf2]/20 rounded-xl hover:bg-[#45aaf2]/15 transition-all">
              <span className="text-2xl">📊</span>
              <span className="text-white text-sm font-medium">{t('nav.analytics')}</span>
              <span className="text-[#6666aa] text-xs">{weeklyStats?.summary?.completion_rate || 0}% this week</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}