import apiService from './api.js';

/**
 * ContactsService - Unified API for contacts and properties management
 * This service provides a consistent interface for all contact-related operations
 * All data comes from the backend API with proper multi-tenant security
 */
class ContactsService {
  // Properties methods
  async getProperties(params = {}) {
    console.log('🌐 Using API properties data');
    return apiService.getProperties(params);
  }

  async getProperty(id) {
    return apiService.getProperty(id);
  }

  async createProperty(propertyData) {
    return apiService.createProperty(propertyData);
  }

  async updateProperty(id, propertyData) {
    return apiService.updateProperty(id, propertyData);
  }

  async deleteProperty(id) {
    return apiService.deleteProperty(id);
  }

  // Contacts methods
  async getContacts(params = {}) {
    console.log('🌐 Using API contacts data');
    return apiService.getContacts(params);
  }

  async getContact(id) {
    return apiService.getContact(id);
  }

  async createContact(contactData) {
    return apiService.createContact(contactData);
  }

  async updateContact(id, contactData) {
    return apiService.updateContact(id, contactData);
  }

  async deleteContact(id) {
    return apiService.deleteContact(id);
  }

  async getContactsByProperty(propertyId) {
    return apiService.getContactsByProperty(propertyId);
  }

  // Utility methods
  getCurrentDataSource() {
    return 'api';
  }

  isUsingApi() {
    return true;
  }

  isUsingStatic() {
    return false;
  }
}

export default new ContactsService(); 