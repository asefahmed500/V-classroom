"use client"

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Video, 
  Square, 
  Pause, 
  Play, 
  Download, 
  Upload,
  Clock,
  HardDrive,
  AlertCircle
} from 'lucide-react'

interface RoomRecorderProps {
  roomId: string
  userId: string
  userName: string
  isHost: boolean
}

export const RoomRecorder = ({ roomId, userId, userName, isHost }: RoomRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const startRecording = useCallback(async () => {
    try {
      // Get screen and audio stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      })

      // Get microphone audio
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      })

      // Combine streams
      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...screenStream.getAudioTracks(),
        ...audioStream.getAudioTracks()
      ])

      streamRef.current = combinedStream
      chunksRef.current = []

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9'
      })

      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        setRecordedBlob(blob)
        
        // Clean up streams
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
        }
      }

      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      // Handle screen share end
      screenStream.getVideoTracks()[0].onended = () => {
        stopRecording()
      }

    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('Failed to start recording. Please ensure you grant screen sharing permissions.')
    }
  }, [])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume()
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1)
        }, 1000)
      } else {
        mediaRecorderRef.current.pause()
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
      }
      setIsPaused(!isPaused)
    }
  }, [isRecording, isPaused])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRecording])

  const downloadRecording = useCallback(() => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `room-${roomId}-recording-${new Date().toISOString().split('T')[0]}.webm`
      a.click()
      URL.revokeObjectURL(url)
    }
  }, [recordedBlob, roomId])

  const uploadRecording = useCallback(async () => {
    if (!recordedBlob) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('recording', recordedBlob, `room-${roomId}-recording.webm`)
      formData.append('roomId', roomId)
      formData.append('userId', userId)
      formData.append('userName', userName)
      formData.append('duration', recordingTime.toString())

      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100
          setUploadProgress(progress)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          alert('Recording uploaded successfully!')
          setRecordedBlob(null)
          setRecordingTime(0)
        } else {
          alert('Failed to upload recording')
        }
        setIsUploading(false)
        setUploadProgress(0)
      })

      xhr.addEventListener('error', () => {
        alert('Failed to upload recording')
        setIsUploading(false)
        setUploadProgress(0)
      })

      xhr.open('POST', '/api/recordings/upload')
      xhr.send(formData)

    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload recording')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [recordedBlob, roomId, userId, userName, recordingTime])

  if (!isHost) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <Video className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Only the room host can record sessions</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Video className="w-5 h-5 mr-2" />
            Session Recording
          </CardTitle>
          {isRecording && (
            <Badge className="bg-red-600 text-white animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
              {isPaused ? 'PAUSED' : 'RECORDING'}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Recording Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-600" />
            <div>
              <p className="font-medium text-gray-900">
                {isRecording ? 'Recording Time' : 'Ready to Record'}
              </p>
              <p className="text-sm text-gray-600">
                {formatTime(recordingTime)}
              </p>
            </div>
          </div>
          
          {recordedBlob && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <HardDrive className="w-4 h-4" />
              <span>{(recordedBlob.size / (1024 * 1024)).toFixed(1)} MB</span>
            </div>
          )}
        </div>

        {/* Recording Controls */}
        <div className="flex gap-2">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              <Video className="w-4 h-4 mr-2" />
              Start Recording
            </Button>
          ) : (
            <>
              <Button
                onClick={pauseRecording}
                variant="outline"
                className="flex-1"
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              <Button
                onClick={stopRecording}
                variant="destructive"
                className="flex-1"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </>
          )}
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading recording...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Recording Actions */}
        {recordedBlob && !isUploading && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                onClick={downloadRecording}
                variant="outline"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={uploadRecording}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload to Cloud
              </Button>
            </div>
            
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Recording Complete</p>
                <p>You can download the recording locally or upload it to the cloud for sharing with participants.</p>
              </div>
            </div>
          </div>
        )}

        {/* Recording Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Recording captures screen sharing and audio</p>
          <p>• Recordings are saved in WebM format</p>
          <p>• Only room hosts can start/stop recordings</p>
          <p>• Participants will be notified when recording starts</p>
        </div>
      </CardContent>
    </Card>
  )
}