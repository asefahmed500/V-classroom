// Fallback connection system for when WebSocket fails
export class ConnectionFallback {
  private static instance: ConnectionFallback
  private fallbackActive = false
  private pollingInterval: NodeJS.Timeout | null = null

  static getInstance(): ConnectionFallback {
    if (!ConnectionFallback.instance) {
      ConnectionFallback.instance = new ConnectionFallback()
    }
    return ConnectionFallback.instance
  }

  async startFallback(roomId: string, userId: string, onUpdate: (data: any) => void) {
    if (this.fallbackActive) return

    console.log('🔄 Starting connection fallback for room:', roomId)
    this.fallbackActive = true

    // Poll room state every 10 seconds as fallback
    this.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        })

        if (response.ok) {
          const data = await response.json()
          onUpdate(data)
        }
      } catch (error) {
        console.error('Fallback polling error:', error)
      }
    }, 10000)
  }

  stopFallback() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
    this.fallbackActive = false
    console.log('🛑 Stopped connection fallback')
  }

  isFallbackActive(): boolean {
    return this.fallbackActive
  }
}

export const connectionFallback = ConnectionFallback.getInstance()