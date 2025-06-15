import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Phone, MessageCircle, Send, ArrowLeft, Bot, BotOff, User, CheckSquare, 
  ExternalLink, Search, Calendar, Clock, MapPin, Plus, Wrench, Brush, 
  Package, Check, Trash2, PlayCircle, RotateCcw, MoreVertical, ChevronDown 
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { cn } from '../lib/utils'
import { useNavigate } from 'react-router-dom'

// Demo data for messages
const demoConversations = [
  {
    id: 1,
    guestName: 'Alex Demo',
    phone: '+1 (555) 000-0001',
    lastMessage: 'This looks great! The auto-responses work perfectly.',
    timestamp: '2 minutes ago',
    unread: 1,
    property: 'Demo Villa',
    autoResponseEnabled: true,
    messages: [
      { id: 1, text: 'Hi! I\'m testing the sandbox mode. How does the auto-response work?', sender: 'guest', timestamp: '2:30 PM' },
      { id: 2, text: 'Hello Alex! Welcome to the demo. Auto-responses are powered by Rambley AI and can handle common guest inquiries automatically.', sender: 'host', senderType: 'rambley', timestamp: '2:31 PM' },
      { id: 3, text: 'Can you create a task for me?', sender: 'guest', timestamp: '2:35 PM', generatedTasks: [1] },
      { id: 4, text: 'I\'ve created a demo task for you! You can see it in the tasks section below.', sender: 'host', senderType: 'rambley', timestamp: '2:36 PM' },
      { id: 5, text: 'This looks great! The auto-responses work perfectly.', sender: 'guest', timestamp: '2:40 PM' },
    ]
  },
  {
    id: 2,
    guestName: 'Sarah Test',
    phone: '+1 (555) 000-0002',
    lastMessage: 'Perfect! I can see how the system works now.',
    timestamp: '10 minutes ago',
    unread: 0,
    property: 'Demo House',
    autoResponseEnabled: false,
    messages: [
      { id: 1, text: 'I\'m exploring the demo features. This is impressive!', sender: 'guest', timestamp: '2:20 PM' },
      { id: 2, text: 'Thank you! Feel free to test all the features. This is a safe sandbox environment.', sender: 'host', senderType: 'host', timestamp: '2:22 PM' },
      { id: 3, text: 'How do I turn on auto-responses?', sender: 'guest', timestamp: '2:25 PM' },
      { id: 4, text: 'Just click the bot toggle in the top right when viewing a conversation!', sender: 'host', senderType: 'host', timestamp: '2:26 PM' },
      { id: 5, text: 'Perfect! I can see how the system works now.', sender: 'guest', timestamp: '2:28 PM' },
    ]
  },
]

// Demo data for tasks
const demoTasks = [
  {
    id: 1,
    title: 'Demo cleaning task - Demo Villa',
    type: 'cleaning',
    property: 'Demo Villa',
    assignee: 'Demo Cleaner',
    dueDate: '2024-01-15',
    dueTime: '11:00 AM',
    status: 'pending',
    priority: 'high',
    description: 'This is a demo cleaning task created automatically from a guest message.',
    threadCount: 2
  },
  {
    id: 2,
    title: 'Test maintenance - Demo House',
    type: 'maintenance',
    property: 'Demo House',
    assignee: 'Demo Technician',
    dueDate: '2024-01-15',
    dueTime: '2:00 PM',
    status: 'in-progress',
    priority: 'medium',
    description: 'Sample maintenance task to demonstrate the system.',
    threadCount: 1
  },
  {
    id: 3,
    title: 'Sample inspection - Demo Villa',
    type: 'inspection',
    property: 'Demo Villa',
    assignee: 'Demo Inspector',
    dueDate: '2024-01-16',
    dueTime: '10:00 AM',
    status: 'completed',
    priority: 'low',
    description: 'Completed demo inspection task.',
    threadCount: 1
  },
]

const statusColors = {
  pending: 'warning',
  'in-progress': 'default',
  completed: 'success',
}

const priorityColors = {
  low: 'secondary',
  medium: 'warning',
  high: 'destructive',
}

const typeIcons = {
  cleaning: Brush,
  maintenance: Wrench,
  inspection: Search,
  restocking: Package,
}

// Persona options for message sending
const personas = [
  {
    id: 'guest',
    label: 'Guest',
    description: 'Respond as the guest',
    icon: User,
    color: 'bg-blue-100 text-blue-600',
    sender: 'guest'
  },
  {
    id: 'host',
    label: 'Host',
    description: 'Manual host response',
    icon: User,
    color: 'bg-green-100 text-green-600',
    sender: 'host',
    senderType: 'host'
  },
  {
    id: 'rambley',
    label: 'Rambley AI',
    description: 'AI-powered response',
    icon: Bot,
    color: 'bg-purple-100 text-purple-600',
    sender: 'host',
    senderType: 'rambley'
  },
  {
    id: 'staff',
    label: 'Staff',
    description: 'Cleaning/maintenance staff',
    icon: Wrench,
    color: 'bg-orange-100 text-orange-600',
    sender: 'host',
    senderType: 'staff'
  }
]

// Helper to get relevant personas for a conversation
function getRelevantPersonas(conversation, hostName = 'Harrison Budd') {
  const personas = []
  if (!conversation) return personas

  // Always add Guest if guestName exists
  if (conversation.guestName) {
    personas.push({
      id: 'guest',
      label: `Guest (${conversation.guestName})`,
      description: 'Respond as the guest',
      icon: User,
      color: 'bg-blue-100 text-blue-600',
      sender: 'guest',
      name: conversation.guestName
    })
  }
  // Always add Host
  personas.push({
    id: 'host',
    label: `Host (${hostName})`,
    description: 'Manual host response',
    icon: User,
    color: 'bg-green-100 text-green-600',
    sender: 'host',
    senderType: 'host',
    name: hostName
  })
  // Add Staff if a staff/assignee is present in the context (simulate for demo)
  // We'll check if any message has senderType 'staff' or if the conversation has a staffName property
  let staffName = null
  if (conversation.staffName) {
    staffName = conversation.staffName
  } else {
    const staffMsg = conversation.messages.find(m => m.senderType === 'staff')
    if (staffMsg && staffMsg.name) staffName = staffMsg.name
    else if (staffMsg) staffName = 'Staff Member'
  }
  if (staffName) {
    personas.push({
      id: 'staff',
      label: `Staff (${staffName})`,
      description: 'Cleaning/maintenance staff',
      icon: Wrench,
      color: 'bg-orange-100 text-orange-600',
      sender: 'host',
      senderType: 'staff',
      name: staffName
    })
  }
  return personas
}

export default function SandboxPage() {
  const navigate = useNavigate()
  const hostName = 'Harrison Budd'
  
  // Messages state
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [conversations, setConversations] = useState(demoConversations)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPersona, setSelectedPersona] = useState(null)
  const [showPersonaDropdown, setShowPersonaDropdown] = useState(false)
  const [conversationStates, setConversationStates] = useState(
    demoConversations.reduce((acc, conv) => {
      acc[conv.id] = { autoResponseEnabled: conv.autoResponseEnabled }
      return acc
    }, {})
  )
  
  // Tasks state
  const [taskFilter, setTaskFilter] = useState('all')
  const [taskSearchTerm, setTaskSearchTerm] = useState('')
  
  // Demo state
  const [demoMode, setDemoMode] = useState('messages') // 'messages' or 'tasks'
  const [isResetting, setIsResetting] = useState(false)

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    
    return conversation.guestName.toLowerCase().includes(query) ||
           conversation.phone.replace(/\D/g, '').includes(query.replace(/\D/g, '')) ||
           conversation.property.toLowerCase().includes(query) ||
           conversation.lastMessage.toLowerCase().includes(query) ||
           conversation.messages.some(message => 
             message.text.toLowerCase().includes(query)
           )
  })

  // Filter tasks
  const filteredTasks = demoTasks.filter(task => {
    const statusMatch = taskFilter === 'all' || 
      (taskFilter === 'upcoming' && task.status !== 'completed') ||
      task.status === taskFilter

    const searchMatch = !taskSearchTerm.trim() || 
      task.title.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
      task.property.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
      task.assignee.toLowerCase().includes(taskSearchTerm.toLowerCase())

    return statusMatch && searchMatch
  })

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation) return

    const now = new Date()
    const timestamp = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    
    const newMessageObj = {
      id: Date.now(),
      text: newMessage.trim(),
      sender: selectedPersona.sender,
      senderType: selectedPersona.senderType,
      timestamp: timestamp
    }

    // Update conversations with new message
    setConversations(prev => prev.map(conv => {
      if (conv.id === selectedConversation.id) {
        const updatedMessages = [...conv.messages, newMessageObj]
        return {
          ...conv,
          messages: updatedMessages,
          lastMessage: newMessage.trim(),
          timestamp: 'Just now'
        }
      }
      return conv
    }))

    // Update selected conversation
    setSelectedConversation(prev => ({
      ...prev,
      messages: [...prev.messages, newMessageObj],
      lastMessage: newMessage.trim(),
      timestamp: 'Just now'
    }))

    // If host sends a message, disable auto-response for this conversation
    if (selectedPersona.sender === 'host' && selectedPersona.senderType === 'host') {
      setConversationStates(prev => ({
        ...prev,
        [selectedConversation.id]: {
          ...prev[selectedConversation.id],
          autoResponseEnabled: false
        }
      }))
    }

    setNewMessage('')
  }

  const toggleAutoResponse = () => {
    if (!selectedConversation) return
    
    setConversationStates(prev => ({
      ...prev,
      [selectedConversation.id]: {
        ...prev[selectedConversation.id],
        autoResponseEnabled: !prev[selectedConversation.id]?.autoResponseEnabled
      }
    }))
  }

  const handleTaskAction = (e, taskId, action) => {
    e.stopPropagation()
    console.log(`Demo: ${action} task:`, taskId)
  }

  const resetDemo = () => {
    setIsResetting(true)
    setSelectedConversation(null)
    setConversations(demoConversations)
    setNewMessage('')
    setSearchQuery('')
    setTaskSearchTerm('')
    setTaskFilter('all')
    setSelectedPersona(null)
    setConversationStates(
      demoConversations.reduce((acc, conv) => {
        acc[conv.id] = { autoResponseEnabled: conv.autoResponseEnabled }
        return acc
      }, {})
    )
    
    setTimeout(() => {
      setIsResetting(false)
    }, 1000)
  }

  const isAutoResponseEnabled = selectedConversation ? 
    conversationStates[selectedConversation.id]?.autoResponseEnabled ?? selectedConversation.autoResponseEnabled : 
    false

  const getSenderBadge = (message) => {
    if (message.sender === 'guest') return null
    if (message.senderType === 'rambley') {
      return (
        <div className="flex items-center gap-1 text-xs text-brand-mid-gray mb-1">
          <Bot className="h-3 w-3" />
          <span>Rambley</span>
        </div>
      )
    } else if (message.senderType === 'staff') {
      return (
        <div className="flex items-center gap-1 text-xs text-brand-mid-gray mb-1">
          <Wrench className="h-3 w-3" />
          <span>Staff</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center gap-1 text-xs text-brand-mid-gray mb-1">
          <User className="h-3 w-3" />
          <span>Host</span>
        </div>
      )
    }
  }

  const renderTaskLinks = (generatedTasks) => {
    if (!generatedTasks || generatedTasks.length === 0) return null

    return (
      <div className="mt-2 pt-2 border-t border-brand-mid-gray/20">
        <div className="flex items-center gap-1 text-xs text-brand-mid-gray mb-1">
          <CheckSquare className="h-3 w-3" />
          <span>Tasks created:</span>
        </div>
        <div className="space-y-1">
          {generatedTasks.map(taskId => {
            const task = demoTasks.find(t => t.id === taskId)
            if (!task) return null
            
            return (
              <button
                key={taskId}
                onClick={() => setDemoMode('tasks')}
                className="flex items-center gap-2 text-xs text-brand-purple hover:text-brand-purple/80 transition-colors group"
              >
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  task.status === 'pending' ? 'bg-yellow-500' :
                  task.status === 'in-progress' ? 'bg-blue-500' :
                  'bg-green-500'
                )} />
                <span className="flex-1 text-left truncate">{task.title}</span>
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  const getTaskCounts = () => {
    return {
      pending: demoTasks.filter(t => t.status === 'pending').length,
      inProgress: demoTasks.filter(t => t.status === 'in-progress').length,
      completed: demoTasks.filter(t => t.status === 'completed').length,
    }
  }

  const counts = getTaskCounts()

  // When conversation changes, update persona options and default
  useEffect(() => {
    if (selectedConversation) {
      const personas = getRelevantPersonas(selectedConversation, hostName)
      setSelectedPersona(personas[0] || null)
    }
  }, [selectedConversation])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b bg-gradient-to-r from-brand-purple/5 to-brand-purple/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-brand-purple/10">
                <PlayCircle className="h-6 w-6 text-brand-purple" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-brand-dark">Sandbox Mode</h1>
                <p className="text-brand-mid-gray">Test and explore Rambley features in a safe demo environment</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-brand-light rounded-lg p-1">
              <Button
                variant={demoMode === 'messages' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDemoMode('messages')}
                className="text-sm"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Messages
              </Button>
              <Button
                variant={demoMode === 'tasks' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDemoMode('tasks')}
                className="text-sm"
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                Tasks
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetDemo}
              disabled={isResetting}
              className="text-sm"
            >
              <RotateCcw className={cn("mr-2 h-4 w-4", isResetting && "animate-spin")} />
              Reset Demo
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {demoMode === 'messages' ? (
            <motion.div
              key="messages"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <div className="h-full p-6 space-y-6">
                {/* Messages Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-brand-dark">Messages</h1>
                    <p className="text-brand-mid-gray">Guest conversations</p>
                  </div>
                </div>

                {/* Messages Content */}
                <div className="flex h-[calc(100vh-220px)] gap-6">
                  {/* Messages List */}
                  <div className="w-1/3 bg-white rounded-lg border overflow-hidden">
                    <div className="p-4 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-mid-gray h-4 w-4" />
                        <Input
                          placeholder="Search guests, properties, numbers..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="overflow-auto h-full">
                      {filteredConversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          onClick={() => setSelectedConversation(conversation)}
                          className={cn(
                            "p-4 border-b cursor-pointer transition-colors hover:bg-brand-light/50",
                            selectedConversation?.id === conversation.id && "bg-brand-light"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-orange-600">
                                {getInitials(conversation.guestName)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-medium text-brand-dark truncate">{conversation.guestName}</h3>
                                {conversation.unread > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {conversation.unread}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-brand-mid-gray mb-1">{conversation.phone} • {conversation.property}</p>
                              <p className="text-sm text-brand-mid-gray truncate">{conversation.lastMessage}</p>
                              <p className="text-xs text-brand-mid-gray mt-1">{conversation.timestamp}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chat View */}
                  <div className="flex-1 bg-white rounded-lg border flex flex-col">
                    {selectedConversation ? (
                      <>
                        {/* Chat Header */}
                        <div className="p-4 border-b flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-orange-600">
                                {getInitials(selectedConversation.guestName)}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-medium text-brand-dark">{selectedConversation.guestName}</h3>
                              <p className="text-sm text-brand-mid-gray">{selectedConversation.property}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={toggleAutoResponse}
                              className={cn(
                                "transition-colors",
                                isAutoResponseEnabled 
                                  ? "text-brand-purple hover:text-brand-purple/80" 
                                  : "text-brand-mid-gray hover:text-brand-dark"
                              )}
                            >
                              {isAutoResponseEnabled ? <Bot className="h-5 w-5" /> : <BotOff className="h-5 w-5" />}
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Phone className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-auto p-4 space-y-4">
                          {selectedConversation.messages.map((message) => (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={cn(
                                "flex",
                                message.sender === 'guest' ? "justify-start" : "justify-end"
                              )}
                            >
                              <div className={cn(
                                "max-w-xs lg:max-w-md rounded-lg p-3",
                                message.sender === 'guest'
                                  ? "bg-brand-light text-brand-dark"
                                  : "bg-brand-purple text-white"
                              )}>
                                {message.sender === 'host' && getSenderBadge(message)}
                                <p className="text-sm">{message.text}</p>
                                <p className={cn(
                                  "text-xs mt-1",
                                  message.sender === 'guest' ? "text-brand-mid-gray" : "text-white/70"
                                )}>
                                  {message.timestamp}
                                </p>
                                {renderTaskLinks(message.generatedTasks)}
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        {/* Message Input */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t">
                          <div className="flex gap-2 mb-3">
                            <div className="relative">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowPersonaDropdown(!showPersonaDropdown)}
                                className="flex items-center gap-2"
                              >
                                {selectedPersona && <selectedPersona.icon className="h-4 w-4" />}
                                <span>{selectedPersona ? selectedPersona.label : 'Select persona'}</span>
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                              {showPersonaDropdown && selectedConversation && (
                                <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border rounded-lg shadow-lg z-10">
                                  <div className="p-2">
                                    <p className="text-xs font-medium text-brand-mid-gray mb-2 px-2">Respond as:</p>
                                    {getRelevantPersonas(selectedConversation, hostName).map((persona) => (
                                      <button
                                        key={persona.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedPersona(persona)
                                          setShowPersonaDropdown(false)
                                        }}
                                        className={cn(
                                          "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                                          selectedPersona && selectedPersona.id === persona.id 
                                            ? "bg-brand-light" 
                                            : "hover:bg-brand-light/50"
                                        )}
                                      >
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", persona.color)}>
                                          <persona.icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                          <p className="font-medium text-brand-dark text-sm">{persona.label}</p>
                                          <p className="text-xs text-brand-mid-gray">{persona.description}</p>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Input
                              placeholder={`Type message as ${selectedPersona ? selectedPersona.label : ''}...`}
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              className="flex-1"
                            />
                            <Button type="submit" disabled={!newMessage.trim() || !selectedPersona}>
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </form>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <MessageCircle className="h-12 w-12 text-brand-mid-gray mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-brand-dark mb-2">Select a conversation</h3>
                          <p className="text-brand-mid-gray">Choose a guest conversation to start messaging</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full p-6 space-y-6"
            >
              {/* Tasks Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-brand-dark">Tasks</h1>
                  <p className="text-brand-mid-gray">Manage cleaning, maintenance, and property tasks</p>
                </div>
                <Button className="sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'all', label: 'All Tasks', count: demoTasks.length },
                    { key: 'upcoming', label: 'Upcoming', count: demoTasks.filter(t => t.status !== 'completed').length },
                    { key: 'pending', label: 'Pending', count: counts.pending },
                    { key: 'in-progress', label: 'In Progress', count: counts.inProgress },
                    { key: 'completed', label: 'Completed', count: counts.completed }
                  ].map((filterOption) => (
                    <Button
                      key={filterOption.key}
                      variant={taskFilter === filterOption.key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTaskFilter(filterOption.key)}
                      className="capitalize"
                    >
                      {filterOption.label}
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "ml-2 text-xs pointer-events-none",
                          taskFilter === filterOption.key 
                            ? "bg-white/20 text-white" 
                            : "bg-brand-mid-gray/10 text-brand-mid-gray"
                        )}
                      >
                        {filterOption.count}
                      </Badge>
                    </Button>
                  ))}
                </div>

                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-mid-gray h-4 w-4" />
                    <Input
                      placeholder="Search tasks..."
                      value={taskSearchTerm}
                      onChange={(e) => setTaskSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Tasks List */}
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="space-y-0">
                  {filteredTasks.map((task, index) => {
                    const TypeIcon = typeIcons[task.type] || CheckSquare
                    
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 border-b hover:bg-brand-light/30 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-4">
                          {/* Task Icon */}
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1",
                            task.type === 'cleaning' ? 'bg-blue-100 text-blue-600' :
                            task.type === 'maintenance' ? 'bg-orange-100 text-orange-600' :
                            task.type === 'inspection' ? 'bg-green-100 text-green-600' :
                            'bg-purple-100 text-purple-600'
                          )}>
                            <TypeIcon className="h-4 w-4" />
                          </div>

                          {/* Task Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-brand-dark mb-1 truncate">
                                  {task.title}
                                </h3>
                                <p className="text-sm text-brand-mid-gray mb-2 line-clamp-2">
                                  {task.description}
                                </p>
                                
                                <div className="flex items-center gap-4 text-sm text-brand-mid-gray mb-2">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span>{task.property}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span>{task.assignee}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{task.dueDate} at {task.dueTime}</span>
                                  </div>
                                  {task.threadCount > 0 && (
                                    <div className="flex items-center gap-1 text-brand-purple">
                                      <MessageCircle className="h-3 w-3" />
                                      <span>{task.threadCount} thread{task.threadCount !== 1 ? 's' : ''}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant={statusColors[task.status]} 
                                    className="text-xs"
                                  >
                                    {task.status.replace('-', ' ')}
                                  </Badge>
                                  <Badge 
                                    variant={priorityColors[task.priority]} 
                                    className="text-xs"
                                  >
                                    {task.priority} priority
                                  </Badge>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 ml-4">
                                {task.status !== 'completed' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={(e) => handleTaskAction(e, task.id, 'complete')}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={(e) => handleTaskAction(e, task.id, 'delete')}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
                
                {filteredTasks.length === 0 && (
                  <div className="text-center py-12">
                    <CheckSquare className="h-12 w-12 text-brand-mid-gray mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-brand-dark mb-2">No Tasks Found</h3>
                    <p className="text-brand-mid-gray">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
} 