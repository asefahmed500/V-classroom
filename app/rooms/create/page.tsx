"use client"

import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { CreateRoomForm } from "@/components/create-room-form"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function CreateRoomPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Redirect to login if not authenticated
  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) {
    router.push('/auth/signin?callbackUrl=/rooms/create')
    return null
  }

  const handleRoomCreated = (roomData: any) => {
    // Redirect to the created room after a short delay
    setTimeout(() => {
      router.push(`/rooms/${roomData._id}`)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create Study Room</h1>
              <p className="text-gray-600 mt-1">Set up your collaborative learning space</p>
            </div>
            <Link href="/rooms">
              <Button variant="outline">
                ← Back to Rooms
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CreateRoomForm onRoomCreated={handleRoomCreated} />
      </div>
    </div>
  )
}