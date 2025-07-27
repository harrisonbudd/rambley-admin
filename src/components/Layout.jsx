import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  MessageSquare, 
  CheckSquare, 
  Settings, 
  LogOut,
  Menu,
  X,
  Home,
  Users,
  AlertTriangle,
  HelpCircle,
  Bot,
  PlayCircle
} from 'lucide-react'
import { Button } from './ui/button'
import { useState, useEffect } from 'react'
import { cn } from '../lib/utils'

const navigation = [
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Sandbox', href: '/sandbox', icon: PlayCircle },
  { name: 'Escalations', href: '/escalations', icon: AlertTriangle },
  { name: 'FAQs', href: '/faqs', icon: HelpCircle },
  { name: 'Properties', href: '/properties', icon: Home },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Prompt', href: '/prompt', icon: Bot },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Layout({ children, onLogout }) {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint is 1024px
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  return (
    <div className="h-screen flex bg-brand-light overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="absolute inset-0 bg-black/50" />
        </motion.div>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "w-64 bg-brand-dark lg:static lg:translate-x-0",
          // On mobile: fixed positioning with conditional transform
          isMobile 
            ? `fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`
            : "static" // On desktop: always visible
        )}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center px-6 border-b border-brand-mid-gray/20">
            <h1 className="text-xl font-bold text-white">Rambley Admin</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto lg:hidden text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-purple text-white"
                      : "text-gray-300 hover:bg-brand-mid-gray/30 hover:text-white"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t border-brand-mid-gray/20">
            <Button
              onClick={onLogout}
              variant="ghost"
              className="w-full text-gray-300 hover:text-white hover:bg-brand-mid-gray/30"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar - Fixed on mobile */}
        <header className="flex h-16 items-center gap-4 border-b bg-background px-6 fixed top-0 left-0 right-0 z-30 lg:static lg:top-auto lg:left-auto lg:right-auto safe-area-top">
          <Button
            onClick={() => setSidebarOpen(true)}
            variant="ghost"
            size="icon"
            className="lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div className="flex-1" />
        </header>

        {/* Page content - Adjusted for fixed header on mobile */}
        <main className="flex-1 overflow-auto pt-16 lg:pt-0">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full max-w-full overflow-x-hidden"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
} 