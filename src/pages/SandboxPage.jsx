import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Phone, MessageCircle, Send, ArrowLeft, Bot, BotOff, User, CheckSquare, 
  ExternalLink, Search, Calendar, Clock, MapPin, Plus, Wrench, Brush, 
  Package, Check, Trash2, PlayCircle, ChevronDown, MessageSquarePlus
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
    threadCount: 2,
    conversations: [
      {
        id: 'alex-demo-task1',
        personName: 'Alex Demo',
        personRole: 'Guest',
        personType: 'guest',
        lastActivity: '2:36 PM',
        autoResponseEnabled: true,
        messages: [
          { id: 1, text: 'Can you create a task for me?', sender: 'guest', senderName: 'Alex Demo', timestamp: '2:35 PM' },
          { id: 2, text: 'I\'ve created a demo task for you! You can see it in the tasks section.', sender: 'rambley', senderName: 'Rambley', timestamp: '2:36 PM' },
          { id: 3, text: 'Demo cleaning task created. Assigned to Demo Cleaner.', sender: 'rambley', senderName: 'Rambley', timestamp: '2:36 PM', isSystemMessage: true }
        ]
      },
      {
        id: 'demo-cleaner-task1',
        personName: 'Demo Cleaner',
        personRole: 'Cleaning Staff',
        personType: 'staff',
        lastActivity: '2:38 PM',
        autoResponseEnabled: false,
        messages: [
          { id: 4, text: 'Hi! There\'s a demo cleaning task at Demo Villa. Can you handle this?', sender: 'rambley', senderName: 'Rambley', timestamp: '2:37 PM' },
          { id: 5, text: 'Sure! I\'ll take care of this demo task right away.', sender: 'staff', senderName: 'Demo Cleaner', timestamp: '2:38 PM' }
        ]
      }
    ]
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
    threadCount: 1,
    conversations: [
      {
        id: 'demo-technician-task2',
        personName: 'Demo Technician',
        personRole: 'Maintenance Staff',
        personType: 'staff',
        lastActivity: '2:28 PM',
        autoResponseEnabled: false,
        messages: [
          { id: 1, text: 'We have a maintenance demo task at Demo House. Can you check it out?', sender: 'rambley', senderName: 'Rambley', timestamp: '2:26 PM' },
          { id: 2, text: 'I\'m on it! This is a great demo of the system.', sender: 'staff', senderName: 'Demo Technician', timestamp: '2:28 PM' }
        ]
      }
    ]
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
    threadCount: 1,
    conversations: [
      {
        id: 'demo-inspector-task3',
        personName: 'Demo Inspector',
        personRole: 'Property Inspector',
        personType: 'staff',
        lastActivity: '2:22 PM',
        autoResponseEnabled: false,
        messages: [
          { id: 1, text: 'Demo inspection task for Demo Villa has been completed successfully.', sender: 'staff', senderName: 'Demo Inspector', timestamp: '2:20 PM' },
          { id: 2, text: 'Excellent! Thank you for completing the demo inspection.', sender: 'rambley', senderName: 'Rambley', timestamp: '2:22 PM' }
        ]
      }
    ]
  }
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
  const [taskPropertyFilter, setTaskPropertyFilter] = useState('all')
  const [taskSearchTerm, setTaskSearchTerm] = useState('')
  const [selectedTask, setSelectedTask] = useState(null)
  const [selectedTaskConversation, setSelectedTaskConversation] = useState(null)
  const [taskConversationStates, setTaskConversationStates] = useState({})
  
  // Demo state
  const [demoMode, setDemoMode] = useState('messages') // 'messages' or 'tasks'

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

  // Get unique properties for task filter
  const taskProperties = [...new Set(demoTasks.map(task => task.property))].sort()

  // Filter tasks
  const filteredTasks = demoTasks.filter(task => {
    const statusMatch = taskFilter === 'all' || 
      (taskFilter === 'upcoming' && task.status !== 'completed') ||
      (taskFilter === 'completed' && task.status === 'completed') ||
      task.status === taskFilter

    const propertyMatch = taskPropertyFilter === 'all' || task.property === taskPropertyFilter

    const searchMatch = !taskSearchTerm.trim() || 
      task.title.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
      task.property.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
      task.assignee.toLowerCase().includes(taskSearchTerm.toLowerCase())

    return statusMatch && propertyMatch && searchMatch
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

  const handleTaskClick = (task) => {
    setSelectedTask(task)
    setSelectedTaskConversation(null)
    setDemoMode('task-detail')
  }

  const handleTaskSendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedTaskConversation) return
    
    // When sending a message, disable auto-response for this conversation
    setTaskConversationStates(prev => ({
      ...prev,
      [selectedTaskConversation.id]: {
        ...prev[selectedTaskConversation.id],
        autoResponseEnabled: false
      }
    }))
    
    // In real app, this would send the message via API
    console.log('Sending task message:', newMessage, 'to conversation:', selectedTaskConversation.id)
    setNewMessage('')
  }

  const toggleTaskAutoResponse = () => {
    if (!selectedTaskConversation) return
    
    setTaskConversationStates(prev => ({
      ...prev,
      [selectedTaskConversation.id]: {
        ...prev[selectedTaskConversation.id],
        autoResponseEnabled: !getTaskAutoResponseState()
      }
    }))
  }

  const getTaskAutoResponseState = () => {
    if (!selectedTaskConversation) return false
    return taskConversationStates[selectedTaskConversation.id]?.autoResponseEnabled ?? selectedTaskConversation.autoResponseEnabled
  }

  const backToTasksList = () => {
    setSelectedTask(null)
    setSelectedTaskConversation(null)
    setDemoMode('tasks')
  }

  const startNewChat = () => {
    setSelectedConversation(null)
    setNewMessage('')
    setSelectedPersona(null)
    setShowPersonaDropdown(false)
    if (demoMode !== 'messages') {
      setDemoMode('messages')
    }
  }

  const isAutoResponseEnabled = selectedConversation ? 
    conversationStates[selectedConversation.id]?.autoResponseEnabled ?? selectedConversation.autoResponseEnabled : 
    false

  const getSenderBadge = (message) => {
    if (message.sender === 'guest') return null
    if (message.senderType === 'rambley') {
      return (
        <div className="flex items-center gap-1 text-xs text-brand-mid-gray">
          <Bot className="h-3 w-3" />
          <span>Rambley</span>
        </div>
      )
    } else if (message.senderType === 'staff') {
      return (
        <div className="flex items-center gap-1 text-xs text-brand-mid-gray">
          <Wrench className="h-3 w-3" />
          <span>Staff</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center gap-1 text-xs text-brand-mid-gray">
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

  const getTaskCounts = (property = 'all') => {
    const tasksToCount = property === 'all' ? demoTasks : demoTasks.filter(t => t.property === property)
    return {
      pending: tasksToCount.filter(t => t.status === 'pending').length,
      inProgress: tasksToCount.filter(t => t.status === 'in-progress').length,
      completed: tasksToCount.filter(t => t.status === 'completed').length,
    }
  }

  const counts = getTaskCounts(taskPropertyFilter)

  // When conversation changes, update persona options and default
  useEffect(() => {
    if (selectedConversation) {
      const personas = getRelevantPersonas(selectedConversation, hostName)
      setSelectedPersona(personas[0] || null)
    }
  }, [selectedConversation])

  return (
    <div className="h-full flex flex-col">
      {/* Sandbox Header with Mode Tabs */}
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
              onClick={startNewChat}
              className="text-sm"
            >
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              New Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {demoMode === 'task-detail' ? (
            <motion.div
              key="task-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full flex"
            >
              {/* Task Detail View - Similar to TaskDetailPage */}
              <div className={cn(
                "w-full lg:w-96 border-r bg-background",
                selectedTaskConversation ? "hidden lg:block" : "block"
              )}>
                {/* Task Header */}
                <div className="p-6 border-b">
                  <Button variant="ghost" onClick={backToTasksList} className="mb-4 -ml-2">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Tasks
                  </Button>
                  
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      selectedTask.type === 'cleaning' ? 'bg-blue-100 text-blue-600' :
                      selectedTask.type === 'maintenance' ? 'bg-orange-100 text-orange-600' :
                      selectedTask.type === 'inspection' ? 'bg-green-100 text-green-600' :
                      'bg-purple-100 text-purple-600'
                    )}>
                      {selectedTask.type === 'cleaning' ? <Brush className="h-5 w-5" /> :
                       selectedTask.type === 'maintenance' ? <Wrench className="h-5 w-5" /> :
                       selectedTask.type === 'inspection' ? <Search className="h-5 w-5" /> :
                       <Package className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-lg font-bold text-brand-dark">{selectedTask.title}</h1>
                        <Badge className={cn(
                          "text-xs",
                          selectedTask.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          selectedTask.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        )}>
                          {selectedTask.status === 'in-progress' ? 'In Progress' : 
                           selectedTask.status.charAt(0).toUpperCase() + selectedTask.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-brand-mid-gray mt-1">{selectedTask.description}</p>
                      
                      <div className="flex flex-wrap gap-3 text-xs text-brand-mid-gray mt-2">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{selectedTask.property}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{selectedTask.assignee}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{selectedTask.dueDate} at {selectedTask.dueTime}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conversations List */}
                <div className="overflow-y-auto">
                  <div className="p-4">
                    <h2 className="text-sm font-medium text-brand-dark mb-3">Task Communications</h2>
                  </div>
                  
                  {selectedTask.conversations?.map((conversation) => {
                    const lastMessage = conversation.messages[conversation.messages.length - 1]
                    
                    // Generate initials from person name
                    const getInitials = (name) => {
                      const names = name.split(' ')
                      if (names.length >= 2) {
                        return `${names[0][0]}${names[1][0]}`.toUpperCase()
                      }
                      return name.substring(0, 2).toUpperCase()
                    }
                    
                    // Get avatar background color based on person type
                    const getAvatarColor = (personType) => {
                      switch (personType) {
                        case 'guest':
                          return 'bg-brand-vanilla text-brand-dark'
                        case 'staff':
                          return 'bg-brand-dark text-brand-vanilla'
                        default:
                          return 'bg-brand-dark text-brand-vanilla'
                      }
                    }
                    
                    return (
                      <motion.div
                        key={conversation.id}
                        whileHover={{ backgroundColor: 'rgba(154, 23, 80, 0.05)' }}
                        className={cn(
                          "p-4 border-b cursor-pointer transition-colors",
                          selectedTaskConversation?.id === conversation.id ? "bg-brand-purple/10 border-brand-purple/20" : ""
                        )}
                        onClick={() => setSelectedTaskConversation(conversation)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-medium text-sm",
                            getAvatarColor(conversation.personType)
                          )}>
                            {getInitials(conversation.personName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-brand-dark text-sm">{conversation.personName}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {conversation.personRole}
                              </Badge>
                            </div>
                            <p className="text-sm text-brand-mid-gray truncate">
                              {lastMessage.senderName}: {lastMessage.text}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-brand-mid-gray">{conversation.lastActivity}</p>
                              <Badge variant="outline" className="text-xs">
                                {conversation.messages.length}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>

              {/* Task Conversation Messages View */}
              <div className={cn(
                "flex-1 flex flex-col",
                !selectedTaskConversation ? "hidden lg:flex" : "flex"
              )}>
                {selectedTaskConversation ? (
                  <>
                    {/* Desktop Task Chat Header */}
                    <div className="hidden lg:flex items-center justify-between p-4 border-b bg-background">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-vanilla text-brand-dark rounded-full flex items-center justify-center font-medium text-sm">
                          {selectedTaskConversation.personName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h2 className="font-semibold text-brand-dark">{selectedTaskConversation.personName}</h2>
                          <p className="text-sm text-brand-mid-gray">{selectedTaskConversation.personRole}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-brand-dark">Auto Response</span>
                          <Switch
                            checked={getTaskAutoResponseState()}
                            onCheckedChange={toggleTaskAutoResponse}
                          />
                          <span className={cn(
                            "text-xs font-medium",
                            getTaskAutoResponseState() ? "text-brand-purple" : "text-brand-mid-gray"
                          )}>
                            {getTaskAutoResponseState() ? "ON" : "OFF"}
                          </span>
                          {getTaskAutoResponseState() ? (
                            <Bot className="h-4 w-4 text-brand-purple" />
                          ) : (
                            <BotOff className="h-4 w-4 text-brand-mid-gray" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Task Chat Header */}
                    <div className="flex items-center justify-between p-4 border-b bg-background lg:hidden">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedTaskConversation(null)}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-purple rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-white">
                            {selectedTaskConversation.personName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <h2 className="font-medium text-brand-dark">{selectedTaskConversation.personName}</h2>
                          <p className="text-xs text-brand-mid-gray">{selectedTaskConversation.personRole}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={getTaskAutoResponseState()}
                          onCheckedChange={toggleTaskAutoResponse}
                        />
                        <span className={cn(
                          "text-xs font-medium",
                          getTaskAutoResponseState() ? "text-brand-purple" : "text-brand-mid-gray"
                        )}>
                          {getTaskAutoResponseState() ? "ON" : "OFF"}
                        </span>
                        {getTaskAutoResponseState() ? (
                          <Bot className="h-4 w-4 text-brand-purple" />
                        ) : (
                          <BotOff className="h-4 w-4 text-brand-mid-gray" />
                        )}
                      </div>
                    </div>

                    {/* Task Messages Container */}
                    <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
                      <div className="p-4 space-y-4">
                        <AnimatePresence>
                          {selectedTaskConversation.messages.map((message, index) => (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className={cn(
                                "flex",
                                message.sender === 'guest' || (message.sender !== 'guest' && message.sender !== 'rambley' && message.sender !== 'host') 
                                  ? "justify-start" 
                                  : "justify-end",
                                message.isSystemMessage && "opacity-60 justify-center"
                              )}
                            >
                              {message.isSystemMessage ? (
                                <div className="bg-gray-100 text-gray-600 italic text-sm px-3 py-2 rounded-lg max-w-md text-center">
                                  {message.text}
                                </div>
                              ) : (
                                <div className={cn(
                                  "max-w-[85%] sm:max-w-xs lg:max-w-md",
                                  message.sender === 'guest' || (message.sender !== 'guest' && message.sender !== 'rambley' && message.sender !== 'host')
                                    ? "mr-4 sm:mr-12" 
                                    : "ml-4 sm:ml-12"
                                )}>
                                  {/* Sender badge for non-guest messages */}
                                  {message.sender !== 'guest' && (message.sender === 'rambley' || message.sender === 'host') && (
                                    <div className={cn(
                                      "flex mb-1",
                                      message.sender !== 'rambley' && message.sender !== 'host'
                                        ? "justify-start"
                                        : "justify-end"
                                    )}>
                                      <div className="flex items-center gap-1 text-xs text-brand-mid-gray">
                                        {message.sender === 'rambley' ? (
                                          <>
                                            <Bot className="h-3 w-3" />
                                            <span>Rambley</span>
                                          </>
                                        ) : message.sender === 'host' ? (
                                          <>
                                            <User className="h-3 w-3" />
                                            <span>Host</span>
                                          </>
                                        ) : (
                                          <>
                                            <User className="h-3 w-3" />
                                            <span>{message.senderName || 'Contact'}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  <div className={cn(
                                    "px-4 py-2 rounded-lg",
                                    message.sender === 'guest'
                                      ? "bg-brand-vanilla text-brand-dark"
                                      : message.sender === 'rambley' || message.sender === 'host'
                                        ? "bg-brand-purple text-white"
                                        : "bg-brand-dark text-brand-vanilla"
                                  )}>
                                    <p className="text-sm">{message.text}</p>
                                    <p className={cn(
                                      "text-xs mt-1",
                                      message.sender === 'guest'
                                        ? "text-brand-mid-gray"
                                        : message.sender === 'rambley' || message.sender === 'host'
                                          ? "text-white/70"
                                          : "text-brand-vanilla/70"
                                    )}>
                                      {message.timestamp}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>  
                      </div>
                    </div>

                    {/* Task Message Input */}
                    <div className="fixed bottom-0 left-0 right-0 lg:relative lg:bottom-auto lg:left-auto lg:right-auto p-4 border-t bg-background z-20 safe-area-inset-bottom">
                      {!getTaskAutoResponseState() && (
                        <div className="mb-3 p-2 bg-brand-vanilla/50 rounded-lg border border-brand-vanilla">
                          <div className="flex items-center gap-2 text-sm text-brand-dark">
                            <BotOff className="h-4 w-4" />
                            <span>Auto-response is disabled. You're in manual mode for this conversation.</span>
                          </div>
                        </div>
                      )}
                      <form onSubmit={handleTaskSendMessage} className="flex gap-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder={`Message ${selectedTaskConversation.personName}...`}
                          className="flex-1"
                        />
                        <Button type="submit" size="icon">
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-brand-light/50">
                    <div className="text-center">
                      <MessageCircle className="mx-auto h-12 w-12 text-brand-mid-gray mb-4" />
                      <h3 className="text-lg font-medium text-brand-dark mb-2">Select a conversation</h3>
                      <p className="text-brand-mid-gray">Choose a person to view your communication with them</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : demoMode === 'messages' ? (
            <motion.div
              key="messages"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="h-full flex"
            >
              {/* Messages List - Identical to MessagesPage */}
              <div className={cn(
                "w-full lg:w-96 border-r bg-background",
                selectedConversation ? "hidden lg:block" : "block"
              )}>
                <div className="p-6 border-b">
                  <h1 className="text-2xl font-bold text-brand-dark">Messages</h1>
                  <p className="text-brand-mid-gray">Guest conversations</p>
                  
                  {/* Search Input */}
                  <div className="mt-4 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-mid-gray" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search guests, properties, numbers..."
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="overflow-y-auto">
                  {filteredConversations.length > 0 ? (
                    filteredConversations.map((conversation) => (
                      <motion.div
                        key={conversation.id}
                        whileHover={{ backgroundColor: 'rgba(154, 23, 80, 0.05)' }}
                        className={cn(
                          "p-4 border-b cursor-pointer transition-colors",
                          selectedConversation?.id === conversation.id ? "bg-brand-purple/10 border-brand-purple/20" : ""
                        )}
                        onClick={() => setSelectedConversation(conversation)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-brand-vanilla text-brand-dark rounded-full flex items-center justify-center font-medium text-sm">
                            {getInitials(conversation.guestName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-brand-dark truncate">{conversation.guestName}</h3>
                              {conversation.unread > 0 && (
                                <Badge variant="default" className="ml-2">
                                  {conversation.unread}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-brand-mid-gray mb-1">
                              <Phone className="h-3 w-3" />
                              <span>{conversation.phone}</span>
                              <span>•</span>
                              <span>{conversation.property}</span>
                            </div>
                            <p className="text-sm text-brand-mid-gray truncate">{conversation.lastMessage}</p>
                            <p className="text-xs text-brand-mid-gray mt-1">{conversation.timestamp}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <MessageCircle className="mx-auto h-12 w-12 text-brand-mid-gray mb-4" />
                      <h3 className="text-lg font-medium text-brand-dark mb-2">No conversations found</h3>
                      <p className="text-brand-mid-gray text-sm">
                        {searchQuery ? `No results for "${searchQuery}"` : 'No conversations available'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat View - Identical to MessagesPage */}
              <div className={cn(
                "flex-1 flex flex-col",
                !selectedConversation ? "hidden lg:flex" : "flex"
              )}>
                {selectedConversation ? (
                  <>
                    {/* Desktop Chat Header */}
                    <div className="hidden lg:flex items-center justify-between p-4 border-b bg-background">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-vanilla text-brand-dark rounded-full flex items-center justify-center font-medium text-sm">
                          {selectedConversation.guestName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h2 className="font-semibold text-brand-dark">{selectedConversation.guestName}</h2>
                          <p className="text-sm text-brand-mid-gray">{selectedConversation.property}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-brand-dark">Auto Response</span>
                          <Switch
                            checked={isAutoResponseEnabled}
                            onCheckedChange={toggleAutoResponse}
                          />
                          <span className={cn(
                            "text-xs font-medium",
                            isAutoResponseEnabled ? "text-brand-purple" : "text-brand-mid-gray"
                          )}>
                            {isAutoResponseEnabled ? "ON" : "OFF"}
                          </span>
                          {isAutoResponseEnabled ? (
                            <Bot className="h-4 w-4 text-brand-purple" />
                          ) : (
                            <BotOff className="h-4 w-4 text-brand-mid-gray" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Chat Header */}
                    <div className="flex items-center justify-between p-4 border-b bg-background lg:hidden">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedConversation(null)}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-purple rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-white">
                            {selectedConversation.guestName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <h2 className="font-medium text-brand-dark">{selectedConversation.guestName}</h2>
                          <p className="text-xs text-brand-mid-gray">{selectedConversation.property}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={isAutoResponseEnabled}
                          onCheckedChange={toggleAutoResponse}
                        />
                        <span className={cn(
                          "text-xs font-medium",
                          isAutoResponseEnabled ? "text-brand-purple" : "text-brand-mid-gray"
                        )}>
                          {isAutoResponseEnabled ? "ON" : "OFF"}
                        </span>
                        {isAutoResponseEnabled ? (
                          <Bot className="h-4 w-4 text-brand-purple" />
                        ) : (
                          <BotOff className="h-4 w-4 text-brand-mid-gray" />
                        )}
                      </div>
                    </div>

                    {/* Messages Container - with bottom padding for fixed input */}
                    <div className="flex-1 overflow-y-auto pb-32 lg:pb-0">
                      <div className="p-4 space-y-4">
                        <AnimatePresence>
                          {selectedConversation.messages.map((message, index) => (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className={cn(
                                "flex",
                                message.sender === 'host' ? "justify-end" : "justify-start"
                              )}
                            >
                                                             <div className={cn(
                                 "max-w-[85%] sm:max-w-xs lg:max-w-md",
                                 message.sender === 'host' ? "flex flex-col items-end" : ""
                               )}>
                                {/* Sender Badge for host messages */}
                                {message.sender === 'host' && (
                                  <div className="mb-1">
                                    {getSenderBadge(message)}
                                  </div>
                                )}
                                
                                {/* Message Bubble */}
                                <div className={cn(
                                  "px-4 py-2 rounded-lg",
                                  message.sender === 'host' 
                                    ? "bg-brand-purple text-white"
                                    : "bg-brand-vanilla text-brand-dark"
                                )}>
                                  <p className="text-sm">{message.text}</p>
                                  <p className={cn(
                                    "text-xs mt-1",
                                    message.sender === 'host' 
                                      ? "text-white/70"
                                      : "text-brand-mid-gray"
                                  )}>
                                    {message.timestamp}
                                  </p>
                                  
                                  {/* Task Links */}
                                  {renderTaskLinks(message.generatedTasks)}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Message Input - Fixed on mobile, normal on desktop */}  
                    <div className="fixed bottom-0 left-0 right-0 lg:relative lg:bottom-auto lg:left-auto lg:right-auto p-4 border-t bg-background z-20 safe-area-inset-bottom">
                      {/* Persona Selector */}
                      {!selectedPersona && (
                        <div className="mb-3 p-3 bg-brand-vanilla/50 rounded-lg border border-brand-vanilla">
                          <div className="flex items-center gap-2 text-sm text-brand-dark mb-2">
                            <Bot className="h-4 w-4" />
                            <span className="font-medium">Choose your persona:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {personas.map((persona) => (
                              <Button
                                key={persona.id}
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedPersona(persona)}
                                className="text-xs"
                              >
                                {persona.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      <form onSubmit={handleSendMessage} className="flex gap-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder={`Type message as ${selectedPersona ? selectedPersona.label : ''}...`}
                          className="flex-1"
                        />
                        <Button type="submit" size="icon" disabled={!newMessage.trim() || !selectedPersona}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-brand-light/50">
                    <div className="text-center">
                      <MessageCircle className="mx-auto h-12 w-12 text-brand-mid-gray mb-4" />
                      <h3 className="text-lg font-medium text-brand-dark mb-2">Select a conversation</h3>
                      <p className="text-brand-mid-gray">Choose a guest conversation to start messaging</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="p-6 space-y-6"
            >
              {/* Tasks Header - Identical to TasksPage */}
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

              {/* Filters - Identical to TasksPage */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Status Filters */}
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

                <div className="flex gap-4">
                  {/* Property Filter */}
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-brand-mid-gray" />
                    <select
                      value={taskPropertyFilter}
                      onChange={(e) => setTaskPropertyFilter(e.target.value)}
                      className="h-9 w-[200px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-2"
                    >
                      <option value="all">All Properties</option>
                      {taskProperties.map((property) => (
                        <option key={property} value={property}>
                          {property}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search */}
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <Search className="h-4 w-4 text-brand-mid-gray" />
                    <Input 
                      placeholder="Search tasks..."
                      value={taskSearchTerm}
                      onChange={(e) => setTaskSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Tasks List - Identical to TasksPage */}
              <div className="space-y-4">
                {filteredTasks.map((task, index) => {
                  const TypeIcon = typeIcons[task.type] || CheckSquare
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card 
                        className={cn(
                          "transition-all hover:shadow-md cursor-pointer",
                          task.status === 'completed' ? 'opacity-75' : ''
                        )}
                        onClick={() => handleTaskClick(task)}
                      >
                        <div className="p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-brand-vanilla rounded-full flex items-center justify-center">
                                  <TypeIcon className="h-4 w-4 text-brand-purple" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-brand-dark">{task.title}</h3>
                                  <p className="text-sm text-brand-mid-gray mt-1">{task.description}</p>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-4 text-sm text-brand-mid-gray">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{task.property}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  <span>{task.assignee}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{task.dueDate} at {task.dueTime}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageCircle className="h-4 w-4" />
                                  <span>{task.threadCount} thread{task.threadCount !== 1 ? 's' : ''}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col sm:items-end gap-2">
                              <div className="flex gap-2">
                                <Badge variant={statusColors[task.status]}>
                                  {task.status.replace('-', ' ')}
                                </Badge>
                                <Badge variant={priorityColors[task.priority]}>
                                  {task.priority} priority
                                </Badge>
                              </div>
                              
                              <div className="flex gap-2">
                                {task.status !== 'completed' && (
                                  <Button 
                                    size="icon" 
                                    variant="outline"
                                    onClick={(e) => handleTaskAction(e, task.id, 'complete')}
                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button 
                                  size="icon" 
                                  variant="outline"
                                  onClick={(e) => handleTaskAction(e, task.id, 'delete')}
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>

              {filteredTasks.length === 0 && (
                <div className="text-center py-12">
                  <Clock className="mx-auto h-12 w-12 text-brand-mid-gray mb-4" />
                  <h3 className="text-lg font-medium text-brand-dark mb-2">No tasks found</h3>
                  <p className="text-brand-mid-gray">
                    {taskSearchTerm ? `No results for "${taskSearchTerm}"` : 'Try adjusting your filters or create a new task.'}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
} 