import apiService from './api.js';
import { config } from '../lib/config.js';

// Static data for development/fallback
const staticProperties = [
  { id: 1, name: 'Sunset Villa', address: 'Malibu, CA' },
  { id: 2, name: 'Mountain Retreat', address: 'Aspen, CO' },
  { id: 3, name: 'Beach House', address: 'Hamptons, NY' }
];

const staticContacts = [
  {
    id: 1,
    name: 'Maria Garcia',
    service_type: 'Cleaning Service',
    phone: '+1 (555) 123-4567',
    email: 'maria@sparkclean.com',
    preferred_language: 'en',
    notes: '',
    is_active: true,
    serviceLocations: [1, 2],
    service_locations: [
      { id: 1, name: 'Sunset Villa', address: 'Malibu, CA' },
      { id: 2, name: 'Mountain Retreat', address: 'Aspen, CO' }
    ]
  },
  {
    id: 2,
    name: 'John Smith',
    service_type: 'Maintenance',
    phone: '+1 (555) 987-6543',
    email: 'john@handyfix.com',
    preferred_language: 'en',
    notes: '',
    is_active: true,
    serviceLocations: [1, 2, 3],
    service_locations: [
      { id: 1, name: 'Sunset Villa', address: 'Malibu, CA' },
      { id: 2, name: 'Mountain Retreat', address: 'Aspen, CO' },
      { id: 3, name: 'Beach House', address: 'Hamptons, NY' }
    ]
  },
  {
    id: 3,
    name: 'Sarah Wilson',
    service_type: 'Property Inspector',
    phone: '+1 (555) 456-7890',
    email: 'sarah@propertycare.com',
    preferred_language: 'en',
    notes: '',
    is_active: true,
    serviceLocations: [1, 3],
    service_locations: [
      { id: 1, name: 'Sunset Villa', address: 'Malibu, CA' },
      { id: 3, name: 'Beach House', address: 'Hamptons, NY' }
    ]
  },
  {
    id: 4,
    name: 'Carlos Rodriguez',
    service_type: 'Tour Guide',
    phone: '+1 (555) 234-5678',
    email: 'carlos@malibutoures.com',
    preferred_language: 'es',
    notes: '',
    is_active: true,
    serviceLocations: [1],
    service_locations: [
      { id: 1, name: 'Sunset Villa', address: 'Malibu, CA' }
    ]
  },
  {
    id: 5,
    name: 'Pacific Taxi Co.',
    service_type: 'Transportation',
    phone: '+1 (555) 876-5432',
    email: 'dispatch@pacifictaxi.com',
    preferred_language: 'en',
    notes: '',
    is_active: true,
    serviceLocations: [1, 2, 3],
    service_locations: [
      { id: 1, name: 'Sunset Villa', address: 'Malibu, CA' },
      { id: 2, name: 'Mountain Retreat', address: 'Aspen, CO' },
      { id: 3, name: 'Beach House', address: 'Hamptons, NY' }
    ]
  },
  {
    id: 6,
    name: 'Lisa Chen',
    service_type: 'Concierge',
    phone: '+1 (555) 345-6789',
    email: 'lisa@luxeconcierge.com',
    preferred_language: 'en',
    notes: '',
    is_active: true,
    serviceLocations: [2, 3],
    service_locations: [
      { id: 2, name: 'Mountain Retreat', address: 'Aspen, CO' },
      { id: 3, name: 'Beach House', address: 'Hamptons, NY' }
    ]
  }
];

class ContactsService {
  // Properties methods
  async getProperties(params = {}) {
    if (config.useStatic) {
      console.log('📊 Using static properties data');
      
      let filteredProperties = [...staticProperties];
      
      // Apply search filter
      if (params.search) {
        const searchTerm = params.search.toLowerCase();
        filteredProperties = filteredProperties.filter(prop => 
          prop.name.toLowerCase().includes(searchTerm) ||
          (prop.address && prop.address.toLowerCase().includes(searchTerm))
        );
      }
      
      return {
        properties: filteredProperties,
        pagination: {
          page: parseInt(params.page || 1),
          limit: parseInt(params.limit || 50),
          total: filteredProperties.length,
          pages: 1
        }
      };
    } else {
      console.log('🌐 Using API properties data');
      return apiService.getProperties(params);
    }
  }

  async getProperty(id) {
    if (config.useStatic) {
      const property = staticProperties.find(p => p.id === parseInt(id));
      if (!property) {
        throw new Error('Property not found');
      }
      
      // Add contact count
      const contactCount = staticContacts.filter(c => 
        c.serviceLocations.includes(parseInt(id))
      ).length;
      
      return { ...property, contact_count: contactCount };
    } else {
      return apiService.getProperty(id);
    }
  }

  async createProperty(propertyData) {
    if (config.useStatic) {
      // Simulate API response
      const newProperty = {
        id: Math.max(...staticProperties.map(p => p.id)) + 1,
        ...propertyData,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      staticProperties.push(newProperty);
      console.log('📊 Added static property:', newProperty);
      return newProperty;
    } else {
      return apiService.createProperty(propertyData);
    }
  }

  async updateProperty(id, propertyData) {
    if (config.useStatic) {
      const index = staticProperties.findIndex(p => p.id === parseInt(id));
      if (index === -1) {
        throw new Error('Property not found');
      }
      
      const updatedProperty = {
        ...staticProperties[index],
        ...propertyData,
        updated_at: new Date().toISOString()
      };
      
      staticProperties[index] = updatedProperty;
      console.log('📊 Updated static property:', updatedProperty);
      return updatedProperty;
    } else {
      return apiService.updateProperty(id, propertyData);
    }
  }

  async deleteProperty(id) {
    if (config.useStatic) {
      const index = staticProperties.findIndex(p => p.id === parseInt(id));
      if (index === -1) {
        throw new Error('Property not found');
      }
      
      staticProperties.splice(index, 1);
      console.log('📊 Deleted static property:', id);
      return { message: 'Property deleted successfully' };
    } else {
      return apiService.deleteProperty(id);
    }
  }

  // Contacts methods
  async getContacts(params = {}) {
    if (config.useStatic) {
      console.log('📊 Using static contacts data');
      
      let filteredContacts = [...staticContacts];
      
      // Apply filters
      if (params.service_type) {
        const serviceTypeFilter = params.service_type.toLowerCase();
        filteredContacts = filteredContacts.filter(c => 
          c.service_type.toLowerCase().includes(serviceTypeFilter)
        );
      }
      
      if (params.language) {
        filteredContacts = filteredContacts.filter(c => 
          c.preferred_language === params.language
        );
      }
      
      if (params.property_id) {
        const propertyId = parseInt(params.property_id);
        filteredContacts = filteredContacts.filter(c => 
          c.serviceLocations.includes(propertyId)
        );
      }
      
      if (params.search) {
        const searchTerm = params.search.toLowerCase();
        filteredContacts = filteredContacts.filter(c => 
          c.name.toLowerCase().includes(searchTerm) ||
          c.email.toLowerCase().includes(searchTerm)
        );
      }
      
      if (params.active !== undefined) {
        const isActive = params.active === 'true';
        filteredContacts = filteredContacts.filter(c => c.is_active === isActive);
      }
      
      return {
        contacts: filteredContacts,
        pagination: {
          page: parseInt(params.page || 1),
          limit: parseInt(params.limit || 20),
          total: filteredContacts.length,
          pages: Math.ceil(filteredContacts.length / parseInt(params.limit || 20))
        }
      };
    } else {
      console.log('🌐 Using API contacts data');
      return apiService.getContacts(params);
    }
  }

  async getContact(id) {
    if (config.useStatic) {
      const contact = staticContacts.find(c => c.id === parseInt(id));
      if (!contact) {
        throw new Error('Contact not found');
      }
      return contact;
    } else {
      return apiService.getContact(id);
    }
  }

  async createContact(contactData) {
    if (config.useStatic) {
      // Convert serviceLocations to service_locations format
      const serviceLocations = contactData.serviceLocations || [];
      const service_locations = serviceLocations.map(id => 
        staticProperties.find(p => p.id === id)
      ).filter(Boolean);
      
      const newContact = {
        id: Math.max(...staticContacts.map(c => c.id)) + 1,
        ...contactData,
        serviceLocations,
        service_locations,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      staticContacts.push(newContact);
      console.log('📊 Added static contact:', newContact);
      return newContact;
    } else {
      return apiService.createContact(contactData);
    }
  }

  async updateContact(id, contactData) {
    if (config.useStatic) {
      const index = staticContacts.findIndex(c => c.id === parseInt(id));
      if (index === -1) {
        throw new Error('Contact not found');
      }
      
      // Convert serviceLocations to service_locations format
      const serviceLocations = contactData.serviceLocations || [];
      const service_locations = serviceLocations.map(id => 
        staticProperties.find(p => p.id === id)
      ).filter(Boolean);
      
      const updatedContact = {
        ...staticContacts[index],
        ...contactData,
        serviceLocations,
        service_locations,
        updated_at: new Date().toISOString()
      };
      
      staticContacts[index] = updatedContact;
      console.log('📊 Updated static contact:', updatedContact);
      return updatedContact;
    } else {
      return apiService.updateContact(id, contactData);
    }
  }

  async deleteContact(id) {
    if (config.useStatic) {
      const index = staticContacts.findIndex(c => c.id === parseInt(id));
      if (index === -1) {
        throw new Error('Contact not found');
      }
      
      staticContacts.splice(index, 1);
      console.log('📊 Deleted static contact:', id);
      return { message: 'Contact deleted successfully' };
    } else {
      return apiService.deleteContact(id);
    }
  }

  async getContactsByProperty(propertyId) {
    if (config.useStatic) {
      const filteredContacts = staticContacts.filter(c => 
        c.serviceLocations.includes(parseInt(propertyId))
      );
      return filteredContacts;
    } else {
      return apiService.getContactsByProperty(propertyId);
    }
  }

  // Utility methods
  getAvailableProperties() {
    return staticProperties;
  }

  getCurrentDataSource() {
    return config.dataSource;
  }

  isUsingApi() {
    return config.useApi;
  }

  isUsingStatic() {
    return config.useStatic;
  }
}

export default new ContactsService(); 