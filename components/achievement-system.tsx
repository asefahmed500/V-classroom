"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Trophy, 
  Star, 
  Target, 
  Clock, 
  Users, 
  BookOpen,
  Flame,
  Award,
  Medal,
  Crown
} from "lucide-react"

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category: 'time' | 'sessions' | 'social' | 'learning' | 'streak'
  requirement: number
  progress: number
  unlocked: boolean
  unlockedAt?: Date
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

interface AchievementSystemProps {
  userId: string
  achievements: Achievement[]
  onAchievementUnlocked: (achievement: Achievement) => void
}

export function AchievementSystem({ userId, achievements, onAchievementUnlocked }: AchievementSystemProps) {
  const [userAchievements, setUserAchievements] = useState<Achievement[]>(achievements)
  const [recentUnlocks, setRecentUnlocks] = useState<Achievement[]>([])

  const defaultAchievements: Achievement[] = [
    {
      id: 'first_session',
      title: 'Getting Started',
      description: 'Complete your first study session',
      icon: '🎯',
      category: 'sessions',
      requirement: 1,
      progress: 0,
      unlocked: false,
      rarity: 'common'
    },
    {
      id: 'study_streak_7',
      title: 'Week Warrior',
      description: 'Study for 7 consecutive days',
      icon: '🔥',
      category: 'streak',
      requirement: 7,
      progress: 0,
      unlocked: false,
      rarity: 'rare'
    },
    {
      id: 'total_time_10h',
      title: 'Time Master',
      description: 'Study for a total of 10 hours',
      icon: '⏰',
      category: 'time',
      requirement: 600, // 10 hours in minutes
      progress: 0,
      unlocked: false,
      rarity: 'rare'
    },
    {
      id: 'social_butterfly',
      title: 'Social Butterfly',
      description: 'Join 5 different study rooms',
      icon: '🦋',
      category: 'social',
      requirement: 5,
      progress: 0,
      unlocked: false,
      rarity: 'epic'
    },
    {
      id: 'knowledge_seeker',
      title: 'Knowledge Seeker',
      description: 'Ask the AI tutor 50 questions',
      icon: '🧠',
      category: 'learning',
      requirement: 50,
      progress: 0,
      unlocked: false,
      rarity: 'epic'
    },
    {
      id: 'marathon_runner',
      title: 'Marathon Runner',
      description: 'Study for 4 hours in a single session',
      icon: '🏃‍♂️',
      category: 'time',
      requirement: 240, // 4 hours in minutes
      progress: 0,
      unlocked: false,
      rarity: 'legendary'
    }
  ]

  useEffect(() => {
    // Initialize with default achievements if none provided
    if (achievements.length === 0) {
      setUserAchievements(defaultAchievements)
    } else {
      setUserAchievements(achievements)
    }
  }, [achievements])

  useEffect(() => {
    // Check for new achievements
    const checkAchievements = async () => {
      try {
        const response = await fetch(`/api/achievements/check/${userId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.newAchievements && data.newAchievements.length > 0) {
            setRecentUnlocks(data.newAchievements)
            data.newAchievements.forEach((achievement: Achievement) => {
              onAchievementUnlocked(achievement)
            })
          }
        }
      } catch (error) {
        console.error('Failed to check achievements:', error)
      }
    }

    const interval = setInterval(checkAchievements, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [userId, onAchievementUnlocked])

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-600 bg-gray-100'
      case 'rare': return 'text-blue-600 bg-blue-100'
      case 'epic': return 'text-purple-600 bg-purple-100'
      case 'legendary': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'common': return <Star className="w-3 h-3" />
      case 'rare': return <Medal className="w-3 h-3" />
      case 'epic': return <Trophy className="w-3 h-3" />
      case 'legendary': return <Crown className="w-3 h-3" />
      default: return <Star className="w-3 h-3" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'time': return <Clock className="w-4 h-4" />
      case 'sessions': return <Target className="w-4 h-4" />
      case 'social': return <Users className="w-4 h-4" />
      case 'learning': return <BookOpen className="w-4 h-4" />
      case 'streak': return <Flame className="w-4 h-4" />
      default: return <Award className="w-4 h-4" />
    }
  }

  const unlockedAchievements = userAchievements.filter(a => a.unlocked)
  const lockedAchievements = userAchievements.filter(a => !a.unlocked)

  return (
    <div className="space-y-4">
      {/* Achievement Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {unlockedAchievements.length}
              </div>
              <div className="text-sm text-gray-600">Unlocked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {userAchievements.length}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round((unlockedAchievements.length / userAchievements.length) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Complete</div>
            </div>
          </div>
          
          <Progress 
            value={(unlockedAchievements.length / userAchievements.length) * 100} 
            className="h-2"
          />
        </CardContent>
      </Card>

      {/* Recent Unlocks */}
      {recentUnlocks.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-700">
              <Star className="w-5 h-5 mr-2" />
              Recently Unlocked!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentUnlocks.map((achievement) => (
                <div key={achievement.id} className="flex items-center space-x-3 p-2 bg-white rounded-lg">
                  <div className="text-2xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium">{achievement.title}</div>
                    <div className="text-sm text-gray-600">{achievement.description}</div>
                  </div>
                  <Badge className={getRarityColor(achievement.rarity)}>
                    {getRarityIcon(achievement.rarity)}
                    {achievement.rarity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unlocked Achievements */}
      {unlockedAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="w-5 h-5 mr-2 text-green-500" />
              Unlocked Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {unlockedAchievements.map((achievement) => (
                <div key={achievement.id} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium text-green-800">{achievement.title}</div>
                    <div className="text-sm text-green-600">{achievement.description}</div>
                    {achievement.unlockedAt && (
                      <div className="text-xs text-green-500 mt-1">
                        Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(achievement.category)}
                    <Badge className={getRarityColor(achievement.rarity)}>
                      {getRarityIcon(achievement.rarity)}
                      {achievement.rarity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Towards Achievements */}
      {lockedAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2 text-blue-500" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lockedAchievements.map((achievement) => (
                <div key={achievement.id} className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="text-xl opacity-50">{achievement.icon}</div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-700">{achievement.title}</div>
                      <div className="text-sm text-gray-500">{achievement.description}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(achievement.category)}
                      <Badge variant="outline" className={getRarityColor(achievement.rarity)}>
                        {getRarityIcon(achievement.rarity)}
                        {achievement.rarity}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="ml-12">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{achievement.progress}/{achievement.requirement}</span>
                    </div>
                    <Progress 
                      value={(achievement.progress / achievement.requirement) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}