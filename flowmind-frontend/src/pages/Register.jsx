import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const TIMEZONES = [
  'UTC',
  'Asia/Baku',
  'Asia/Istanbul',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Europe/London',
  'Europe/Paris',
  'Europe/Moscow',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Australia/Sydney',
  'Africa/Cairo',
]

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    password2: '',
    occupation: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.password2) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      const data = err.response?.data
      if (data) {
        const firstError = Object.values(data)[0]
        setError(Array.isArray(firstError) ? firstError[0] : firstError)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 py-12">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#7c6aff] opacity-10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#7c6aff] rounded-2xl mb-4 shadow-lg shadow-[#7c6aff]/30">
            <span className="text-2xl">🧠</span>
          </div>
          <h1 className="text-3xl font-bold text-white">
            Flow<span className="text-[#7c6aff]">Mind</span>
          </h1>
          <p className="text-[#6666aa] mt-1 text-sm">Get in the flow. Master your mind.</p>
        </div>

        {/* Card */}
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">Create your account</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-[#6666aa] mb-1.5 block">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-[#444466] focus:outline-none focus:border-[#7c6aff] transition-colors"
              />
            </div>

            <div>
              <label className="text-sm text-[#6666aa] mb-1.5 block">Username</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="yourname"
                required
                className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-[#444466] focus:outline-none focus:border-[#7c6aff] transition-colors"
              />
            </div>

            <div>
              <label className="text-sm text-[#6666aa] mb-1.5 block">
                Occupation <span className="text-[#444466]">(optional)</span>
              </label>
              <input
                type="text"
                name="occupation"
                value={form.occupation}
                onChange={handleChange}
                placeholder="Student, Developer, Designer..."
                className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-[#444466] focus:outline-none focus:border-[#7c6aff] transition-colors"
              />
            </div>

            <div>
              <label className="text-sm text-[#6666aa] mb-1.5 block">Timezone</label>
              <select
                name="timezone"
                value={form.timezone}
                onChange={handleChange}
                className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#7c6aff] transition-colors"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-[#6666aa] mb-1.5 block">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-[#444466] focus:outline-none focus:border-[#7c6aff] transition-colors"
              />
            </div>

            <div>
              <label className="text-sm text-[#6666aa] mb-1.5 block">Confirm Password</label>
              <input
                type="password"
                name="password2"
                value={form.password2}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-[#444466] focus:outline-none focus:border-[#7c6aff] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#7c6aff] hover:bg-[#6a58ee] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition-all duration-200 shadow-lg shadow-[#7c6aff]/25 mt-2"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-[#6666aa] mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-[#7c6aff] hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}