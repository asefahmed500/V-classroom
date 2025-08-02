"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { User, Edit, Save, X } from "lucide-react"
import type { User as UserType } from "@/types"

export function UserProfile() {
  const [user, setUser] = useState<UserType | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    school: "",
    grade: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/user/profile")
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setFormData({
          name: userData.name,
          school: userData.school,
          grade: userData.grade,
        })
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUser(updatedUser)
        setEditing(false)
        toast({
          title: "Success",
          description: "Profile updated successfully",
        })
      } else {
        throw new Error("Failed to update profile")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name,
        school: user.school,
        grade: user.grade,
      })
    }
    setEditing(false)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Failed to load profile</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            Profile
          </CardTitle>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing ? (
          <>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="school">School</Label>
              <Input
                id="school"
                value={formData.school}
                onChange={(e) => setFormData({ ...formData, school: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="grade">Grade</Label>
              <Select value={formData.grade} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9">9th Grade</SelectItem>
                  <SelectItem value="10">10th Grade</SelectItem>
                  <SelectItem value="11">11th Grade</SelectItem>
                  <SelectItem value="12">12th Grade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-1" />
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <Label>Name</Label>
              <p className="text-sm text-gray-600">{user.name}</p>
            </div>

            <div>
              <Label>Email</Label>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>

            <div>
              <Label>School</Label>
              <p className="text-sm text-gray-600">{user.school}</p>
            </div>

            <div>
              <Label>Grade</Label>
              <p className="text-sm text-gray-600">{user.grade}th Grade</p>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Study Statistics</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{user.studyStats.totalStudyTime}h</p>
                  <p className="text-xs text-gray-500">Total Study Time</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{user.studyStats.roomsJoined}</p>
                  <p className="text-xs text-gray-500">Rooms Joined</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{user.studyStats.studyStreak}</p>
                  <p className="text-xs text-gray-500">Day Streak</p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
