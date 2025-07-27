# Phase 3 Frontend Integration Testing Guide

## Overview
Phase 3 integrates the ContactsPage with a data service layer that can switch between static and API data sources based on environment configuration.

## Configuration Options

### Environment Variables
- `VITE_DATA_SOURCE`: Set to `'static'` or `'api'`
- `VITE_API_URL`: Backend API URL (for API mode)

### Configuration Files
- `.env.local` - Local development settings (default: static mode)
- `.env.example` - Template with both configurations

## Testing Scenarios

### 1. Static Data Mode (Default)
**Configuration:**
```env
VITE_DATA_SOURCE=static
```

**Expected Behavior:**
- ✅ Data source indicator shows "Static Data (static)" with FileText icon
- ✅ Contacts load immediately from hardcoded data
- ✅ CRUD operations work in memory (no persistence between page refreshes)
- ✅ All 6 default contacts displayed with service locations
- ✅ Properties load (Sunset Villa, Mountain Retreat, Beach House)
- ✅ Console shows "📊 Using static contacts data" messages

**Test Checklist:**
- [ ] Page loads without errors
- [ ] 6 contacts displayed with proper data
- [ ] Data source indicator shows static mode
- [ ] Add new contact works (appears in list)
- [ ] Edit contact works (changes saved)
- [ ] Delete contact works (removed from list)
- [ ] Preferred language field works
- [ ] Service locations checkboxes work
- [ ] Form validation works
- [ ] Refresh button reloads data

### 2. API Data Mode
**Configuration:**
```env
VITE_DATA_SOURCE=api
VITE_API_URL=https://your-backend-app.railway.app/api
```

**Prerequisites:**
- ✅ Backend deployed and running on Railway
- ✅ Valid JWT token for authentication
- ✅ Database tables created and empty

**Expected Behavior:**
- ✅ Data source indicator shows "Database API (api)" with Database icon
- ✅ Initial load shows empty contacts list (no static data)
- ✅ CRUD operations persist in database
- ✅ All API calls authenticated with JWT
- ✅ Console shows "🌐 Using API contacts data" messages

**Test Checklist:**
- [ ] Page loads without errors (may show empty state initially)
- [ ] Data source indicator shows API mode
- [ ] Authentication required (login first)
- [ ] Create contact persists after page refresh
- [ ] Edit contact persists after page refresh
- [ ] Delete contact persists after page refresh
- [ ] Service locations persist properly
- [ ] Preferred language persists
- [ ] Error handling works for network issues
- [ ] Loading states work properly

### 3. Environment Switching Test
**Test switching between modes:**

1. **Start in Static Mode:**
   - Verify static data loads
   - Add/edit some contacts

2. **Switch to API Mode:**
   ```bash
   # Update .env.local
   VITE_DATA_SOURCE=api
   VITE_API_URL=https://your-backend-app.railway.app/api
   ```
   - Refresh page
   - Verify API mode indicator
   - Verify different data set (empty or from database)

3. **Switch back to Static:**
   ```bash
   # Update .env.local
   VITE_DATA_SOURCE=static
   ```
   - Refresh page
   - Verify static data returns

## Manual Testing Steps

### 1. Basic Functionality Test
1. Open `http://localhost:5173`
2. Navigate to Contacts tab
3. Verify data source indicator
4. Check that contacts load properly
5. Test refresh button

### 2. CRUD Operations Test
1. **Create Contact:**
   - Click "Add Contact"
   - Fill all required fields
   - Select service locations
   - Submit and verify success

2. **Edit Contact:**
   - Click edit button on existing contact
   - Modify fields
   - Change service locations
   - Save and verify changes

3. **Delete Contact:**
   - Click delete button
   - Verify contact removed from list

### 3. Data Persistence Test (API Mode Only)
1. Create a contact
2. Refresh the page
3. Verify contact still exists
4. Edit the contact
5. Refresh again
6. Verify changes persist

### 4. Error Handling Test
1. **Network Error (API Mode):**
   - Disconnect internet
   - Try to create/edit contact
   - Verify error messages

2. **Validation Errors:**
   - Try to submit empty form
   - Enter invalid email
   - Enter invalid phone
   - Verify validation messages

## Development Tools

### Console Debugging
Check browser console for:
- Configuration logs: `🔧 App Configuration:`
- Data source logs: `📊 Using static...` or `🌐 Using API...`
- Error logs for troubleshooting

### Network Tab (API Mode)
Monitor network requests:
- `/api/contacts` - GET requests
- `/api/properties` - GET requests  
- `/api/contacts` - POST/PUT/DELETE requests
- Verify JWT authentication headers

## Troubleshooting

### Common Issues

1. **"Configuration not loading"**
   - Verify `.env.local` exists
   - Restart development server
   - Check environment variable names (must start with `VITE_`)

2. **"API mode not working"**
   - Verify backend is running
   - Check CORS configuration
   - Verify JWT token is valid
   - Check network tab for 401/403 errors

3. **"Static data not showing"**
   - Check console for JavaScript errors
   - Verify contactsService.js imported correctly
   - Check component rendering

4. **"Service locations not working"**
   - Verify properties are loaded
   - Check data format consistency
   - Verify ID matching between contacts and properties

### Performance Testing
- [ ] Initial page load time acceptable
- [ ] Data loading states work properly
- [ ] No memory leaks on repeated operations
- [ ] Smooth transitions between modes

## Success Criteria

### Phase 3 Complete When:
- ✅ Both static and API modes work correctly
- ✅ Data source switching works via environment variables
- ✅ All CRUD operations work in both modes
- ✅ Error handling is robust
- ✅ Loading states provide good UX
- ✅ Preferred language feature works
- ✅ Service locations feature works
- ✅ Data persistence works in API mode
- ✅ Form validation is comprehensive
- ✅ UI remains responsive and intuitive

## Next Steps After Phase 3
1. Deploy frontend with API mode to staging
2. End-to-end testing on staging environment
3. Performance optimization if needed
4. User acceptance testing
5. Production deployment preparation 