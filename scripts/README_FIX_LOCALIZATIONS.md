# Fix Localization Issues

## Quick Fix

1. **Get your admin token:**

   - Log into Strapi admin panel
   - Go to Settings → API Tokens
   - Create a new token with 'Full access' permission
   - Copy the token

2. **Run the fix script:**
   ```bash
   # Replace YOUR_ADMIN_TOKEN with your actual token
   ADMIN_TOKEN=YOUR_ADMIN_TOKEN node scripts/fix-all-localizations.js
   ```

## Manual Fix (for specific entries)

If you know which entry is causing issues, you can fix it directly:

```bash
# Example: Fix Article ID 27
curl -X POST http://localhost:1337/auto-translate/fix-localization-issues \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contentType": "api::article.article",
    "entryId": 27
  }'
```

## What the fix does:

1. Removes self-references in localizations
2. Validates all localization links
3. Ensures proper bidirectional linking
4. Cleans up any invalid references

After running the fix, you should be able to edit your content normally again.
