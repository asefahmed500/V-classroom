"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Pen, 
  Eraser, 
  Square, 
  Circle, 
  Type, 
  Undo, 
  Redo, 
  Download, 
  Upload,
  Palette,
  Minus,
  Share2,
  Save
} from 'lucide-react'
import { toast } from 'sonner'

interface DrawingElement {
  id: string
  type: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text'
  points: { x: number; y: number }[]
  color: string
  strokeWidth: number
  text?: string
  x?: number
  y?: number
  width?: number
  height?: number
}

interface WhiteboardProps {
  roomId?: string
  onSave?: (elements: DrawingElement[]) => void
  onShare?: (shareUrl: string) => void
}

export default function AdvancedWhiteboard({ roomId, onSave, onShare }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'rectangle' | 'circle' | 'text'>('pen')
  const [currentColor, setCurrentColor] = useState('#000000')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [elements, setElements] = useState<DrawingElement[]>([])
  const [history, setHistory] = useState<DrawingElement[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [textInput, setTextInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null)

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'
  ]

  const strokeWidths = [1, 2, 4, 6, 8, 12]

  // Save to history for undo/redo
  const saveToHistory = useCallback((newElements: DrawingElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push([...newElements])
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])

  // Redraw canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    elements.forEach((element) => {
      ctx.strokeStyle = element.color
      ctx.lineWidth = element.strokeWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      switch (element.type) {
        case 'pen':
          if (element.points.length > 1) {
            ctx.beginPath()
            ctx.moveTo(element.points[0].x, element.points[0].y)
            element.points.forEach((point) => {
              ctx.lineTo(point.x, point.y)
            })
            ctx.stroke()
          }
          break

        case 'eraser':
          ctx.globalCompositeOperation = 'destination-out'
          if (element.points.length > 1) {
            ctx.beginPath()
            ctx.moveTo(element.points[0].x, element.points[0].y)
            element.points.forEach((point) => {
              ctx.lineTo(point.x, point.y)
            })
            ctx.stroke()
          }
          ctx.globalCompositeOperation = 'source-over'
          break

        case 'rectangle':
          if (element.x !== undefined && element.y !== undefined && 
              element.width !== undefined && element.height !== undefined) {
            ctx.strokeRect(element.x, element.y, element.width, element.height)
          }
          break

        case 'circle':
          if (element.x !== undefined && element.y !== undefined && 
              element.width !== undefined) {
            ctx.beginPath()
            ctx.arc(element.x, element.y, Math.abs(element.width) / 2, 0, 2 * Math.PI)
            ctx.stroke()
          }
          break

        case 'text':
          if (element.x !== undefined && element.y !== undefined && element.text) {
            ctx.fillStyle = element.color
            ctx.font = `${element.strokeWidth * 8}px Arial`
            ctx.fillText(element.text, element.x, element.y)
          }
          break
      }
    })
  }, [elements])

  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  // Get mouse position relative to canvas
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  // Mouse down handler
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e)
    setIsDrawing(true)
    setStartPoint(pos)

    if (currentTool === 'text') {
      setTextPosition(pos)
      setShowTextInput(true)
      return
    }

    if (currentTool === 'pen' || currentTool === 'eraser') {
      const newElement: DrawingElement = {
        id: `element-${Date.now()}`,
        type: currentTool,
        points: [pos],
        color: currentColor,
        strokeWidth: strokeWidth
      }
      setElements(prev => [...prev, newElement])
    }
  }

  // Mouse move handler
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return

    const pos = getMousePos(e)

    if (currentTool === 'pen' || currentTool === 'eraser') {
      setElements(prev => {
        const newElements = [...prev]
        const lastElement = newElements[newElements.length - 1]
        if (lastElement) {
          lastElement.points.push(pos)
        }
        return newElements
      })
    }
  }

  // Mouse up handler
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return

    const pos = getMousePos(e)

    if (currentTool === 'rectangle') {
      const newElement: DrawingElement = {
        id: `element-${Date.now()}`,
        type: 'rectangle',
        points: [],
        color: currentColor,
        strokeWidth: strokeWidth,
        x: Math.min(startPoint.x, pos.x),
        y: Math.min(startPoint.y, pos.y),
        width: Math.abs(pos.x - startPoint.x),
        height: Math.abs(pos.y - startPoint.y)
      }
      setElements(prev => [...prev, newElement])
      saveToHistory([...elements, newElement])
    } else if (currentTool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(pos.x - startPoint.x, 2) + Math.pow(pos.y - startPoint.y, 2)
      )
      const newElement: DrawingElement = {
        id: `element-${Date.now()}`,
        type: 'circle',
        points: [],
        color: currentColor,
        strokeWidth: strokeWidth,
        x: startPoint.x,
        y: startPoint.y,
        width: radius * 2
      }
      setElements(prev => [...prev, newElement])
      saveToHistory([...elements, newElement])
    } else if (currentTool === 'pen' || currentTool === 'eraser') {
      saveToHistory(elements)
    }

    setIsDrawing(false)
    setStartPoint(null)
  }

  // Add text
  const addText = () => {
    if (!textInput.trim() || !textPosition) return

    const newElement: DrawingElement = {
      id: `element-${Date.now()}`,
      type: 'text',
      points: [],
      color: currentColor,
      strokeWidth: strokeWidth,
      text: textInput,
      x: textPosition.x,
      y: textPosition.y
    }

    setElements(prev => [...prev, newElement])
    saveToHistory([...elements, newElement])
    setTextInput('')
    setShowTextInput(false)
    setTextPosition(null)
  }

  // Undo
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setElements(history[historyIndex - 1])
    }
  }

  // Redo
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setElements(history[historyIndex + 1])
    }
  }

  // Clear canvas
  const clearCanvas = () => {
    setElements([])
    saveToHistory([])
    toast.success('Whiteboard cleared')
  }

  // Save whiteboard
  const saveWhiteboard = () => {
    if (onSave) {
      onSave(elements)
    }
    
    // Also save to localStorage
    localStorage.setItem(`whiteboard-${roomId || 'default'}`, JSON.stringify(elements))
    toast.success('Whiteboard saved')
  }

  // Load whiteboard
  const loadWhiteboard = () => {
    const saved = localStorage.getItem(`whiteboard-${roomId || 'default'}`)
    if (saved) {
      const savedElements = JSON.parse(saved)
      setElements(savedElements)
      saveToHistory(savedElements)
      toast.success('Whiteboard loaded')
    }
  }

  // Export as image
  const exportImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `whiteboard-${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
    toast.success('Whiteboard exported')
  }

  // Share whiteboard
  const shareWhiteboard = () => {
    const shareUrl = `${window.location.origin}/whiteboard/${roomId || 'shared'}`
    navigator.clipboard.writeText(shareUrl)
    if (onShare) {
      onShare(shareUrl)
    }
    toast.success('Share link copied to clipboard')
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Advanced Whiteboard</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadWhiteboard}>
              <Upload className="w-4 h-4 mr-1" />
              Load
            </Button>
            <Button variant="outline" size="sm" onClick={saveWhiteboard}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={exportImage}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={shareWhiteboard}>
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg">
          {/* Tools */}
          <div className="flex items-center gap-1">
            <Button
              variant={currentTool === 'pen' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentTool('pen')}
            >
              <Pen className="w-4 h-4" />
            </Button>
            <Button
              variant={currentTool === 'eraser' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentTool('eraser')}
            >
              <Eraser className="w-4 h-4" />
            </Button>
            <Button
              variant={currentTool === 'rectangle' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentTool('rectangle')}
            >
              <Square className="w-4 h-4" />
            </Button>
            <Button
              variant={currentTool === 'circle' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentTool('circle')}
            >
              <Circle className="w-4 h-4" />
            </Button>
            <Button
              variant={currentTool === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentTool('text')}
            >
              <Type className="w-4 h-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Colors */}
          <div className="flex items-center gap-1">
            <Palette className="w-4 h-4 text-gray-500" />
            {colors.map((color) => (
              <button
                key={color}
                className={`w-6 h-6 rounded border-2 ${
                  currentColor === color ? 'border-gray-800' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setCurrentColor(color)}
              />
            ))}
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Stroke Width */}
          <div className="flex items-center gap-1">
            <Minus className="w-4 h-4 text-gray-500" />
            {strokeWidths.map((width) => (
              <Button
                key={width}
                variant={strokeWidth === width ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStrokeWidth(width)}
                className="px-2"
              >
                {width}
              </Button>
            ))}
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={historyIndex <= 0}
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
            >
              <Redo className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={clearCanvas}>
              Clear
            </Button>
          </div>
        </div>

        {/* Text Input Modal */}
        {showTextInput && (
          <div className="absolute z-10 bg-white p-3 border rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter text..."
                className="px-2 py-1 border rounded"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && addText()}
              />
              <Button size="sm" onClick={addText}>
                Add
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setShowTextInput(false)
                  setTextInput('')
                  setTextPosition(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="border rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={1000}
            height={600}
            className="w-full cursor-crosshair bg-white"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              setIsDrawing(false)
              setStartPoint(null)
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}