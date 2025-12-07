import { Info, X } from 'lucide-react'
import { useTranslation } from '../../hooks/useTranslation'

const AboutModal = ({ onClose, language = 'en' }) => {
  const { t } = useTranslation(language)

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Info className="text-blue-500" size={20} />
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">{t('aboutTitle')}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label={t('close')}
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-700 dark:text-gray-200 mb-3">
          {t('aboutDescription')}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {t('aboutEarly')}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200 mb-4">
          {t('aboutGoal')}
        </p>

        <a
          href="https://github.com/LandoNikko/Transit-Designer"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-300 hover:underline text-sm font-semibold"
        >
          {t('viewOnGithub')}
        </a>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AboutModal

