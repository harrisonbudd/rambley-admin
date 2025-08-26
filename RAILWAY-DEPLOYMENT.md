# Railway Deployment Instructions

## Environment Setup

### Current Status
- **Branch**: `develop` (staging)
- **Files committed**: Webhook implementation ready for deployment
- **Next step**: Deploy to Railway staging environment

### Railway Environment Variables

#### 1. Staging Environment Variables
Navigate to your Railway staging project and add:

```bash
WEBHOOK_API_KEY=rambley_staging_wh_k3y_2024_a7f9c2e1d8b6
```

**How to add in Railway:**
1. Go to Railway dashboard
2. Select your staging project/environment
3. Go to Variables tab
4. Click "New Variable"
5. Name: `WEBHOOK_API_KEY`
6. Value: `rambley_staging_wh_k3y_2024_a7f9c2e1d8b6`
7. Click "Add"

#### 2. Production Environment Variables (Later)
After merging to `main` branch:

```bash
WEBHOOK_API_KEY=rambley_prod_wh_secure_2024_x9m7n3p5q8w2
```

### Database Migration Commands

#### For Staging
Once your staging deployment is live, run:

```bash
# Access your Railway staging database
# Run the migration script
node backend/scripts/guest-messages-migration.js
```

**Alternative: Using Railway CLI**
```bash
railway login
railway connect [your-staging-service]
railway run node backend/scripts/guest-messages-migration.js
```

#### For Production (After Staging Success)
```bash
# After merging to main and deploying
railway connect [your-production-service]  
railway run node backend/scripts/guest-messages-migration.js
```

### Deployment Workflow

#### Phase 1: Staging Deployment
1. ✅ **Current**: Code committed to `develop` branch
2. **Next**: Railway auto-deploys from `develop` branch to staging
3. **Add**: `WEBHOOK_API_KEY` environment variable to staging
4. **Run**: Database migration in staging environment
5. **Test**: Google Sheets integration with staging webhook URL

#### Phase 2: Production Deployment  
1. **Validate**: All staging tests pass
2. **Merge**: `develop` → `main` branch
3. **Deploy**: Railway auto-deploys from `main` to production
4. **Add**: `WEBHOOK_API_KEY` environment variable to production
5. **Run**: Database migration in production environment
6. **Switch**: Update Google Sheets to use production webhook URL

### Webhook URLs

#### Staging
```
https://[your-staging-app].railway.app/api/webhook/google-sheets-messages
```

#### Production
```
https://[your-production-app].railway.app/api/webhook/google-sheets-messages
```

### Testing Checklist

#### Staging Tests
- [ ] Webhook endpoint responds to GET `/api/webhook/status`
- [ ] Database migration creates `guest_messages` table
- [ ] Google Apps Script `sendTestData()` succeeds
- [ ] Google Apps Script `sendLatestAiResponse()` succeeds
- [ ] Data appears correctly in staging database
- [ ] Rate limiting works (10 requests/minute)
- [ ] API key authentication prevents unauthorized access

#### Production Tests  
- [ ] All staging tests pass in production
- [ ] Production webhook URL configured in Google Sheets
- [ ] Automatic webhook triggers work (`setupAutoWebhook()`)
- [ ] Production database receives real aiResponse data
- [ ] No data leakage between staging and production

### Troubleshooting

#### Common Issues
1. **"Webhook API key not configured"**
   - Solution: Add `WEBHOOK_API_KEY` environment variable in Railway

2. **Database migration fails**
   - Solution: Ensure Railway PostgreSQL service is running
   - Check `DATABASE_URL` environment variable is set

3. **Google Sheets can't reach webhook**
   - Solution: Verify Railway deployment is live and accessible
   - Check webhook URL format is correct

4. **Rate limit errors**
   - Solution: Current limit is 10 requests/minute
   - Adjust in `backend/server.js` if needed

### Next Steps After Deployment
1. **Monitor**: Watch Railway logs for webhook requests
2. **Scale**: Monitor database performance with incoming data
3. **Iterate**: Build Messages page in frontend to display data
4. **Enhance**: Add notification system for new guest messages