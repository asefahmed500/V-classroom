"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Clock, 
  Target, 
  TrendingUp, 
  BookOpen, 
  Brain,
  Calendar,
  Award,
  BarChart3
} from "lucide-react"

interface StudyAnalyticsProps {
  userId: string
  roomId: string
}

interface AnalyticsData {
  totalStudyTime: number
  focusTime: number
  breakTime: number
  sessionsCompleted: number
  averageSessionLength: number
  subjectsStudied: string[]
  weeklyProgress: number[]
  achievements: number
}

export function StudyAnalytics({ userId, roomId }: StudyAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalStudyTime: 0,
    focusTime: 0,
    breakTime: 0,
    sessionsCompleted: 0,
    averageSessionLength: 0,
    subjectsStudied: [],
    weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
    achievements: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`/api/analytics/user/${userId}`)
        if (response.ok) {
          const data = await response.json()
          setAnalytics(prev => ({
            ...prev,
            ...data.analytics
          }))
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
        // Keep default analytics data on error
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      fetchAnalytics()
    } else {
      setIsLoading(false)
    }
  }, [userId])

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-500"
    if (progress >= 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-24 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-24 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Study Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Study Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatTime(analytics.totalStudyTime)}
              </div>
              <div className="text-sm text-gray-600">Total Study Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {analytics.sessionsCompleted}
              </div>
              <div className="text-sm text-gray-600">Sessions Completed</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Focus Time</span>
              <span>{formatTime(analytics.focusTime)}</span>
            </div>
            <Progress 
              value={(analytics.focusTime / (analytics.totalStudyTime || 1)) * 100} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Weekly Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Weekly Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-end h-24 space-x-1">
            {(analytics.weeklyProgress || [0, 0, 0, 0, 0, 0, 0]).map((progress, index) => {
              const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
              return (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div 
                    className={`w-full rounded-t ${getProgressColor(progress)} transition-all duration-300`}
                    style={{ height: `${Math.max(progress, 5)}%` }}
                  ></div>
                  <div className="text-xs text-gray-600 mt-1">{days[index]}</div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Study Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Study Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-blue-500" />
              <span className="text-sm">Avg. Session</span>
            </div>
            <span className="font-medium">{formatTime(analytics.averageSessionLength)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BookOpen className="w-4 h-4 mr-2 text-green-500" />
              <span className="text-sm">Subjects</span>
            </div>
            <span className="font-medium">{analytics.subjectsStudied?.length || 0}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Award className="w-4 h-4 mr-2 text-yellow-500" />
              <span className="text-sm">Achievements</span>
            </div>
            <span className="font-medium">{analytics.achievements}</span>
          </div>
        </CardContent>
      </Card>

      {/* Subjects Studied */}
      {analytics.subjectsStudied && analytics.subjectsStudied.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="w-5 h-5 mr-2" />
              Subjects Studied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analytics.subjectsStudied.map((subject, index) => (
                <Badge key={index} variant="secondary">
                  {subject}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}