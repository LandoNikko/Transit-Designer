import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Play, Pause, Square, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Volume2, VolumeX, SkipBack, SkipForward, List, GitCommitVertical, Building2, TrainFront, ArrowDown, AlertTriangle, Plus, RotateCcw, Music, Radio, Bell, Clock, MapPin, Info, MessageSquare, Trash2, FileText, Download, Image, FolderArchive, Ear } from 'lucide-react'
import { useTranslation } from '../../hooks/useTranslation'
import { getAllPresets } from '../../data/audioPresets'
import { getAudioProcessor } from '../../utils/audioProcessor'
import { generateSoundEffect } from '../../utils/elevenLabsAPI'
import JSZip from 'jszip'

export const SoundWave = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
    <rect x="1" y="5" width="2" height="4" fill="currentColor" className="animate-sound-wave" style={{ animationDelay: '0ms' }} />
    <rect x="4" y="3" width="2" height="8" fill="currentColor" className="animate-sound-wave" style={{ animationDelay: '150ms' }} />
    <rect x="7" y="2" width="2" height="10" fill="currentColor" className="animate-sound-wave" style={{ animationDelay: '300ms' }} />
    <rect x="10" y="4" width="2" height="6" fill="currentColor" className="animate-sound-wave" style={{ animationDelay: '450ms' }} />
  </svg>
)

// Reusable class strings for consistency
const BUTTON_CLASSES = "flex items-center justify-center p-1.5 rounded-lg transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"

const AnnouncementPanel = ({ 
  stations, 
  lines, 
  announcements, 
  setAnnouncements, 
  audioAssignments,
  setAudioAssignments,
  announcementTypes,
  setAnnouncementTypes,
  betweenSegments,
  setBetweenSegments,
  uploadedAudios,
  setUploadedAudios,
  generatedAudioHistory,
  setGeneratedAudioHistory,
  apiKey, 
  onShowApiKey = () => {},
  language = 'en', 
  isMobile, 
  onClose,
  onStationSelect,
  selectedStationId,
  showStationNumbers = false,
  onPlayingStationChange,
  showTranscription = false,
  setShowTranscription,
  setCurrentTranscription,
  selectedLineId,
  setSelectedLineId,
  audioProcessingPreset = 'standard',
  setAudioProcessingPreset
}) => {
  const { t } = useTranslation(language)
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null)
  const [isPlayingAll, setIsPlayingAll] = useState(false)
  const audioProcessorRef = useRef(null)
  const audioProcessingPresetRef = useRef(audioProcessingPreset)
  const [isPaused, setIsPaused] = useState(false)
  const [openDropdowns, setOpenDropdowns] = useState({})
  const [showAIConfig, setShowAIConfig] = useState(null)
  const [aiGenerationType, setAiGenerationType] = useState('text-to-speech')
  const [aiTextInput, setAiTextInput] = useState('')
  const [aiSelectedVoice, setAiSelectedVoice] = useState('21m00Tcm4TlvDq8ikWAM') // Default Rachel voice
  
  // ElevenLabs voices with preview audio
  const availableVoices = useMemo(() => [
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', preview: '/src/assets/audio/presets/Rachel preview.mp3' },
    { id: 'sRYzP8TwEiiqAWebdYPJ', name: 'Hatakekohei', preview: '/src/assets/audio/presets/Hatakekohei preview.mp3' },
    { id: 'EkK5I93UQWFDigLMpZcX', name: 'James' },
    { id: 'RILOU7YmBhvwJGDGjNmP', name: 'Jane' },
    { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica' },
    { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura' },
    { id: 'x70vRnQBMBu4FAYhjJbO', name: 'Nathan' }
  ], [])
  
  const [voicePreviewPlaying, setVoicePreviewPlaying] = useState(null)
  const [voiceDropdownOpen, setVoiceDropdownOpen] = useState(false)
  const voicePreviewRef = useRef(null)
  const voiceDropdownRef = useRef(null)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [generatedAudioPreviewPlaying, setGeneratedAudioPreviewPlaying] = useState(null)
  const generatedAudioPreviewRef = useRef(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [masterVolume, setMasterVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showVolumeControl, setShowVolumeControl] = useState(false)
  const [showSpeedControl, setShowSpeedControl] = useState(false)
  const [showAudioProcessing, setShowAudioProcessing] = useState(false)
  const [hoveredBetweenSlot, setHoveredBetweenSlot] = useState(null)
  const [stationAudioSlots, setStationAudioSlots] = useState({})
  const [audioDurations, setAudioDurations] = useState({})
  const [audioRemainingTimes, setAudioRemainingTimes] = useState({})
  const [queueProgress, setQueueProgress] = useState(0)
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const fileInputRefs = useRef({})
  const audioRef = useRef(null)
  const dropdownRefs = useRef({})
  const updateIntervalRef = useRef(null)
  const queueUpdateIntervalRef = useRef(null)
  const isPlayingAllRef = useRef(false)

  useEffect(() => {
    isPlayingAllRef.current = isPlayingAll
  }, [isPlayingAll])

  useEffect(() => {
    if (onPlayingStationChange && currentlyPlaying) {
      const match = currentlyPlaying.match(/^station-(.+)$/)
      if (match) {
        onPlayingStationChange(match[1], !isPaused)
      } else {
        onPlayingStationChange(null, false)
      }
    } else if (onPlayingStationChange) {
      onPlayingStationChange(null, false)
    }
  }, [currentlyPlaying, isPaused, onPlayingStationChange])

  useEffect(() => {
    if (currentlyPlaying && !isPaused) {
      const match = currentlyPlaying.match(/^station-(.+)$/)
      if (match && onStationSelect) {
        onStationSelect(match[1])
      } else if (currentlyPlaying.startsWith('between') && onStationSelect) {
        onStationSelect(null)
      }
    }
  }, [currentlyPlaying, isPaused, onStationSelect])

  useEffect(() => {
    if (setCurrentTranscription) {
      if (currentlyPlaying && !isPaused) {
        const assignment = audioAssignments[currentlyPlaying]
        setCurrentTranscription(assignment?.transcription || '')
      } else {
        setCurrentTranscription('')
      }
    }
  }, [currentlyPlaying, isPaused, audioAssignments, setCurrentTranscription])

  // Stop audio playback when preset is loaded (stations/lines change)
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (audioProcessorRef.current) {
      audioProcessorRef.current.setPlaybackState(false)
    }
    setCurrentlyPlaying(null)
    setIsPaused(false)
    setIsPlayingAll(false)
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current)
      updateIntervalRef.current = null
    }
    if (queueUpdateIntervalRef.current) {
      clearInterval(queueUpdateIntervalRef.current)
      queueUpdateIntervalRef.current = null
    }
  }, [stations, lines])

  useEffect(() => {
    if (lines.length > 0) {
      if (!selectedLineId || !lines.find(l => l.id === selectedLineId)) {
      setSelectedLineId(lines[0].id)
    }
    }
  }, [lines, selectedLineId])

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutside = Object.keys(openDropdowns).every(slotId => {
        const ref = dropdownRefs.current[slotId]
        return !ref || !ref.contains(event.target)
      })
      if (clickedOutside) {
        setOpenDropdowns({})
      }
      
      if (voiceDropdownOpen && voiceDropdownRef.current && !voiceDropdownRef.current.contains(event.target)) {
        setVoiceDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openDropdowns, voiceDropdownOpen])

  const selectedLine = useMemo(() => 
    lines.find(line => line.id === selectedLineId),
    [lines, selectedLineId]
  )
  
  const lineStations = useMemo(() => {
    if (!selectedLine) return []
    
    return selectedLine.stations
      .map(stationId => stations.find(s => s.id === stationId))
      .filter(Boolean)
      .filter((station, index, arr) => {
        if (index === arr.length - 1 && arr.length > 1) {
          return station.id !== arr[0].id
        }
        return true
      })
  }, [selectedLine, stations])
  
  const lineColor = selectedLine?.color || '#ef4444'
  const presets = useMemo(() => getAllPresets(), [])
  
  const getStationLines = useCallback((stationId) => {
    return lines.filter(line => line.stations.includes(stationId))
  }, [lines])

  const setupAudioWithProcessing = useCallback((audioElement) => {
    if (!audioProcessorRef.current) {
      audioProcessorRef.current = getAudioProcessor()
    }
    
    try {
      audioProcessorRef.current.disconnect()
      audioProcessorRef.current.createEffectsChain(audioElement)
      audioProcessorRef.current.applyPreset(audioProcessingPresetRef.current)
    } catch (error) {
      console.warn('Could not setup audio processing:', error)
    }
  }, [])

  useEffect(() => {
    audioProcessingPresetRef.current = audioProcessingPreset
  }, [audioProcessingPreset])

  useEffect(() => {
    if (audioProcessorRef.current && audioProcessorRef.current.compressor) {
      try {
        audioProcessorRef.current.applyPreset(audioProcessingPreset)
      } catch (error) {
        console.warn('Could not apply audio preset:', error)
      }
    }
  }, [audioProcessingPreset])

  const loadAudioDuration = (slotId, url) => {
    if (!url) return
    
    try {
      const audio = new Audio(url)
      audio.preload = 'metadata'
      audio.addEventListener('loadedmetadata', () => {
        const duration = Math.ceil(audio.duration)
        if (duration && !isNaN(duration)) {
          setAudioDurations(prev => ({
            ...prev,
            [slotId]: duration
          }))
        }
      })
      audio.addEventListener('error', (e) => {
        console.warn(`Could not load audio metadata for ${slotId}:`, url)
        setAudioDurations(prev => ({
          ...prev,
          [slotId]: 30
        }))
      })
      audio.load()
    } catch (error) {
      console.warn(`Error creating audio for ${slotId}:`, error)
      setAudioDurations(prev => ({
        ...prev,
        [slotId]: 30
      }))
    }
  }

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }

  const getOrderedQueue = useCallback(() => {
    const queue = []
    lineStations.forEach((station, index) => {
      const stationSlotId = `station-${station.id}`
      if (audioAssignments[stationSlotId]?.url) {
        queue.push(stationSlotId)
      }
      
      const extraStationSlots = stationAudioSlots[station.id]
      if (Array.isArray(extraStationSlots)) {
        extraStationSlots.forEach(slotId => {
          if (audioAssignments[slotId]?.url) {
            queue.push(slotId)
          }
        })
      }
      
      if (index < lineStations.length - 1) {
        const betweenSlotId = `between-${station.id}-${lineStations[index + 1].id}`
        if (audioAssignments[betweenSlotId]?.url) {
          queue.push(betweenSlotId)
        }
        
        const extraSegments = betweenSegments[betweenSlotId]
        if (Array.isArray(extraSegments)) {
          extraSegments.forEach(segmentId => {
            if (audioAssignments[segmentId]?.url) {
              queue.push(segmentId)
            }
          })
        }
      }
    })
    return queue
  }, [lineStations, audioAssignments, betweenSegments, stationAudioSlots])

  const getTotalDuration = () => {
    let total = 0
    const queue = getOrderedQueue()
    queue.forEach(slotId => {
      if (audioDurations[slotId]) {
        total += audioDurations[slotId]
      }
    })
    return total
  }

  const getElapsedTime = () => {
    let elapsed = 0
    const queue = getOrderedQueue()
    for (let i = 0; i < currentQueueIndex && i < queue.length; i++) {
      const slotId = queue[i]
      if (audioDurations[slotId]) {
        elapsed += audioDurations[slotId]
      }
    }
    if (queue[currentQueueIndex] && audioRef.current && !audioRef.current.paused) {
      elapsed += Math.ceil(audioRef.current.currentTime)
    }
    return elapsed
  }

  const getRemainingTime = () => {
    return getTotalDuration() - getElapsedTime()
  }

  useEffect(() => {
    if (lineStations.length > 0 && selectedLineId) {
      const newAssignments = {}
      
      const validSlotIds = new Set()
      lineStations.forEach((station, index) => {
        validSlotIds.add(`station-${station.id}`)
        if (index < lineStations.length - 1) {
          validSlotIds.add(`between-${station.id}-${lineStations[index + 1].id}`)
        }
      })
      
      const filteredAssignments = {}
      Object.keys(audioAssignments).forEach(slotId => {
        if (validSlotIds.has(slotId)) {
          filteredAssignments[slotId] = audioAssignments[slotId]
        }
      })
      
      lineStations.forEach((station, index) => {
        const slotIndex = index * 2
        const stationSlotId = `station-${station.id}`
        
        if (!filteredAssignments[stationSlotId]) {
          const preset = presets[slotIndex % presets.length]
          newAssignments[stationSlotId] = {
            type: 'preset',
            url: preset.path,
            name: preset.name
          }
          loadAudioDuration(stationSlotId, preset.path)
        } else {
          newAssignments[stationSlotId] = filteredAssignments[stationSlotId]
          if (filteredAssignments[stationSlotId].url) {
            loadAudioDuration(stationSlotId, filteredAssignments[stationSlotId].url)
          }
        }
        
        if (index < lineStations.length - 1) {
          const betweenSlotId = `between-${station.id}-${lineStations[index + 1].id}`
          if (!filteredAssignments[betweenSlotId]) {
            const preset = presets[(slotIndex + 1) % presets.length]
            newAssignments[betweenSlotId] = {
              type: 'preset',
              url: preset.path,
              name: preset.name
            }
            loadAudioDuration(betweenSlotId, preset.path)
          } else {
            newAssignments[betweenSlotId] = filteredAssignments[betweenSlotId]
            if (filteredAssignments[betweenSlotId].url) {
              loadAudioDuration(betweenSlotId, filteredAssignments[betweenSlotId].url)
            }
          }
        }
      })
      
      setAudioAssignments(newAssignments)
    }
  }, [selectedLineId, lineStations.length])

  const getAnnouncementIcon = useCallback((slotId, type = 'station', customColor = null) => {
    const customType = announcementTypes[slotId] || type
    
    switch(customType) {
      case 'station':
        return <MapPin size={14} style={customColor ? { color: customColor } : {}} className={customColor ? '' : 'text-blue-500'} />
      case 'centralStation':
        return <Building2 size={14} style={customColor ? { color: customColor } : {}} className={customColor ? '' : 'text-purple-500'} />
      case 'arrival':
        return <ArrowDown size={14} className="text-green-500" />
      case 'departure':
        return <TrainFront size={14} className="text-orange-500" />
      case 'transfer':
        return <GitCommitVertical size={14} className="text-purple-500" />
      case 'information':
        return <Info size={14} className="text-cyan-500" />
      case 'live':
        return <MessageSquare size={14} className="text-pink-500" />
      case 'warning':
        return <AlertTriangle size={14} className="text-red-500" />
      case 'chime':
        return <Bell size={14} className="text-yellow-500" />
      case 'music':
        return <Music size={14} className="text-pink-500" />
      case 'ambience':
        return <Radio size={14} className="text-indigo-500" />
      case 'general':
      default:
        return <GitCommitVertical size={14} className="text-gray-400" />
    }
  }, [announcementTypes])

  const getAnnouncementLabel = useCallback((slotId, type = 'general') => {
    const customType = announcementTypes[slotId] || type
    
    switch(customType) {
      case 'station':
        return t('station')
      case 'centralStation':
        return t('centralStation')
      case 'arrival':
        return t('arrival')
      case 'departure':
        return t('departure')
      case 'transfer':
        return t('transfer')
      case 'information':
        return t('information')
      case 'live':
        return t('live')
      case 'warning':
        return t('warning')
      case 'chime':
        return t('chime')
      case 'music':
        return t('music')
      case 'ambience':
        return t('ambience')
      case 'general':
      default:
        return t('general')
    }
  }, [announcementTypes, t])
  
  const renderStationCircle = (stationId) => {
    const stationLines = getStationLines(stationId)
    const colors = stationLines.map(line => line.color)
    
    if (colors.length === 0) {
      return (
        <div className="relative z-10 w-4 h-4 rounded-full bg-gray-400 dark:bg-gray-500 border-[3px] border-gray-200 dark:border-gray-700" />
      )
    }
    
    if (colors.length === 1) {
      return (
        <div 
          className="relative z-10 w-4 h-4 rounded-full border-[3px]" 
          style={{ 
            backgroundColor: colors[0],
            borderColor: colors[0]
          }} 
        />
      )
    }
    
    const segmentAngle = 360 / colors.length
    const gradientStops = colors.map((color, idx) => {
      const start = idx * segmentAngle
      const end = (idx + 1) * segmentAngle
      return `${color} ${start}deg ${end}deg`
    }).join(', ')
    
    return (
      <div 
        className="relative z-10 w-4 h-4 rounded-full"
        style={{
          background: `conic-gradient(${gradientStops})`,
          padding: '3px'
        }}
      >
        <div 
          className="w-full h-full rounded-full" 
          style={{ backgroundColor: colors[0] }}
        />
      </div>
    )
  }

  const handleStationClick = (stationId) => {
    if (onStationSelect) {
      onStationSelect(stationId)
    }
  }

  const handleTypeChange = (slotId, newType) => {
    setAnnouncementTypes(prev => ({
      ...prev,
      [slotId]: newType
    }))
  }

  const addBetweenSegment = (afterSlotId) => {
    const segmentId = `${afterSlotId}-segment-${Date.now()}`
    setBetweenSegments(prev => ({
      ...prev,
      [afterSlotId]: [...(prev[afterSlotId] || []), segmentId]
    }))
  }

  const addStationAudioSlot = (stationId) => {
    const slotId = `station-${stationId}-slot-${Date.now()}`
    setStationAudioSlots(prev => ({
      ...prev,
      [stationId]: [...(prev[stationId] || []), slotId]
    }))
  }

  const removeStationAudioSlot = (stationId, slotId) => {
    setStationAudioSlots(prev => ({
      ...prev,
      [stationId]: (prev[stationId] || []).filter(id => id !== slotId)
    }))
    
    setAudioAssignments(prev => {
      const newAssignments = { ...prev }
      delete newAssignments[slotId]
      return newAssignments
    })
    
    setAnnouncementTypes(prev => {
      const newTypes = { ...prev }
      delete newTypes[slotId]
      return newTypes
    })
    
    setGeneratedAudioHistory(prev => {
      const newHistory = { ...prev }
      delete newHistory[slotId]
      return newHistory
    })
  }

  const removeBetweenSegment = (parentSlotId, segmentId) => {
    setBetweenSegments(prev => ({
      ...prev,
      [parentSlotId]: (prev[parentSlotId] || []).filter(id => id !== segmentId)
    }))
    
    setAudioAssignments(prev => {
      const newAssignments = { ...prev }
      delete newAssignments[segmentId]
      return newAssignments
    })
  }

  const removeMainBetweenSlot = (slotId) => {
    setAudioAssignments(prev => {
      const newAssignments = { ...prev }
      if (newAssignments[slotId]?.url && newAssignments[slotId]?.type === 'upload') {
        URL.revokeObjectURL(newAssignments[slotId].url)
      }
      delete newAssignments[slotId]
      return newAssignments
    })
  }

  const handleFileUpload = (slotId, event) => {
    const file = event.target.files[0]
    if (file && file.type.startsWith('audio/')) {
      const url = URL.createObjectURL(file)
      const uploadedAudio = {
        id: `upload-${Date.now()}`,
        name: file.name,
        url
      }
      
      setUploadedAudios(prev => [...prev, uploadedAudio])
      setAudioAssignments(prev => ({
        ...prev,
        [slotId]: {
          type: 'upload',
          url,
          name: file.name
        }
      }))
      loadAudioDuration(slotId, url)
      setOpenDropdowns({})
    }
  }

  const getLocalizedAudioName = useCallback((assignment, slotId) => {
    if (!assignment) return ''
    
    if (assignment.type === 'preset') {
      return assignment.name
    }
    if (assignment.type === 'upload') {
      return `${t('audioTypeUpload')}: ${assignment.name}`
    }
    if (assignment.type === 'generated') {
      if (!slotId) return `${assignment.voiceName || t('audioTypeGenerated')} #1`
      
      const parts = slotId.split('-')
      const numericPart = parts.find(part => !isNaN(parseInt(part)))
      const slotNumber = numericPart ? parseInt(numericPart) + 1 : 1
      
      return `${assignment.voiceName || t('audioTypeGenerated')} #${slotNumber}`
    }
    return assignment.name
  }, [t])

  const getPresetTextForSlot = useCallback((slotId, stationName) => {
    const announcementType = announcementTypes[slotId]
    
    const miscTypes = ['chime', 'music', 'ambience']
    if (miscTypes.includes(announcementType)) {
      return ''
    }
    
    switch(announcementType) {
      case 'arrival':
        return t('presetArrival').replaceAll('{station}', stationName)
      case 'departure':
        return t('presetDeparture').replaceAll('{station}', stationName)
      case 'transfer':
        return t('presetTransfer').replaceAll('{station}', stationName)
      case 'information':
        return t('presetInformation').replaceAll('{station}', stationName)
      case 'live':
        return t('presetLive').replaceAll('{station}', stationName)
      case 'warning':
        return t('presetWarning').replaceAll('{station}', stationName)
      case 'centralStation':
        return t('presetCentralStation').replaceAll('{station}', stationName)
      case 'station':
      default:
        return `${stationName}`
    }
  }, [announcementTypes, t])

  const handleGenerateAudio = useCallback(async (slotId, stationName) => {
    if (!aiTextInput.trim()) return
    if (!apiKey) {
      onShowApiKey()
      return
    }
    
    setIsGeneratingAudio(true)
    try {
      const newGenerations = []
      
      if (aiGenerationType === 'sound-effects') {
        // Generate 4 sound effect variations
        const generatePromises = Array(4).fill(null).map(async () => {
          const audioUrl = await generateSoundEffect(aiTextInput, apiKey, {
            loop: false,
            durationSeconds: null,
            promptInfluence: 0.3,
            modelId: 'eleven_text_to_sound_v2',
            outputFormat: 'mp3_44100_128'
          })
          
          return {
            url: audioUrl,
            name: `SFX: ${aiTextInput.substring(0, 30)}${aiTextInput.length > 30 ? '...' : ''}`,
            type: 'sound-effect',
            text: aiTextInput,
            timestamp: Date.now()
          }
        })
        
        const results = await Promise.all(generatePromises)
        newGenerations.push(...results)
        
      } else if (aiGenerationType === 'text-to-speech') {
        // Generate 2 text-to-speech variations
        const generatePromises = Array(2).fill(null).map(async () => {
          const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${aiSelectedVoice}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': apiKey
            },
            body: JSON.stringify({
              text: aiTextInput,
              model_id: 'eleven_multilingual_v2',
              output_format: 'mp3_44100_128'
            })
          })
          
          if (!response.ok) {
            const error = await response.text()
            throw new Error(`API Error: ${error}`)
          }
          
          const audioBlob = await response.blob()
          const audioUrl = URL.createObjectURL(audioBlob)
          
          return {
            url: audioUrl,
            name: `AI: ${aiTextInput.substring(0, 30)}${aiTextInput.length > 30 ? '...' : ''}`,
            type: 'generated',
            text: aiTextInput,
            voice: aiSelectedVoice,
            voiceName: availableVoices.find(v => v.id === aiSelectedVoice)?.name || 'Unknown',
            timestamp: Date.now()
          }
        })
        
        const results = await Promise.all(generatePromises)
        newGenerations.push(...results)
      }
      
      if (newGenerations.length > 0) {
        setGeneratedAudioHistory(prev => ({
          ...prev,
          [slotId]: [...(prev[slotId] || []), ...newGenerations]
        }))
        
        setAudioAssignments(prev => ({
          ...prev,
          [slotId]: newGenerations[0]
        }))
        
        loadAudioDuration(slotId, newGenerations[0].url)
      }
    } catch (error) {
      console.error('Error generating audio:', error)
      alert(`Error generating ${aiGenerationType === 'sound-effects' ? 'sound effect' : 'audio'}. Please try again.`)
    } finally {
      setIsGeneratingAudio(false)
    }
  }, [apiKey, aiTextInput, aiSelectedVoice, aiGenerationType, loadAudioDuration, availableVoices, onShowApiKey])

  const handleSelectPreset = (slotId, preset) => {
    const url = preset.path || preset.url
    setAudioAssignments(prev => ({
      ...prev,
      [slotId]: {
        type: 'preset',
        url: url,
        name: preset.name
      }
    }))
    loadAudioDuration(slotId, url)
    setOpenDropdowns({})
  }

  const toggleDropdown = (slotId) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [slotId]: !prev[slotId]
    }))
    setShowAIConfig(null)
  }

  const handleShowAIConfig = (slotId, stationName = '') => {
    setShowAIConfig(slotId)
    setOpenDropdowns({})
    const presetText = getPresetTextForSlot(slotId, stationName)
    setAiTextInput(presetText)
  }

  const handleRemoveAudio = (slotId) => {
    setAudioAssignments(prev => {
      const newAssignments = { ...prev }
      if (newAssignments[slotId]?.url && newAssignments[slotId]?.type === 'upload') {
        URL.revokeObjectURL(newAssignments[slotId].url)
      }
      delete newAssignments[slotId]
      return newAssignments
    })
  }

  const handlePlayAudio = (slotId) => {
    const assignment = audioAssignments[slotId]
    if (!assignment?.url) return

    if (currentlyPlaying === slotId && !isPaused) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      if (audioProcessorRef.current) {
        audioProcessorRef.current.setPlaybackState(false)
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
        updateIntervalRef.current = null
      }
      if (queueUpdateIntervalRef.current) {
        clearInterval(queueUpdateIntervalRef.current)
        queueUpdateIntervalRef.current = null
      }
      setIsPaused(true)
      setIsPlayingAll(false)
    } else if (currentlyPlaying === slotId && isPaused) {
      if (audioRef.current) {
        audioRef.current.play()
        setIsPaused(false)
        updateIntervalRef.current = setInterval(() => {
          if (audioRef.current && !audioRef.current.paused) {
            const remaining = Math.ceil(audioRef.current.duration - audioRef.current.currentTime)
            setAudioRemainingTimes(prev => ({
              ...prev,
              [slotId]: remaining
            }))
          }
        }, 100)
      }
    } else {
      if (isPlayingAll) {
        setIsPlayingAll(false)
        if (queueUpdateIntervalRef.current) {
          clearInterval(queueUpdateIntervalRef.current)
          queueUpdateIntervalRef.current = null
        }
      }
      
      if (audioRef.current) {
        audioRef.current.pause()
      }
      if (audioProcessorRef.current) {
        audioProcessorRef.current.setPlaybackState(false)
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
      
      if (currentlyPlaying) {
        setAudioRemainingTimes(prev => {
          const newTimes = { ...prev }
          delete newTimes[currentlyPlaying]
          return newTimes
        })
      }
      
      setCurrentlyPlaying(slotId)
      setIsPaused(false)
      const audio = new Audio(assignment.url)
      audioRef.current = audio
      
      setupAudioWithProcessing(audio)
      
      audio.playbackRate = playbackSpeed
      audio.volume = isMuted ? 0 : masterVolume
      
      const queue = getOrderedQueue()
      const index = queue.indexOf(slotId)
      if (index !== -1) {
        setCurrentQueueIndex(index)
      }
      
      updateIntervalRef.current = setInterval(() => {
        if (audio && !audio.paused) {
          const remaining = Math.ceil(audio.duration - audio.currentTime)
          setAudioRemainingTimes(prev => ({
            ...prev,
            [slotId]: remaining
          }))
        }
      }, 100)
      
      audio.onended = () => {
        setCurrentlyPlaying(null)
        setIsPaused(false)
        audioRef.current = null
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current)
          updateIntervalRef.current = null
        }
        setAudioRemainingTimes(prev => {
          const newTimes = { ...prev }
          delete newTimes[slotId]
          return newTimes
        })
      }
      audio.onerror = (e) => {
        console.error('Audio playback error:', e)
        setCurrentlyPlaying(null)
        setIsPaused(false)
        audioRef.current = null
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current)
          updateIntervalRef.current = null
        }
      }
      audio.play().then(() => {
        if (audioProcessorRef.current) {
          audioProcessorRef.current.setPlaybackState(true)
        }
      }).catch(err => {
        console.error('Failed to play audio:', err)
        setCurrentlyPlaying(null)
        setIsPaused(false)
        audioRef.current = null
        if (audioProcessorRef.current) {
          audioProcessorRef.current.setPlaybackState(false)
        }
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current)
          updateIntervalRef.current = null
        }
      })
    }
  }

  const handleSpeedChange = (newSpeed) => {
    setPlaybackSpeed(newSpeed)
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed
    }
  }

  const getSpeedStep = (speed) => {
    if (speed >= 1 && speed <= 2) {
      return 0.1
    }
    return 0.25
  }

  const handleMasterPlayPause = () => {
    if (isPlayingAll) {
      setIsPlayingAll(false)
      setIsPaused(true)
      if (audioRef.current) {
        audioRef.current.pause()
      }
      if (audioProcessorRef.current) {
        audioProcessorRef.current.setPlaybackState(false)
      }
      if (queueUpdateIntervalRef.current) {
        clearInterval(queueUpdateIntervalRef.current)
        queueUpdateIntervalRef.current = null
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
        updateIntervalRef.current = null
      }
    } else {
      const queue = getOrderedQueue()
      if (queue.length === 0) return
      
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
        updateIntervalRef.current = null
      }
      
      // If paused, resume from current position
      if (isPaused && currentlyPlaying && audioRef.current) {
        setIsPlayingAll(true)
        setIsPaused(false)
        audioRef.current.play().then(() => {
          if (audioProcessorRef.current) {
            audioProcessorRef.current.setPlaybackState(true)
          }
          startQueueProgressTracking()
          updateIntervalRef.current = setInterval(() => {
            if (audioRef.current && !audioRef.current.paused) {
              const remaining = Math.ceil(audioRef.current.duration - audioRef.current.currentTime)
              setAudioRemainingTimes(prev => ({
                ...prev,
                [currentlyPlaying]: remaining
              }))
            }
          }, 100)
        }).catch(err => {
          console.error('Failed to resume audio:', err)
          setIsPlayingAll(false)
          setIsPaused(true)
        })
      } else if (!currentlyPlaying || !queue.includes(currentlyPlaying)) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (audioProcessorRef.current) {
        audioProcessorRef.current.setPlaybackState(false)
      }
        setCurrentQueueIndex(0)
        setIsPlayingAll(true)
        setIsPaused(false)
        setTimeout(() => playQueueFromIndex(0), 0)
    } else {
      setIsPlayingAll(true)
        setIsPaused(false)
        startQueueProgressTracking()
      }
    }
  }

  const handleSkipPrev = () => {
    const queue = getOrderedQueue()
    if (queue.length === 0) return
    
    if (currentlyPlaying) {
      setAudioRemainingTimes(prev => {
        const newTimes = { ...prev }
        delete newTimes[currentlyPlaying]
        return newTimes
      })
    }
    
    setIsPaused(false)
    
    if (isPlayingAll) {
      const newIndex = currentQueueIndex > 0 ? currentQueueIndex - 1 : queue.length - 1
      setCurrentQueueIndex(newIndex)
      playQueueFromIndex(newIndex)
    } else {
      const newIndex = currentQueueIndex > 0 ? currentQueueIndex - 1 : queue.length - 1
      setCurrentQueueIndex(newIndex)
      setCurrentlyPlaying(queue[newIndex])
    }
  }

  const handleSkipNext = () => {
    const queue = getOrderedQueue()
    if (queue.length === 0) return
    
    if (currentlyPlaying) {
      setAudioRemainingTimes(prev => {
        const newTimes = { ...prev }
        delete newTimes[currentlyPlaying]
        return newTimes
      })
    }
    
    setIsPaused(false)
    
    if (isPlayingAll) {
      const newIndex = (currentQueueIndex + 1) % queue.length
      setCurrentQueueIndex(newIndex)
      playQueueFromIndex(newIndex)
    } else {
      const newIndex = (currentQueueIndex + 1) % queue.length
      setCurrentQueueIndex(newIndex)
      setCurrentlyPlaying(queue[newIndex])
    }
  }

  const startQueueProgressTracking = () => {
    if (queueUpdateIntervalRef.current) {
      clearInterval(queueUpdateIntervalRef.current)
    }
    queueUpdateIntervalRef.current = setInterval(() => {
      setQueueProgress(Date.now())
    }, 500)
  }

  const playQueueFromIndex = useCallback(async (startIndex) => {
    const queue = getOrderedQueue()
    if (startIndex >= queue.length) return
    
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (audioProcessorRef.current) {
      audioProcessorRef.current.setPlaybackState(false)
    }
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current)
      updateIntervalRef.current = null
    }
    
    startQueueProgressTracking()
    setIsPaused(false)
    
    for (let i = startIndex; i < queue.length; i++) {
      if (!isPlayingAllRef.current) break
      
      const slotId = queue[i]
      const assignment = audioAssignments[slotId]
      
      if (assignment?.url) {
        setCurrentQueueIndex(i)
          setCurrentlyPlaying(slotId)
        
        await new Promise((resolve) => {
          const audio = new Audio(assignment.url)
          audioRef.current = audio
          
          // Setup audio processing
          setupAudioWithProcessing(audio)
          
          audio.playbackRate = playbackSpeed
          audio.volume = isMuted ? 0 : masterVolume
          
          updateIntervalRef.current = setInterval(() => {
            if (audio && !audio.paused) {
              const remaining = Math.ceil(audio.duration - audio.currentTime)
              setAudioRemainingTimes(prev => ({
                ...prev,
                [slotId]: remaining
              }))
            }
          }, 100)
          
          audio.onended = () => {
            if (audioProcessorRef.current) {
              audioProcessorRef.current.setPlaybackState(false)
            }
            if (updateIntervalRef.current) {
              clearInterval(updateIntervalRef.current)
              updateIntervalRef.current = null
            }
            setAudioRemainingTimes(prev => {
              const newTimes = { ...prev }
              delete newTimes[slotId]
              return newTimes
            })
            resolve()
          }
          
          audio.onerror = (e) => {
            console.error('Audio playback error:', e)
            if (updateIntervalRef.current) {
              clearInterval(updateIntervalRef.current)
              updateIntervalRef.current = null
            }
            resolve()
          }
          
          audio.play().then(() => {
            if (audioProcessorRef.current) {
              audioProcessorRef.current.setPlaybackState(true)
            }
          }).catch(err => {
            console.error('Failed to play audio:', err)
            if (audioProcessorRef.current) {
              audioProcessorRef.current.setPlaybackState(false)
            }
            if (updateIntervalRef.current) {
              clearInterval(updateIntervalRef.current)
              updateIntervalRef.current = null
            }
            resolve()
          })
        })
      }
    }
    
    setIsPlayingAll(false)
    setIsPaused(false)
    setCurrentlyPlaying(null)
    setCurrentQueueIndex(0)
    audioRef.current = null
    if (queueUpdateIntervalRef.current) {
      clearInterval(queueUpdateIntervalRef.current)
      queueUpdateIntervalRef.current = null
    }
  }, [getOrderedQueue, setupAudioWithProcessing, playbackSpeed, isMuted, masterVolume, audioAssignments])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (queueUpdateIntervalRef.current) {
        clearInterval(queueUpdateIntervalRef.current)
      }
    }
  }, [])

  const renderStationCard = (station, stationSlotId, slotIndex) => {
    const assignment = audioAssignments[stationSlotId]
    const isPlaying = currentlyPlaying === stationSlotId
    const isPlayingAndNotPaused = isPlaying && !isPaused
    const isManuallySelected = station.id === selectedStationId
    const showHighlight = isPlayingAndNotPaused || (isManuallySelected && !isPlayingAndNotPaused)
    const extraSlots = stationAudioSlots[station.id] || []
    const totalSlots = 1 + extraSlots.length

    return (
      <div 
        className={`rounded-lg transition-all overflow-visible ${
          showHighlight ? 'card-selected' : 'card-unselected'
        }`}
        onClick={() => handleStationClick(station.id)}
      >
        <div className="p-2 space-y-2">
          {/* Main station slot row */}
          {renderStationSlotRow(stationSlotId, station.name, station.id, slotIndex, false, 1, totalSlots)}
          
          {/* Extra station audio slots */}
          {extraSlots.map((extraSlotId, idx) => (
            <div key={extraSlotId}>
              {renderStationSlotRow(extraSlotId, station.name, station.id, slotIndex, true, idx + 2, totalSlots)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderStationSlotRow = (slotId, label, stationId, slotIndex, isExtraSlot, currentSlotNumber, totalSlots) => {
    const assignment = audioAssignments[slotId]
    const isPlaying = currentlyPlaying === slotId
    const isPlayingAndNotPaused = isPlaying && !isPaused
    const isDropdownOpen = openDropdowns[slotId]
    const isAIConfigOpen = showAIConfig === slotId
    const isTypeDropdownOpen = openDropdowns[`${slotId}-type`]
    const isLastSlot = currentSlotNumber === totalSlots

    return (
      <div>
        {/* Top row: Icon/Number, Label, Remove button, Duration */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {/* Icon/Number space */}
            <div className="w-5 flex items-center justify-center flex-shrink-0">
              {showStationNumbers && !isExtraSlot ? (
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {slotIndex / 2 + 1}
                </span>
              ) : (
                <div className="relative" ref={el => dropdownRefs.current[`${slotId}-type`] = el}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleDropdown(`${slotId}-type`)
                    }}
                    className="flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 rounded p-0.5 transition-colors"
                  >
                    {getAnnouncementIcon(slotId, 'station', lineColor)}
                  </button>
                  
                  {isTypeDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1 min-w-[160px]">
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pointer-events-none">
                        {t('stationTypes')}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTypeChange(slotId, 'station')
                          setOpenDropdowns({})
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                      >
                        <MapPin size={14} className="text-blue-500" />
                        <span className="text-gray-700 dark:text-gray-300">{t('station')}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTypeChange(slotId, 'centralStation')
                          setOpenDropdowns({})
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                      >
                        <Building2 size={14} className="text-purple-500" />
                        <span className="text-gray-700 dark:text-gray-300">{t('centralStation')}</span>
                      </button>
                      <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pointer-events-none">
                        {t('announcements')}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTypeChange(slotId, 'arrival')
                          setOpenDropdowns({})
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                      >
                        <ArrowDown size={14} className="text-green-500" />
                        <span className="text-gray-700 dark:text-gray-300">{t('arrival')}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTypeChange(slotId, 'departure')
                          setOpenDropdowns({})
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                      >
                        <TrainFront size={14} className="text-orange-500" />
                        <span className="text-gray-700 dark:text-gray-300">{t('departure')}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTypeChange(slotId, 'transfer')
                          setOpenDropdowns({})
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                      >
                        <GitCommitVertical size={14} className="text-purple-500" />
                        <span className="text-gray-700 dark:text-gray-300">{t('transfer')}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTypeChange(slotId, 'information')
                          setOpenDropdowns({})
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                      >
                        <Info size={14} className="text-cyan-500" />
                        <span className="text-gray-700 dark:text-gray-300">{t('information')}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTypeChange(slotId, 'live')
                          setOpenDropdowns({})
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                      >
                        <MessageSquare size={14} className="text-pink-500" />
                        <span className="text-gray-700 dark:text-gray-300">{t('live')}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTypeChange(slotId, 'warning')
                          setOpenDropdowns({})
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                      >
                        <AlertTriangle size={14} className="text-red-500" />
                        <span className="text-gray-700 dark:text-gray-300">{t('warning')}</span>
                      </button>
                      <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pointer-events-none">
                        {t('misc')}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTypeChange(slotId, 'chime')
                          setOpenDropdowns({})
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                      >
                        <Bell size={14} className="text-yellow-500" />
                        <span className="text-gray-700 dark:text-gray-300">{t('chime')}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTypeChange(slotId, 'music')
                          setOpenDropdowns({})
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                      >
                        <Music size={14} className="text-pink-500" />
                        <span className="text-gray-700 dark:text-gray-300">{t('music')}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTypeChange(slotId, 'ambience')
                          setOpenDropdowns({})
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                      >
                        <Radio size={14} className="text-indigo-500" />
                        <span className="text-gray-700 dark:text-gray-300">{t('ambience')}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <span className="font-medium text-sm text-gray-800 dark:text-gray-200 flex-shrink-0">{label}</span>
            
            {/* Remove button for extra slots */}
            {isExtraSlot && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeStationAudioSlot(stationId, slotId)
                }}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                title={t('removeSegment')}
              >
                <X size={12} className="text-red-500" />
              </button>
            )}
          </div>
          
          {/* Duration counter - aligned right */}
          {assignment && audioDurations[slotId] && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex-shrink-0 font-medium">
              {audioRemainingTimes[slotId] !== undefined 
                ? formatTime(audioRemainingTimes[slotId])
                : formatTime(audioDurations[slotId])
              }
            </span>
          )}
        </div>

        {/* Bottom row: Waveform/Plus icon, Audio dropdown, and play button */}
        <div className="flex items-center gap-2">
          {/* Waveform when playing, Plus icon on last slot when selected, or empty space */}
          <div className="w-8 flex items-center justify-center flex-shrink-0">
            {isPlayingAndNotPaused ? (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500 text-white rounded">
                <SoundWave />
              </div>
            ) : isLastSlot && selectedStationId === stationId ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  addStationAudioSlot(stationId)
                }}
                className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                title={t('addSegment')}
              >
                <Plus size={16} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400" />
              </button>
            ) : null}
          </div>
          
          <div className="flex-1 min-w-0 relative" ref={el => dropdownRefs.current[slotId] = el}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleDropdown(slotId)
              }}
              className="w-full flex items-center justify-between gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm transition-colors"
            >
              <span className="truncate text-gray-700 dark:text-gray-300">
                {assignment ? getLocalizedAudioName(assignment, slotId) : t('selectAudio')}
              </span>
              {isDropdownOpen ? (
                <ChevronUp size={14} className="flex-shrink-0 text-gray-500" />
              ) : (
                <ChevronDown size={14} className="flex-shrink-0 text-gray-500" />
              )}
            </button>

            {/* Dropdown content */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                <input
                  ref={el => fileInputRefs.current[slotId] = el}
                  type="file"
                  accept="audio/*"
                  onChange={(e) => handleFileUpload(slotId, e)}
                  className="hidden"
                />
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRefs.current[slotId]?.click()
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700"
                >
                  <span className="text-blue-600 dark:text-blue-400">+</span>
                  <span>{t('uploadAudio')}</span>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleShowAIConfig(slotId, label)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-blue-600 dark:text-blue-400">+</span>
                  <span>{t('generateWithAI')}</span>
                </button>

                <div className="py-1">
                  {uploadedAudios.map((uploaded) => (
                    <button
                      key={uploaded.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectPreset(slotId, { path: uploaded.url, name: uploaded.name })
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span className="truncate">{uploaded.name}</span>
                    </button>
                  ))}
                  {getAllPresets(language).map((preset) => (
                    <button
                      key={preset.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectPreset(slotId, preset)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span className="truncate">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Play button */}
          {assignment && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handlePlayAudio(slotId)
              }}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
              title={t('playAudio')}
            >
              {isPlayingAndNotPaused ? (
                <Pause size={16} className="text-blue-500" />
              ) : (
                <Play size={16} className="text-gray-600 dark:text-gray-400" />
              )}
            </button>
          )}
        </div>

        {isAIConfigOpen && (
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 max-w-full overflow-visible">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">AI Generation</p>
            
            {!apiKey && (
              <div className="mb-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">{t('setApiKey')}</p>
                    <p className="text-xs text-orange-700/90 dark:text-orange-200 mt-1">{t('setApiKeyToGenerate')}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onShowApiKey()
                    }}
                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-semibold transition-colors"
                  >
                    {t('setApiKey')}
                  </button>
                </div>
              </div>
            )}
            
            {/* Generation Type Radio Buttons */}
            <div className="space-y-2 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="generationType"
                  value="text-to-speech"
                  checked={aiGenerationType === 'text-to-speech'}
                  onChange={(e) => setAiGenerationType(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Text-to-Speech</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="generationType"
                  value="sound-effects"
                  checked={aiGenerationType === 'sound-effects'}
                  onChange={(e) => setAiGenerationType(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Sound Effects</span>
              </label>
              <label className="flex items-center gap-2 cursor-not-allowed opacity-50">
                <input
                  type="radio"
                  name="generationType"
                  value="music"
                  disabled
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Music (Coming Soon)</span>
              </label>
            </div>

            {/* Text-to-Speech Form */}
            {aiGenerationType === 'text-to-speech' && (
              <div className="space-y-3 max-w-full">
                <div className="relative" ref={voiceDropdownRef}>
                  <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Voice</label>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setVoiceDropdownOpen(!voiceDropdownOpen)
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                  >
                    <span className="text-sm text-gray-800 dark:text-gray-200">
                      {availableVoices.find(v => v.id === aiSelectedVoice)?.name || 'Select a voice'}
                    </span>
                    {voiceDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {voiceDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                      {availableVoices.map(voice => (
                        <button
                          key={voice.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setAiSelectedVoice(voice.id)
                            setVoiceDropdownOpen(false)
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm text-gray-700 dark:text-gray-300"
                        >
                          <span>{voice.name}</span>
                          {voice.preview && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                playVoicePreview(voice.preview, voice.id)
                              }}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {voicePreviewPlaying === voice.id ? 'Stop' : 'Preview'}
                            </button>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Text</label>
                  <textarea
                    value={aiTextInput}
                    onChange={(e) => setAiTextInput(e.target.value)}
                    placeholder={t('presetInformation')}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Sound Effects Form */}
            {aiGenerationType === 'sound-effects' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Description</label>
                  <textarea
                    value={aiTextInput}
                    onChange={(e) => setAiTextInput(e.target.value)}
                    placeholder="e.g. futuristic train door chime, calm, short"
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    Generate 4 variations with ElevenLabs Sound Effects.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleGenerateAudio(slotId, label)
                }}
                disabled={isGeneratingAudio || !aiTextInput.trim()}
                className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGeneratingAudio ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  'Generate'
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowAIConfig(null)
                  setAiTextInput('')
                }}
                disabled={isGeneratingAudio}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderAudioSlot = (slotId, label, stationId = null, slotIndex = 0, isExtraSegment = false, parentSlotId = null, isExtraStationSlot = false) => {
    const assignment = audioAssignments[slotId]
    const isPlaying = currentlyPlaying === slotId
    const isPlayingAndNotPaused = isPlaying && !isPaused
    const isStation = !slotId.startsWith('between') && !isExtraSegment && !isExtraStationSlot
    const isManuallySelected = isStation && stationId && stationId === selectedStationId
    const isDropdownOpen = openDropdowns[slotId]
    const isAIConfigOpen = showAIConfig === slotId
    const isTypeDropdownOpen = openDropdowns[`${slotId}-type`]
    const slotType = slotId.startsWith('between') || isExtraSegment ? 'general' : 'station'
    
    const showHighlight = isPlayingAndNotPaused || (isManuallySelected && !isPlayingAndNotPaused)

    return (
      <div 
        className={`rounded-lg transition-all overflow-visible ${
          showHighlight ? 'card-selected' : 'card-unselected'
        }`}
        onClick={() => {
          if (isStation && stationId) handleStationClick(stationId)
        }}
      >
        <div className="p-2">
          {/* Top row: Prefix space + Icon/Number, Label, Remove button, Duration */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {/* Prefix space for station number OR icon selector */}
              <div className="w-5 flex items-center justify-center flex-shrink-0">
                {showStationNumbers && isStation ? (
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {slotIndex / 2 + 1}
                  </span>
                ) : (
                  <div className="relative" ref={el => dropdownRefs.current[`${slotId}-type`] = el}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleDropdown(`${slotId}-type`)
                      }}
                      className="flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 rounded p-0.5 transition-colors"
                    >
                      {getAnnouncementIcon(slotId, slotType, isStation ? lineColor : null)}
                    </button>
                    
                    {isTypeDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1 min-w-[160px]">
                        {isStation ? (
                          <>
                            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pointer-events-none">
                              {t('stationTypes')}
            </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                                handleTypeChange(slotId, 'station')
                                setOpenDropdowns({})
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                            >
                              <MapPin size={14} className="text-blue-500" />
                              <span className="text-gray-700 dark:text-gray-300">{t('station')}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTypeChange(slotId, 'centralStation')
                                setOpenDropdowns({})
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                            >
                              <Building2 size={14} className="text-purple-500" />
                              <span className="text-gray-700 dark:text-gray-300">{t('centralStation')}</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pointer-events-none">
                              {t('announcements')}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTypeChange(slotId, 'general')
                                setOpenDropdowns({})
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                            >
                              <GitCommitVertical size={14} className="text-gray-400" />
                              <span className="text-gray-700 dark:text-gray-300">{t('general')}</span>
              </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTypeChange(slotId, 'arrival')
                                setOpenDropdowns({})
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                            >
                              <ArrowDown size={14} className="text-green-500" />
                              <span className="text-gray-700 dark:text-gray-300">{t('arrival')}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTypeChange(slotId, 'departure')
                                setOpenDropdowns({})
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                            >
                              <TrainFront size={14} className="text-orange-500" />
                              <span className="text-gray-700 dark:text-gray-300">{t('departure')}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTypeChange(slotId, 'transfer')
                                setOpenDropdowns({})
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                            >
                              <GitCommitVertical size={14} className="text-purple-500" />
                              <span className="text-gray-700 dark:text-gray-300">{t('transfer')}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTypeChange(slotId, 'information')
                                setOpenDropdowns({})
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                            >
                              <Info size={14} className="text-cyan-500" />
                              <span className="text-gray-700 dark:text-gray-300">{t('information')}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTypeChange(slotId, 'live')
                                setOpenDropdowns({})
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                            >
                              <MessageSquare size={14} className="text-pink-500" />
                              <span className="text-gray-700 dark:text-gray-300">{t('live')}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTypeChange(slotId, 'warning')
                                setOpenDropdowns({})
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                            >
                              <AlertTriangle size={14} className="text-red-500" />
                              <span className="text-gray-700 dark:text-gray-300">{t('warning')}</span>
                            </button>
                            <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pointer-events-none">
                              {t('misc')}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTypeChange(slotId, 'chime')
                                setOpenDropdowns({})
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                            >
                              <Bell size={14} className="text-yellow-500" />
                              <span className="text-gray-700 dark:text-gray-300">{t('chime')}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTypeChange(slotId, 'music')
                                setOpenDropdowns({})
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                            >
                              <Music size={14} className="text-pink-500" />
                              <span className="text-gray-700 dark:text-gray-300">{t('music')}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTypeChange(slotId, 'ambience')
                                setOpenDropdowns({})
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm"
                            >
                              <Radio size={14} className="text-indigo-500" />
                              <span className="text-gray-700 dark:text-gray-300">{t('ambience')}</span>
                            </button>
                          </>
            )}
          </div>
                    )}
                </div>
                )}
              </div>
              
              <span className="font-medium text-sm text-gray-800 dark:text-gray-200 flex-shrink-0">{label}</span>
              
              {/* Remove button for extra segments, extra station slots, or main between slots */}
              {((isExtraSegment && parentSlotId) || (isExtraStationSlot && stationId) || (!isStation && !isExtraSegment && !isExtraStationSlot && assignment)) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (isExtraSegment && parentSlotId) {
                      removeBetweenSegment(parentSlotId, slotId)
                    } else if (isExtraStationSlot && stationId) {
                      removeStationAudioSlot(stationId, slotId)
                    } else {
                      removeMainBetweenSlot(slotId)
                    }
                  }}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                  title={t('removeSegment')}
                >
                  <X size={12} className="text-red-500" />
                </button>
              )}
              </div>
              
            {/* Duration counter - aligned right */}
            {assignment && audioDurations[slotId] && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex-shrink-0 font-medium">
                {audioRemainingTimes[slotId] !== undefined 
                  ? formatTime(audioRemainingTimes[slotId])
                  : formatTime(audioDurations[slotId])
                }
              </span>
            )}
          </div>

          {/* Bottom row: Prefix space + Dropdown and Play button */}
          <div className="flex items-center gap-2">
            {/* Prefix space for animated audio SVG */}
            <div className="w-5 flex items-center justify-center flex-shrink-0">
              {isPlayingAndNotPaused && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500 text-white rounded">
                  <SoundWave />
                </div>
              )}
            </div>
            
            <div className="flex-1 relative" ref={el => dropdownRefs.current[slotId] = el}>
                <input
                  ref={el => fileInputRefs.current[slotId] = el}
                  type="file"
                  accept="audio/*"
                  onChange={(e) => handleFileUpload(slotId, e)}
                  className="hidden"
                />
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleDropdown(slotId)
                }}
                className="w-full flex items-center justify-between gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded border border-gray-200 dark:border-gray-600 transition-colors text-xs"
              >
                <span className="truncate text-gray-700 dark:text-gray-300">
                  {assignment ? getLocalizedAudioName(assignment, slotId) : 'Select audio...'}
                </span>
                {isDropdownOpen ? (
                  <ChevronUp size={14} className="flex-shrink-0 text-gray-500" />
                ) : (
                  <ChevronDown size={14} className="flex-shrink-0 text-gray-500" />
                )}
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRefs.current[slotId]?.click()
                  }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700"
                >
                    <span className="text-blue-600 dark:text-blue-400">+</span>
                    <span>Upload Audio</span>
                </button>
                  
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                      handleShowAIConfig(slotId, label)
                  }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span className="text-blue-600 dark:text-blue-400">+</span>
                    <span>{t('generateWithAI')}</span>
                </button>

                  <div className="py-1">
                    {uploadedAudios.map((uploaded) => (
                <button
                        key={uploaded.id}
                  onClick={(e) => {
                    e.stopPropagation()
                          handleSelectPreset(slotId, { path: uploaded.url, name: uploaded.name })
                  }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm text-gray-700 dark:text-gray-300"
                >
                        <span className="truncate">{uploaded.name}</span>
                </button>
                    ))}
                    {presets.map((preset) => (
        <button
                        key={preset.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectPreset(slotId, preset)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left text-sm text-gray-700 dark:text-gray-300"
                      >
                        <span className="truncate">{preset.name}</span>
        </button>
                    ))}
              </div>
            </div>
          )}
            </div>

            {assignment && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handlePlayAudio(slotId)
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors flex-shrink-0"
                title={t('playAudio')}
              >
                {isPlayingAndNotPaused ? (
                  <Pause size={14} className="text-blue-500" />
                ) : (
                  <Play size={14} className="text-gray-600 dark:text-gray-400" />
                )}
              </button>
            )}
          </div>

          {isAIConfigOpen && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 max-w-full overflow-visible">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">AI Generation</p>
              
              {!apiKey && (
                <div className="mb-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">{t('setApiKey')}</p>
                      <p className="text-xs text-orange-700/90 dark:text-orange-200 mt-1">{t('setApiKeyToGenerate')}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onShowApiKey()
                      }}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-semibold transition-colors"
                    >
                      {t('setApiKey')}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Generation Type Radio Buttons */}
              <div className="space-y-2 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
              <input
                    type="radio"
                    name="generationType"
                    value="text-to-speech"
                    checked={aiGenerationType === 'text-to-speech'}
                    onChange={(e) => setAiGenerationType(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Text-to-Speech</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="generationType"
                    value="sound-effects"
                    checked={aiGenerationType === 'sound-effects'}
                    onChange={(e) => setAiGenerationType(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Sound Effects</span>
                </label>
                <label className="flex items-center gap-2 cursor-not-allowed opacity-50">
                  <input
                    type="radio"
                    name="generationType"
                    value="music"
                    disabled
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Music (Coming Soon)</span>
                </label>
              </div>

              {/* Text-to-Speech Form */}
              {aiGenerationType === 'text-to-speech' && (
                <div className="space-y-3 max-w-full">
                  <div className="relative" ref={voiceDropdownRef}>
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Voice</label>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setVoiceDropdownOpen(!voiceDropdownOpen)
                      }}
                      className="w-full flex items-center justify-between gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded border border-gray-200 dark:border-gray-600 transition-colors text-xs"
                    >
                      <span className="text-gray-700 dark:text-gray-300">
                        {availableVoices.find(v => v.id === aiSelectedVoice)?.name || 'Select voice...'}
                      </span>
                      {voiceDropdownOpen ? (
                        <ChevronUp size={14} className="flex-shrink-0 text-gray-500" />
                      ) : (
                        <ChevronDown size={14} className="flex-shrink-0 text-gray-500" />
                      )}
                    </button>

                    {voiceDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[100] overflow-hidden">
                        {availableVoices.map(voice => {
                          const isSelected = aiSelectedVoice === voice.id
                          const isPlaying = voicePreviewPlaying === voice.id
                          return (
                            <button
                              key={voice.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (e.target.closest('.preview-button')) return
                                setAiSelectedVoice(voice.id)
                                setVoiceDropdownOpen(false)
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-left text-xs ${
                                isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
                              }`}
                            >
                              <span className="flex-1 text-gray-700 dark:text-gray-300">
                                {voice.name}
                              </span>
                              <span
                                className="preview-button p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (isPlaying) {
                                    voicePreviewRef.current?.pause()
                                    setVoicePreviewPlaying(null)
                                  } else {
                                    if (voicePreviewRef.current) {
                                      voicePreviewRef.current.src = voice.preview
                                      voicePreviewRef.current.play()
                                      setVoicePreviewPlaying(voice.id)
                                    }
                                  }
                                }}
                                title={`Preview ${voice.name}`}
                              >
                                {isPlaying ? (
                                  <Pause size={14} className="text-blue-500" />
                                ) : (
                                  <Play size={14} className="text-gray-600 dark:text-gray-400" />
                                )}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Text</label>
                    <textarea
                      value={aiTextInput}
                      onChange={(e) => setAiTextInput(e.target.value)}
                      placeholder="Enter the text to convert to speech..."
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={3}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Generated Audio History */}
                  {generatedAudioHistory[slotId] && generatedAudioHistory[slotId].length > 0 && !isGeneratingAudio && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Generated Audio:</p>
                      {generatedAudioHistory[slotId].map((gen, index) => {
                        const isCurrentAssignment = assignment && assignment.url === gen.url
                        const previewId = `${slotId}-gen-${index}`
                        const isPreviewPlaying = generatedAudioPreviewPlaying === previewId
                        return (
                          <button
                            key={previewId}
                            onClick={(e) => {
                              e.stopPropagation()
                              setAudioAssignments(prev => ({
                                ...prev,
                                [slotId]: gen
                              }))
                            }}
                            className={`w-full p-2 border rounded bg-gray-50 dark:bg-gray-700/50 transition-all text-left ${
                              isCurrentAssignment 
                                ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50' 
                                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium mb-1">{gen.voiceName} #{index + 1}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 break-words whitespace-normal">{gen.text}</p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (isPreviewPlaying) {
                                      if (generatedAudioPreviewRef.current) {
                                        generatedAudioPreviewRef.current.pause()
                                        generatedAudioPreviewRef.current.currentTime = 0
                                      }
                                      setGeneratedAudioPreviewPlaying(null)
                                    } else {
                                      if (generatedAudioPreviewRef.current) {
                                        generatedAudioPreviewRef.current.src = gen.url
                                        generatedAudioPreviewRef.current.load()
                                        generatedAudioPreviewRef.current.play().catch(err => {
                                          console.error('Error playing preview:', err)
                                        })
                                        setGeneratedAudioPreviewPlaying(previewId)
                                      }
                                    }
                                  }}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                  title={isPreviewPlaying ? "Stop" : "Play"}
                                >
                                  {isPreviewPlaying ? (
                                    <Pause size={14} className="text-blue-500" />
                                  ) : (
                                    <Play size={14} className="text-gray-600 dark:text-gray-400" />
                                  )}
                                </span>
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setGeneratedAudioHistory(prev => ({
                                      ...prev,
                                      [slotId]: prev[slotId].filter((_, i) => i !== index)
                                    }))
                                    if (isCurrentAssignment) {
                                      setAudioAssignments(prev => {
                                        const updated = { ...prev }
                                        delete updated[slotId]
                                        return updated
                                      })
                                    }
                                  }}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                  title={t('remove')}
                                >
                                  <X size={14} className="text-gray-700 dark:text-gray-300" />
                                </span>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Sound Effects Form */}
              {aiGenerationType === 'sound-effects' && (
                <div className="space-y-3 max-w-full">
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Sound Description</label>
                    <textarea
                      value={aiTextInput}
                      onChange={(e) => setAiTextInput(e.target.value)}
                      placeholder="Describe the sound effect you want (e.g., 'Train arriving at station with brakes screeching')"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={3}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Generated Audio History */}
                  {generatedAudioHistory[slotId] && generatedAudioHistory[slotId].length > 0 && !isGeneratingAudio && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Generated Sound Effects:</p>
                      {generatedAudioHistory[slotId].map((gen, index) => {
                        const isCurrentAssignment = assignment && assignment.url === gen.url
                        const previewId = `${slotId}-sfx-${index}`
                        const isPreviewPlaying = generatedAudioPreviewPlaying === previewId
                        return (
                          <button
                            key={previewId}
                            onClick={(e) => {
                              e.stopPropagation()
                              setAudioAssignments(prev => ({
                                ...prev,
                                [slotId]: gen
                              }))
                            }}
                            className={`w-full p-2 border rounded bg-gray-50 dark:bg-gray-700/50 transition-all text-left ${
                              isCurrentAssignment 
                                ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50' 
                                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium mb-1">Sound Effect #{index + 1}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 break-words whitespace-normal">{gen.text}</p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (isPreviewPlaying) {
                                      if (generatedAudioPreviewRef.current) {
                                        generatedAudioPreviewRef.current.pause()
                                        generatedAudioPreviewRef.current.currentTime = 0
                                      }
                                      setGeneratedAudioPreviewPlaying(null)
                                    } else {
                                      if (generatedAudioPreviewRef.current) {
                                        generatedAudioPreviewRef.current.src = gen.url
                                        generatedAudioPreviewRef.current.load()
                                        generatedAudioPreviewRef.current.play().catch(err => {
                                          console.error('Error playing preview:', err)
                                        })
                                        setGeneratedAudioPreviewPlaying(previewId)
                                      }
                                    }
                                  }}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                  title={isPreviewPlaying ? "Stop" : "Play"}
                                >
                                  {isPreviewPlaying ? (
                                    <Pause size={14} className="text-blue-500" />
                                  ) : (
                                    <Play size={14} className="text-gray-600 dark:text-gray-400" />
                                  )}
                                </span>
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setGeneratedAudioHistory(prev => ({
                                      ...prev,
                                      [slotId]: prev[slotId].filter((_, i) => i !== index)
                                    }))
                                    if (isCurrentAssignment) {
                                      setAudioAssignments(prev => {
                                        const updated = { ...prev }
                                        delete updated[slotId]
                                        return updated
                                      })
                                    }
                                  }}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                  title={t('remove')}
                                >
                                  <X size={14} className="text-gray-700 dark:text-gray-300" />
                                </span>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleGenerateAudio(slotId, label)
                }}
                  disabled={isGeneratingAudio || !aiTextInput.trim()}
                  className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGeneratingAudio ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    'Generate'
                  )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                    setShowAIConfig(null)
                    setAiTextInput('')
                }}
                  disabled={isGeneratingAudio}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm transition-colors disabled:opacity-50"
              >
                  Cancel
              </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const handleExportAudioZip = async () => {
    setIsExporting(true)
    try {
      const zip = new JSZip()
      const queue = getOrderedQueue()
      const lineName = lines.find(l => l.id === selectedLineId)?.name || 'Train Line'
      
      for (let i = 0; i < queue.length; i++) {
        const slotId = queue[i]
        const assignment = audioAssignments[slotId]
        
        if (assignment?.url) {
          try {
            const response = await fetch(assignment.url)
            const blob = await response.blob()
            const fileName = `${String(i + 1).padStart(3, '0')}_${assignment.transcription || slotId}.mp3`
              .replace(/[^a-z0-9_\-\.]/gi, '_')
            zip.file(fileName, blob)
          } catch (error) {
            console.error(`Failed to fetch audio for ${slotId}:`, error)
          }
        }
      }
      
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `${lineName.replace(/[^a-z0-9_\-]/gi, '_')}_audio.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export audio:', error)
      alert('Failed to export audio files. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportCanvasSnapshot = () => {
    const svgElement = document.querySelector('.relative.w-full.h-full svg')
    if (!svgElement) {
      alert('Canvas not found')
      return
    }

    setIsExporting(true)
    try {
      const svgClone = svgElement.cloneNode(true)
      const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 1200, 800]
      
      svgClone.setAttribute('width', viewBox[2].toString())
      svgClone.setAttribute('height', viewBox[3].toString())
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      
      const bgRect = svgClone.querySelector('rect.pointer-events-none')
      if (bgRect) {
        bgRect.style.fill = 'white'
        bgRect.removeAttribute('class')
      }
      
      const textElements = svgClone.querySelectorAll('text')
      textElements.forEach(text => {
        text.style.fill = '#1f2937'
        text.removeAttribute('class')
      })
      
      const rectElements = svgClone.querySelectorAll('rect:not(.grid-dot)')
      rectElements.forEach(rect => {
        if (!rect.classList.contains('pointer-events-none')) {
          rect.style.fill = 'white'
          rect.removeAttribute('class')
        }
      })
      
      const svgData = new XMLSerializer().serializeToString(svgClone)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new window.Image()
      
      canvas.width = viewBox[2]
      canvas.height = viewBox[3]
      
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)
      
      img.onload = () => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        
        canvas.toBlob((blob) => {
          const downloadUrl = URL.createObjectURL(blob)
          const a = document.createElement('a')
          const lineName = lines.find(l => l.id === selectedLineId)?.name || 'Train Line'
          a.href = downloadUrl
          a.download = `${lineName.replace(/[^a-z0-9_\-]/gi, '_')}_map.png`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(downloadUrl)
          URL.revokeObjectURL(url)
          setIsExporting(false)
        })
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        alert('Failed to export canvas snapshot')
        setIsExporting(false)
      }
      
      img.src = url
    } catch (error) {
      console.error('Failed to export canvas:', error)
      alert('Failed to export canvas snapshot. Please try again.')
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Hidden audio element for voice previews */}
      <audio
        ref={voicePreviewRef}
        onEnded={() => setVoicePreviewPlaying(null)}
        onPause={() => setVoicePreviewPlaying(null)}
      />
      {/* Hidden audio element for generated audio previews */}
      <audio
        ref={generatedAudioPreviewRef}
        onEnded={() => setGeneratedAudioPreviewPlaying(null)}
      />
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">{t('audioControlPanel')}</h2>
          <div className="flex items-center gap-2">
            {getTotalDuration() > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                {isPlayingAll ? formatTime(getRemainingTime()) : formatTime(getTotalDuration())}
              </span>
            )}
            {isMobile && onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {lines.length > 1 && (
          <div className="flex items-center gap-2 mb-1.5">
            <button
              onClick={() => {
                const currentIndex = lines.findIndex(l => l.id === selectedLineId)
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : lines.length - 1
                setSelectedLineId(lines[prevIndex].id)
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title={t('previousLine')}
            >
              <ChevronLeft size={16} className="text-gray-600 dark:text-gray-400" />
            </button>
            <div className="flex-1 text-center">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {lines.find(l => l.id === selectedLineId)?.name || ''}
              </span>
            </div>
            <button
              onClick={() => {
                const currentIndex = lines.findIndex(l => l.id === selectedLineId)
                const nextIndex = currentIndex < lines.length - 1 ? currentIndex + 1 : 0
                setSelectedLineId(lines[nextIndex].id)
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title={t('nextLine')}
            >
              <ChevronRight size={16} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        )}

        {lineStations.length > 0 && (
          <>
            {/* Master Control Panel */}
            <div className="flex items-center justify-center gap-1 mb-1.5">
              <button
                onClick={() => setShowVolumeControl(!showVolumeControl)}
                className={`flex items-center justify-center p-1.5 rounded-lg transition-colors gap-0.5 ${
                  showVolumeControl
                    ? 'btn-selected'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title={t('toggleVolume')}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                {showVolumeControl ? (
                  <ChevronUp size={12} className="opacity-60" />
                ) : (
                  <ChevronDown size={12} className="opacity-60" />
            )}
        </button>
              
              <button
                onClick={handleSkipPrev}
                className={BUTTON_CLASSES}
                title={t('previousInQueue')}
              >
                <SkipBack size={16} />
              </button>
              
              <button
                onClick={handleMasterPlayPause}
                className="flex items-center justify-center p-2 rounded-lg transition-colors bg-blue-500 hover:bg-blue-600 text-white"
                title={t('playPauseQueue')}
              >
                {isPlayingAll ? <Pause size={18} /> : <Play size={18} />}
              </button>
              
              <button
                onClick={handleSkipNext}
                className={BUTTON_CLASSES}
                title={t('nextInQueue')}
              >
                <SkipForward size={16} />
              </button>
              
              <button
                onClick={() => setShowSpeedControl(!showSpeedControl)}
                className={`flex items-center justify-center p-1.5 rounded-lg transition-colors gap-0.5 min-w-[44px] ${
                  showSpeedControl
                    ? 'btn-selected'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title={t('cycleSpeed')}
              >
                <span className="text-xs font-medium leading-none">{playbackSpeed}x</span>
                {showSpeedControl ? (
                  <ChevronUp size={12} className="opacity-60" />
                ) : (
                  <ChevronDown size={12} className="opacity-60" />
                )}
              </button>
              
              <button
                onClick={() => setShowAudioProcessing(!showAudioProcessing)}
                className={`flex items-center justify-center p-1.5 rounded-lg transition-colors gap-0.5 ${
                  showAudioProcessing
                    ? 'btn-selected'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title={t('audioProcessing')}
              >
                <Ear size={16} />
                {showAudioProcessing ? (
                  <ChevronUp size={12} className="opacity-60" />
                ) : (
                  <ChevronDown size={12} className="opacity-60" />
                )}
              </button>
              
              {setShowTranscription && (
                <button
                  onClick={() => setShowTranscription(!showTranscription)}
                  className={`flex items-center justify-center p-1.5 rounded-lg transition-colors ${
                    showTranscription 
                      ? 'btn-selected' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title={t('displayAudioCaptions')}
                >
                  <FileText size={16} />
                </button>
              )}
            </div>

            {/* Queue Progress Display */}
            <div className="mb-1.5 px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('audioQueue')}: {currentQueueIndex + 1} / {getOrderedQueue().length}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {formatTime(getTotalDuration())}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-100"
                  style={{ 
                    width: `${getTotalDuration() > 0 ? ((getTotalDuration() - getRemainingTime()) / getTotalDuration() * 100) : 0}%` 
                  }}
                />
              </div>
            </div>

            {/* Volume Control Row */}
            {showVolumeControl && (
              <div className="mb-1.5 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-blue-500">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Volume</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[32px] text-right">
                    {Math.round((isMuted ? 0 : masterVolume) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsMuted(!isMuted)
                      if (audioRef.current) {
                        audioRef.current.volume = isMuted ? masterVolume : 0
                      }
                    }}
                    className={BUTTON_CLASSES}
                    title={isMuted ? t('unmute') : t('mute')}
                  >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : masterVolume}
                    onChange={(e) => {
                      const newVolume = parseFloat(e.target.value)
                      setMasterVolume(newVolume)
                      if (newVolume > 0) setIsMuted(false)
                      if (audioRef.current) {
                        audioRef.current.volume = newVolume
                      }
                    }}
                    className="flex-1 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}


            {/* Speed Control Row */}
            {showSpeedControl && (
              <div className="mb-1.5 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-blue-500">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Speed</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[40px] text-right">
                    {playbackSpeed.toFixed(2)}x
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSpeedChange(1)}
                    className={BUTTON_CLASSES}
                    title={t('resetSpeed')}
                  >
                    <span className="text-xs font-medium">1x</span>
                  </button>
                  
                  <input
                    type="range"
                    min="0.5"
                    max="4"
                    step="0.05"
                    value={playbackSpeed}
                    onChange={(e) => {
                      const newSpeed = parseFloat(e.target.value)
                      handleSpeedChange(newSpeed)
                    }}
                    className="flex-1 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Audio Processing Dropdown */}
            {showAudioProcessing && (
              <div className="mb-1.5 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-blue-500">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">{t('audioProcessing')}</div>
                <div className="grid grid-cols-3 gap-1">
                  {['standard', 'vacant', 'commuter', 'express', 'firstClass', 'radio', 'platform', 'underground', 'tunnel'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAudioProcessingPreset(preset)}
                      className={`px-2 py-1.5 rounded text-xs font-medium text-center transition-colors ${
                        audioProcessingPreset === preset
                          ? 'btn-selected'
                          : 'btn-unselected'
                      }`}
                    >
                      {t(`audioPreset${preset.charAt(0).toUpperCase() + preset.slice(1)}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </>
        )}

      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {lines.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 mt-6">
            <p>{t('noLinesYet')}</p>
            <p className="text-sm mt-1.5">{t('createLineFirst')}</p>
          </div>
        ) : lineStations.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 mt-6">
            <p>{t('selectLine')}</p>
          </div>
        ) : (
          <div className="flex gap-2">
            {/* Audio slots column with integrated timeline markers */}
            <div className="flex-1 min-w-0 overflow-visible">
            {lineStations.map((station, index) => {
              let slotIndex = index * 2
                const stationSlotId = `station-${station.id}`
                const betweenSlotId = `between-${station.id}-${lineStations[index + 1]?.id}`
                const isLastStation = index === lineStations.length - 1
                const isFirstStation = index === 0
                
              return (
                  <div key={`slot-group-${station.id}`}>
                    {/* Station row with aligned circle */}
                    <div className="flex gap-2">
                      {/* Timeline marker - circle centered with station box, line passes through */}
                      <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: '20px' }}>
                        {/* Continuous line passing through */}
                        {!isFirstStation && (
                          <div 
                            className="absolute w-0.5 left-1/2 -translate-x-1/2" 
                            style={{ 
                              bottom: '50%', 
                              top: 0,
                              backgroundColor: lineColor,
                              opacity: 0.6
                            }} 
                          />
                        )}
                        {!isLastStation && (
                          <div 
                            className="absolute w-0.5 left-1/2 -translate-x-1/2" 
                            style={{ 
                              top: '50%', 
                              bottom: 0,
                              backgroundColor: lineColor,
                              opacity: 0.6
                            }} 
                          />
                        )}
                        
                        {/* Circle on top of line */}
                        {renderStationCircle(station.id)}
                      </div>
                      
                      {/* Station slot box */}
                      <div className="flex-1 min-w-0">
                        {renderStationCard(station, stationSlotId, slotIndex)}
                      </div>
                    </div>
                  
                      {/* Between content with line */}
                  {index < lineStations.length - 1 && (
                        <div className="flex gap-2">
                          {/* Timeline line */}
                          <div className="flex flex-col items-center flex-shrink-0" style={{ width: '20px' }}>
                            <div className="w-0.5 flex-1" style={{ backgroundColor: lineColor, opacity: 0.6 }} />
                          </div>
                        
                        {/* Between content */}
                        <div 
                          className="relative flex-1 my-3 pl-8 pr-0"
                          onMouseEnter={() => setHoveredBetweenSlot(betweenSlotId)}
                          onMouseLeave={() => setHoveredBetweenSlot(null)}
                        >
                      <div className="absolute left-3 top-0 bottom-0 w-0.5 border-l-2 border-dashed border-gray-300 dark:border-gray-600" />
                        
                        {/* Add segment buttons on the dashed line */}
                        {hoveredBetweenSlot === betweenSlotId && (
                          <>
                            <button
                              onClick={() => addBetweenSegment(betweenSlotId)}
                              className="absolute left-3 -translate-x-1/2 top-0 -translate-y-1/2 p-0.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors shadow-sm border border-gray-300 dark:border-gray-600 z-10"
                              title={t('addSegment')}
                            >
                              <Plus size={12} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400" />
                            </button>
                            
                            {(betweenSegments[betweenSlotId] || []).map((_, segIndex) => (
                              <button
                                key={`add-${segIndex}`}
                                onClick={() => addBetweenSegment(betweenSlotId)}
                                className="absolute left-3 -translate-x-1/2 p-0.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors shadow-sm border border-gray-300 dark:border-gray-600 z-10"
                                style={{ top: `${((segIndex + 1) / ((betweenSegments[betweenSlotId]?.length || 0) + 2)) * 100}%` }}
                                title={t('addSegment')}
                              >
                                <Plus size={12} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400" />
                              </button>
                            ))}
                            
                            <button
                              onClick={() => addBetweenSegment(betweenSlotId)}
                              className="absolute left-3 -translate-x-1/2 bottom-0 translate-y-1/2 p-0.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors shadow-sm border border-gray-300 dark:border-gray-600 z-10"
                              title={t('addSegment')}
                            >
                              <Plus size={12} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400" />
                            </button>
                          </>
                        )}
                        
                        <div className="space-y-1.5">
                      {renderAudioSlot(
                            betweenSlotId,
                            getAnnouncementLabel(betweenSlotId, 'general'),
                        null,
                        slotIndex + 1
                          )}
                          
                          {/* Extra between segments */}
                          {(betweenSegments[betweenSlotId] || []).map((segmentId) => (
                            <div key={segmentId}>
                              {renderAudioSlot(
                                segmentId,
                                getAnnouncementLabel(segmentId, 'general'),
                                null,
                                slotIndex + 1,
                                true,
                                betweenSlotId
                              )}
                            </div>
                          ))}
                        </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Loop indicator for last station */}
                    {isLastStation && lineStations.length > 1 && (
                      <div className="flex gap-2">
                        <div className="flex-shrink-0" style={{ width: '20px' }} />
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 py-2 px-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 mt-3">
                          <RotateCcw size={12} className="flex-shrink-0" />
                          <span>{t('returnsTo').replace('{station}', lineStations[0].name)}</span>
                        </div>
                    </div>
                  )}
                </div>
              )
            })}
            </div>
          </div>
        )}
      </div>

      {/* Export Panel */}
      {lineStations.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>{t('download')}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCanvasSnapshot}
                disabled={isExporting}
                className="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-900 dark:hover:text-gray-200"
                title={t('downloadCanvas')}
              >
                <Image size={12} />
                <span>{t('downloadCanvasLabel')}</span>
              </button>
              <div className="h-3 w-px bg-gray-300 dark:bg-gray-600" />
              <button
                onClick={handleExportAudioZip}
                disabled={isExporting || getOrderedQueue().filter(id => audioAssignments[id]?.url).length === 0}
                className="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-900 dark:hover:text-gray-200"
                title={`${t('download')} ${getOrderedQueue().filter(id => audioAssignments[id]?.url).length} ${t('downloadAudio')}`}
              >
                <FolderArchive size={12} />
                <span>{t('downloadAudio')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnnouncementPanel


