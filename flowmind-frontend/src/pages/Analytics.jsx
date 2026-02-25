import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import api from '../api/axios'
import BlobBackground from '../components/BlobBackground'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Area, AreaChart
} from 'recharts'

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

export default function Analytics() {
  const { t } = useTranslation()
  const [weeklyStats, setWeeklyStats] = useState(null)
  const [monthlyStats, setMonthlyStats] = useState(null)
  const [aiSummary, setAiSummary] = useState('')
  const [loadingAi, setLoadingAi] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('weekly')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [weekRes, monthRes] = await Promise.all([
        api.get('/api/analytics/weekly/'),
        api.get('/api/analytics/monthly/'),
      ])
      setWeeklyStats(weekRes.data)
      setMonthlyStats(monthRes.data)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const getAiSummary = async () => {
    setLoadingAi(true)
    try {
      const res = await api.get('/api/analytics/weekly/summary/')
      setAiSummary(res.data.summary)
    } catch { setAiSummary('Could not generate summary. Try again later.') }
    finally { setLoadingAi(false) }
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(18,18,26,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '10px 14px', fontSize: 13 }}>
          <p style={{ color: '#fff', fontWeight: 700, marginBottom: 6 }}>{label}</p>
          {payload.map((p, i) => {
            // Always use a legible color — completed=green, total=white, rate=green
            const color = p.dataKey === 'completed_tasks' || p.name?.toLowerCase().includes('completed') ? '#43e97b'
              : p.name?.toLowerCase().includes('rate') ? '#43e97b'
                : '#fff'
            return (
              <p key={i} style={{ color, marginBottom: 2, fontWeight: 500 }}>
                {p.name}: <span style={{ fontWeight: 700 }}>{p.value}{p.name?.includes('Rate') ? '%' : ''}</span>
              </p>
            )
          })}
        </div>
      )
    }
    return null
  }

  const stats = activeTab === 'weekly' ? weeklyStats : monthlyStats
  const translateDayName = (dayName) => { const key = `days.${dayName}`; const translated = i18n.t(key); return translated === key ? dayName : translated }
  const chartData = (stats?.days || []).map(day => ({ ...day, day_name: translateDayName(day.day_name) }))

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#06060d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <BlobBackground /><div style={{ color: '#7c6aff', position: 'relative', zIndex: 1 }}>Loading...</div>
    </div>
  )

  const rate = stats?.summary?.completion_rate || 0
  const rateColor = rate >= 70 ? '#43e97b' : rate >= 40 ? '#f7b731' : '#ff6b6b'

  return (
    <div style={{ minHeight: '100vh', background: '#06060d', padding: 32, position: 'relative' }}>
      <BlobBackground />
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{t('analytics.title')}</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>{t('analytics.trackDesc')}</p>
          </div>
          {/* TAB SWITCHER */}
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 4, display: 'flex', gap: 4 }}>
            {[['weekly', t('analytics.weeklyStats')], ['monthly', t('analytics.monthlyStats')]].map(([tab, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: activeTab === tab ? '#7c6aff' : 'transparent',
                color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.4)',
                boxShadow: activeTab === tab ? '0 2px 10px rgba(124,106,255,0.4)' : 'none',
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { icon: '✅', value: stats?.summary?.completed_tasks || 0, label: t('analytics.completionRate'), sub: `${t('common.of', 'of')} ${stats?.summary?.total_tasks || 0} ${t('analytics.totalTasks').toLowerCase()}`, accent: '#7c6aff' },
            { icon: '🔥', value: `${rate}%`, label: t('analytics.completionRate'), sub: rate >= 70 ? t('analytics.excellent') : rate >= 40 ? t('analytics.good') : t('analytics.keepGoing'), accent: rateColor, subColor: rateColor },
            { icon: '⏱️', value: `${stats?.summary?.total_focus_hours || 0}h`, label: t('analytics.focusHours'), accent: '#4fc3f7' },
            { icon: '⭐', value: stats?.summary?.best_day ? translateDayName(stats.summary.best_day) : '—', label: t('analytics.bestDay'), accent: '#43e97b' },
          ].map((s, i) => (
            <div key={i} style={{ ...GLASS, borderRadius: 20, padding: '20px 22px', position: 'relative', overflow: 'hidden', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{s.label}</div>
              {s.sub && <div style={{ fontSize: 11, color: s.subColor || 'rgba(255,255,255,0.3)', marginTop: 2, fontWeight: s.subColor ? 600 : 400 }}>{s.sub}</div>}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: s.accent, borderRadius: '0 0 20px 20px' }} />
            </div>
          ))}
        </div>

        {/* CHARTS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* COMPLETION RATE */}
          <div style={{ ...GLASS, padding: 24 }}>
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: 20 }}>{t('analytics.completionRate')}</h3>
            {chartData.length === 0 ? (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>{t('analytics.noData')}</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs><linearGradient id="cRate" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c6aff" stopOpacity={0.3} /><stop offset="95%" stopColor="#7c6aff" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day_name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="completion_rate" name="Completion Rate" stroke="#7c6aff" strokeWidth={2} fill="url(#cRate)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* TASKS BAR */}
          <div style={{ ...GLASS, padding: 24 }}>
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: 20 }}>{t('analytics.tasksOverview')}</h3>
            {chartData.length === 0 ? (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>{t('analytics.noData')}</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day_name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total_tasks" name="Total" fill="rgba(124,106,255,0.2)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed_tasks" name="Completed" fill="#7c6aff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* FOCUS HOURS */}
          <div style={{ ...GLASS, padding: 24 }}>
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: 20 }}>{t('analytics.focusHours')}</h3>
            {chartData.length === 0 ? (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>{t('analytics.noData')}</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs><linearGradient id="cFocus" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#43e97b" stopOpacity={0.3} /><stop offset="95%" stopColor="#43e97b" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day_name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="focus_hours" name="Focus Hours" stroke="#43e97b" strokeWidth={2} fill="url(#cFocus)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* DAILY BREAKDOWN */}
          <div style={{ ...GLASS, padding: 24 }}>
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: 20 }}>{t('analytics.dailyBreakdown')}</h3>
            {chartData.length === 0 ? (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>{t('analytics.noData')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {chartData.slice(-7).map((day, i) => {
                  const barColor = day.completion_rate >= 70 ? '#43e97b' : day.completion_rate >= 40 ? '#f7b731' : '#7c6aff'
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, width: 32, flexShrink: 0 }}>{day.day_name}</span>
                      <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${day.completion_rate}%`, background: barColor, borderRadius: 999, boxShadow: `0 0 6px ${barColor}60`, transition: 'width 0.7s ease' }} />
                      </div>
                      <span style={{ color: '#fff', fontSize: 11, fontWeight: 500, width: 36, textAlign: 'right', flexShrink: 0 }}>{day.completion_rate}%</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, width: 52, textAlign: 'right', flexShrink: 0 }}>{day.completed_tasks}/{day.total_tasks}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* AI WEEKLY SUMMARY */}
        <div style={{ ...GLASS_PURPLE, padding: 24 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(124,106,255,0.5),transparent)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: '#7c6aff', boxShadow: '0 0 20px rgba(124,106,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
              <h3 style={{ color: '#fff', fontWeight: 700 }}>{t('analytics.weeklySummary')}</h3>
            </div>
            {!aiSummary ? (
              <button onClick={getAiSummary} disabled={loadingAi} style={{ background: 'rgba(124,106,255,0.15)', border: '1px solid rgba(124,106,255,0.3)', color: '#7c6aff', fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 10, cursor: 'pointer', opacity: loadingAi ? 0.5 : 1 }}>{loadingAi ? '🤖 Thinking...' : t('analytics.getAiSummary')}</button>
            ) : (
              <button onClick={() => setAiSummary('')} style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>{t('analytics.refresh', 'Refresh')}</button>
            )}
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            {aiSummary ? (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.7 }}>{aiSummary}</p>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>{t('analytics.aiSummaryHint')}</p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}