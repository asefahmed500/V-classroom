"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Hash, ArrowRight } from "lucide-react"

export function RoomCodeInput() {
  const [roomCode, setRoomCode] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomCode.trim()) return

    setLoading(true)
    try {
      // First, find the room by code
      const response = await fetch(`/api/rooms/join/${roomCode.toUpperCase()}`)
      if (response.ok) {
        const data = await response.json()
        router.push(`/rooms/${data.roomId}`)
      } else {
        const error = await response.json()
        alert(error.message || "Room not found")
      }
    } catch (error) {
      console.error("Join room error:", error)
      alert("Failed to join room")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Hash className="w-5 h-5 mr-2" />
          Join with Room Code
        </CardTitle>
        <CardDescription>
          Enter a 6-character room code to join a private study room
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleJoin} className="flex space-x-2">
          <Input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="font-mono text-center text-lg tracking-wider"
          />
          <Button type="submit" disabled={loading || roomCode.length !== 6}>
            {loading ? "Joining..." : <ArrowRight className="w-4 h-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}