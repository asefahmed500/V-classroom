"use client"

import type React from "react"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pen, Eraser, Square, Circle, Type, Palette, Download, Trash2, Undo, Redo } from "lucide-react"

interface DrawingPoint {
  x: number
  y: number
}

interface DrawingPath {
  points: DrawingPoint[]
  color: string
  width: number
  tool: string
}

export function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentTool, setCurrentTool] = useState("pen")
  const [currentColor, setCurrentColor] = useState("#000000")
  const [currentWidth, setCurrentWidth] = useState(2)
  const [paths, setPaths] = useState<DrawingPath[]>([])
  const [currentPath, setCurrentPath] = useState<DrawingPoint[]>([])

  const colors = ["#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500"]

  const tools = [
    { id: "pen", icon: Pen, label: "Pen" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "text", icon: Type, label: "Text" },
  ]

  useEffect(() => {
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

    // Redraw all paths
    paths.forEach((path) => {
      if (path.points.length > 1) {
        ctx.strokeStyle = path.color
        ctx.lineWidth = path.width
        ctx.lineCap = "round"
        ctx.lineJoin = "round"

        ctx.beginPath()
        ctx.moveTo(path.points[0].x, path.points[0].y)

        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y)
        }

        ctx.stroke()
      }
    })
  }, [paths])

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
    if (currentTool !== "pen") return

    setIsDrawing(true)
    const pos = getMousePos(e)
    setCurrentPath([pos])
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || currentTool !== "pen") return

    const pos = getMousePos(e)
    setCurrentPath((prev) => [...prev, pos])

    // Draw current stroke
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!ctx || currentPath.length === 0) return

    ctx.strokeStyle = currentColor
    ctx.lineWidth = currentWidth
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    ctx.beginPath()
    const lastPoint = currentPath[currentPath.length - 1]
    ctx.moveTo(lastPoint.x, lastPoint.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return

    setIsDrawing(false)

    if (currentPath.length > 1) {
      const newPath: DrawingPath = {
        points: currentPath,
        color: currentColor,
        width: currentWidth,
        tool: currentTool,
      }
      setPaths((prev) => [...prev, newPath])
    }

    setCurrentPath([])
  }

  const clearCanvas = () => {
    setPaths([])
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const downloadCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement("a")
    link.download = "whiteboard.png"
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
          <Button size="sm" variant="outline" onClick={() => {}}>
            <Undo className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => {}}>
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
