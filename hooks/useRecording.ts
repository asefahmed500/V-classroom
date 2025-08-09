"use client"

import { useState, useRef, useCallback } from 'react'

interface UseRecordingProps {
  roomId: string
  userId: string
}

export const useRecording = ({ roomId, userId }: UseRecordingProps) => {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordings, setRecordings] = useState<any[]>([])
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout>()

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Get screen + audio stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      })

      // Get microphone stream
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true
      })

      // Combine streams
      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...screenStream.getAudioTracks(),
        ...micStream.getAudioTracks()
      ])

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9'
      })

      mediaRecorderRef.current = mediaRecorder
      recordedChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: 'video/webm'
        })

        // Upload recording
        await uploadRecording(blob)
        
        // Clean up streams
        combinedStream.getTracks().forEach(track => track.stop())
        screenStream.getTracks().forEach(track => track.stop())
        micStream.getTracks().forEach(track => track.stop())
      }

      // Handle screen share end
      screenStream.getVideoTracks()[0].onended = () => {
        stopRecording()
      }

      mediaRecorder.start(1000) // Record in 1-second chunks
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Failed to start recording:', error)
      throw error
    }
  }, [roomId, userId])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRecording])

  // Upload recording to server
  const uploadRecording = async (blob: Blob) => {
    try {
      const formData = new FormData()
      const fileName = `recording-${roomId}-${Date.now()}.webm`
      
      formData.append('file', blob, fileName)
      formData.append('roomId', roomId)
      formData.append('userId', userId)
      formData.append('type', 'recording')

      const response = await fetch('/api/recordings/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setRecordings(prev => [...prev, data.recording])
        return data.recording
      }
    } catch (error) {
      console.error('Failed to upload recording:', error)
    }
  }

  // Load existing recordings
  const loadRecordings = useCallback(async () => {
    try {
      const response = await fetch(`/api/recordings/${roomId}`)
      if (response.ok) {
        const data = await response.json()
        setRecordings(data.recordings || [])
      }
    } catch (error) {
      console.error('Failed to load recordings:', error)
    }
  }, [roomId])

  // Delete recording
  const deleteRecording = useCallback(async (recordingId: string) => {
    try {
      const response = await fetch(`/api/recordings/${recordingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        setRecordings(prev => prev.filter(r => r.id !== recordingId))
      }
    } catch (error) {
      console.error('Failed to delete recording:', error)
    }
  }, [userId])

  // Format recording time
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return {
    isRecording,
    recordingTime: formatTime(recordingTime),
    recordings,
    startRecording,
    stopRecording,
    loadRecordings,
    deleteRecording,
    canRecord: typeof navigator !== 'undefined' && 
                navigator.mediaDevices && 
                navigator.mediaDevices.getDisplayMedia
  }
}