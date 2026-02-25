import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/axios'

export default function Pomodoro() {
  const { t } = useTranslation()

  // Settings
  const [settings, setSettings] = useState({
    focus_minutes: 25,
    short_break_minutes: 5,
    long_break_minutes: 15,
    sessions_before_long_break: 4,
  })
  const [showSettings, setShowSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState({ ...settings })

  // Timer
  const [mode, setMode] = useState('focus') // focus | short_break | long_break
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [currentSession, setCurrentSession] = useState(null)
  const intervalRef = useRef(null)

  // Stats
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])

  // Tasks
  const [tasks, setTasks] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [showTaskPicker, setShowTaskPicker] = useState(false)

  useEffect(() => {
    fetchSettings()
    fetchStats()
    fetchHistory()
    fetchTodayTasks()
  }, [])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            handleTimerEnd()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [isRunning])

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/pomodoro/settings/')
      setSettings(res.data)
      setSettingsForm(res.data)
      setTimeLeft(res.data.focus_minutes * 60)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/pomodoro/stats/')
      setStats(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await api.get('/api/pomodoro/history/')
      setHistory(res.data.results || res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchTodayTasks = async () => {
    try {
      const res = await api.get('/api/planner/today/')
      setTasks(res.data.tasks || [])
    } catch (err) {
      console.error(err)
    }
  }

  const getDuration = (m) => {
    if (m === 'focus') return settings.focus_minutes
    if (m === 'short_break') return settings.short_break_minutes
    return settings.long_break_minutes
  }

  const handleStart = async () => {
    try {
      const res = await api.post('/api/pomodoro/start/', {
        session_type: mode,
        task_id: selectedTask?.id || null,
      })
      setCurrentSession(res.data.session)
      setIsRunning(true)
    } catch (err) {
      console.error(err)
    }
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleResume = () => {
    setIsRunning(true)
  }

  const handleCancel = async () => {
    setIsRunning(false)
    if (currentSession) {
      try {
        await api.patch(`/api/pomodoro/sessions/${currentSession.id}/cancel/`)
      } catch (err) {
        console.error(err)
      }
    }
    setCurrentSession(null)
    setTimeLeft(getDuration(mode) * 60)
    fetchStats()
    fetchHistory()
  }

  const handleTimerEnd = async () => {
    setIsRunning(false)
    if (currentSession) {
      try {
        const res = await api.patch(`/api/pomodoro/sessions/${currentSession.id}/complete/`)
        const next = res.data.next
        setCurrentSession(null)
        switchMode(next.type, next.duration_minutes)
        fetchStats()
        fetchHistory()

        // Play sound notification
        try {
          const ctx = new AudioContext()
          const oscillator = ctx.createOscillator()
          const gain = ctx.createGain()
          oscillator.connect(gain)
          gain.connect(ctx.destination)
          oscillator.frequency.value = 800
          gain.gain.setValueAtTime(0.3, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
          oscillator.start(ctx.currentTime)
          oscillator.stop(ctx.currentTime + 0.5)
        } catch { }

      } catch (err) {
        console.error(err)
      }
    }
  }

  const switchMode = (newMode, minutes = null) => {
    setMode(newMode)
    setTimeLeft((minutes || getDuration(newMode)) * 60)
    setIsRunning(false)
    setCurrentSession(null)
  }

  const saveSettings = async () => {
    try {
      const res = await api.patch('/api/pomodoro/settings/', settingsForm)
      setSettings(res.data)
      setShowSettings(false)
      if (!isRunning) {
        setTimeLeft(res.data.focus_minutes * 60)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const totalSeconds = getDuration(mode) * 60
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100
  const circumference = 2 * Math.PI * 110

  const modeConfig = {
    focus: { label: t('pomodoro.focusSession'), color: '#7c6aff', bg: 'from-[#7c6aff]/20 to-transparent' },
    short_break: { label: t('pomodoro.shortBreak'), color: '#43e97b', bg: 'from-[#43e97b]/20 to-transparent' },
    long_break: { label: t('pomodoro.longBreak'), color: '#45aaf2', bg: 'from-[#45aaf2]/20 to-transparent' },
  }

  const current = modeConfig[mode]

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6 md:p-8">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{t('pomodoro.title')}</h1>
          <p className="text-[#6666aa] text-sm mt-1">
            {stats?.today?.sessions || 0} {t('pomodoro.sessionsToday')} · {stats?.today?.focus_hours || 0}h {t('pomodoro.focusHours')}
          </p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="bg-white/5 hover:bg-white/10 border border-white/10 text-[#6666aa] hover:text-white text-sm px-4 py-2.5 rounded-xl transition-all"
        >
          ⚙️ {t('pomodoro.settings')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* TIMER COLUMN */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* MODE SWITCHER */}
          <div className="bg-[#12121a] border border-white/10 rounded-2xl p-2 flex gap-2">
            {Object.entries(modeConfig).map(([key, val]) => (
              <button
                key={key}
                onClick={() => !isRunning && switchMode(key)}
                disabled={isRunning}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === key
                    ? 'text-white'
                    : 'text-[#6666aa] hover:text-white disabled:cursor-not-allowed'
                  }`}
                style={mode === key ? { background: `${val.color}25`, color: val.color } : {}}
              >
                {val.label}
              </button>
            ))}
          </div>

          {/* TIMER CIRCLE */}
          <div className={`bg-[#12121a] border border-white/10 rounded-2xl p-8 flex flex-col items-center bg-gradient-to-b ${current.bg}`}>

            {/* SVG Circle */}
            <div className="relative mb-8">
              <svg width="260" height="260" className="-rotate-90">
                {/* Background circle */}
                <circle
                  cx="130" cy="130" r="110"
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="8"
                />
                {/* Progress circle */}
                <circle
                  cx="130" cy="130" r="110"
                  fill="none"
                  stroke={current.color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (progress / 100) * circumference}
                  style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 8px ${current.color})` }}
                />
              </svg>

              {/* Time display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-white tracking-tight">
                  {formatTime(timeLeft)}
                </span>
                <span className="text-sm mt-2 font-medium" style={{ color: current.color }}>
                  {current.label}
                </span>
                {selectedTask && (
                  <span className="text-xs text-[#6666aa] mt-1 max-w-[140px] text-center truncate">
                    📌 {selectedTask.title}
                  </span>
                )}
              </div>
            </div>

            {/* CONTROLS */}
            <div className="flex items-center gap-4">
              {!currentSession && !isRunning && (
                <>
                  <button
                    onClick={() => setShowTaskPicker(true)}
                    className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#6666aa] hover:text-white transition-all flex items-center justify-center text-lg"
                    title="Attach task"
                  >
                    📌
                  </button>
                  <button
                    onClick={handleStart}
                    className="w-20 h-20 rounded-full text-white font-bold text-lg transition-all shadow-lg flex items-center justify-center"
                    style={{ background: current.color, boxShadow: `0 0 30px ${current.color}40` }}
                  >
                    {t('pomodoro.start')}
                  </button>
                  <button
                    onClick={() => setTimeLeft(getDuration(mode) * 60)}
                    className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#6666aa] hover:text-white transition-all flex items-center justify-center text-lg"
                    title="Reset"
                  >
                    🔄
                  </button>
                </>
              )}

              {currentSession && isRunning && (
                <>
                  <button
                    onClick={handleCancel}
                    className="w-12 h-12 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all flex items-center justify-center text-lg"
                  >
                    ✕
                  </button>
                  <button
                    onClick={handlePause}
                    className="w-20 h-20 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-lg transition-all flex items-center justify-center border border-white/10"
                  >
                    {t('pomodoro.pause')}
                  </button>
                  <div className="w-12 h-12" />
                </>
              )}

              {currentSession && !isRunning && (
                <>
                  <button
                    onClick={handleCancel}
                    className="w-12 h-12 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all flex items-center justify-center text-lg"
                  >
                    ✕
                  </button>
                  <button
                    onClick={handleResume}
                    className="w-20 h-20 rounded-full text-white font-bold text-lg transition-all shadow-lg flex items-center justify-center"
                    style={{ background: current.color, boxShadow: `0 0 30px ${current.color}40` }}
                  >
                    {t('pomodoro.resume')}
                  </button>
                  <div className="w-12 h-12" />
                </>
              )}
            </div>

            {/* SESSION DOTS */}
            <div className="flex items-center gap-2 mt-6">
              {Array.from({ length: settings.sessions_before_long_break }).map((_, i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full transition-all"
                  style={{
                    background: i < (stats?.today?.sessions % settings.sessions_before_long_break || 0)
                      ? current.color
                      : 'rgba(255,255,255,0.1)'
                  }}
                />
              ))}
              <span className="text-xs text-[#6666aa] ml-2">
                {stats?.today?.sessions_until_long_break || settings.sessions_before_long_break} {t('pomodoro.untilLongBreak')}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-5">

          {/* TODAY STATS */}
          <div className="bg-[#12121a] border border-white/10 rounded-2xl p-5">
            <h3 className="text-white font-bold mb-4">{t('planner.today')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-white">{stats?.today?.sessions || 0}</div>
                <div className="text-[#6666aa] text-xs mt-1">{t('pomodoro.sessionsToday')}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-white">{stats?.today?.focus_hours || 0}h</div>
                <div className="text-[#6666aa] text-xs mt-1">{t('pomodoro.focusHours')}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center col-span-2">
                <div className="text-2xl font-bold text-white">{stats?.all_time?.sessions || 0}</div>
                <div className="text-[#6666aa] text-xs mt-1">{t('pomodoro.allTimeSessions')}</div>
              </div>
            </div>
          </div>

          {/* RECENT SESSIONS */}
          <div className="bg-[#12121a] border border-white/10 rounded-2xl p-5 flex-1">
            <h3 className="text-white font-bold mb-4">{t('pomodoro.recentSessions')}</h3>
            {history.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">🍅</div>
                <p className="text-[#6666aa] text-xs">{t('pomodoro.noSessions')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 8).map(session => (
                  <div key={session.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${session.status === 'completed' ? 'bg-[#43e97b]' :
                        session.status === 'cancelled' ? 'bg-red-400' : 'bg-[#f7b731]'
                      }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium">
                        {session.session_type === 'focus' ? `🎯 ${t('pomodoro.focusSession')}` :
                          session.session_type === 'short_break' ? `☕ ${t('pomodoro.shortBreak')}` : `🛋️ ${t('pomodoro.longBreak')}`}
                      </p>
                      {session.task_title && (
                        <p className="text-[#6666aa] text-xs truncate">{session.task_title}</p>
                      )}
                    </div>
                    <span className="text-[#6666aa] text-xs flex-shrink-0">{session.duration_minutes}m</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TASK PICKER MODAL */}
      {showTaskPicker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-white font-bold text-lg mb-4">📌 {t('pomodoro.attachTask')}</h2>
            <p className="text-[#6666aa] text-sm mb-4">{t('pomodoro.attachTaskDesc')}</p>

            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              <button
                onClick={() => { setSelectedTask(null); setShowTaskPicker(false) }}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${!selectedTask
                    ? 'border-[#7c6aff]/50 bg-[#7c6aff]/10 text-[#7c6aff]'
                    : 'border-white/10 text-[#6666aa] hover:text-white hover:border-white/20'
                  }`}
              >
                {t('pomodoro.noTaskFocus')}
              </button>
              {tasks.filter(t => !t.is_done).map(task => (
                <button
                  key={task.id}
                  onClick={() => { setSelectedTask(task); setShowTaskPicker(false) }}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${selectedTask?.id === task.id
                      ? 'border-[#7c6aff]/50 bg-[#7c6aff]/10 text-[#7c6aff]'
                      : 'border-white/10 text-white hover:border-white/20'
                    }`}
                >
                  <div className="font-medium">{task.title}</div>
                  <div className="text-xs text-[#6666aa] mt-0.5">{task.category} · {task.duration_minutes}min</div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowTaskPicker(false)}
              className="w-full py-3 rounded-xl border border-white/10 text-[#6666aa] hover:text-white text-sm transition-all"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-white font-bold text-lg mb-5">⚙️ {t('pomodoro.settings')}</h2>

            <div className="space-y-4">
              {[
                { key: 'focus_minutes', label: t('pomodoro.focusMinutes'), min: 1, max: 120 },
                { key: 'short_break_minutes', label: t('pomodoro.shortBreakMinutes'), min: 1, max: 30 },
                { key: 'long_break_minutes', label: t('pomodoro.longBreakMinutes'), min: 1, max: 60 },
                { key: 'sessions_before_long_break', label: t('pomodoro.sessionsBeforeLongBreak'), min: 1, max: 10 },
              ].map(({ key, label, min, max }) => (
                <div key={key}>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-sm text-[#6666aa]">{label}</label>
                    <span className="text-white font-bold text-sm">{settingsForm[key]}</span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={settingsForm[key]}
                    onChange={e => setSettingsForm({ ...settingsForm, [key]: parseInt(e.target.value) })}
                    className="w-full accent-[#7c6aff]"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-[#6666aa] hover:text-white text-sm transition-all"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={saveSettings}
                className="flex-1 py-3 rounded-xl bg-[#7c6aff] hover:bg-[#6a58ee] text-white text-sm font-semibold transition-all"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}