import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Edit, Trash2, Check, X, MapPin } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useNotification } from '../contexts/NotificationContext'

// Available properties for service selection
const availableProperties = [
  { id: 1, name: 'Sunset Villa' },
  { id: 2, name: 'Mountain Retreat' },
  { id: 3, name: 'Beach House' }
]

const initialContacts = [
  { 
    id: 1, 
    name: 'Maria Garcia', 
    type: 'Cleaning Service', 
    phone: '+1 (555) 123-4567', 
    email: 'maria@sparkclean.com',
    serviceLocations: [1, 2] // Sunset Villa, Mountain Retreat
  },
  { 
    id: 2, 
    name: 'John Smith', 
    type: 'Maintenance', 
    phone: '+1 (555) 987-6543', 
    email: 'john@handyfix.com',
    serviceLocations: [1, 2, 3] // All properties
  },
  { 
    id: 3, 
    name: 'Sarah Wilson', 
    type: 'Property Inspector', 
    phone: '+1 (555) 456-7890', 
    email: 'sarah@propertycare.com',
    serviceLocations: [1, 3] // Sunset Villa, Beach House
  },
  { 
    id: 4, 
    name: 'Carlos Rodriguez', 
    type: 'Tour Guide', 
    phone: '+1 (555) 234-5678', 
    email: 'carlos@malibutoures.com',
    serviceLocations: [1] // Sunset Villa only
  },
  { 
    id: 5, 
    name: 'Pacific Taxi Co.', 
    type: 'Transportation', 
    phone: '+1 (555) 876-5432', 
    email: 'dispatch@pacifictaxi.com',
    serviceLocations: [1, 2, 3] // All properties
  },
  { 
    id: 6, 
    name: 'Lisa Chen', 
    type: 'Concierge', 
    phone: '+1 (555) 345-6789', 
    email: 'lisa@luxeconcierge.com',
    serviceLocations: [2, 3] // Mountain Retreat, Beach House
  },
]

export default function ContactsPage() {
  const [editingContact, setEditingContact] = useState(null)
  const [contactsList, setContactsList] = useState(initialContacts)
  const [editForm, setEditForm] = useState({})
  const [errors, setErrors] = useState({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [newContact, setNewContact] = useState({
    name: '',
    type: '',
    phone: '',
    email: '',
    serviceLocations: []
  })
  const { showWarning, showSuccess } = useNotification()

  const getPropertyNames = (serviceLocationIds) => {
    return serviceLocationIds.map(id => 
      availableProperties.find(prop => prop.id === id)?.name || 'Unknown'
    )
  }

  const handleAddContact = () => {
    if (!newContact.name.trim() || !newContact.type.trim() || !newContact.phone.trim() || !newContact.email.trim()) {
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

    const contact = {
      ...newContact,
      id: Math.max(...contactsList.map(c => c.id)) + 1
    }

    setContactsList([...contactsList, contact])
    setShowAddModal(false)
    setNewContact({
      name: '',
      type: '',
      phone: '',
      email: '',
      serviceLocations: []
    })
    showSuccess('Contact added successfully!')
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
    setEditForm({ ...contact })
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
    
    if (!editForm.type?.trim()) {
      newErrors.type = 'Type is required'
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

  const saveContactChanges = () => {
    if (!validateContactForm()) return
    
    setContactsList(prev => 
      prev.map(contact => 
        contact.id === editingContact ? { ...editForm } : contact
      )
    )
    setEditingContact(null)
    setEditForm({})
    setErrors({})
    showSuccess('Contact updated successfully!')
  }

  const deleteContact = (contactId) => {
    setContactsList(prev => prev.filter(contact => contact.id !== contactId))
    showSuccess('Contact deleted successfully!')
  }

  const updateEditForm = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
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
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-contact-name">Name or Business Name *</Label>
                <Input 
                  id="new-contact-name" 
                  value={newContact.name}
                  onChange={(e) => handleNewContactChange('name', e.target.value)}
                  placeholder="Enter name or business name"
                />
              </div>
              <div>
                <Label htmlFor="new-contact-type">Service Type *</Label>
                <Input 
                  id="new-contact-type" 
                  value={newContact.type}
                  onChange={(e) => handleNewContactChange('type', e.target.value)}
                  placeholder="e.g. Cleaning Service, Maintenance, Tour Guide"
                />
              </div>
              <div>
                <Label htmlFor="new-contact-phone">Phone Number *</Label>
                <Input 
                  id="new-contact-phone" 
                  value={newContact.phone}
                  onChange={(e) => handleNewContactChange('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="new-contact-email">Email Address *</Label>
                <Input 
                  id="new-contact-email" 
                  value={newContact.email}
                  onChange={(e) => handleNewContactChange('email', e.target.value)}
                  placeholder="email@example.com"
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
          >
            Cancel
          </Button>
          <Button onClick={handleAddContact}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
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
        className="space-y-4"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-brand-dark">Contacts</h3>
          <Button onClick={() => setShowAddModal(true)}>
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
                        <Label htmlFor={`contact-type-${contact.id}`}>Type</Label>
                        <Input
                          id={`contact-type-${contact.id}`}
                          value={editForm.type || ''}
                          onChange={(e) => updateEditForm('type', e.target.value)}
                          className={errors.type ? 'border-red-500' : ''}
                          placeholder="e.g. Cleaning Service, Tour Guide, Taxi, Maintenance"
                        />
                        {errors.type && (
                          <p className="text-sm text-red-500 mt-1">{errors.type}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor={`contact-phone-${contact.id}`}>Phone</Label>
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
                        <Label htmlFor={`contact-email-${contact.id}`}>Email</Label>
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
                      <Button size="sm" onClick={saveContactChanges}>
                        <Check className="h-4 w-4 mr-1" />
                        Save Changes
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEditingContact}>
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
                          {contact.type}
                        </Badge>
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-brand-mid-gray">
                        <span>{contact.phone}</span>
                        <span>{contact.email}</span>
                      </div>
                      {contact.serviceLocations && contact.serviceLocations.length > 0 && (
                        <div className="flex items-center gap-2 mt-3">
                          <MapPin className="h-3 w-3 text-brand-mid-gray" />
                          <span className="text-xs text-brand-mid-gray">Services:</span>
                          <div className="flex gap-1 flex-wrap">
                            {getPropertyNames(contact.serviceLocations).map((propertyName, index) => (
                              <Badge key={index} variant="outline" className="text-xs bg-brand-vanilla/50 text-brand-dark border-brand-purple/20">
                                {propertyName}
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
                        disabled={editingContact !== null}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteContact(contact.id)}
                        disabled={editingContact !== null}
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