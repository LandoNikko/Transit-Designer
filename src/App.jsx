import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import MapEditor from './components/MapEditor/MapEditor'
import AnnouncementPanel from './components/AnnouncementEditor/AnnouncementPanel'
import Toolbar from './components/Shared/Toolbar'
import APIKeyInput from './components/Shared/APIKeyInput'
import AboutModal from './components/Shared/AboutModal'
import PresetSidebar from './components/Shared/PresetSidebar'
import CreateLineModal from './components/Shared/CreateLineModal'
import { trainPresets } from './data/presets'
import { getPresetPath } from './data/audioPresets'

function App() {
  const [stations, setStations] = useState([])
  const [lines, setLines] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [audioAssignments, setAudioAssignments] = useState({})
  const [announcementTypes, setAnnouncementTypes] = useState({})
  const [betweenSegments, setBetweenSegments] = useState({})
  const [uploadedAudios, setUploadedAudios] = useState([])
  const [generatedAudioHistory, setGeneratedAudioHistory] = useState({})
  const [currentTool, setCurrentTool] = useState('select')
  const [selectedStations, setSelectedStations] = useState([])
  const [apiKey, setApiKey] = useState(sessionStorage.getItem('elevenLabsApiKey') || '')
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [showAboutModal, setShowAboutModal] = useState(false)
  const [currentPresetId, setCurrentPresetId] = useState(null)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved === 'true'
  })
  const [gridZoom, setGridZoom] = useState(1)
  const [labelSize, setLabelSize] = useState(1)
  const [lineThickness, setLineThickness] = useState(1)
  const [markerSize, setMarkerSize] = useState(1)
  const [gridThickness, setGridThickness] = useState(1)
  const [gridOpacity, setGridOpacity] = useState(1)
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en'
  })
  const [isMobile, setIsMobile] = useState(false)
  const [showMobilePresets, setShowMobilePresets] = useState(false)
  const [showMobileAnnouncements, setShowMobileAnnouncements] = useState(false)
  const [showMobileHeader, setShowMobileHeader] = useState(true)
  const [lineStyle, setLineStyle] = useState(() => {
    return localStorage.getItem('lineStyle') || 'smooth'
  })
  const [gridStyle, setGridStyle] = useState(() => {
    return localStorage.getItem('gridStyle') || 'dots'
  })
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const historyIndexRef = useRef(-1)
  const mapEditorRef = useRef(null)
  const [showStationNumbers, setShowStationNumbers] = useState(false)
  const [selectedStationId, setSelectedStationId] = useState(null)
  const [playingStationId, setPlayingStationId] = useState(null)
  const [isStationPlaying, setIsStationPlaying] = useState(false)
  const [showTranscription, setShowTranscription] = useState(false)
  const [currentTranscription, setCurrentTranscription] = useState('')
  const [selectedLineId, setSelectedLineId] = useState(null)
  const [audioProcessingPreset, setAudioProcessingPreset] = useState(() => {
    return localStorage.getItem('audioProcessingPreset') || 'standard'
  })
  const [customTransitSystems, setCustomTransitSystems] = useState(() => {
    const saved = localStorage.getItem('customTransitSystems')
    return saved ? JSON.parse(saved) : []
  })
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [isLoadingPreset, setIsLoadingPreset] = useState(false)
  const [showCreateLineModal, setShowCreateLineModal] = useState(false)

  useEffect(() => {
    const defaultPreset = trainPresets.find(p => p.id === 'simple')
    if (defaultPreset && stations.length === 0) {
      loadPreset(defaultPreset)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode.toString())
    
    const htmlElement = document.documentElement
    const bodyElement = document.body
    
    htmlElement.classList.remove('dark')
    if (bodyElement) bodyElement.classList.remove('dark')
    
    if (isDarkMode) {
      htmlElement.classList.add('dark')
      if (bodyElement) bodyElement.classList.add('dark')
    }
  }, [isDarkMode])

  useEffect(() => {
    localStorage.setItem('language', language)
  }, [language])

  useEffect(() => {
    localStorage.setItem('lineStyle', lineStyle)
  }, [lineStyle])

  useEffect(() => {
    localStorage.setItem('gridStyle', gridStyle)
  }, [gridStyle])

  useEffect(() => {
    localStorage.setItem('audioProcessingPreset', audioProcessingPreset)
  }, [audioProcessingPreset])

  useEffect(() => {
    localStorage.setItem('customTransitSystems', JSON.stringify(customTransitSystems))
  }, [customTransitSystems])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])


  const handleApiKeySave = useCallback((key) => {
    sessionStorage.setItem('elevenLabsApiKey', key)
    setApiKey(key)
    setShowApiKeyInput(false)
  }, [])

  const loadPreset = useCallback((preset) => {
    setIsLoadingPreset(true)
    
    const baseSpacing = 30
    const currentSpacing = 30 * gridZoom
    const stationsWithIndices = preset.stations.map(station => {
      const gridIndexX = station.gridIndexX ?? Math.round(station.x / baseSpacing)
      const gridIndexY = station.gridIndexY ?? Math.round(station.y / baseSpacing)
      return {
        ...station,
        gridIndexX,
        gridIndexY,
        x: gridIndexX * currentSpacing,
        y: gridIndexY * currentSpacing
      }
    })
    
    // Convert filename-based audio assignments to URL-based
    const processedAudioAssignments = {}
    const rawAudioAssignments = preset.audioAssignments || {}
    Object.keys(rawAudioAssignments).forEach(slotId => {
      const assignment = rawAudioAssignments[slotId]
      if (assignment.filename) {
        processedAudioAssignments[slotId] = {
          ...assignment,
          url: getPresetPath(assignment.filename)
        }
      } else {
        processedAudioAssignments[slotId] = assignment
      }
    })
    
    const initialAudioAssignments = processedAudioAssignments
    const initialAnnouncementTypes = preset.announcementTypes || {}
    const initialBetweenSegments = preset.betweenSegments || {}
    const initialUploadedAudios = preset.uploadedAudios || []
    const initialGeneratedAudioHistory = {}
    
    // Use base setters to avoid saving preset load to history
    setStations(stationsWithIndices)
    setLines(preset.lines)
    setAudioAssignments(initialAudioAssignments)
    setAnnouncementTypes(initialAnnouncementTypes)
    setBetweenSegments(initialBetweenSegments)
    setUploadedAudios(initialUploadedAudios)
    setGeneratedAudioHistory(initialGeneratedAudioHistory)
    
    // Now save this as the initial history state
    setHistory([{
      stations: stationsWithIndices,
      lines: preset.lines,
      audioAssignments: initialAudioAssignments,
      announcementTypes: initialAnnouncementTypes,
      betweenSegments: initialBetweenSegments,
      uploadedAudios: initialUploadedAudios,
      generatedAudioHistory: initialGeneratedAudioHistory
    }])
    setHistoryIndex(0)
    
    setCurrentPresetId(preset.id)
    setSelectedStations([])
    setIsCustomMode(preset.isCustom || false)
    
    setTimeout(() => {
      if (mapEditorRef.current?.centerView) {
        mapEditorRef.current.centerView(false)
      }
      setIsLoadingPreset(false)
    }, 150)
    setAnnouncements([])
  }, [gridZoom])

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  const handleModification = useCallback((newStations, newLines, newAudioAssignments, newAnnouncementTypes, newBetweenSegments, newUploadedAudios, newGeneratedAudioHistory) => {
    if (isLoadingPreset) return
    
    setIsCustomMode(currentMode => {
      setCurrentPresetId(currentId => {
        const stationsToUse = newStations ?? stations
        const linesToUse = newLines ?? lines
        const audioAssignmentsToUse = newAudioAssignments ?? audioAssignments
        const announcementTypesToUse = newAnnouncementTypes ?? announcementTypes
        const betweenSegmentsToUse = newBetweenSegments ?? betweenSegments
        const uploadedAudiosToUse = newUploadedAudios ?? uploadedAudios
        const generatedAudioHistoryToUse = newGeneratedAudioHistory ?? generatedAudioHistory
        
        if (currentMode) {
          setCustomTransitSystems(prev => prev.map(p => 
            p.id === currentId ? {
              ...p,
              stations: structuredClone(stationsToUse),
              lines: structuredClone(linesToUse),
              audioAssignments: structuredClone(audioAssignmentsToUse),
              announcementTypes: structuredClone(announcementTypesToUse),
              betweenSegments: structuredClone(betweenSegmentsToUse),
              uploadedAudios: structuredClone(uploadedAudiosToUse),
              generatedAudioHistory: structuredClone(generatedAudioHistoryToUse)
            } : p
          ))
          return currentId
        }
        
        const builtInPreset = trainPresets.find(p => p.id === currentId)
        if (!builtInPreset) return currentId
        
        const timestamp = Date.now()
        const copyId = `custom-${timestamp}`
        
        const linesWithCopySuffix = linesToUse.map(line => ({
          ...line,
          name: `${line.name} (Copy)`
        }))
        
        const newTransitSystem = {
          id: copyId,
          name: builtInPreset.name,
          nameKey: builtInPreset.name,
          isCopy: true,
          description: builtInPreset.description || 'Custom',
          descriptionKey: builtInPreset.description,
          fullDescription: builtInPreset.fullDescription,
          fullDescriptionKey: builtInPreset.fullDescription,
          stations: structuredClone(stationsToUse),
          lines: structuredClone(linesWithCopySuffix),
          audioAssignments: structuredClone(audioAssignmentsToUse),
          announcementTypes: structuredClone(announcementTypesToUse),
          betweenSegments: structuredClone(betweenSegmentsToUse),
          uploadedAudios: structuredClone(uploadedAudiosToUse),
          generatedAudioHistory: structuredClone(generatedAudioHistoryToUse),
          isCustom: true
        }
        
        setCustomTransitSystems(prev => [newTransitSystem, ...prev])
        setLines(linesWithCopySuffix)
        
        return copyId
      })
      return true
    })
  }, [isLoadingPreset, stations, lines, audioAssignments, announcementTypes, betweenSegments, uploadedAudios, generatedAudioHistory])

  const handleCreateCustomLine = useCallback((stationCount, lineName, lineColor, isLoop, gridPositions = []) => {
    const timestamp = Date.now()
    const baseSpacing = 30
    const minGridIndex = 3
    const maxGridIndex = 20
    
    let newStations = []
    let newLines = []
    
    if (stationCount > 0) {
      const stationIds = []
      
      newStations = Array.from({ length: stationCount }, (_, i) => {
        let gridIndexX, gridIndexY
        if (gridPositions.length > i) {
          gridIndexX = gridPositions[i].gridIndexX
          gridIndexY = gridPositions[i].gridIndexY
        } else {
          gridIndexX = minGridIndex + Math.floor(Math.random() * (maxGridIndex - minGridIndex))
          gridIndexY = minGridIndex + Math.floor(Math.random() * (maxGridIndex - minGridIndex))
        }
        
        const stationId = `station-${timestamp}-${i}`
        stationIds.push(stationId)
        
        return {
          id: stationId,
          name: `Station ${i + 1}`,
          gridIndexX,
          gridIndexY,
          x: gridIndexX * baseSpacing,
          y: gridIndexY * baseSpacing,
          color: lineColor,
          lineId: `line-${timestamp}`,
          index: i
        }
      })
      
      const lineStationIds = isLoop ? [...stationIds, stationIds[0]] : stationIds
      
      newLines = [{
        id: `line-${timestamp}`,
        name: lineName,
        color: lineColor,
        stations: lineStationIds
      }]
    }
    
    const newTransitSystem = {
      id: `custom-${timestamp}`,
      name: lineName,
      description: 'Custom',
      fullDescription: 'Custom transit system',
      stations: newStations,
      lines: newLines,
      audioAssignments: {},
      announcementTypes: {},
      betweenSegments: {},
      uploadedAudios: [],
      generatedAudioHistory: {},
      isCustom: true
    }
    
    setCustomTransitSystems(prev => [newTransitSystem, ...prev])
    loadPreset(newTransitSystem)
    setShowCreateLineModal(false)
  }, [loadPreset])

  // Sync historyIndex with ref
  useEffect(() => {
    historyIndexRef.current = historyIndex
  }, [historyIndex])

  // Save state to history - using structuredClone for better performance
  const saveToHistory = useCallback((newStations, newLines, newAudioAssignments, newAnnouncementTypes, newBetweenSegments, newUploadedAudios, newGeneratedAudioHistory) => {
    const newState = {
      stations: structuredClone(newStations),
      lines: structuredClone(newLines),
      audioAssignments: structuredClone(newAudioAssignments),
      announcementTypes: structuredClone(newAnnouncementTypes),
      betweenSegments: structuredClone(newBetweenSegments),
      uploadedAudios: structuredClone(newUploadedAudios),
      generatedAudioHistory: structuredClone(newGeneratedAudioHistory)
    }
    
    setHistory(prevHistory => {
      const newHistory = prevHistory.slice(0, historyIndexRef.current + 1)
      newHistory.push(newState)
      
      // Keep only last 100 actions
      if (newHistory.length > 100) {
        newHistory.shift()
        return newHistory
      }
      
      return newHistory
    })
    
    setHistoryIndex(prev => Math.min(prev + 1, 99))
  }, [])

  // Wrap setStations to save history
  const updateStations = useCallback((newStations) => {
    if (typeof newStations === 'function') {
      setStations(prev => {
        const updated = newStations(prev)
        handleModification(updated, lines, audioAssignments, announcementTypes, betweenSegments, uploadedAudios, generatedAudioHistory)
        saveToHistory(updated, lines, audioAssignments, announcementTypes, betweenSegments, uploadedAudios, generatedAudioHistory)
        return updated
      })
    } else {
      handleModification(newStations, lines, audioAssignments, announcementTypes, betweenSegments, uploadedAudios, generatedAudioHistory)
      saveToHistory(newStations, lines, audioAssignments, announcementTypes, betweenSegments, uploadedAudios, generatedAudioHistory)
      setStations(newStations)
    }
  }, [lines, audioAssignments, announcementTypes, betweenSegments, uploadedAudios, generatedAudioHistory, saveToHistory, handleModification])

  // Wrap setLines to save history
  const updateLines = useCallback((newLines) => {
    if (typeof newLines === 'function') {
      setLines(prev => {
        const updated = newLines(prev)
        handleModification(stations, updated, audioAssignments, announcementTypes, betweenSegments, uploadedAudios, generatedAudioHistory)
        saveToHistory(stations, updated, audioAssignments, announcementTypes, betweenSegments, uploadedAudios, generatedAudioHistory)
        return updated
      })
    } else {
      handleModification(stations, newLines, audioAssignments, announcementTypes, betweenSegments, uploadedAudios, generatedAudioHistory)
      saveToHistory(stations, newLines, audioAssignments, announcementTypes, betweenSegments, uploadedAudios, generatedAudioHistory)
      setLines(newLines)
    }
  }, [stations, audioAssignments, announcementTypes, betweenSegments, uploadedAudios, generatedAudioHistory, saveToHistory, handleModification])

  // Wrap announcement state setters to save history
  const updateAudioAssignments = useCallback((newAssignments) => {
    if (typeof newAssignments === 'function') {
      setAudioAssignments(prev => {
        const updated = newAssignments(prev)
        handleModification(stations, lines, updated, announcementTypes, betweenSegments, uploadedAudios, generatedAudioHistory)
        saveToHistory(stations, lines, updated, announcementTypes, betweenSegments, uploadedAudios, generatedAudioHistory)
        return updated
      })
    } else {
      handleModification(stations, lines, newAssignments, announcementTypes, betweenSegments, uploadedAudios, generatedAudioHistory)
      saveToHistory(stations, lines, newAssignments, announcementTypes, betweenSegments, uploadedAudios, generatedAudioHistory)
      setAudioAssignments(newAssignments)
    }
  }, [stations, lines, announcementTypes, betweenSegments, uploadedAudios, generatedAudioHistory, saveToHistory, handleModification])

  const updateAnnouncementTypes = useCallback((newTypes) => {
    if (typeof newTypes === 'function') {
      setAnnouncementTypes(prev => {
        const updated = newTypes(prev)
        saveToHistory(stations, lines, audioAssignments, updated, betweenSegments, uploadedAudios, generatedAudioHistory)
        return updated
      })
    } else {
      saveToHistory(stations, lines, audioAssignments, newTypes, betweenSegments, uploadedAudios, generatedAudioHistory)
      setAnnouncementTypes(newTypes)
    }
  }, [stations, lines, audioAssignments, betweenSegments, uploadedAudios, generatedAudioHistory, saveToHistory])

  const updateBetweenSegments = useCallback((newSegments) => {
    if (typeof newSegments === 'function') {
      setBetweenSegments(prev => {
        const updated = newSegments(prev)
        saveToHistory(stations, lines, audioAssignments, announcementTypes, updated, uploadedAudios, generatedAudioHistory)
        return updated
      })
    } else {
      saveToHistory(stations, lines, audioAssignments, announcementTypes, newSegments, uploadedAudios, generatedAudioHistory)
      setBetweenSegments(newSegments)
    }
  }, [stations, lines, audioAssignments, announcementTypes, uploadedAudios, generatedAudioHistory, saveToHistory])

  const updateUploadedAudios = useCallback((newAudios) => {
    if (typeof newAudios === 'function') {
      setUploadedAudios(prev => {
        const updated = newAudios(prev)
        saveToHistory(stations, lines, audioAssignments, announcementTypes, betweenSegments, updated, generatedAudioHistory)
        return updated
      })
    } else {
      saveToHistory(stations, lines, audioAssignments, announcementTypes, betweenSegments, newAudios, generatedAudioHistory)
      setUploadedAudios(newAudios)
    }
  }, [stations, lines, audioAssignments, announcementTypes, betweenSegments, generatedAudioHistory, saveToHistory])

  const updateGeneratedAudioHistory = useCallback((newHistory) => {
    if (typeof newHistory === 'function') {
      setGeneratedAudioHistory(prev => {
        const updated = newHistory(prev)
        saveToHistory(stations, lines, audioAssignments, announcementTypes, betweenSegments, uploadedAudios, updated)
        return updated
      })
    } else {
      saveToHistory(stations, lines, audioAssignments, announcementTypes, betweenSegments, uploadedAudios, newHistory)
      setGeneratedAudioHistory(newHistory)
    }
  }, [stations, lines, audioAssignments, announcementTypes, betweenSegments, uploadedAudios, saveToHistory])

  // Combined update for stations and lines (for atomic operations like merging)
  const updateStationsAndLines = useCallback((newStations, newLines) => {
    const resolvedStations = typeof newStations === 'function' ? newStations(stations) : newStations
    const resolvedLines = typeof newLines === 'function' ? newLines(lines) : newLines
    
    handleModification(resolvedStations, resolvedLines, audioAssignments, announcementTypes, betweenSegments, uploadedAudios, generatedAudioHistory)
    saveToHistory(resolvedStations, resolvedLines, audioAssignments, announcementTypes, betweenSegments, uploadedAudios, generatedAudioHistory)
    setStations(resolvedStations)
    setLines(resolvedLines)
  }, [stations, lines, audioAssignments, announcementTypes, betweenSegments, uploadedAudios, generatedAudioHistory, saveToHistory, handleModification])

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      const state = history[newIndex]
      setStations(state.stations)
      setLines(state.lines)
      setAudioAssignments(state.audioAssignments || {})
      setAnnouncementTypes(state.announcementTypes || {})
      setBetweenSegments(state.betweenSegments || {})
      setUploadedAudios(state.uploadedAudios || [])
      setGeneratedAudioHistory(state.generatedAudioHistory || {})
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      const state = history[newIndex]
      setStations(state.stations)
      setLines(state.lines)
      setAudioAssignments(state.audioAssignments || {})
      setAnnouncementTypes(state.announcementTypes || {})
      setBetweenSegments(state.betweenSegments || {})
      setUploadedAudios(state.uploadedAudios || [])
      setGeneratedAudioHistory(state.generatedAudioHistory || {})
    }
  }

  const handleResetToDefault = useCallback(() => {
    const defaultPreset = trainPresets.find(p => p.id === 'simple')
    if (defaultPreset) {
      loadPreset(defaultPreset)
      setGridZoom(1)
    }
  }, [loadPreset])

  const handlePlayingStationChange = useCallback((stationId, isPlaying) => {
    setPlayingStationId(stationId)
    setIsStationPlaying(isPlaying)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {(!isMobile || showMobileHeader) && (
        <Toolbar 
          currentTool={currentTool}
          onToolChange={setCurrentTool}
          onShowAbout={() => setShowAboutModal(true)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          gridZoom={gridZoom}
          onGridZoomChange={setGridZoom}
          onReset={handleResetToDefault}
          language={language}
          onLanguageChange={setLanguage}
          lineStyle={lineStyle}
          onLineStyleChange={setLineStyle}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          isMobile={isMobile}
          showMobileHeader={showMobileHeader}
          onToggleMobileHeader={() => setShowMobileHeader(!showMobileHeader)}
          showStationNumbers={showStationNumbers}
          onToggleStationNumbers={() => setShowStationNumbers(!showStationNumbers)}
        />
      )}
      
      {showApiKeyInput && (
        <APIKeyInput 
          onSave={handleApiKeySave}
          onClose={() => setShowApiKeyInput(false)}
          initialKey={apiKey}
          language={language}
        />
      )}
      
      {showAboutModal && (
        <AboutModal
          onClose={() => setShowAboutModal(false)}
          language={language}
        />
      )}
      
      <div className="flex flex-1 overflow-hidden relative">
        {(!isMobile || showMobilePresets) && (
          <div className={`${isMobile ? 'absolute left-0 top-0 bottom-0 z-20 w-64 shadow-xl' : ''}`}>
            <PresetSidebar 
              onLoadPreset={loadPreset}
              currentPresetId={currentPresetId}
              language={language}
              isMobile={isMobile}
              onClose={() => setShowMobilePresets(false)}
              customTransitSystems={customTransitSystems}
              setCustomTransitSystems={setCustomTransitSystems}
              onCreateEmpty={() => setShowCreateLineModal(true)}
            />
          </div>
        )}
        
        <div className="flex-1 border-r border-gray-200 dark:border-gray-700 relative">
          <MapEditor
            ref={mapEditorRef}
            stations={stations}
            setStations={updateStations}
            setStationsNoHistory={setStations}
            lines={lines}
            setLines={updateLines}
            setStationsAndLines={updateStationsAndLines}
            currentTool={currentTool}
            setCurrentTool={setCurrentTool}
            selectedStations={selectedStations}
            setSelectedStations={setSelectedStations}
            gridZoom={gridZoom}
            onGridZoomChange={setGridZoom}
            language={language}
            lineStyle={lineStyle}
            onLineStyleChange={setLineStyle}
            gridStyle={gridStyle}
            onGridStyleChange={setGridStyle}
            showStationNumbers={showStationNumbers}
            isMobile={isMobile}
            selectedStationId={selectedStationId}
            playingStationId={playingStationId}
            isStationPlaying={isStationPlaying}
            showTranscription={showTranscription}
            setShowTranscription={setShowTranscription}
            currentTranscription={currentTranscription}
            selectedLineId={selectedLineId}
            labelSize={labelSize}
            onLabelSizeChange={setLabelSize}
            lineThickness={lineThickness}
            onLineThicknessChange={setLineThickness}
            markerSize={markerSize}
            onMarkerSizeChange={setMarkerSize}
            gridThickness={gridThickness}
            onGridThicknessChange={setGridThickness}
            gridOpacity={gridOpacity}
            onGridOpacityChange={setGridOpacity}
            currentPresetId={currentPresetId}
            customTransitSystems={customTransitSystems}
          />
          
          {isMobile && (
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
              {!showMobileHeader && (
                <button
                  onClick={() => setShowMobileHeader(true)}
                  className="bg-blue-500 text-white p-3 rounded-lg shadow-lg"
                  title="Show Menu"
                >
                  ☰
                </button>
              )}
              <button
                onClick={() => setShowMobilePresets(!showMobilePresets)}
                className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg shadow-lg text-sm font-medium"
              >
                {showMobilePresets ? '✕' : '📋'}
              </button>
              <button
                onClick={() => setShowMobileAnnouncements(!showMobileAnnouncements)}
                className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg shadow-lg text-sm font-medium"
              >
                {showMobileAnnouncements ? '✕' : '🔊'}
              </button>
            </div>
          )}
        </div>
        
        {(!isMobile || showMobileAnnouncements) && (
          <div className={`${isMobile ? 'absolute right-0 top-0 bottom-0 z-20 w-80 shadow-xl' : 'w-96'} flex flex-col bg-white dark:bg-gray-800`}>
            <AnnouncementPanel
              stations={stations}
              lines={lines}
              announcements={announcements}
              setAnnouncements={setAnnouncements}
              audioAssignments={audioAssignments}
              setAudioAssignments={updateAudioAssignments}
              announcementTypes={announcementTypes}
              setAnnouncementTypes={updateAnnouncementTypes}
              betweenSegments={betweenSegments}
              setBetweenSegments={updateBetweenSegments}
              uploadedAudios={uploadedAudios}
              setUploadedAudios={updateUploadedAudios}
              generatedAudioHistory={generatedAudioHistory}
              setGeneratedAudioHistory={updateGeneratedAudioHistory}
              apiKey={apiKey}
              onShowApiKey={() => setShowApiKeyInput(true)}
              language={language}
              isMobile={isMobile}
              onClose={() => setShowMobileAnnouncements(false)}
              onStationSelect={setSelectedStationId}
              selectedStationId={selectedStationId}
              showStationNumbers={showStationNumbers}
              onPlayingStationChange={handlePlayingStationChange}
              showTranscription={showTranscription}
              setShowTranscription={setShowTranscription}
              setCurrentTranscription={setCurrentTranscription}
              audioProcessingPreset={audioProcessingPreset}
              setAudioProcessingPreset={setAudioProcessingPreset}
              selectedLineId={selectedLineId}
              setSelectedLineId={setSelectedLineId}
            />
          </div>
        )}
      </div>

      {showCreateLineModal && (
        <CreateLineModal
          onClose={() => setShowCreateLineModal(false)}
          onCreate={handleCreateCustomLine}
          language={language}
          lineStyle={lineStyle}
        />
      )}
    </div>
  )
}

export default App
