"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Link, 
  Image, 
  Code, 
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Eye,
  Edit,
  Save,
  Download
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { toast } from 'sonner'

interface MarkdownEditorProps {
  initialContent?: string
  onSave?: (content: string) => void
  placeholder?: string
}

export default function MarkdownEditor({ 
  initialContent = '', 
  onSave, 
  placeholder = 'Start typing your markdown...' 
}: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Insert text at cursor position
  const insertText = (before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const textToInsert = selectedText || placeholder

    const newContent = 
      content.substring(0, start) + 
      before + textToInsert + after + 
      content.substring(end)

    setContent(newContent)

    // Set cursor position
    setTimeout(() => {
      const newCursorPos = start + before.length + textToInsert.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
      textarea.focus()
    }, 0)
  }

  // Toolbar actions
  const actions = [
    {
      icon: <Heading1 className="w-4 h-4" />,
      label: 'Heading 1',
      action: () => insertText('# ', '', 'Heading 1')
    },
    {
      icon: <Heading2 className="w-4 h-4" />,
      label: 'Heading 2',
      action: () => insertText('## ', '', 'Heading 2')
    },
    {
      icon: <Heading3 className="w-4 h-4" />,
      label: 'Heading 3',
      action: () => insertText('### ', '', 'Heading 3')
    },
    {
      icon: <Bold className="w-4 h-4" />,
      label: 'Bold',
      action: () => insertText('**', '**', 'bold text')
    },
    {
      icon: <Italic className="w-4 h-4" />,
      label: 'Italic',
      action: () => insertText('*', '*', 'italic text')
    },
    {
      icon: <Underline className="w-4 h-4" />,
      label: 'Underline',
      action: () => insertText('<u>', '</u>', 'underlined text')
    },
    {
      icon: <Code className="w-4 h-4" />,
      label: 'Code',
      action: () => insertText('`', '`', 'code')
    },
    {
      icon: <Quote className="w-4 h-4" />,
      label: 'Quote',
      action: () => insertText('> ', '', 'quote')
    },
    {
      icon: <List className="w-4 h-4" />,
      label: 'Bullet List',
      action: () => insertText('- ', '', 'list item')
    },
    {
      icon: <ListOrdered className="w-4 h-4" />,
      label: 'Numbered List',
      action: () => insertText('1. ', '', 'list item')
    },
    {
      icon: <Link className="w-4 h-4" />,
      label: 'Link',
      action: () => insertText('[', '](url)', 'link text')
    },
    {
      icon: <Image className="w-4 h-4" />,
      label: 'Image',
      action: () => insertText('![', '](image-url)', 'alt text')
    }
  ]

  // Save content
  const handleSave = () => {
    if (onSave) {
      onSave(content)
    }
    localStorage.setItem('markdown-editor-content', content)
    toast.success('Content saved')
  }

  // Export as markdown file
  const exportMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `document-${Date.now()}.md`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Markdown file exported')
  }

  // Load from localStorage on mount
  useState(() => {
    const saved = localStorage.getItem('markdown-editor-content')
    if (saved && !initialContent) {
      setContent(saved)
    }
  })

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Markdown Editor</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={exportMarkdown}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'edit' | 'preview')}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="edit" className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="edit" className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 rounded-lg border">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={action.action}
                  title={action.label}
                  className="p-2"
                >
                  {action.icon}
                </Button>
              ))}
            </div>

            {/* Editor */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              className="w-full h-96 p-4 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </TabsContent>

          <TabsContent value="preview">
            <div className="border rounded-lg p-4 h-96 overflow-y-auto bg-white">
              {content ? (
                <ReactMarkdown 
                  className="prose prose-sm max-w-none"
                  components={{
                    h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-bold mb-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
                    p: ({ children }) => <p className="mb-3">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-3">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-3">{children}</ol>,
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-3">
                        {children}
                      </blockquote>
                    ),
                    code: ({ children }) => (
                      <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-gray-100 p-3 rounded overflow-x-auto mb-3">
                        {children}
                      </pre>
                    ),
                    a: ({ href, children }) => (
                      <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    ),
                    img: ({ src, alt }) => (
                      <img src={src} alt={alt} className="max-w-full h-auto rounded mb-3" />
                    )
                  }}
                >
                  {content}
                </ReactMarkdown>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  Nothing to preview. Start typing in the editor.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Character count */}
        <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
          <span>{content.length} characters</span>
          <span>{content.split('\n').length} lines</span>
        </div>
      </CardContent>
    </Card>
  )
}