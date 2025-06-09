import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  AlertTriangle,
  Plus, 
  Eye, 
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Calendar,
  Filter,
  Search,
  MapPin
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { cn } from '../lib/utils'

const escalations = [
  {
    id: 1,
    title: 'Guest Reports Hot Water Issue',
    type: 'Guest Issue',
    priority: 'high',
    status: 'open',
    createdAt: '2024-01-16 09:15 AM',
    property: 'Sunset Villa',
    guest: 'Sarah Chen',
    description: 'Guest reports no hot water in master bathroom. Needs immediate attention as guest has early checkout tomorrow.',
    assignedTo: 'John Smith (Maintenance)',
    lastUpdate: '2024-01-16 09:45 AM',
    estimatedResolution: '2 hours',
    messages: 3
  },
  {
    id: 2,
    title: 'High Cost Maintenance Request',
    type: 'Cost Threshold',
    priority: 'medium',
    status: 'pending_approval',
    createdAt: '2024-01-16 08:30 AM',
    property: 'Mountain Retreat',
    guest: null,
    description: 'HVAC system repair estimated at $750. Requires host approval before proceeding.',
    assignedTo: 'Mike Wilson (Maintenance)',
    lastUpdate: '2024-01-16 08:30 AM',
    estimatedCost: '$750',
    messages: 1
  },
  {
    id: 3,
    title: 'Staff Response Timeout',
    type: 'Staff Timeout',
    priority: 'medium',
    status: 'escalated',
    createdAt: '2024-01-16 07:00 AM',
    property: 'Beach House',
    guest: 'Michael Rodriguez',
    description: 'Cleaning staff has not responded to urgent cleaning request for 45 minutes. Guest checking in at 3 PM.',
    assignedTo: 'Maria Garcia (Cleaning)',
    lastUpdate: '2024-01-16 07:45 AM',
    messages: 2
  },
  {
    id: 4,
    title: 'Guest Complaint - Noise Issues',
    type: 'Guest Complaint',
    priority: 'high',
    status: 'resolved',
    createdAt: '2024-01-15 11:30 PM',
    property: 'Mountain Retreat',
    guest: 'Jennifer Park',
    description: 'Guest complained about noise from neighboring property. Issue resolved by contacting neighbor and providing earplugs.',
    assignedTo: 'Host',
    lastUpdate: '2024-01-16 06:00 AM',
    resolvedAt: '2024-01-16 06:00 AM',
    messages: 5
  },
  {
    id: 5,
    title: 'Emergency - Lock Malfunction',
    type: 'Emergency',
    priority: 'critical',
    status: 'resolved',
    createdAt: '2024-01-15 02:15 PM',
    property: 'Sunset Villa',
    guest: 'David Kim',
    description: 'Guest unable to enter property due to smart lock malfunction. Emergency locksmith dispatched.',
    assignedTo: 'Emergency Services',
    lastUpdate: '2024-01-15 03:45 PM',
    resolvedAt: '2024-01-15 03:45 PM',
    messages: 8
  }
]

export default function EscalationsPage() {
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [propertyFilter, setPropertyFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Get unique properties for the filter dropdown
  const properties = [...new Set(escalations.map(escalation => escalation.property))].sort()

  const getStatusInfo = (status) => {
    switch (status) {
      case 'open':
        return { color: 'bg-red-100 text-red-700', label: 'Open', icon: AlertCircle }
      case 'pending_approval':
        return { color: 'bg-yellow-100 text-yellow-700', label: 'Pending Approval', icon: Clock }
      case 'escalated':
        return { color: 'bg-orange-100 text-orange-700', label: 'Escalated', icon: AlertTriangle }
      case 'resolved':
        return { color: 'bg-green-100 text-green-700', label: 'Resolved', icon: CheckCircle }
      default:
        return { color: 'bg-gray-100 text-gray-700', label: 'Unknown', icon: AlertCircle }
    }
  }

  const getPriorityInfo = (priority) => {
    switch (priority) {
      case 'critical':
        return { color: 'border-red-500 bg-red-50', badge: 'bg-red-500 text-white' }
      case 'high':
        return { color: 'border-orange-500 bg-orange-50', badge: 'bg-orange-500 text-white' }
      case 'medium':
        return { color: 'border-yellow-500 bg-yellow-50', badge: 'bg-yellow-500 text-white' }
      case 'low':
        return { color: 'border-green-500 bg-green-50', badge: 'bg-green-500 text-white' }
      default:
        return { color: 'border-gray-500 bg-gray-50', badge: 'bg-gray-500 text-white' }
    }
  }

  const filteredEscalations = escalations.filter(escalation => {
    // Status filter
    const statusMatch = selectedFilter === 'all' || escalation.status === selectedFilter
    
    // Property filter
    const propertyMatch = propertyFilter === 'all' || escalation.property === propertyFilter
    
    // Search filter
    const searchMatch = !searchTerm.trim() || 
      escalation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      escalation.property.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (escalation.guest && escalation.guest.toLowerCase().includes(searchTerm.toLowerCase())) ||
      escalation.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      escalation.assignedTo.toLowerCase().includes(searchTerm.toLowerCase())

    return statusMatch && propertyMatch && searchMatch
  })

  const getEscalationCounts = () => {
    return {
      all: escalations.length,
      open: escalations.filter(e => e.status === 'open').length,
      pending_approval: escalations.filter(e => e.status === 'pending_approval').length,
      escalated: escalations.filter(e => e.status === 'escalated').length,
      resolved: escalations.filter(e => e.status === 'resolved').length,
    }
  }

  const counts = getEscalationCounts()
  const openEscalations = escalations.filter(e => e.status === 'open' || e.status === 'escalated' || e.status === 'pending_approval')
  const resolvedToday = escalations.filter(e => e.status === 'resolved' && e.resolvedAt?.includes('2024-01-16'))

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">Escalations</h1>
            <p className="text-brand-mid-gray">Monitor and manage escalated issues requiring your attention</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Escalations', count: counts.all },
              { key: 'open', label: 'Open', count: counts.open },
              { key: 'pending_approval', label: 'Pending Approval', count: counts.pending_approval },
              { key: 'escalated', label: 'Escalated', count: counts.escalated },
              { key: 'resolved', label: 'Resolved', count: counts.resolved }
            ].map((filterOption) => (
              <Button
                key={filterOption.key}
                variant={selectedFilter === filterOption.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter(filterOption.key)}
                className="capitalize"
              >
                {filterOption.label}
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "ml-2 text-xs pointer-events-none",
                    selectedFilter === filterOption.key 
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
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="h-9 w-[200px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-2"
              >
                <option value="all">All Properties</option>
                {properties.map((property) => (
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
                placeholder="Search escalations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Escalations List */}
        <div className="space-y-4">
          {filteredEscalations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-brand-mid-gray mb-4" />
                <h3 className="text-lg font-medium text-brand-dark mb-2">No escalations found</h3>
                <p className="text-brand-mid-gray">
                  {searchTerm ? `No results for "${searchTerm}"` : 'No escalations match your current filters.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredEscalations.map((escalation) => {
              const statusInfo = getStatusInfo(escalation.status)
              const priorityInfo = getPriorityInfo(escalation.priority)
              const StatusIcon = statusInfo.icon
              
              return (
                <Card key={escalation.id} className={`border-l-4 ${priorityInfo.color}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-brand-dark">{escalation.title}</h3>
                          <Badge className={`text-xs ${priorityInfo.badge}`}>
                            {escalation.priority.toUpperCase()}
                          </Badge>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </div>
                        </div>
                        
                        <p className="text-brand-mid-gray mb-4">{escalation.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <Label className="text-xs text-brand-mid-gray">Property</Label>
                            <p className="font-medium">{escalation.property}</p>
                          </div>
                          {escalation.guest && (
                            <div>
                              <Label className="text-xs text-brand-mid-gray">Guest</Label>
                              <p className="font-medium">{escalation.guest}</p>
                            </div>
                          )}
                          <div>
                            <Label className="text-xs text-brand-mid-gray">Assigned To</Label>
                            <p className="font-medium">{escalation.assignedTo}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-brand-mid-gray">Created</Label>
                            <p className="font-medium">{escalation.createdAt}</p>
                          </div>
                          {escalation.estimatedResolution && (
                            <div>
                              <Label className="text-xs text-brand-mid-gray">Est. Resolution</Label>
                              <p className="font-medium">{escalation.estimatedResolution}</p>
                            </div>
                          )}
                          {escalation.estimatedCost && (
                            <div>
                              <Label className="text-xs text-brand-mid-gray">Estimated Cost</Label>
                              <p className="font-medium text-orange-600">{escalation.estimatedCost}</p>
                            </div>
                          )}
                        </div>
                        
                        {escalation.resolvedAt && (
                          <div className="mt-3 text-sm">
                            <Label className="text-xs text-brand-mid-gray">Resolved</Label>
                            <p className="font-medium text-green-600">{escalation.resolvedAt}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="outline">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          {escalation.messages}
                        </Button>
                        <Button size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </motion.div>
    </div>
  )
} 