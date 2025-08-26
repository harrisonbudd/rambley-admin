# Webhook Setup Guide

## Overview
This webhook endpoint allows your Google Sheets to send aiResponse data directly to your Rambley PostgreSQL database on Railway.

## Files Created
1. `backend/scripts/guest-messages-migration.js` - Database migration script
2. `backend/routes/webhook.js` - Webhook endpoint implementation
3. `google-sheets-webhook-integration.gs` - Google Apps Script integration
4. Updated `backend/server.js` with webhook route and rate limiting

## Setup Instructions

### 1. Database Migration
Run this migration on your Railway PostgreSQL database:
```bash
# Connect to your Railway database and run:
cd backend
node scripts/guest-messages-migration.js
```

### 2. Environment Variables
Add these environment variables to your Railway deployment:

```
WEBHOOK_API_KEY=your-secure-api-key-here
```

### 3. Google Apps Script Setup
1. Open your Google Sheets with the aiResponse data
2. Go to Extensions > Apps Script
3. Replace the default code with the content from `google-sheets-webhook-integration.gs`
4. Set these Script Properties (Project Settings > Script Properties):
   - `WEBHOOK_URL`: `https://your-railway-app.railway.app/api/webhook/google-sheets-messages`
   - `WEBHOOK_API_KEY`: Same value as your Railway environment variable
   - `ACCOUNT_ID`: Your Rambley account ID (usually `1` for demo account)

### 4. Testing
From Google Apps Script:
1. Run `sendTestData()` function to test the connection
2. Run `sendLatestAiResponse()` to send the most recent row
3. Use `setupAutoWebhook()` to enable automatic sending (every 5 minutes)

## Webhook Endpoints

### POST /api/webhook/google-sheets-messages
Accepts aiResponse data from Google Sheets.

**Headers:**
- `Content-Type: application/json`
- `X-API-Key: your-webhook-api-key`

**Body:**
```json
{
  "account_id": 1,
  "property_id": "PROP-001",
  "booking_id": "BOOKING-123",
  "guest_message": "Hello, I have a question...",
  "property_details_json": "{\"name\": \"Test Property\"}",
  "booking_details_json": "{\"checkin\": \"2024-01-15\"}",
  "property_faqs_json": "[{\"question\": \"...\", \"answer\": \"...\"}]",
  "escalation_risk_indicators": "Low",
  "available_knowledge": "Yes",
  "sub_category": "General Inquiry",
  "raw_data": {}
}
```

### GET /api/webhook/status
Health check endpoint for webhook service.

## Database Schema

The `guest_messages` table stores all incoming data with these fields:
- `id` - Primary key
- `account_id` - Links to your account (multi-tenant support)
- `property_id`, `booking_id` - Identifiers from your sheets
- `guest_message` - The actual message content
- `property_details_json`, `booking_details_json`, `property_faqs_json` - JSONB fields
- `escalation_risk_indicators`, `available_knowledge`, `sub_category` - Text fields
- `raw_data` - JSONB field storing the complete original data
- `created_at`, `updated_at` - Timestamps

## Security Features
- API key authentication via `X-API-Key` header
- Rate limiting: 10 requests per minute
- Row Level Security (RLS) for multi-tenant data isolation
- Request size limits and JSON validation

## Google Sheets Integration Features
- Automatic column mapping from aiResponse sheet headers
- Flexible header name matching (handles variations)
- Error handling and retry logic
- Manual and automated sending options
- Test functions for validation

## Next Steps
Once data is flowing into the `guest_messages` table, you can:
1. Build a Messages page in your Rambley frontend
2. Create API endpoints to retrieve and manage guest messages
3. Add notification systems for new messages
4. Integrate with your existing contacts and properties data