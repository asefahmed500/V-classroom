"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RoomJoinByCode } from "@/components/room-join-by-code"
import { RoomCodeInput } from "@/components/room-code-input"
import { Users, Hash, ArrowRight } from "lucide-react"

export default function JoinPage() {
  const searchParams = useSearchParams()
  const [initialCode, setInitialCode] = useState("")

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      setInitialCode(code.toUpperCase())
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Join Study Room</h1>
                <p className="text-sm text-gray-600">Enter a room code to join a study session</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Main Join Interface */}
          <div className="space-y-8">
            {/* Welcome Card */}
            <Card className="text-center bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Hash className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Join a Study Room
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-lg mb-6">
                  Enter a 6-digit room code to join your study partners in a collaborative learning session.
                </p>
                
                {/* Quick Instructions */}
                <div className="bg-white/50 rounded-lg p-4 text-left">
                  <h3 className="font-semibold text-gray-900 mb-3">How to join:</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                      <span>Get the room code from your study partner</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                      <span>Enter the 6-digit code below</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                      <span>Enter your name and join the room</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Join Form */}
            <RoomJoinByCode 
              initialCode={initialCode}
              onRoomFound={(roomData) => {
                console.log('Room found:', roomData)
              }}
            />

            {/* Alternative Methods */}
            <Card className="bg-gray-50 border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">Other Ways to Join</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <h4 className="font-medium text-gray-900">Browse Public Rooms</h4>
                    <p className="text-sm text-gray-600">Find open study sessions you can join</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <h4 className="font-medium text-gray-900">Create Your Own Room</h4>
                    <p className="text-sm text-gray-600">Start a new study session and invite others</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            {/* Help Section */}
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="font-semibold text-amber-800 mb-2">Need Help?</h3>
                  <p className="text-sm text-amber-700 mb-4">
                    Room codes are 6 characters long and case-insensitive. 
                    If you're having trouble joining, make sure you have the correct code from your study partner.
                  </p>
                  <div className="text-xs text-amber-600">
                    Example codes: ABC123, XYZ789, DEF456
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}