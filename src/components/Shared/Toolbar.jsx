import { MousePointer2, MapPin, Info, RotateCcw, Globe, Undo2, Redo2, ChevronUp, GitBranch, Pencil, Hash } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { languages } from '../../locales/translations'

const Toolbar = ({ currentTool, onToolChange, onShowAbout, isDarkMode, onToggleDarkMode, gridZoom, onGridZoomChange, onReset, language, onLanguageChange, lineStyle, onLineStyleChange, onUndo, onRedo, canUndo, canRedo, isMobile, showMobileHeader, onToggleMobileHeader, showStationNumbers, onToggleStationNumbers }) => {
  const { t } = useTranslation(language)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const languageMenuRef = useRef(null)
  const tools = [
    { id: 'select', icon: MousePointer2, label: t('selectTool') },
    { id: 'station', icon: MapPin, label: t('addStationTool') },
    { id: 'createLine', icon: GitBranch, label: t('createTrainLineTool') },
    { id: 'drawPath', icon: Pencil, label: t('drawPathTool') },
  ]

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
        setShowLanguageMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-2 md:px-4 py-2 md:py-3 transition-colors">
      {/* Desktop Layout */}
      <div className="hidden md:flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.location.reload()}
            className="text-xl font-bold text-gray-800 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400 transition-all duration-200 hover:scale-105 cursor-pointer"
            title="Refresh page"
          >
            {t('appTitle')}
          </button>
          
          <div 
            className="flex gap-0 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden"
            style={{ backgroundColor: 'var(--toolbar-group-bg)' }}
          >
            <button
              onClick={() => onToolChange('select')}
              className={`flex items-center gap-2 px-4 py-2 transition-colors ${
                currentTool === 'select' ? 'btn-selected' : 'btn-unselected'
              }`}
            >
              <MousePointer2 size={18} />
              <span className="text-sm font-medium">{t('selectTool')}</span>
            </button>
            
            <button
              onClick={() => onToolChange('createLine')}
              className={`flex items-center gap-2 px-4 py-2 transition-colors ${
                currentTool === 'createLine' ? 'btn-selected' : 'btn-unselected'
              }`}
            >
              <GitBranch size={18} />
              <span className="text-sm font-medium">{t('createTrainLineTool')}</span>
            </button>
            
            {(currentTool === 'createLine' || currentTool === 'station' || currentTool === 'drawPath') && (
              <>
                <button
                  onClick={() => onToolChange('station')}
                  className={`flex items-center gap-2 px-4 py-2 transition-colors ${
                    currentTool === 'station' ? 'btn-selected' : 'btn-unselected'
                  }`}
                >
                  <MapPin size={18} />
                  <span className="text-sm font-medium">{t('addStationTool')}</span>
                </button>
                
                <button
                  onClick={() => onToolChange('drawPath')}
                  className={`flex items-center gap-2 px-4 py-2 transition-colors ${
                    currentTool === 'drawPath' ? 'btn-selected' : 'btn-unselected'
                  }`}
                >
                  <Pencil size={18} />
                  <span className="text-sm font-medium">{t('drawPathTool')}</span>
                </button>
              </>
            )}
          </div>
        </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleStationNumbers}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              showStationNumbers
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title={showStationNumbers ? t('hideStationNumbers') : t('showStationNumbers')}
          >
            <Hash size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={t('undo')}
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={t('redo')}
          >
            <Redo2 size={18} />
          </button>
        </div>

        <button
          onClick={onReset}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title={t('resetToDefault')}
        >
          <RotateCcw size={18} />
        </button>

        <div 
          className="relative" 
          ref={languageMenuRef}
        >
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Language"
          >
            <Globe size={18} />
            <span className="text-lg flag-emoji">{languages.find(l => l.code === language)?.flag}</span>
          </button>
          
           {showLanguageMenu && (
             <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-[100]">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    onLanguageChange(lang.code)
                    setShowLanguageMenu(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    language === lang.code ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  }`}
                >
                  <span className="text-xl flag-emoji">{lang.flag}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{lang.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onToggleDarkMode}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title={isDarkMode ? t('switchToLightMode') : t('switchToDarkMode')}
        >
          <i className={`${isDarkMode ? 'ri-sun-fill' : 'ri-moon-fill'} text-lg`}></i>
        </button>
        
        <button
          onClick={onShowAbout}
          className="flex items-center gap-2 px-2 md:px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors"
        >
          <Info size={18} />
          <span className="text-sm font-medium">
            {t('about')}
          </span>
        </button>
      </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                currentTool === tool.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
              title={tool.label}
            >
              <tool.icon size={18} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-40"
            title={t('undo')}
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-40"
            title={t('redo')}
          >
            <Redo2 size={16} />
          </button>
          
          <button
            onClick={onToggleDarkMode}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <i className={`${isDarkMode ? 'ri-sun-fill' : 'ri-moon-fill'}`}></i>
          </button>
          
          <button
            onClick={onShowAbout}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200"
          >
            <Info size={16} />
          </button>
          
          <button
            onClick={onToggleMobileHeader}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <ChevronUp size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Toolbar
