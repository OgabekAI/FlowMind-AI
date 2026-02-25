import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function AIChat() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchHistory = async () => {
    try {
      const res = await api.get('/api/ai/chat/')
      setMessages(res.data.results || res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setFetching(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')

    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    }])

    setLoading(true)

    try {
      const res = await api.post('/api/ai/chat/', { message: userMessage })
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.data.response,
        timestamp: res.data.timestamp,
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I could not process your message. Please try again.',
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const suggestedPrompts = [
    t('chat.prompts.focus'),
    t('chat.prompts.goals'),
    t('chat.prompts.tip'),
    t('chat.prompts.prioritize'),
    t('chat.prompts.schedule'),
    t('chat.prompts.motivate'),
  ]

  const clearChat = () => {
    setMessages([])
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f]">

      {/* HEADER */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/10 bg-[#12121a] flex-shrink-0">
        <div className="w-10 h-10 bg-[#7c6aff] rounded-xl flex items-center justify-center text-xl shadow-lg shadow-[#7c6aff]/30">
          🤖
        </div>
        <div>
          <h1 className="text-white font-bold">{t('chat.title')}</h1>
          <p className="text-[#6666aa] text-xs">Powered by Llama 3.3 · Always here to help</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#43e97b] animate-pulse" />
            <span className="text-[#43e97b] text-xs font-medium">Online</span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-[#6666aa] hover:text-red-400 text-xs px-3 py-1.5 rounded-lg transition-all"
            >
              🗑️ Clear
            </button>
          )}
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">

        {fetching ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[#7c6aff]">Loading...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-white font-bold text-xl mb-2">
                Hey {user?.username}! 👋
              </h2>
              <p className="text-[#6666aa] text-sm max-w-sm">
                {t('chat.emptyState')} I know your goals and today's plan — ask me anything!
              </p>
            </div>

            {/* SUGGESTED PROMPTS — empty state */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="text-left px-4 py-3 bg-[#12121a] border border-white/10 hover:border-[#7c6aff]/30 hover:bg-[#7c6aff]/5 rounded-xl text-[#6666aa] hover:text-white text-xs transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* AVATAR */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-[#7c6aff] to-[#ff6b6b] text-white font-bold'
                    : 'bg-[#7c6aff] text-white'
                }`}>
                  {msg.role === 'user'
                    ? user?.username?.[0]?.toUpperCase()
                    : '🤖'}
                </div>

                {/* BUBBLE */}
                <div className={`max-w-[70%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#7c6aff] text-white rounded-tr-sm'
                      : 'bg-[#12121a] border border-white/10 text-[#d0d0f0] rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-[#444466] text-xs px-1">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {/* TYPING INDICATOR */}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#7c6aff] flex items-center justify-center text-sm flex-shrink-0">
                  🤖
                </div>
                <div className="bg-[#12121a] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <div className="w-2 h-2 rounded-full bg-[#7c6aff] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-[#7c6aff] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-[#7c6aff] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* SUGGESTED PROMPTS — shown when there are messages */}
      {messages.length > 0 && !loading && (
        <div className="px-6 py-2 flex gap-2 overflow-x-auto flex-shrink-0">
          {suggestedPrompts.slice(0, 4).map((prompt, i) => (
            <button
              key={i}
              onClick={() => setInput(prompt)}
              className="flex-shrink-0 px-3 py-1.5 bg-[#12121a] border border-white/10 hover:border-[#7c6aff]/30 rounded-xl text-[#6666aa] hover:text-white text-xs transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* INPUT */}
      <div className="px-6 py-4 border-t border-white/10 bg-[#12121a] flex-shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.placeholder')}
            rows={1}
            className="flex-1 bg-[#1a1a26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-[#444466] focus:outline-none focus:border-[#7c6aff] transition-colors resize-none"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-11 h-11 bg-[#7c6aff] hover:bg-[#6a58ee] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all shadow-lg shadow-[#7c6aff]/25 flex-shrink-0"
          >
            <span className="text-white text-lg">↑</span>
          </button>
        </div>
        <p className="text-[#444466] text-xs mt-2 text-center">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>

    </div>
  )
}