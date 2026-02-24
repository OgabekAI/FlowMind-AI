import { useTranslation } from 'react-i18next'

const languages = [
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'uz', label: 'UZ', flag: '🇺🇿' },
  { code: 'ru', label: 'RU', flag: '🇷🇺' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()

  return (
    <div className="flex items-center gap-1 bg-[#1a1a26] border border-white/10 rounded-xl p-1">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
            i18n.language === lang.code
              ? 'bg-[#7c6aff] text-white'
              : 'text-[#6666aa] hover:text-white'
          }`}
        >
          <span>{lang.flag}</span>
          {lang.label}
        </button>
      ))}
    </div>
  )
}