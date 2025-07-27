import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Edit, Trash2, Check, X, MapPin, Database, FileText, RefreshCw } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useNotification } from '../contexts/NotificationContext'
import contactsService from '../services/contactsService'

export default function ContactsPage() {
  const [editingContact, setEditingContact] = useState(null)
  const [contactsList, setContactsList] = useState([])
  const [availableProperties, setAvailableProperties] = useState([])
  const [editForm, setEditForm] = useState({})
  const [errors, setErrors] = useState({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newContact, setNewContact] = useState({
    name: '',
    service_type: '',
    phone: '',
    email: '',
    preferred_language: 'en',
    notes: '',
    serviceLocations: []
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
      
      // Load both contacts and properties
      const [contactsResponse, propertiesResponse] = await Promise.all([
        contactsService.getContacts(),
        contactsService.getProperties()
      ])
      
      setContactsList(contactsResponse.contacts || contactsResponse)
      setAvailableProperties(propertiesResponse.properties || propertiesResponse)
      
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err.message || 'Failed to load data')
      showError('Failed to load contacts and properties')
    } finally {
      setLoading(false)
    }
  }

  // Get property names from service locations
  const getPropertyNames = (serviceLocationIds) => {
    if (!serviceLocationIds || !Array.isArray(serviceLocationIds)) {
      return []
    }
    return serviceLocationIds.map(id => 
      availableProperties.find(prop => prop.id === id)?.name || 'Unknown'
    )
  }

  // Get service locations from contact (handles both formats)
  const getServiceLocations = (contact) => {
    // API format has service_locations array with objects
    if (contact.service_locations && Array.isArray(contact.service_locations)) {
      return contact.service_locations
    }
    // Static format has serviceLocations array with IDs
    if (contact.serviceLocations && Array.isArray(contact.serviceLocations)) {
      return contact.serviceLocations.map(id => 
        availableProperties.find(prop => prop.id === id)
      ).filter(Boolean)
    }
    return []
  }

  // Get service location IDs from contact (for editing)
  const getServiceLocationIds = (contact) => {
    // API format
    if (contact.service_locations && Array.isArray(contact.service_locations)) {
      return contact.service_locations.map(loc => loc.id)
    }
    // Static format
    if (contact.serviceLocations && Array.isArray(contact.serviceLocations)) {
      return contact.serviceLocations
    }
    return []
  }

  const handleAddContact = async () => {
    if (!newContact.name.trim() || !newContact.service_type.trim() || !newContact.phone.trim() || !newContact.email.trim()) {
      showWarning('Please fill in all required fields.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newContact.email)) {
      showWarning('Please enter a valid email address.')
      return
    }

    if (!/^\+?[\d\s\(\)\-\.]+$/.test(newContact.phone)) {
      showWarning('Please enter a valid phone number.')
      return
    }

    try {
      setLoading(true)
      
      const contactData = {
        ...newContact,
        serviceLocations: newContact.serviceLocations
      }

      const createdContact = await contactsService.createContact(contactData)
      
      // Update the contacts list
      setContactsList(prev => [...prev, createdContact])
      
      // Reset form and close modal
      setShowAddModal(false)
      setNewContact({
        name: '',
        service_type: '',
        phone: '',
        email: '',
        preferred_language: 'en',
        notes: '',
        serviceLocations: []
      })
      
      showSuccess('Contact added successfully!')
      
    } catch (err) {
      console.error('Error adding contact:', err)
      showError(err.message || 'Failed to add contact')
    } finally {
      setLoading(false)
    }
  }

  const handleNewContactChange = (field, value) => {
    setNewContact(prev => ({ ...prev, [field]: value }))
  }

  const toggleServiceLocation = (propertyId, isForNewContact = false) => {
    if (isForNewContact) {
      setNewContact(prev => ({
        ...prev,
        serviceLocations: prev.serviceLocations.includes(propertyId)
          ? prev.serviceLocations.filter(id => id !== propertyId)
          : [...prev.serviceLocations, propertyId]
      }))
    } else {
      setEditForm(prev => ({
        ...prev,
        serviceLocations: prev.serviceLocations.includes(propertyId)
          ? prev.serviceLocations.filter(id => id !== propertyId)
          : [...prev.serviceLocations, propertyId]
      }))
    }
  }

  const startEditingContact = (contact) => {
    setEditingContact(contact.id)
    setEditForm({ 
      ...contact,
      service_type: contact.service_type || contact.type, // Handle both formats
      serviceLocations: getServiceLocationIds(contact)
    })
    setErrors({})
  }

  const cancelEditingContact = () => {
    setEditingContact(null)
    setEditForm({})
    setErrors({})
  }

  const validateContactForm = () => {
    const newErrors = {}
    
    if (!editForm.name?.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!editForm.service_type?.trim()) {
      newErrors.service_type = 'Service type is required'
    }
    
    if (!editForm.phone?.trim()) {
      newErrors.phone = 'Phone is required'
    } else if (!/^\+?[\d\s\(\)\-\.]+$/.test(editForm.phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }
    
    if (!editForm.email?.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const saveContactChanges = async () => {
    if (!validateContactForm()) return
    
    try {
      setLoading(true)
      
      const contactData = {
        ...editForm,
        serviceLocations: editForm.serviceLocations || []
      }

      const updatedContact = await contactsService.updateContact(editingContact, contactData)
      
      // Update the contacts list
      setContactsList(prev => 
        prev.map(contact => 
          contact.id === editingContact ? updatedContact : contact
        )
      )
      
      setEditingContact(null)
      setEditForm({})
      setErrors({})
      showSuccess('Contact updated successfully!')
      
    } catch (err) {
      console.error('Error updating contact:', err)
      showError(err.message || 'Failed to update contact')
    } finally {
      setLoading(false)
    }
  }

  const deleteContact = async (contactId) => {
    try {
      setLoading(true)
      
      await contactsService.deleteContact(contactId)
      
      // Remove from contacts list
      setContactsList(prev => prev.filter(contact => contact.id !== contactId))
      
      showSuccess('Contact deleted successfully!')
      
    } catch (err) {
      console.error('Error deleting contact:', err)
      showError(err.message || 'Failed to delete contact')
    } finally {
      setLoading(false)
    }
  }

  const updateEditForm = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Data source indicator
  const DataSourceIndicator = () => {
    const isUsingApi = contactsService.isUsingApi()
    const dataSource = contactsService.getCurrentDataSource()
    
    return (
      <div className="flex items-center gap-2 text-xs text-brand-mid-gray">
        {isUsingApi ? (
          <>
            <Database className="h-3 w-3" />
            <span>Database API ({dataSource})</span>
          </>
        ) : (
          <>
            <FileText className="h-3 w-3" />
            <span>Static Data ({dataSource})</span>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="h-6 px-2"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    )
  }

  const AddContactModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-brand-dark">Add New Contact</h2>
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
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1">
                <Label htmlFor="new-contact-name" className="text-sm font-medium">Name or Business Name *</Label>
                <Input 
                  id="new-contact-name" 
                  value={newContact.name}
                  onChange={(e) => handleNewContactChange('name', e.target.value)}
                  placeholder="Enter name or business name"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-contact-type" className="text-sm font-medium">Service Type *</Label>
                <Input 
                  id="new-contact-type" 
                  value={newContact.service_type}
                  onChange={(e) => handleNewContactChange('service_type', e.target.value)}
                  placeholder="e.g. Cleaning Service, Maintenance, Tour Guide"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-contact-phone" className="text-sm font-medium">Phone Number *</Label>
                <Input 
                  id="new-contact-phone" 
                  value={newContact.phone}
                  onChange={(e) => handleNewContactChange('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-contact-email" className="text-sm font-medium">Email Address *</Label>
                <Input 
                  id="new-contact-email" 
                  value={newContact.email}
                  onChange={(e) => handleNewContactChange('email', e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-contact-language" className="text-sm font-medium">Preferred Language</Label>
                <select 
                  id="new-contact-language"
                  value={newContact.preferred_language}
                  onChange={(e) => handleNewContactChange('preferred_language', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="it">Italian</option>
                  <option value="de">German</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-contact-notes" className="text-sm font-medium">Notes</Label>
                <Input 
                  id="new-contact-notes" 
                  value={newContact.notes}
                  onChange={(e) => handleNewContactChange('notes', e.target.value)}
                  placeholder="Optional notes"
                />
              </div>
            </CardContent>
          </Card>

          {/* Service Locations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Service Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label className="text-sm text-brand-mid-gray mb-3 block">
                Select which properties this contact can service:
              </Label>
              <div className="space-y-2">
                {availableProperties.map((property) => (
                  <label key={property.id} className="flex items-center gap-3 p-2 rounded border hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newContact.serviceLocations.includes(property.id)}
                      onChange={() => toggleServiceLocation(property.id, true)}
                      className="h-4 w-4 text-brand-purple focus:ring-brand-purple border-gray-300 rounded"
                    />
                    <span className="text-sm text-brand-dark">{property.name}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="sticky bottom-0 bg-white border-t p-6 flex justify-end gap-3">
          <Button 
            variant="outline"
            onClick={() => setShowAddModal(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddContact}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add Contact
          </Button>
        </div>
      </div>
    </div>
  )

  // Loading state
  if (loading && contactsList.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-brand-mid-gray">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading contacts...</span>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error && contactsList.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-red-500 text-center">
            <p className="font-medium">Failed to load contacts</p>
            <p className="text-sm text-brand-mid-gray">{error}</p>
          </div>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-brand-dark">Contacts</h3>
            <DataSourceIndicator />
          </div>
          <Button onClick={() => setShowAddModal(true)} disabled={loading}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>
        
        <div className="grid gap-4">
          {contactsList.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="p-4">
                {editingContact === contact.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`contact-name-${contact.id}`}>Name</Label>
                        <Input
                          id={`contact-name-${contact.id}`}
                          value={editForm.name || ''}
                          onChange={(e) => updateEditForm('name', e.target.value)}
                          className={errors.name ? 'border-red-500' : ''}
                          placeholder="Enter name or business name"
                        />
                        {errors.name && (
                          <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor={`contact-type-${contact.id}`}>Service Type</Label>
                        <Input
                          id={`contact-type-${contact.id}`}
                          value={editForm.service_type || ''}
                          onChange={(e) => updateEditForm('service_type', e.target.value)}
                          className={errors.service_type ? 'border-red-500' : ''}
                          placeholder="e.g. Cleaning Service, Tour Guide, Taxi, Maintenance"
                        />
                        {errors.service_type && (
                          <p className="text-sm text-red-500 mt-1">{errors.service_type}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor={`contact-phone-${contact.id}`} className="text-sm font-medium">Phone</Label>
                        <Input
                          id={`contact-phone-${contact.id}`}
                          value={editForm.phone || ''}
                          onChange={(e) => updateEditForm('phone', e.target.value)}
                          className={errors.phone ? 'border-red-500' : ''}
                          placeholder="+1 (555) 123-4567"
                        />
                        {errors.phone && (
                          <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor={`contact-email-${contact.id}`} className="text-sm font-medium">Email</Label>
                        <Input
                          id={`contact-email-${contact.id}`}
                          value={editForm.email || ''}
                          onChange={(e) => updateEditForm('email', e.target.value)}
                          className={errors.email ? 'border-red-500' : ''}
                          placeholder="email@example.com"
                        />
                        {errors.email && (
                          <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor={`contact-language-${contact.id}`} className="text-sm font-medium">Preferred Language</Label>
                        <select 
                          id={`contact-language-${contact.id}`}
                          value={editForm.preferred_language || 'en'}
                          onChange={(e) => updateEditForm('preferred_language', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple"
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="it">Italian</option>
                          <option value="de">German</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor={`contact-notes-${contact.id}`} className="text-sm font-medium">Notes</Label>
                        <Input
                          id={`contact-notes-${contact.id}`}
                          value={editForm.notes || ''}
                          onChange={(e) => updateEditForm('notes', e.target.value)}
                          placeholder="Optional notes"
                        />
                      </div>
                    </div>
                    
                    {/* Service Locations */}
                    <div className="border-t pt-4">
                      <Label className="text-sm font-medium text-brand-dark mb-3 block">
                        Service Locations
                      </Label>
                      <div className="space-y-2">
                        {availableProperties.map((property) => (
                          <label key={property.id} className="flex items-center gap-3 p-2 rounded border hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editForm.serviceLocations?.includes(property.id) || false}
                              onChange={() => toggleServiceLocation(property.id, false)}
                              className="h-4 w-4 text-brand-purple focus:ring-brand-purple border-gray-300 rounded"
                            />
                            <span className="text-sm text-brand-dark">{property.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={saveContactChanges} disabled={loading}>
                        {loading ? (
                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        Save Changes
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEditingContact} disabled={loading}>
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-brand-dark">{contact.name}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {contact.service_type || contact.type}
                        </Badge>
                        {contact.preferred_language && contact.preferred_language !== 'en' && (
                          <Badge variant="outline" className="text-xs">
                            {contact.preferred_language.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-brand-mid-gray">
                        <span>{contact.phone}</span>
                        <span>{contact.email}</span>
                      </div>
                      {getServiceLocations(contact).length > 0 && (
                        <div className="flex items-center gap-2 mt-3">
                          <MapPin className="h-3 w-3 text-brand-mid-gray" />
                          <span className="text-xs text-brand-mid-gray">Services:</span>
                          <div className="flex gap-1 flex-wrap">
                            {getServiceLocations(contact).map((location, index) => (
                              <Badge key={location.id || index} variant="outline" className="text-xs bg-brand-vanilla/50 text-brand-dark border-brand-purple/20">
                                {location.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => startEditingContact(contact)}
                        disabled={editingContact !== null || loading}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteContact(contact.id)}
                        disabled={editingContact !== null || loading}
                        className="hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
      {showAddModal && <AddContactModal />}
    </div>
  )
}