import { useTranslation } from 'react-i18next'

const languages = [
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'uz', label: 'UZ', flag: '🇺🇿' },
  { code: 'ru', label: 'RU', flag: '🇷🇺' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, padding: 4,
      width: '100%',
    }}>
      {languages.map((lang) => {
        const isActive = i18n.language === lang.code
        return (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, padding: '7px 0', borderRadius: 10,
              border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              transition: 'all 0.2s',
              background: isActive ? '#7c6aff' : 'transparent',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
              boxShadow: isActive ? '0 2px 8px rgba(124,106,255,0.35)' : 'none',
            }}
          >
            <span>{lang.flag}</span>
            {lang.label}
          </button>
        )
      })}
    </div>
  )
}