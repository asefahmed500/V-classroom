"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    grade: "",
    school: "",
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Pre-fill form data from URL params (for invitations)
    const email = searchParams.get("email")
    const name = searchParams.get("name")
    
    if (email) {
      setFormData(prev => ({ ...prev, email }))
    }
    if (name) {
      setFormData(prev => ({ ...prev, name }))
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const redirectUrl = searchParams.get("redirect") || "/dashboard"
        router.push(redirectUrl)
      } else {
        const error = await response.json()
        alert(error.message || "Signup failed")
      }
    } catch (error) {
      alert("Network error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Join Virtual Study Rooms</CardTitle>
          <CardDescription>Create your account to start studying with peers</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">School Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="grade">Grade Level</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, grade: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9">9th Grade</SelectItem>
                  <SelectItem value="10">10th Grade</SelectItem>
                  <SelectItem value="11">11th Grade</SelectItem>
                  <SelectItem value="12">12th Grade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="school">School Name</Label>
              <Input
                id="school"
                type="text"
                value={formData.school}
                onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-4">
            <Link href="/" className="flex items-center text-sm text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
