import { useState, useEffect } from 'react'
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
  X,
  RefreshCw
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { useNotification } from '../contexts/NotificationContext'
import contactsService from '../services/contactsService'
import AddPropertyModal from '../components/AddPropertyModal'

export default function PropertiesPage() {
  const [properties, setProperties] = useState([])
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newProperty, setNewProperty] = useState({
    name: '',
    address: '',
    type: '',
    bedrooms: 0,
    bathrooms: 0,
    maxGuests: 1,
    checkinTime: '3:00 PM',
    checkoutTime: '11:00 AM',
    instructions: '',
    houseRules: '',
    wifiName: '',
    wifiPassword: '',
    emergencyContact: '',
    status: 'active'
  })
  const { showWarning, showSuccess, showError } = useNotification()

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await contactsService.getProperties()
      setProperties(response.properties || response)
      
    } catch (err) {
      console.error('Error loading properties:', err)
      setError(err.message || 'Failed to load properties')
      showError('Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  const handleAddProperty = async () => {
    if (!newProperty.name.trim() || !newProperty.address.trim()) {
      showWarning('Please fill in at least the property name and address.')
      return
    }

    try {
      setLoading(true)
      
      const createdProperty = await contactsService.createProperty(newProperty)
      
      // Update the properties list
      setProperties(prev => [...prev, createdProperty])
      
      // Reset form and close modal
      setShowAddModal(false)
      setNewProperty({
        name: '',
        address: '',
        type: '',
        bedrooms: 0,
        bathrooms: 0,
        maxGuests: 1,
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
      
    } catch (err) {
      console.error('Error adding property:', err)
      showError(err.message || 'Failed to add property')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProperty = async (propertyId) => {
    if (!confirm('Are you sure you want to delete this property?')) {
      return
    }

    try {
      setLoading(true)
      
      await contactsService.deleteProperty(propertyId)
      
      // Remove from properties list
      setProperties(prev => prev.filter(property => property.id !== propertyId))
      
      // If we're viewing the deleted property, go back to list
      if (selectedProperty && selectedProperty.id === propertyId) {
        setSelectedProperty(null)
      }
      
      showSuccess('Property deleted successfully!')
      
    } catch (err) {
      console.error('Error deleting property:', err)
      showError(err.message || 'Failed to delete property')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setNewProperty(prev => ({ ...prev, [field]: value }))
  }

  // Refresh button
  const RefreshButton = () => (
    <Button
      variant="ghost"
      size="sm"
      onClick={loadData}
      disabled={loading}
      className="h-6 px-2"
      title="Refresh properties"
    >
      <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
    </Button>
  )

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
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-brand-dark">Properties</h3>
          <RefreshButton />
        </div>
        <Button onClick={() => setShowAddModal(true)} disabled={loading}>
          <Plus className="mr-2 h-4 w-4" />
          Add Property
        </Button>
      </div>
      
      <div className="grid gap-4">
        {loading && properties.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2 text-brand-mid-gray">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading properties...</span>
            </div>
          </div>
        ) : error && properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="text-red-500 text-center">
              <p className="font-medium">Failed to load properties</p>
              <p className="text-sm text-brand-mid-gray">{error}</p>
            </div>
            <Button onClick={loadData} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="text-center">
              <p className="font-medium text-brand-dark">No properties found</p>
              <p className="text-sm text-brand-mid-gray">Add your first property to get started!</p>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Property
            </Button>
          </div>
        ) : (
          properties.map((property) => (
            <Card key={property.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1" onClick={() => setSelectedProperty(property)}>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-brand-dark">{property.name}</h4>
                      <Badge variant={property.status === 'active' ? 'default' : 'secondary'}>
                        {property.status}
                      </Badge>
                    </div>
                    <p className="text-brand-mid-gray text-sm mt-1">{property.address}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-brand-mid-gray">
                      <span>Check-in: {property.checkin_time || property.checkinTime || '3:00 PM'}</span>
                      <span>Check-out: {property.checkout_time || property.checkoutTime || '11:00 AM'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedProperty(property)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteProperty(property.id)
                      }}
                      disabled={loading}
                      className="hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
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
      {showAddModal && (
        <AddPropertyModal 
          newProperty={newProperty}
          handleInputChange={handleInputChange}
          handleAddProperty={handleAddProperty}
          setShowAddModal={setShowAddModal}
        />
      )}
    </div>
  )
} 