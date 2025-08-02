"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Pause, RotateCcw, Clock, Users } from "lucide-react"
import { io, type Socket } from "socket.io-client"
import type { TimerState } from "@/types"

interface SynchronizedTimerProps {
  roomId: string
  userId: string
  isHost: boolean
}

export function SynchronizedTimer({ roomId, userId, isHost }: SynchronizedTimerProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [timerState, setTimerState] = useState<TimerState>({
    timeLeft: 25 * 60, // 25 minutes
    isRunning: false,
    isBreak: false,
    sessions: 0,
    startTime: 0,
  })
  const [studyDuration, setStudyDuration] = useState(25)
  const [breakDuration, setBreakDuration] = useState(5)

  useEffect(() => {
    initializeSocket()

    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (timerState.isRunning && timerState.timeLeft > 0) {
      interval = setInterval(() => {
        setTimerState((prev) => ({
          ...prev,
          timeLeft: prev.timeLeft - 1,
        }))
      }, 1000)
    } else if (timerState.timeLeft === 0 && timerState.isRunning) {
      // Timer finished
      handleTimerComplete()
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timerState.isRunning, timerState.timeLeft])

  const initializeSocket = () => {
    const newSocket = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
    })

    newSocket.on("timer-start", (data: TimerState) => {
      setTimerState(data)
    })

    newSocket.on("timer-pause", () => {
      setTimerState((prev) => ({ ...prev, isRunning: false }))
    })

    newSocket.on("timer-reset", () => {
      setTimerState({
        timeLeft: studyDuration * 60,
        isRunning: false,
        isBreak: false,
        sessions: 0,
        startTime: 0,
      })
    })

    setSocket(newSocket)
  }

  const handleTimerComplete = () => {
    const newState = { ...timerState }
    newState.isRunning = false

    if (!newState.isBreak) {
      // Study session finished, start break
      newState.sessions += 1
      newState.isBreak = true
      newState.timeLeft = breakDuration * 60
    } else {
      // Break finished, start new study session
      newState.isBreak = false
      newState.timeLeft = studyDuration * 60
    }

    setTimerState(newState)

    // Show notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(newState.isBreak ? "Break time!" : "Study time!", {
        body: newState.isBreak ? "Take a well-deserved break" : "Time to focus and study",
        icon: "/favicon.ico",
      })
    }
  }

  const startTimer = () => {
    if (!isHost) return

    const newState = {
      ...timerState,
      isRunning: true,
      startTime: Date.now(),
    }

    setTimerState(newState)

    if (socket) {
      socket.emit("timer-start", roomId, newState)
    }
  }

  const pauseTimer = () => {
    if (!isHost) return

    setTimerState((prev) => ({ ...prev, isRunning: false }))

    if (socket) {
      socket.emit("timer-pause", roomId)
    }
  }

  const resetTimer = () => {
    if (!isHost) return

    const newState = {
      timeLeft: studyDuration * 60,
      isRunning: false,
      isBreak: false,
      sessions: 0,
      startTime: 0,
    }

    setTimerState(newState)

    if (socket) {
      socket.emit("timer-reset", roomId)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getProgressPercentage = () => {
    const totalTime = timerState.isBreak ? breakDuration * 60 : studyDuration * 60
    return ((totalTime - timerState.timeLeft) / totalTime) * 100
  }

  return (
    <Card className="bg-gray-700 border-gray-600">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Timer Display */}
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-600"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - getProgressPercentage() / 100)}`}
                  className={timerState.isBreak ? "text-green-500" : "text-blue-500"}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-mono font-bold text-white">{formatTime(timerState.timeLeft)}</div>
                  <div className="text-xs text-gray-300">{timerState.isBreak ? "Break Time" : "Study Time"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-2">
            {isHost ? (
              <>
                <Button
                  size="sm"
                  variant={timerState.isRunning ? "secondary" : "default"}
                  onClick={timerState.isRunning ? pauseTimer : startTimer}
                >
                  {timerState.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>

                <Button size="sm" variant="outline" onClick={resetTimer}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <div className="flex items-center space-x-2 text-gray-300">
                <Users className="w-4 h-4" />
                <span className="text-sm">Synchronized with host</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <Badge variant="secondary">Sessions: {timerState.sessions}</Badge>
            <div className="flex items-center space-x-2 text-gray-300">
              <Clock className="w-4 h-4" />
              <span>Pomodoro Timer</span>
            </div>
          </div>

          {/* Settings (Host only) */}
          {isHost && !timerState.isRunning && (
            <div className="space-y-2 pt-2 border-t border-gray-600">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-300">Study:</span>
                <Select value={studyDuration.toString()} onValueChange={(value) => setStudyDuration(Number(value))}>
                  <SelectTrigger className="w-20 h-8 bg-gray-600 border-gray-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15m</SelectItem>
                    <SelectItem value="25">25m</SelectItem>
                    <SelectItem value="30">30m</SelectItem>
                    <SelectItem value="45">45m</SelectItem>
                    <SelectItem value="60">60m</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-300">Break:</span>
                <Select value={breakDuration.toString()} onValueChange={(value) => setBreakDuration(Number(value))}>
                  <SelectTrigger className="w-20 h-8 bg-gray-600 border-gray-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5m</SelectItem>
                    <SelectItem value="10">10m</SelectItem>
                    <SelectItem value="15">15m</SelectItem>
                    <SelectItem value="20">20m</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
