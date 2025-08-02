"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, RotateCcw, Clock } from "lucide-react"

export function StudyTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60) // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [sessions, setSessions] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      // Timer finished
      setIsRunning(false)
      if (!isBreak) {
        // Study session finished, start break
        setSessions(sessions + 1)
        setIsBreak(true)
        setTimeLeft(5 * 60) // 5 minute break
      } else {
        // Break finished, start new study session
        setIsBreak(false)
        setTimeLeft(25 * 60) // 25 minute study session
      }
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, timeLeft, isBreak, sessions])

  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  const resetTimer = () => {
    setIsRunning(false)
    setIsBreak(false)
    setTimeLeft(25 * 60)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Card className="bg-gray-700 border-gray-600">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-white" />
            <div className="text-white">
              <div className="text-2xl font-mono font-bold">{formatTime(timeLeft)}</div>
              <div className="text-xs text-gray-300">{isBreak ? "Break Time" : "Study Time"}</div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button size="sm" variant={isRunning ? "secondary" : "default"} onClick={toggleTimer}>
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>

            <Button size="sm" variant="outline" onClick={resetTimer}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          <Badge variant="secondary">Sessions: {sessions}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}
