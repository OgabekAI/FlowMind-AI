import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import api from '../api/axios'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line,
  CartesianGrid, Area, AreaChart
} from 'recharts'

export default function Analytics() {
  const { t } = useTranslation()
  const [weeklyStats, setWeeklyStats] = useState(null)
  const [monthlyStats, setMonthlyStats] = useState(null)
  const [aiSummary, setAiSummary] = useState('')
  const [loadingAi, setLoadingAi] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('weekly')

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      const [weekRes, monthRes] = await Promise.all([
        api.get('/api/analytics/weekly/'),
        api.get('/api/analytics/monthly/'),
      ])
      setWeeklyStats(weekRes.data)
      setMonthlyStats(monthRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getAiSummary = async () => {
    setLoadingAi(true)
    try {
      const res = await api.get('/api/analytics/weekly/summary/')
      setAiSummary(res.data.summary)
    } catch {
      setAiSummary('Could not generate summary. Try again later.')
    } finally {
      setLoadingAi(false)
    }
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a26] border border-white/10 rounded-xl px-3 py-2 text-xs">
          <p className="text-white font-semibold mb-1">{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }}>{p.name}: {p.value}{p.name.includes('Rate') ? '%' : ''}</p>
          ))}
        </div>
      )
    }
    return null
  }

  const stats = activeTab === 'weekly' ? weeklyStats : monthlyStats

  // Translate day names coming from the backend (always English abbreviations)
  const translateDayName = (dayName) => {
    const key = `days.${dayName}`
    const translated = i18n.t(key)
    return translated === key ? dayName : translated  // fallback to original if key missing
  }

  const chartData = (stats?.days || []).map(day => ({
    ...day,
    day_name: translateDayName(day.day_name),
  }))

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
          <h1 className="text-2xl md:text-3xl font-bold text-white">{t('analytics.title')}</h1>
          <p className="text-[#6666aa] text-sm mt-1">{t('analytics.trackDesc')}</p>
        </div>

        {/* TAB SWITCHER */}
        <div className="bg-[#12121a] border border-white/10 rounded-xl p-1 flex gap-1">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'weekly'
              ? 'bg-[#7c6aff] text-white'
              : 'text-[#6666aa] hover:text-white'
              }`}
          >
            {t('analytics.weeklyStats')}
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'monthly'
              ? 'bg-[#7c6aff] text-white'
              : 'text-[#6666aa] hover:text-white'
              }`}
          >
            {t('analytics.monthlyStats')}
          </button>
        </div>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-5">
          <div className="text-2xl mb-2">✅</div>
          <div className="text-2xl font-bold text-white">
            {stats?.summary?.completed_tasks || 0}
          </div>
          <div className="text-[#6666aa] text-xs mt-1">{t('analytics.completionRate')}</div>
          <div className="text-[#444466] text-xs">{t('common.of', 'of')} {stats?.summary?.total_tasks || 0} {t('analytics.totalTasks').toLowerCase()}</div>
        </div>

        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-5">
          <div className="text-2xl mb-2">🔥</div>
          <div className="text-2xl font-bold text-white">
            {stats?.summary?.completion_rate || 0}%
          </div>
          <div className="text-[#6666aa] text-xs mt-1">{t('analytics.completionRate')}</div>
          <div className={`text-xs mt-1 font-medium ${(stats?.summary?.completion_rate || 0) >= 70
            ? 'text-[#43e97b]'
            : (stats?.summary?.completion_rate || 0) >= 40
              ? 'text-[#f7b731]'
              : 'text-red-400'
            }`}>
            {(stats?.summary?.completion_rate || 0) >= 70 ? t('analytics.excellent') :
              (stats?.summary?.completion_rate || 0) >= 40 ? t('analytics.good') : t('analytics.keepGoing')}
          </div>
        </div>

        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-5">
          <div className="text-2xl mb-2">⏱️</div>
          <div className="text-2xl font-bold text-white">
            {stats?.summary?.total_focus_hours || 0}h
          </div>
          <div className="text-[#6666aa] text-xs mt-1">{t('analytics.focusHours')}</div>
        </div>

        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-5">
          <div className="text-2xl mb-2">⭐</div>
          <div className="text-2xl font-bold text-white truncate">
            {stats?.summary?.best_day ? translateDayName(stats.summary.best_day) : '—'}
          </div>
          <div className="text-[#6666aa] text-xs mt-1">{t('analytics.bestDay')}</div>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* COMPLETION RATE CHART */}
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-5">{t('analytics.completionRate')}</h3>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[#6666aa] text-sm">
              {t('analytics.noData')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c6aff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7c6aff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="day_name"
                  tick={{ fill: '#6666aa', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6666aa', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="completion_rate"
                  name="Completion Rate"
                  stroke="#7c6aff"
                  strokeWidth={2}
                  fill="url(#colorRate)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* TASKS BAR CHART */}
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-5">{t('analytics.tasksOverview')}</h3>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[#6666aa] text-sm">
              {t('analytics.noData')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="day_name"
                  tick={{ fill: '#6666aa', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6666aa', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total_tasks" name="Total" fill="rgba(124,106,255,0.3)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed_tasks" name="Completed" fill="#7c6aff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* FOCUS HOURS CHART */}
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-5">{t('analytics.focusHours')}</h3>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[#6666aa] text-sm">
              {t('analytics.noData')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#43e97b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#43e97b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="day_name"
                  tick={{ fill: '#6666aa', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6666aa', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="focus_hours"
                  name="Focus Hours"
                  stroke="#43e97b"
                  strokeWidth={2}
                  fill="url(#colorFocus)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* DAILY BREAKDOWN */}
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-5">{t('analytics.dailyBreakdown')}</h3>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[#6666aa] text-sm">
              {t('analytics.noData')}
            </div>
          ) : (
            <div className="space-y-3">
              {chartData.slice(-7).map((day, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[#6666aa] text-xs w-8 flex-shrink-0">{day.day_name}</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${day.completion_rate}%`,
                        background: day.completion_rate >= 70
                          ? '#43e97b'
                          : day.completion_rate >= 40
                            ? '#f7b731'
                            : '#7c6aff'
                      }}
                    />
                  </div>
                  <span className="text-white text-xs font-medium w-10 text-right flex-shrink-0">
                    {day.completion_rate}%
                  </span>
                  <span className="text-[#6666aa] text-xs w-14 text-right flex-shrink-0">
                    {day.completed_tasks}/{day.total_tasks} {t('analytics.totalTasks').toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI WEEKLY SUMMARY */}
      <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#7c6aff] rounded-xl flex items-center justify-center text-lg">
              🤖
            </div>
            <h3 className="text-white font-bold">{t('analytics.weeklySummary')}</h3>
          </div>
          {!aiSummary && (
            <button
              onClick={getAiSummary}
              disabled={loadingAi}
              className="bg-[#7c6aff]/15 hover:bg-[#7c6aff]/25 border border-[#7c6aff]/30 text-[#7c6aff] text-xs font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-50"
            >
              {loadingAi ? '🤖 Thinking...' : t('analytics.getAiSummary')}
            </button>
          )}
          {aiSummary && (
            <button
              onClick={() => setAiSummary('')}
              className="text-[#6666aa] hover:text-white text-xs transition-all"
            >
              {t('analytics.refresh', 'Refresh')}
            </button>
          )}
        </div>

        {aiSummary ? (
          <p className="text-[#9090c0] text-sm leading-relaxed">{aiSummary}</p>
        ) : (
          <p className="text-[#6666aa] text-sm">
            {t('analytics.aiSummaryHint')}
          </p>
        )}
      </div>

    </div>
  )
}