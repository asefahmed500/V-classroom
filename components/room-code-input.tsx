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
      // Use the new lookup endpoint
      const response = await fetch('/api/rooms/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: roomCode.trim() })
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/rooms/${data.room.id}`)
      } else {
        const error = await response.json()
        alert(error.message || error.error || "Room not found")
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
          Enter a room code to join a study room
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleJoin} className="flex space-x-2">
          <Input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.trim())}
            placeholder="Enter room code"
            className="font-mono text-center text-lg tracking-wider"
          />
          <Button type="submit" disabled={loading || !roomCode.trim()}>
            {loading ? "Joining..." : <ArrowRight className="w-4 h-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}