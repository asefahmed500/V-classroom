"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Share2, X } from "lucide-react"
import { getOptimizedImageUrl } from "@/lib/cloudinary"

interface ImagePreviewProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  imageName: string
  publicId?: string
}

export function ImagePreview({ isOpen, onClose, imageUrl, imageName, publicId }: ImagePreviewProps) {
  const [loading, setLoading] = useState(true)

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = imageUrl
    link.download = imageName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(imageUrl)
      alert("Image link copied to clipboard!")
    } catch (error) {
      console.error("Failed to copy link:", error)
    }
  }

  // Get optimized versions for different sizes
  const thumbnailUrl = publicId ? getOptimizedImageUrl(publicId, { width: 300, height: 300 }) : imageUrl
  const mediumUrl = publicId ? getOptimizedImageUrl(publicId, { width: 800, height: 600 }) : imageUrl
  const fullUrl = publicId ? getOptimizedImageUrl(publicId, { width: 1200, height: 900 }) : imageUrl

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate">{imageName}</DialogTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="p-4 pt-0">
          <div className="relative bg-gray-100 rounded-lg overflow-hidden">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            <img
              src={fullUrl}
              alt={imageName}
              className="w-full h-auto max-h-[70vh] object-contain"
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          </div>
          
          {/* Image info */}
          <div className="mt-4 text-sm text-gray-600">
            <p>Click and drag to pan • Scroll to zoom</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}