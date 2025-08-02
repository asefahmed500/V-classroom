"use client"

import type React from "react"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pen, Eraser, Square, Circle, Type, Palette, Download, Trash2, Undo, Redo } from "lucide-react"
import { io, type Socket } from "socket.io-client"

interface DrawingPoint {
  x: number
  y: number
}

interface DrawingPath {
  id: string
  points: DrawingPoint[]
  color: string
  width: number
  tool: string
  userId: string
}

interface CollaborativeWhiteboardProps {
  roomId: string
  userId: string
}

export function CollaborativeWhiteboard({ roomId, userId }: CollaborativeWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentTool, setCurrentTool] = useState("pen")
  const [currentColor, setCurrentColor] = useState("#000000")
  const [currentWidth, setCurrentWidth] = useState(2)
  const [paths, setPaths] = useState<DrawingPath[]>([])
  const [currentPath, setCurrentPath] = useState<DrawingPoint[]>([])
  const [history, setHistory] = useState<DrawingPath[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const colors = ["#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500"]

  const tools = [
    { id: "pen", icon: Pen, label: "Pen" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "text", icon: Type, label: "Text" },
  ]

  useEffect(() => {
    initializeSocket()
    loadWhiteboardData()

    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [])

  useEffect(() => {
    redrawCanvas()
  }, [paths])

  const initializeSocket = () => {
    const newSocket = io(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", {
      path: "/api/socket",
      transports: ["websocket", "polling"],
    })

    newSocket.on("connect", () => {
      console.log("Whiteboard socket connected")
    })

    newSocket.on("connect_error", (error) => {
      console.error("Whiteboard socket connection error:", error)
    })

    newSocket.on("whiteboard-draw", (drawData: DrawingPath) => {
      setPaths((prev) => [...prev, drawData])
    })

    newSocket.on("whiteboard-clear", () => {
      setPaths([])
    })

    setSocket(newSocket)
  }

  const loadWhiteboardData = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/whiteboard`)
      if (response.ok) {
        const data = await response.json()
        if (data.paths) {
          setPaths(data.paths)
        }
      }
    } catch (error) {
      console.error("Failed to load whiteboard data:", error)
    }
  }

  const saveWhiteboardData = async (newPaths: DrawingPath[]) => {
    try {
      await fetch(`/api/rooms/${roomId}/whiteboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: newPaths }),
      })
    } catch (error) {
      console.error("Failed to save whiteboard data:", error)
    }
  }

  const redrawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Clear canvas
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw all paths
    paths.forEach((path) => {
      if (path.points.length > 1) {
        ctx.strokeStyle = path.color
        ctx.lineWidth = path.width
        ctx.lineCap = "round"
        ctx.lineJoin = "round"

        if (path.tool === "eraser") {
          ctx.globalCompositeOperation = "destination-out"
        } else {
          ctx.globalCompositeOperation = "source-over"
        }

        ctx.beginPath()
        ctx.moveTo(path.points[0].x, path.points[0].y)

        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y)
        }

        ctx.stroke()
      }
    })

    ctx.globalCompositeOperation = "source-over"
  }

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool !== "pen" && currentTool !== "eraser") return

    setIsDrawing(true)
    const pos = getMousePos(e)
    setCurrentPath([pos])
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || (currentTool !== "pen" && currentTool !== "eraser")) return

    const pos = getMousePos(e)
    setCurrentPath((prev) => [...prev, pos])

    // Draw current stroke locally
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!ctx || currentPath.length === 0) return

    ctx.strokeStyle = currentColor
    ctx.lineWidth = currentWidth
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    if (currentTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out"
    } else {
      ctx.globalCompositeOperation = "source-over"
    }

    ctx.beginPath()
    const lastPoint = currentPath[currentPath.length - 1]
    ctx.moveTo(lastPoint.x, lastPoint.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()

    ctx.globalCompositeOperation = "source-over"
  }

  const stopDrawing = () => {
    if (!isDrawing) return

    setIsDrawing(false)

    if (currentPath.length > 1) {
      const newPath: DrawingPath = {
        id: `${userId}-${Date.now()}`,
        points: currentPath,
        color: currentColor,
        width: currentWidth,
        tool: currentTool,
        userId,
      }

      const newPaths = [...paths, newPath]
      setPaths(newPaths)

      // Broadcast to other users
      if (socket) {
        socket.emit("whiteboard-draw", roomId, newPath)
      }

      // Save to database
      saveWhiteboardData(newPaths)

      // Update history
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(newPaths)
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    }

    setCurrentPath([])
  }

  const clearCanvas = () => {
    setPaths([])
    if (socket) {
      socket.emit("whiteboard-clear", roomId)
    }
    saveWhiteboardData([])

    // Update history
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push([])
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      const previousPaths = history[historyIndex - 1]
      setPaths(previousPaths)
      saveWhiteboardData(previousPaths)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      const nextPaths = history[historyIndex + 1]
      setPaths(nextPaths)
      saveWhiteboardData(nextPaths)
    }
  }

  const downloadCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement("a")
    link.download = `whiteboard-${roomId}-${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="bg-gray-100 border-b p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Tools */}
          <div className="flex items-center space-x-2">
            {tools.map((tool) => (
              <Button
                key={tool.id}
                size="sm"
                variant={currentTool === tool.id ? "default" : "outline"}
                onClick={() => setCurrentTool(tool.id)}
              >
                <tool.icon className="w-4 h-4" />
              </Button>
            ))}
          </div>

          {/* Colors */}
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4 text-gray-600" />
            {colors.map((color) => (
              <button
                key={color}
                className={`w-6 h-6 rounded-full border-2 ${
                  currentColor === color ? "border-gray-800" : "border-gray-300"
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setCurrentColor(color)}
              />
            ))}
          </div>

          {/* Brush Size */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Size:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={currentWidth}
              onChange={(e) => setCurrentWidth(Number.parseInt(e.target.value))}
              className="w-20"
            />
            <Badge variant="outline">{currentWidth}px</Badge>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={undo} disabled={historyIndex <= 0}>
            <Undo className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={redo} disabled={historyIndex >= history.length - 1}>
            <Redo className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={clearCanvas}>
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={downloadCanvas}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>
    </div>
  )
}
