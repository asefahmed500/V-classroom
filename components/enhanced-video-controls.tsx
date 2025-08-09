"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  MonitorOff,
  Settings,
  Volume2,
  VolumeX,
  Camera,
  Headphones
} from "lucide-react"

interface EnhancedVideoControlsProps {
  localStream: MediaStream | null
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  onVideoToggle: () => void
  onAudioToggle: () => void
  onStreamUpdate: (stream: MediaStream) => void
  roomId: string
  userId: string
}

export function EnhancedVideoControls({
  localStream,
  isVideoEnabled,
  isAudioEnabled,
  onVideoToggle,
  onAudioToggle,
  onStreamUpdate,
  roomId,
  userId
}: EnhancedVideoControlsProps) {
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [volume, setVolume] = useState([100])
  const [showSettings, setShowSettings] = useState(false)
  const [devices, setDevices] = useState<{
    cameras: MediaDeviceInfo[]
    microphones: MediaDeviceInfo[]
    speakers: MediaDeviceInfo[]
  }>({
    cameras: [],
    microphones: [],
    speakers: []
  })
  const [selectedDevices, setSelectedDevices] = useState({
    camera: '',
    microphone: '',
    speaker: ''
  })

  useEffect(() => {
    loadDevices()
  }, [])

  const loadDevices = async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices()
      
      setDevices({
        cameras: deviceList.filter(device => device.kind === 'videoinput'),
        microphones: deviceList.filter(device => device.kind === 'audioinput'),
        speakers: deviceList.filter(device => device.kind === 'audiooutput')
      })
    } catch (error) {
      console.error('Error loading devices:', error)
    }
  }

  const switchCamera = async (deviceId: string) => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: { deviceId: selectedDevices.microphone || undefined }
      })
      
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop())
      }
      
      onStreamUpdate(newStream)
      setSelectedDevices(prev => ({ ...prev, camera: deviceId }))
    } catch (error) {
      console.error('Error switching camera:', error)
    }
  }

  const switchMicrophone = async (deviceId: string) => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: selectedDevices.camera || undefined },
        audio: { deviceId: { exact: deviceId } }
      })
      
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop())
      }
      
      onStreamUpdate(newStream)
      setSelectedDevices(prev => ({ ...prev, microphone: deviceId }))
    } catch (error) {
      console.error('Error switching microphone:', error)
    }
  }

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        })
        
        setIsScreenSharing(true)
        onStreamUpdate(screenStream)
        
        // Handle screen share end
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false)
          // Switch back to camera
          switchCamera(selectedDevices.camera)
        }
      } else {
        setIsScreenSharing(false)
        // Switch back to camera
        if (selectedDevices.camera) {
          switchCamera(selectedDevices.camera)
        }
      }
    } catch (error) {
      console.error('Error toggling screen share:', error)
    }
  }

  const adjustVolume = (newVolume: number[]) => {
    setVolume(newVolume)
    // In a real implementation, this would adjust the audio output volume
  }

  return (
    <div className="flex items-center justify-center space-x-2 bg-black/70 backdrop-blur-sm rounded-lg p-3">
      {/* Video Toggle */}
      <Button
        variant={isVideoEnabled ? "default" : "destructive"}
        size="sm"
        onClick={onVideoToggle}
        className="w-12 h-12 rounded-full"
      >
        {isVideoEnabled ? (
          <Video className="w-5 h-5" />
        ) : (
          <VideoOff className="w-5 h-5" />
        )}
      </Button>

      {/* Audio Toggle */}
      <Button
        variant={isAudioEnabled ? "default" : "destructive"}
        size="sm"
        onClick={onAudioToggle}
        className="w-12 h-12 rounded-full"
      >
        {isAudioEnabled ? (
          <Mic className="w-5 h-5" />
        ) : (
          <MicOff className="w-5 h-5" />
        )}
      </Button>

      {/* Screen Share Toggle */}
      <Button
        variant={isScreenSharing ? "secondary" : "outline"}
        size="sm"
        onClick={toggleScreenShare}
        className="w-12 h-12 rounded-full"
      >
        {isScreenSharing ? (
          <MonitorOff className="w-5 h-5" />
        ) : (
          <Monitor className="w-5 h-5" />
        )}
      </Button>

      {/* Volume Control */}
      <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2">
        <Volume2 className="w-4 h-4 text-white" />
        <Slider
          value={volume}
          onValueChange={adjustVolume}
          max={100}
          step={1}
          className="w-20"
        />
        <span className="text-white text-xs w-8">{volume[0]}%</span>
      </div>

      {/* Settings */}
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="w-12 h-12 rounded-full"
        >
          <Settings className="w-5 h-5" />
        </Button>

        {showSettings && (
          <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg p-4 w-80 z-50">
            <h3 className="font-semibold text-gray-900 mb-4">Media Settings</h3>
            
            {/* Camera Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Camera className="w-4 h-4 inline mr-1" />
                Camera
              </label>
              <select
                value={selectedDevices.camera}
                onChange={(e) => switchCamera(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select Camera</option>
                {devices.cameras.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Microphone Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mic className="w-4 h-4 inline mr-1" />
                Microphone
              </label>
              <select
                value={selectedDevices.microphone}
                onChange={(e) => switchMicrophone(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select Microphone</option>
                {devices.microphones.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Speaker Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Headphones className="w-4 h-4 inline mr-1" />
                Speaker
              </label>
              <select
                value={selectedDevices.speaker}
                onChange={(e) => setSelectedDevices(prev => ({ ...prev, speaker: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Default Speaker</option>
                {devices.speakers.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Close Settings */}
            <Button
              onClick={() => setShowSettings(false)}
              className="w-full"
              size="sm"
            >
              Done
            </Button>
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div className="flex items-center space-x-1 bg-green-600 rounded-full px-3 py-1">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span className="text-white text-xs font-medium">LIVE</span>
      </div>
    </div>
  )
}