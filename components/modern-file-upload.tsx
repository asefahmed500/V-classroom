"use client"

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, Download, Trash2, Eye, Share2, Search, Filter,
  FileText, Image, Video, Music, Archive, File, Folder,
  Grid, List, MoreVertical, Star, StarOff, Copy, Link,
  Users, Clock, CheckCircle, AlertCircle, X, Plus, Cloud
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { Socket } from 'socket.io-client'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'

interface FileData {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedBy: string
  uploadedByName: string
  uploadedAt: number
  downloads: number
  isShared: boolean
  isFavorite: boolean
  tags: string[]
  thumbnail?: string
  description?: string
}

interface ModernFileUploadProps {
  socket: Socket | null
  roomId: string
  userId: string
  userName: string
  isHost: boolean
}

export function ModernFileUpload({ 
  socket, 
  roomId, 
  userId, 
  userName, 
  isHost 
}: ModernFileUploadProps) {
  const [files, setFiles] = useState<FileData[]>([])
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'downloads'>('date')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [draggedFiles, setDraggedFiles] = useState<File[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)  c
onst onDrop = useCallback((acceptedFiles: File[]) => {
    setDraggedFiles(acceptedFiles)
    setShowUploadModal(true)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 100 * 1024 * 1024, // 100MB
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.ogg'],
      'audio/*': ['.mp3', '.wav', '.ogg'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md', '.csv'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar']
    }
  })

  const uploadFiles = async (filesToUpload: File[]) => {
    const uploadPromises = filesToUpload.map(async (file) => {
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }))

      const formData = new FormData()
      formData.append('file', file)
      formData.append('roomId', roomId)
      formData.append('uploadedBy', userId)
      formData.append('uploadedByName', userName)

      try {
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }

        const result = await response.json()
        
        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const currentProgress = prev[fileId] || 0
            const newProgress = Math.min(currentProgress + Math.random() * 30, 95)
      