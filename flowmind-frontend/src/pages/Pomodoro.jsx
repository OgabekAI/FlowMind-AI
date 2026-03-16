import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/axios'
import BlobBackground from '../components/BlobBackground'

export default function Pomodoro() {
  const { t } = useTranslation()

  const [settings, setSettings] = useState({
    focus_minutes: 25, short_break_minutes: 5,
    long_break_minutes: 15, sessions_before_long_break: 4,
  })
  const [showSettings, setShowSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState({ ...settings })

  const [mode, setMode] = useState('focus')
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [currentSession, setCurrentSession] = useState(null)
  const [timerFinished, setTimerFinished] = useState(false)
  const intervalRef = useRef(null)
  const restoredRef = useRef(false)

  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [tasks, setTasks] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [showTaskPicker, setShowTaskPicker] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('pmdr_timer')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        const remaining = Math.floor((data.endAt - Date.now()) / 1000)
        if (remaining > 5) {
          restoredRef.current = true
          setCurrentSession(data.session)
          setMode(data.mode)
          setTimeLeft(remaining)
          setIsRunning(true)
        } else {
          localStorage.removeItem('pmdr_timer')
        }
      } catch { localStorage.removeItem('pmdr_timer') }
    }
    api.get('/api/pomodoro/settings/').then(res => {
      setSettings(res.data); setSettingsForm(res.data)
      if (!restoredRef.current) setTimeLeft(res.data.focus_minutes * 60)
    }).catch(err => console.error(err))
    fetchStats(); fetchHistory(); fetchTodayTasks()
  }, [])

  useEffect(() => {
    if (isRunning && currentSession) {
      localStorage.setItem('pmdr_timer', JSON.stringify({
        session: currentSession, mode, endAt: Date.now() + timeLeft * 1000,
      }))
    } else {
      localStorage.removeItem('pmdr_timer')
    }
  }, [isRunning])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { clearInterval(intervalRef.current); handleTimerEnd(); return 0 }
          return prev - 1
        })
      }, 1000)
    } else { clearInterval(intervalRef.current) }
    return () => clearInterval(intervalRef.current)
  }, [isRunning])

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/pomodoro/settings/')
      setSettings(res.data); setSettingsForm(res.data); setTimeLeft(res.data.focus_minutes * 60)
    } catch (err) { console.error(err) }
  }
  const fetchStats = async () => {
    try { const res = await api.get('/api/pomodoro/stats/'); setStats(res.data) }
    catch (err) { console.error(err) }
  }
  const fetchHistory = async () => {
    try { const res = await api.get('/api/pomodoro/history/'); setHistory(res.data.results || res.data) }
    catch (err) { console.error(err) }
  }
  const fetchTodayTasks = async () => {
    try { const res = await api.get('/api/planner/today/'); setTasks(res.data.tasks || []) }
    catch (err) { console.error(err) }
  }

  const getDuration = (m) => {
    if (m === 'focus') return settings.focus_minutes
    if (m === 'short_break') return settings.short_break_minutes
    return settings.long_break_minutes
  }

  const handleStart = async () => {
    try {
      const res = await api.post('/api/pomodoro/start/', { session_type: mode, task_id: selectedTask?.id || null })
      setCurrentSession(res.data.session); setIsRunning(true)
    } catch (err) { console.error(err) }
  }
  const handlePause = () => setIsRunning(false)
  const handleResume = () => setIsRunning(true)
  const handleCancel = async () => {
    setIsRunning(false); setTimerFinished(false)
    localStorage.removeItem('pmdr_timer')
    if (currentSession) {
      try { await api.patch(`/api/pomodoro/sessions/${currentSession.id}/cancel/`) }
      catch (err) { console.error(err) }
    }
    setCurrentSession(null); setTimeLeft(getDuration(mode) * 60)
    fetchStats(); fetchHistory()
  }
  const handleTimerEnd = async () => {
    setIsRunning(false); setTimerFinished(true)
    localStorage.removeItem('pmdr_timer')
    if (currentSession) {
      try {
        const res = await api.patch(`/api/pomodoro/sessions/${currentSession.id}/complete/`)
        const next = res.data.next; setCurrentSession(null)
        switchMode(next.type, next.duration_minutes)
        fetchStats(); fetchHistory()
        try {
          const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value = 800
          gain.gain.setValueAtTime(0.3, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
          osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5)
        } catch { }
      } catch (err) { console.error(err) }
    }
  }
  const switchMode = (newMode, minutes = null) => {
    setMode(newMode); setTimeLeft((minutes || getDuration(newMode)) * 60)
    setIsRunning(false); setCurrentSession(null); setTimerFinished(false)
  }
  const saveSettings = async () => {
    try {
      const res = await api.patch('/api/pomodoro/settings/', settingsForm)
      setSettings(res.data); setShowSettings(false)
      if (!isRunning) setTimeLeft(res.data.focus_minutes * 60)
    } catch (err) { console.error(err) }
  }
  const formatTime = (seconds) =>
    `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`

  const totalSeconds = getDuration(mode) * 60
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100
  const circumference = 2 * Math.PI * 165

  const modeConfig = {
    focus: { label: t('pomodoro.focusSession'), color: '#7c6aff' },
    short_break: { label: t('pomodoro.shortBreak'), color: '#43e97b' },
    long_break: { label: t('pomodoro.longBreak'), color: '#45aaf2' },
  }
  const current = modeConfig[mode]

  const iconBtn = {
    width: 64, height: 64, borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 22, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s', outline: 'none',
  }
  const cancelBtn = {
    ...iconBtn,
    background: 'rgba(255,107,107,0.1)',
    border: '1px solid rgba(255,107,107,0.2)',
    color: '#ff6b6b',
  }
  const GLASS_MODAL = {
    background: 'rgba(12,12,20,0.96)',
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
    borderRadius: 24, padding: 24, width: '100%', maxWidth: 420,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#06060d', position: 'relative' }}>
      <BlobBackground />

      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        minHeight: '100vh', padding: '32px 24px',
      }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 760, marginBottom: 36 }}>
          <div>
            <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 30, margin: 0 }}>{t('pomodoro.title')}</h1>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, marginTop: 5 }}>{t('pomodoro.tagline')}</p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 50, padding: '11px 22px', color: 'rgba(255,255,255,0.6)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
          >⚙️ {t('pomodoro.settings')}</button>
        </div>

        <div style={{
          display: 'flex', gap: 6,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 50, padding: 6,
          marginBottom: 52,
        }}>
          {Object.entries(modeConfig).map(([key, val]) => (
            <button
              key={key}
              onClick={() => !isRunning && switchMode(key)}
              disabled={isRunning}
              style={{
                padding: '12px 30px', borderRadius: 50, border: 'none',
                fontWeight: 600, fontSize: 14, cursor: isRunning ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                background: mode === key ? val.color : 'transparent',
                color: mode === key ? '#fff' : 'rgba(255,255,255,0.4)',
                boxShadow: mode === key ? `0 0 16px ${val.color}40` : 'none',
              }}
            >{val.label}</button>
          ))}
        </div>

        <div style={{ position: 'relative', marginBottom: 52 }}>
          <svg width="380" height="380" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
            <circle cx="190" cy="190" r="165" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
            <circle
              cx="190" cy="190" r="165" fill="none"
              stroke={current.color} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (progress / 100) * circumference}
              style={{
                transition: 'stroke-dashoffset 1s linear',
                filter: `drop-shadow(0 0 14px ${current.color})`,
              }}
            />
          </svg>

          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 80, fontWeight: 700, color: '#fff', letterSpacing: -3, lineHeight: 1 }}>
              {formatTime(timeLeft)}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 3, marginTop: 12 }}>
              {current.label}
            </span>
            {selectedTask && (
              <div style={{
                background: 'rgba(124,106,255,0.12)',
                border: '1px solid rgba(124,106,255,0.2)',
                borderRadius: 20, fontSize: 13, color: '#7c6aff',
                padding: '5px 14px', marginTop: 12,
                maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>📌 {selectedTask.title}</div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>

          {!currentSession && (
            <>
              <button onClick={() => setShowTaskPicker(true)} title="Attach task" style={iconBtn}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
              >📌</button>

              {timerFinished ? (
                <button
                  onClick={() => { setTimerFinished(false); setTimeLeft(getDuration(mode) * 60) }}
                  style={{
                    width: 96, height: 96, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.08)',
                    border: `2px solid ${current.color}`,
                    color: current.color, fontSize: 34, cursor: 'pointer',
                    boxShadow: `0 0 30px ${current.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = current.color; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = current.color; e.currentTarget.style.transform = 'scale(1)' }}
                >↺</button>
              ) : (
                <button
                  onClick={handleStart}
                  style={{
                    width: 96, height: 96, borderRadius: '50%',
                    background: current.color, border: 'none', color: '#fff',
                    fontSize: 34, cursor: 'pointer',
                    boxShadow: `0 0 40px ${current.color}50, 0 0 80px ${current.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >▶</button>
              )}

              <button onClick={() => setShowSettings(true)} style={iconBtn}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
              >⚙️</button>
            </>
          )}

          {currentSession && isRunning && (
            <>
              <button onClick={handleCancel} style={cancelBtn}>✕</button>

              <button
                onClick={handlePause}
                style={{
                  width: 96, height: 96, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff', fontSize: 34, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              >⏸</button>

              <div style={{ width: 64, height: 64 }} />
            </>
          )}

          {currentSession && !isRunning && (
            <>
              <button onClick={handleCancel} style={cancelBtn}>✕</button>

              <button
                onClick={handleResume}
                style={{
                  width: 96, height: 96, borderRadius: '50%',
                  background: current.color, border: 'none', color: '#fff',
                  fontSize: 34, cursor: 'pointer',
                  boxShadow: `0 0 40px ${current.color}50, 0 0 80px ${current.color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >▶</button>

              <div style={{ width: 64, height: 64 }} />
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 32 }}>
          {Array.from({ length: settings.sessions_before_long_break }).map((_, i) => {
            const sessionsInCycle = (stats?.today?.sessions || 0) % settings.sessions_before_long_break
            const filled = i < sessionsInCycle
            return (
              <div key={i} style={{
                width: 10, height: 10, borderRadius: '50%',
                background: filled ? current.color : 'rgba(255,255,255,0.1)',
                boxShadow: filled ? `0 0 8px ${current.color}` : 'none',
                transition: 'all 0.3s',
              }} />
            )
          })}
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>
            {settings.sessions_before_long_break - ((stats?.today?.sessions || 0) % settings.sessions_before_long_break)} {t('pomodoro.untilLongBreak')}
          </span>
        </div>


        <div style={{
          display: 'flex', marginTop: 44, width: '100%', maxWidth: 760,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, padding: 4,
        }}>
          {[
            { value: stats?.today?.sessions || 0, label: t('pomodoro.sessionsToday') },
            { value: `${stats?.today?.focus_hours || 0}${t('units.hour')}`, label: t('pomodoro.focusHours') },
            { value: stats?.all_time?.sessions || 0, label: t('pomodoro.allTimeSessions') },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, padding: '16px 20px', textAlign: 'center',
              borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}>
              <div style={{ fontSize: 34, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 }}>{s.label}</div>
            </div>
          ))}
        </div>

      </div>

      {showTaskPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={GLASS_MODAL}>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 17, marginBottom: 6 }}>📌 {t('pomodoro.attachTask')}</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 16 }}>{t('pomodoro.attachTaskDesc')}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto', marginBottom: 16 }}>
              <button
                onClick={() => { setSelectedTask(null); setShowTaskPicker(false) }}
                style={{
                  textAlign: 'left', padding: '12px 16px', borderRadius: 12, cursor: 'pointer', fontSize: 13,
                  border: !selectedTask ? '1px solid rgba(124,106,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  background: !selectedTask ? 'rgba(124,106,255,0.1)' : 'rgba(255,255,255,0.03)',
                  color: !selectedTask ? '#7c6aff' : 'rgba(255,255,255,0.4)',
                }}
              >{t('pomodoro.noTaskFocus')}</button>

              {tasks.filter(task => !task.is_done).map(task => (
                <button
                  key={task.id}
                  onClick={() => { setSelectedTask(task); setShowTaskPicker(false) }}
                  style={{
                    textAlign: 'left', padding: '12px 16px', borderRadius: 12, cursor: 'pointer', fontSize: 13,
                    border: selectedTask?.id === task.id ? '1px solid rgba(124,106,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    background: selectedTask?.id === task.id ? 'rgba(124,106,255,0.1)' : 'rgba(255,255,255,0.03)',
                    color: selectedTask?.id === task.id ? '#7c6aff' : '#fff',
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{task.title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{task.category} · {task.duration_minutes}min</div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowTaskPicker(false)}
              style={{ width: '100%', padding: '12px 0', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}
            >{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ ...GLASS_MODAL, maxWidth: 380 }}>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 17, marginBottom: 24 }}>⚙️ {t('pomodoro.settings')}</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { key: 'focus_minutes', label: t('pomodoro.focusMinutes'), min: 1, max: 120 },
                { key: 'short_break_minutes', label: t('pomodoro.shortBreakMinutes'), min: 1, max: 30 },
                { key: 'long_break_minutes', label: t('pomodoro.longBreakMinutes'), min: 1, max: 60 },
                { key: 'sessions_before_long_break', label: t('pomodoro.sessionsBeforeLongBreak'), min: 1, max: 10 },
              ].map(({ key, label, min, max }) => (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{label}</label>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{settingsForm[key]}</span>
                  </div>
                  <input
                    type="range" min={min} max={max} value={settingsForm[key]}
                    onChange={e => setSettingsForm({ ...settingsForm, [key]: parseInt(e.target.value) })}
                    style={{ width: '100%', accentColor: current.color }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                onClick={() => setShowSettings(false)}
                style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}
              >{t('common.cancel')}</button>
              <button
                onClick={saveSettings}
                style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: current.color, border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: `0 4px 16px ${current.color}40` }}
              >{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}