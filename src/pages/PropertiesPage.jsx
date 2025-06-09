import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2,
  Save,
  ArrowLeft,
  Clock,
  Key,
  Shield,
  X
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { useNotification } from '../contexts/NotificationContext'

// Mock data with expanded property information
const initialProperties = [
  { 
    id: 1, 
    name: 'Sunset Villa', 
    address: '123 Ocean Drive, Malibu, CA', 
    status: 'active',
    checkinTime: '3:00 PM',
    checkoutTime: '11:00 AM',
    instructions: 'Welcome to Sunset Villa! Your keyless entry code is provided 24 hours before check-in. Please park in the driveway and enter through the front door. The garage code is 1234 if you prefer covered parking.',
    houseRules: '• No smoking inside the property\n• No pets allowed\n• Quiet hours: 10 PM - 8 AM\n• Maximum occupancy: 6 guests\n• Please remove shoes when entering',
    wifiName: 'SunsetVilla_Guest',
    wifiPassword: 'Ocean2024!',
    emergencyContact: '+1 (555) 911-HELP'
  },
  { 
    id: 2, 
    name: 'Mountain Retreat', 
    address: '456 Pine Ridge, Aspen, CO', 
    status: 'active',
    checkinTime: '4:00 PM',
    checkoutTime: '10:00 AM',
    instructions: 'Welcome to Mountain Retreat! Check-in is at the main lodge. Pick up your keys and trail maps at the front desk. Parking is available in the gravel lot.',
    houseRules: '• No smoking anywhere on property\n• Pets welcome with $50 fee\n• Quiet hours: 9 PM - 7 AM\n• Maximum occupancy: 8 guests\n• Please keep doors locked due to wildlife',
    wifiName: 'MountainRetreat',
    wifiPassword: 'Alpine2024',
    emergencyContact: '+1 (555) mountain'
  },
  { 
    id: 3, 
    name: 'Beach House', 
    address: '789 Coastal Way, Miami, FL', 
    status: 'maintenance',
    checkinTime: '3:00 PM',
    checkoutTime: '11:00 AM',
    instructions: 'Beach House is currently under maintenance. New check-in instructions will be provided once renovations are complete.',
    houseRules: '• No smoking inside\n• No glass on the beach\n• Rinse sand off before entering\n• Maximum occupancy: 4 guests',
    wifiName: 'BeachHouse_WiFi',
    wifiPassword: 'Ocean123',
    emergencyContact: '+1 (555) beach-help'
  },
]

export default function PropertiesPage() {
  const [properties, setProperties] = useState(initialProperties)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newProperty, setNewProperty] = useState({
    name: '',
    address: '',
    checkinTime: '3:00 PM',
    checkoutTime: '11:00 AM',
    instructions: '',
    houseRules: '',
    wifiName: '',
    wifiPassword: '',
    emergencyContact: '',
    status: 'active'
  })
  const { showWarning, showSuccess } = useNotification()

  const handleAddProperty = () => {
    if (!newProperty.name.trim() || !newProperty.address.trim()) {
      showWarning('Please fill in at least the property name and address.')
      return
    }

    const property = {
      ...newProperty,
      id: Math.max(...properties.map(p => p.id)) + 1
    }

    setProperties([...properties, property])
    setShowAddModal(false)
    setNewProperty({
      name: '',
      address: '',
      checkinTime: '3:00 PM',
      checkoutTime: '11:00 AM',
      instructions: '',
      houseRules: '',
      wifiName: '',
      wifiPassword: '',
      emergencyContact: '',
      status: 'active'
    })
    showSuccess('Property added successfully!')
  }

  const handleInputChange = (field, value) => {
    setNewProperty(prev => ({ ...prev, [field]: value }))
  }

  const renderPropertyDetail = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setSelectedProperty(null)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Properties
        </Button>
        <div>
          <h3 className="text-lg font-semibold text-brand-dark">{selectedProperty.name}</h3>
          <p className="text-brand-mid-gray">{selectedProperty.address}</p>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="property-name">Property Name</Label>
            <Input id="property-name" defaultValue={selectedProperty.name} />
          </div>
          <div>
            <Label htmlFor="property-address">Address</Label>
            <Input id="property-address" defaultValue={selectedProperty.address} />
          </div>
          <div>
            <Label htmlFor="checkin-time">Check-in Time</Label>
            <Input id="checkin-time" defaultValue={selectedProperty.checkinTime} />
          </div>
          <div>
            <Label htmlFor="checkout-time">Check-out Time</Label>
            <Input id="checkout-time" defaultValue={selectedProperty.checkoutTime} />
          </div>
        </CardContent>
      </Card>

      {/* Access Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Access & WiFi
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="wifi-name">WiFi Network Name</Label>
            <Input id="wifi-name" defaultValue={selectedProperty.wifiName} />
          </div>
          <div>
            <Label htmlFor="wifi-password">WiFi Password</Label>
            <Input id="wifi-password" defaultValue={selectedProperty.wifiPassword} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="emergency-contact">Emergency Contact</Label>
            <Input id="emergency-contact" defaultValue={selectedProperty.emergencyContact} />
          </div>
        </CardContent>
      </Card>

      {/* Check-in Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Check-in Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="instructions">Instructions</Label>
          <textarea 
            id="instructions"
            className="w-full h-32 px-3 py-2 border border-input rounded-md text-sm mt-2"
            defaultValue={selectedProperty.instructions}
          />
          <Button className="mt-4">
            <Save className="mr-2 h-4 w-4" />
            Save Instructions
          </Button>
        </CardContent>
      </Card>

      {/* House Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            House Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="house-rules">Rules</Label>
          <textarea 
            id="house-rules"
            className="w-full h-32 px-3 py-2 border border-input rounded-md text-sm mt-2"
            defaultValue={selectedProperty.houseRules}
          />
          <Button className="mt-4">
            <Save className="mr-2 h-4 w-4" />
            Save Rules
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  const renderPropertiesList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-brand-dark">Properties</h3>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Property
        </Button>
      </div>
      
      <div className="grid gap-4">
        {properties.map((property) => (
          <Card key={property.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => setSelectedProperty(property)}
                >
                  <h4 className="font-semibold text-brand-dark">{property.name}</h4>
                  <p className="text-sm text-brand-mid-gray">{property.address}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-brand-mid-gray">
                    <span>Check-in: {property.checkinTime}</span>
                    <span>Check-out: {property.checkoutTime}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedProperty(property)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const AddPropertyModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-brand-dark">Add New Property</h2>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowAddModal(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-property-name">Property Name *</Label>
                <Input 
                  id="new-property-name" 
                  value={newProperty.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter property name"
                />
              </div>
              <div>
                <Label htmlFor="new-property-address">Address *</Label>
                <Input 
                  id="new-property-address" 
                  value={newProperty.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter full address"
                />
              </div>
              <div>
                <Label htmlFor="new-checkin-time">Check-in Time</Label>
                <Input 
                  id="new-checkin-time" 
                  value={newProperty.checkinTime}
                  onChange={(e) => handleInputChange('checkinTime', e.target.value)}
                  placeholder="e.g., 3:00 PM"
                />
              </div>
              <div>
                <Label htmlFor="new-checkout-time">Check-out Time</Label>
                <Input 
                  id="new-checkout-time" 
                  value={newProperty.checkoutTime}
                  onChange={(e) => handleInputChange('checkoutTime', e.target.value)}
                  placeholder="e.g., 11:00 AM"
                />
              </div>
            </CardContent>
          </Card>

          {/* Access Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Access & WiFi
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-wifi-name">WiFi Network Name</Label>
                <Input 
                  id="new-wifi-name" 
                  value={newProperty.wifiName}
                  onChange={(e) => handleInputChange('wifiName', e.target.value)}
                  placeholder="Enter WiFi network name"
                />
              </div>
              <div>
                <Label htmlFor="new-wifi-password">WiFi Password</Label>
                <Input 
                  id="new-wifi-password" 
                  value={newProperty.wifiPassword}
                  onChange={(e) => handleInputChange('wifiPassword', e.target.value)}
                  placeholder="Enter WiFi password"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="new-emergency-contact">Emergency Contact</Label>
                <Input 
                  id="new-emergency-contact" 
                  value={newProperty.emergencyContact}
                  onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                  placeholder="Enter emergency contact number"
                />
              </div>
            </CardContent>
          </Card>

          {/* Check-in Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Check-in Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="new-instructions">Instructions</Label>
              <textarea 
                id="new-instructions"
                className="w-full h-32 px-3 py-2 border border-input rounded-md text-sm mt-2"
                value={newProperty.instructions}
                onChange={(e) => handleInputChange('instructions', e.target.value)}
                placeholder="Enter detailed check-in instructions for guests..."
              />
            </CardContent>
          </Card>

          {/* House Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                House Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="new-house-rules">Rules</Label>
              <textarea 
                id="new-house-rules"
                className="w-full h-32 px-3 py-2 border border-input rounded-md text-sm mt-2"
                value={newProperty.houseRules}
                onChange={(e) => handleInputChange('houseRules', e.target.value)}
                placeholder="Enter house rules (e.g., • No smoking inside&#10;• Quiet hours: 10 PM - 8 AM)"
              />
            </CardContent>
          </Card>
        </div>

        <div className="sticky bottom-0 bg-white border-t p-6 flex justify-end gap-3">
          <Button 
            variant="outline"
            onClick={() => setShowAddModal(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleAddProperty}>
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {selectedProperty ? renderPropertyDetail() : renderPropertiesList()}
      </motion.div>
      {showAddModal && <AddPropertyModal />}
    </div>
  )
} 