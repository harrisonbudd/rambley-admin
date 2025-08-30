# API Testing Guide

This guide covers how to test the Contacts API system on Railway staging environment.

## Quick Start

1. **Get Authentication Token**
   ```bash
   node get-auth-token.js https://your-app.railway.app
   ```
   This will use default admin credentials (`admin@rambley.com` / `AdminPass123!`)

2. **Run Full API Tests**
   ```bash
   node test-api.js https://your-app.railway.app <your-jwt-token>
   ```

## API Endpoints

### Properties API (`/api/properties`)

- **GET /api/properties** - List all properties
  - Query params: `active`, `search`, `page`, `limit`
  - Example: `/api/properties?search=villa&page=1&limit=10`

- **GET /api/properties/:id** - Get single property
- **POST /api/properties** - Create new property
  ```json
  {
    "name": "Property Name",
    "address": "Property Address", 
    "description": "Property Description"
  }
  ```
- **PUT /api/properties/:id** - Update property
- **DELETE /api/properties/:id** - Soft delete property

### Contacts API (`/api/contacts`)

- **GET /api/contacts** - List all contacts
  - Query params: `service_type`, `property_id`, `language`, `search`, `active`, `page`, `limit`
  - Example: `/api/contacts?service_type=Cleaning&language=en&page=1`

- **GET /api/contacts/:id** - Get single contact with service locations
- **POST /api/contacts** - Create new contact
  ```json
  {
    "name": "Contact Name",
    "service_type": "Service Type",
    "phone": "+1 (555) 123-4567",
    "email": "contact@example.com",
    "preferred_language": "en",
    "notes": "Optional notes",
    "serviceLocations": [1, 2, 3]
  }
  ```
- **PUT /api/contacts/:id** - Update contact
- **DELETE /api/contacts/:id** - Soft delete contact
- **GET /api/contacts/by-property/:propertyId** - Get contacts for specific property

## Database Schema

### Properties Table
```sql
CREATE TABLE properties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Contacts Table
```sql
CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  service_type VARCHAR(100) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  preferred_language VARCHAR(10) DEFAULT 'en',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Contact Service Locations (Junction Table)
```sql
CREATE TABLE contact_service_locations (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
  property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(contact_id, property_id)
);
```

## Testing Checklist

### Database Migration
- [ ] Properties table created
- [ ] Contacts table created  
- [ ] Contact service locations junction table created
- [ ] All indexes created
- [ ] No hardcoded data migrated

### Properties API
- [ ] GET /api/properties returns empty array initially
- [ ] POST /api/properties creates new property
- [ ] GET /api/properties/:id returns single property
- [ ] PUT /api/properties/:id updates property
- [ ] DELETE /api/properties/:id soft deletes property
- [ ] Validation works (required name field)
- [ ] Duplicate name prevention works

### Contacts API  
- [ ] GET /api/contacts returns empty array initially
- [ ] POST /api/contacts creates new contact with service locations
- [ ] GET /api/contacts/:id returns contact with service locations
- [ ] PUT /api/contacts/:id updates contact and service locations
- [ ] DELETE /api/contacts/:id soft deletes contact
- [ ] GET /api/contacts/by-property/:id filters by property
- [ ] Query filtering works (service_type, language, search)
- [ ] Validation works (email format, phone format, required fields)
- [ ] Duplicate email prevention works
- [ ] Preferred language field works

### Security & Performance
- [ ] All endpoints require authentication
- [ ] JWT token validation works
- [ ] Database queries are parameterized (SQL injection safe)
- [ ] Database indexes improve query performance
- [ ] Soft deletes preserve data
- [ ] Transaction rollback works on errors

## Troubleshooting

### Migration Issues
- Check Railway deployment logs
- Verify `DATABASE_URL` environment variable
- Ensure migration runs before server starts

### Authentication Issues  
- Verify default admin user was created
- Check JWT secret is set
- Ensure token is passed in Authorization header

### Database Issues
- Check PostgreSQL connection
- Verify table creation
- Check foreign key constraints 