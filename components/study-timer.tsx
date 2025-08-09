"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  Coffee, 
  Target,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react'
import { Socket } from 'socket.io-client'

interface StudyTimerProps {
  socket: Socket | null
  roomId: string
  userId: string
  isHost?: boolean
}

interface TimerState {
  isRunning: boolean
  timeLeft: number
  mode: 'work' | 'shortBreak' | 'longBreak'
  session: number
}

const TIMER_MODES = {
  work: { duration: 25 * 60, label: 'Focus Time', color: 'bg-red-500', icon: Target },
  shortBreak: { duration: 5 * 60, label: 'Short Break', color: 'bg-green-500', icon: Coffee },
  longBreak: { duration: 15 * 60, label: 'Long Break', color: 'bg-blue-500', icon: Coffee }
}

export const StudyTimer = ({ socket, roomId, userId, isHost = false }: StudyTimerProps) => {
  const [timer, setTimer] = useState<TimerState>({
    isRunning: false,
    timeLeft: TIMER_MODES.work.duration,
    mode: 'work',
    session: 1
  })
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    socket.on('timer-start', (timerState: TimerState) => {
      setTimer(prev => ({ ...prev, isRunning: true }))
    })

    socket.on('timer-pause', (timerState: TimerState) => {
      setTimer(prev => ({ ...prev, isRunning: false }))
    })

    socket.on('timer-reset', (timerState: TimerState) => {
      setTimer(timerState)
    })

    socket.on('timer-update', ({ timeLeft, mode }) => {
      setTimer(prev => ({ ...prev, timeLeft, mode }))
    })

    return () => {
      socket.off('timer-start')
      socket.off('timer-pause')
      socket.off('timer-reset')
      socket.off('timer-update')
    }
  }, [socket])

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (timer.isRunning && timer.timeLeft > 0) {
      interval = setInterval(() => {
        setTimer(prev => {
          const newTimeLeft = prev.timeLeft - 1
          
          // Broadcast timer update to other users
          if (socket && isHost) {
            socket.emit('timer-update', { 
              roomId, 
              timeLeft: newTimeLeft, 
              mode: prev.mode 
            })
          }

          // Handle timer completion
          if (newTimeLeft === 0) {
            handleTimerComplete(prev)
            return prev
          }

          return { ...prev, timeLeft: newTimeLeft }
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timer.isRunning, timer.timeLeft, socket, roomId, isHost])

  // Handle timer completion
  const handleTimerComplete = useCallback((currentTimer: TimerState) => {
    // Play notification sound
    if (soundEnabled) {
      const audio = new Audio('/sounds/timer-complete.mp3')
      audio.play().catch(() => {}) // Ignore errors if sound file doesn't exist
    }

    // Show browser notification
    if (Notification.permission === 'granted') {
      const mode = TIMER_MODES[currentTimer.mode]
      new Notification(`${mode.label} Complete!`, {
        body: getNextModeMessage(currentTimer),
        icon: '/icons/timer.png'
      })
    }

    // Auto-switch to next mode
    const nextMode = getNextMode(currentTimer)
    const newTimer: TimerState = {
      isRunning: false,
      timeLeft: TIMER_MODES[nextMode].duration,
      mode: nextMode,
      session: nextMode === 'work' ? currentTimer.session + 1 : currentTimer.session
    }

    setTimer(newTimer)

    if (socket && isHost) {
      socket.emit('timer-reset', { roomId })
    }
  }, [soundEnabled, socket, roomId, isHost])

  // Get next timer mode based on Pomodoro technique
  const getNextMode = (currentTimer: TimerState): 'work' | 'shortBreak' | 'longBreak' => {
    if (currentTimer.mode === 'work') {
      return currentTimer.session % 4 === 0 ? 'longBreak' : 'shortBreak'
    }
    return 'work'
  }

  const getNextModeMessage = (currentTimer: TimerState): string => {
    const nextMode = getNextMode(currentTimer)
    const nextModeConfig = TIMER_MODES[nextMode]
    return `Next: ${nextModeConfig.label} (${Math.floor(nextModeConfig.duration / 60)} minutes)`
  }

  // Timer controls (only for host)
  const startTimer = useCallback(() => {
    if (!isHost || !socket) return
    
    setTimer(prev => ({ ...prev, isRunning: true }))
    socket.emit('timer-start', { roomId })
  }, [isHost, socket, roomId])

  const pauseTimer = useCallback(() => {
    if (!isHost || !socket) return
    
    setTimer(prev => ({ ...prev, isRunning: false }))
    socket.emit('timer-pause', { roomId })
  }, [isHost, socket, roomId])

  const resetTimer = useCallback(() => {
    if (!isHost || !socket) return
    
    const newTimer: TimerState = {
      isRunning: false,
      timeLeft: TIMER_MODES[timer.mode].duration,
      mode: timer.mode,
      session: timer.session
    }
    
    setTimer(newTimer)
    socket.emit('timer-reset', { roomId })
  }, [isHost, socket, roomId, timer.mode, timer.session])

  const switchMode = useCallback((mode: 'work' | 'shortBreak' | 'longBreak') => {
    if (!isHost || !socket) return
    
    const newTimer: TimerState = {
      isRunning: false,
      timeLeft: TIMER_MODES[mode].duration,
      mode,
      session: timer.session
    }
    
    setTimer(newTimer)
    socket.emit('timer-reset', { roomId })
  }, [isHost, socket, roomId, timer.session])

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const currentMode = TIMER_MODES[timer.mode]
  const progress = ((currentMode.duration - timer.timeLeft) / currentMode.duration) * 100
  const Icon = currentMode.icon

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Study Timer
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Session {timer.session}</Badge>
            {!isHost && <Badge variant="outline">Synced</Badge>}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Timer Display */}
        <div className="text-center space-y-4">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white ${currentMode.color}`}>
            <Icon className="w-5 h-5" />
            <span className="font-medium">{currentMode.label}</span>
          </div>
          
          <div className="text-6xl font-mono font-bold text-gray-900">
            {formatTime(timer.timeLeft)}
          </div>
          
          <Progress value={progress} className="w-full h-2" />
        </div>

        {/* Mode Selector */}
        <div className="flex gap-2 justify-center">
          {Object.entries(TIMER_MODES).map(([mode, config]) => (
            <Button
              key={mode}
              variant={timer.mode === mode ? 'default' : 'outline'}
              size="sm"
              onClick={() => switchMode(mode as any)}
              disabled={!isHost || timer.isRunning}
              className="flex items-center gap-1"
            >
              <config.icon className="w-3 h-3" />
              {config.label}
            </Button>
          ))}
        </div>

        {/* Controls */}
        {isHost ? (
          <div className="flex justify-center gap-3">
            <Button
              onClick={timer.isRunning ? pauseTimer : startTimer}
              size="lg"
              className="flex items-center gap-2"
            >
              {timer.isRunning ? (
                <>
                  <Pause className="w-5 h-5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start
                </>
              )}
            </Button>
            
            <Button
              onClick={resetTimer}
              variant="outline"
              size="lg"
              disabled={timer.isRunning}
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
            
            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              variant="outline"
              size="lg"
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </Button>
          </div>
        ) : (
          <div className="text-center text-gray-600">
            <p className="text-sm">Timer is controlled by the room host</p>
            <div className="flex justify-center mt-2">
              <Button
                onClick={() => setSoundEnabled(!soundEnabled)}
                variant="outline"
                size="sm"
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{timer.session}</div>
            <div className="text-xs text-gray-600">Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {Math.floor((timer.session * 25) / 60)}h
            </div>
            <div className="text-xs text-gray-600">Focus Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.floor(timer.session / 4)}
            </div>
            <div className="text-xs text-gray-600">Cycles</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}