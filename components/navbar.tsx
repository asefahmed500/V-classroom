"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Users, BookOpen, Brain, Clock, Video, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Features", href: "#features", icon: BookOpen },
  { name: "How it Works", href: "#how-it-works", icon: Brain },
  { name: "Pricing", href: "#pricing", icon: Clock },
  { name: "About", href: "#about", icon: Users },
]

export function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm" : "bg-transparent",
      )}
    >
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center transform group-hover:scale-105 transition-transform duration-200">
                <Users className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            </div>
            <span className="text-lg lg:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Virtual Study Rooms
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors duration-200 font-medium group"
              >
                <item.icon className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex items-center space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost" className="font-medium hover:bg-blue-50 hover:text-blue-600">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-medium shadow-lg hover:shadow-xl transition-all duration-200">
                Get Started Free
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" className="relative">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-80 p-0">
              <div className="flex flex-col h-full">
                {/* Mobile Header */}
                <div className="flex items-center justify-between p-6 border-b">
                  <Link href="/" className="flex items-center space-x-2" onClick={() => setIsOpen(false)}>
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Virtual Study Rooms
                    </span>
                  </Link>
                </div>

                {/* Mobile Navigation */}
                <div className="flex-1 py-6">
                  <div className="space-y-2 px-6">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 group"
                      >
                        <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    ))}
                  </div>

                  {/* Mobile Quick Actions */}
                  <div className="mt-8 px-6">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">Quick Actions</h3>
                      <div className="space-y-2">
                        <Link
                          href="/rooms"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <Video className="w-4 h-4" />
                          <span>Join Study Room</span>
                        </Link>
                        <Link
                          href="/rooms/create"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center space-x-2 text-sm text-purple-600 hover:text-purple-700"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Create Room</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Auth Buttons */}
                <div className="border-t p-6 space-y-3">
                  <Link href="/auth/login" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full font-medium bg-transparent">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/signup" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-medium">
                      Get Started Free
                    </Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  )
}
