import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, MessageCircle, Send, ArrowLeft, Bot, BotOff, User, CheckSquare, ExternalLink, Search } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { cn } from '../lib/utils'
import { useNavigate } from 'react-router-dom'
import { Switch } from '../components/ui/switch'

// Mock data
const conversations = [
  {
    id: 1,
    guestName: 'Sarah Johnson',
    phone: '+1 (555) 123-4567',
    lastMessage: 'Thank you for the check-in instructions!',
    timestamp: '2 minutes ago',
    unread: 2,
    property: 'Sunset Villa',
    autoResponseEnabled: true, // Conversation-specific auto-response state
    messages: [
      { id: 1, text: 'Hi! I\'ll be arriving around 3 PM today. Is early check-in possible?', sender: 'guest', timestamp: '1:30 PM' },
      { id: 2, text: 'Hello Sarah! Welcome to Sunset Villa. Early check-in is available for a small fee. I\'ll send you the details.', sender: 'host', senderType: 'rambley', timestamp: '1:35 PM' },
      { id: 3, text: 'Perfect! Also, where should I park?', sender: 'guest', timestamp: '1:40 PM' },
      { id: 4, text: 'You can park in the driveway or on the street. The garage code is 1234 if you prefer covered parking.', sender: 'host', senderType: 'host', timestamp: '1:42 PM' },
      { id: 5, text: 'Could I get some fresh towels delivered to the room?', sender: 'guest', timestamp: '2:05 PM', generatedTasks: [1] },
      { id: 6, text: 'Of course! I\'ve arranged for fresh towels to be delivered within the hour.', sender: 'host', senderType: 'rambley', timestamp: '2:06 PM' },
      { id: 7, text: 'Thank you for the check-in instructions!', sender: 'guest', timestamp: '2:10 PM' },
    ]
  },
  {
    id: 2,
    guestName: 'Mike Chen',
    phone: '+1 (555) 987-6543',
    lastMessage: 'The WiFi password isn\'t working',
    timestamp: '15 minutes ago',
    unread: 1,
    property: 'Mountain Retreat',
    autoResponseEnabled: true,
    messages: [
      { id: 1, text: 'Hi, I just checked in but the WiFi password isn\'t working', sender: 'guest', timestamp: '1:55 PM', generatedTasks: [2] },
      { id: 2, text: 'Hi Mike! Let me help you with that. Try "MountainView2024" - make sure to include the capital letters. I\'ve also created a tech support task to verify the connection.', sender: 'host', senderType: 'rambley', timestamp: '1:58 PM' },
    ]
  },
  {
    id: 3,
    guestName: 'Emma Rodriguez',
    phone: '+1 (555) 456-7890',
    lastMessage: 'Check-out completed, thank you!',
    timestamp: '1 hour ago',
    unread: 0,
    property: 'Beach House',
    autoResponseEnabled: false, // This conversation has auto-response disabled
    messages: [
      { id: 1, text: 'Hi! We had a wonderful stay. Just wanted to let you know we\'ve checked out and left the keys on the counter.', sender: 'guest', timestamp: '12:30 PM' },
      { id: 2, text: 'Thank you Emma! So glad you enjoyed your stay. Hope to host you again soon!', sender: 'host', senderType: 'host', timestamp: '12:32 PM' },
      { id: 3, text: 'Actually, we noticed the bathroom faucet was dripping. Thought you should know.', sender: 'guest', timestamp: '12:45 PM', generatedTasks: [3, 4] },
      { id: 4, text: 'Thanks for letting us know! I\'ve logged this for our maintenance team.', sender: 'host', senderType: 'host', timestamp: '12:50 PM' },
      { id: 5, text: 'Check-out completed, thank you!', sender: 'guest', timestamp: '1:00 PM' },
    ]
  },
]

// Mock tasks data for reference
const mockTasks = {
  1: { id: 1, title: 'Deliver fresh towels - Room 12', type: 'housekeeping', status: 'pending' },
  2: { id: 2, title: 'WiFi troubleshooting - Mountain Retreat', type: 'maintenance', status: 'in-progress' },
  3: { id: 3, title: 'Fix dripping bathroom faucet - Beach House', type: 'maintenance', status: 'pending' },
  4: { id: 4, title: 'Post-checkout inspection - Beach House', type: 'inspection', status: 'pending' },
}

export default function MessagesPage() {
  const navigate = useNavigate()
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [conversationStates, setConversationStates] = useState(
    conversations.reduce((acc, conv) => {
      acc[conv.id] = { autoResponseEnabled: conv.autoResponseEnabled }
      return acc
    }, {})
  )

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    
    // Search in guest name
    if (conversation.guestName.toLowerCase().includes(query)) return true
    
    // Search in phone number (remove formatting for search)
    if (conversation.phone.replace(/\D/g, '').includes(query.replace(/\D/g, ''))) return true
    
    // Search in property name
    if (conversation.property.toLowerCase().includes(query)) return true
    
    // Search in last message
    if (conversation.lastMessage.toLowerCase().includes(query)) return true
    
    // Search in all messages
    if (conversation.messages.some(message => 
      message.text.toLowerCase().includes(query)
    )) return true
    
    return false
  })

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation) return

    // When host sends a message, disable auto-response for this conversation
    setConversationStates(prev => ({
      ...prev,
      [selectedConversation.id]: {
        ...prev[selectedConversation.id],
        autoResponseEnabled: false
      }
    }))

    // Add message to conversation (in real app, this would be an API call)
    console.log('Sending message:', newMessage)
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

  const handleTaskLink = (taskId) => {
    // Navigate to the task detail page
    navigate(`/tasks/${taskId}`)
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
            const task = mockTasks[taskId]
            if (!task) return null
            
            return (
              <button
                key={taskId}
                onClick={() => handleTaskLink(taskId)}
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

  return (
    <div className="h-full flex">
      {/* Conversations List */}
      <div className={cn(
        "w-full lg:w-96 border-r bg-background",
        selectedConversation ? "hidden lg:block" : "block"
      )}>
        <div className="p-4 sm:p-6 border-b">
          <h1 className="text-xl sm:text-2xl font-bold text-brand-dark">Messages</h1>
          <p className="text-sm sm:text-base text-brand-mid-gray">Guest conversations</p>
          
          {/* Search Input */}
          <div className="mt-3 sm:mt-4 relative">
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
            filteredConversations.map((conversation) => {
              // Generate initials from guest name
              const getInitials = (name) => {
                const names = name.split(' ')
                if (names.length >= 2) {
                  return `${names[0][0]}${names[1][0]}`.toUpperCase()
                }
                return name.substring(0, 2).toUpperCase()
              }
              
              return (
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
              )
            })
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

      {/* Chat View */}
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
            <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
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
                        "px-3 sm:px-4 py-2 rounded-lg",
                        message.sender === 'host' 
                          ? "bg-brand-purple text-white" // Both Rambley and Host use purple background
                          : "bg-brand-vanilla text-brand-dark" // Guest messages unchanged
                      )}>
                        <p className="text-sm leading-relaxed">{message.text}</p>
                        <p className={cn(
                          "text-xs mt-1",
                          message.sender === 'host' 
                            ? "text-white/70" // Both Rambley and Host timestamps
                            : "text-brand-mid-gray" // Guest timestamp
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
              {!isAutoResponseEnabled && (
                <div className="mb-3 p-2 bg-brand-vanilla/50 rounded-lg border border-brand-vanilla">
                  <div className="flex items-center gap-2 text-sm text-brand-dark">
                    <BotOff className="h-4 w-4" />
                    <span>Auto-response is disabled. You're in manual mode for this conversation.</span>
                  </div>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
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
              <p className="text-brand-mid-gray">Choose a guest conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 