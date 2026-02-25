import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import BlobBackground from '../components/BlobBackground'

export default function AIChat() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => { fetchHistory() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const fetchHistory = async () => {
    try {
      const res = await api.get('/api/ai/chat/')
      const all = res.data.results || res.data
      // Filter out messages before the last clear action
      const clearedAt = localStorage.getItem('chat_cleared_at')
      const filtered = clearedAt
        ? all.filter(m => new Date(m.timestamp) > new Date(clearedAt))
        : all
      setMessages(filtered)
    } catch (err) { console.error(err) } finally { setFetching(false) }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: userMessage, timestamp: new Date().toISOString() }])
    setLoading(true)
    try {
      const res = await api.post('/api/ai/chat/', { message: userMessage })
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: res.data.response, timestamp: res.data.timestamp }])
    } catch {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: 'Sorry, I could not process your message. Please try again.', timestamp: new Date().toISOString() }])
    } finally { setLoading(false) }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }
  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const clearChat = () => {
    localStorage.setItem('chat_cleared_at', new Date().toISOString())
    setMessages([])
  }

  const suggestedPrompts = [
    t('chat.prompts.focus'), t('chat.prompts.goals'), t('chat.prompts.tip'),
    t('chat.prompts.prioritize'), t('chat.prompts.schedule'), t('chat.prompts.motivate'),
  ]

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#06060d', position: 'relative' }}>
      <BlobBackground />
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} } @keyframes onlinePulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {/* HEADER */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(30px)',
        flexShrink: 0, position: 'relative', zIndex: 2,
      }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: '#7c6aff', boxShadow: '0 0 24px rgba(124,106,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
        <div>
          <h1 style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{t('chat.title')}</h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{t('chat.poweredBy')}</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#43e97b', animation: 'onlinePulse 2s infinite' }} />
            <span style={{ color: '#43e97b', fontSize: 12, fontWeight: 500 }}>{t('chat.online')}</span>
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: 12, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.1)'; e.currentTarget.style.color = '#ff6b6b' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
            >🗑️ {t('chat.clear')}</button>
          )}
        </div>
      </div>

      {/* MESSAGES */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 1 }}>
        {fetching ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <div style={{ color: '#7c6aff' }}>Loading...</div>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🤖</div>
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Hey {user?.username}! 👋</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, maxWidth: 360 }}>{t('chat.emptyState')} I know your goals and today's plan — ask me anything!</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', maxWidth: 480 }}>
              {suggestedPrompts.map((prompt, i) => (
                <button key={i} onClick={() => setInput(prompt)} style={{
                  textAlign: 'left', padding: '12px 16px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14, color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,106,255,0.3)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(124,106,255,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                >{prompt}</button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', gap: 12, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: msg.role === 'user' ? 14 : 16,
                  background: msg.role === 'user' ? 'linear-gradient(135deg,#7c6aff,#ff6b6b)' : '#7c6aff',
                  color: '#fff', fontWeight: 700,
                }}>
                  {msg.role === 'user' ? user?.username?.[0]?.toUpperCase() : '🤖'}
                </div>
                <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', gap: 4, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    padding: '12px 16px', fontSize: 14, lineHeight: 1.6,
                    ...(msg.role === 'user'
                      ? { background: 'linear-gradient(135deg,#7c6aff,#a855f7)', borderRadius: '18px 18px 4px 18px', color: '#fff', boxShadow: '0 4px 16px rgba(124,106,255,0.3)' }
                      : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderLeft: '2px solid #43e97b', borderRadius: '18px 18px 18px 4px', color: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)' }
                    ),
                  }}>{msg.content}</div>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, paddingInline: 4 }}>{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#7c6aff', boxShadow: '0 0 16px rgba(124,106,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🤖</div>
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px 18px 18px 4px', padding: '14px 18px', display: 'flex', gap: 6, alignItems: 'center' }}>
                  {[0, 150, 300].map((d, i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c6aff', boxShadow: '0 0 6px rgba(124,106,255,0.6)', animation: `bounce 1s infinite`, animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* QUICK PROMPTS */}
      {messages.length > 0 && !loading && (
        <div style={{ padding: '8px 24px', display: 'flex', gap: 8, overflowX: 'auto', flexShrink: 0, position: 'relative', zIndex: 2 }}>
          {suggestedPrompts.slice(0, 4).map((prompt, i) => (
            <button key={i} onClick={() => setInput(prompt)} style={{ flexShrink: 0, padding: '6px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,106,255,0.3)'; e.currentTarget.style.color = '#a89aff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
            >{prompt}</button>
          ))}
        </div>
      )}

      {/* INPUT */}
      <div style={{
        padding: '16px 24px', background: 'rgba(255,255,255,0.03)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(30px)', flexShrink: 0, position: 'relative', zIndex: 2,
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.placeholder')}
            rows={1}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, padding: '12px 16px', color: '#fff', fontSize: 14, outline: 'none',
              resize: 'none', maxHeight: 120, fontFamily: 'inherit', transition: 'border-color 0.2s',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(124,106,255,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,106,255,0.1)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }}
          />
          <button onClick={sendMessage} disabled={!input.trim() || loading} style={{
            width: 44, height: 44, background: '#7c6aff', border: 'none', cursor: 'pointer',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(124,106,255,0.35)', flexShrink: 0,
            opacity: (!input.trim() || loading) ? 0.4 : 1, fontSize: 18, color: '#fff',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { if (input.trim() && !loading) e.currentTarget.style.background = '#6a58ee' }}
            onMouseLeave={e => e.currentTarget.style.background = '#7c6aff'}
          >↑</button>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'center', marginTop: 8 }}>{t('chat.enterToSend')}</p>
      </div>
    </div>
  )
}