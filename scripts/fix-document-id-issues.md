# Fix "Editing Document Without ID" Error

This error occurs when Strapi v5 entries are missing their `documentId` field, which is required for the admin panel to work properly.

## Quick Solution

The easiest fix is to delete the problematic localized entries and recreate them:

### 1. Identify problematic entries

Look for entries that you can't edit. These are likely the German (de-DE) translations that were created.

### 2. Delete via API

```bash
# Delete a specific entry (replace CONTENT_TYPE and ENTRY_ID)
curl -X DELETE http://localhost:1337/api/articles/ENTRY_ID \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### 3. Or delete via database

If you have database access:

```sql
-- For PostgreSQL/MySQL
DELETE FROM articles WHERE locale = 'de-DE' AND document_id IS NULL;
DELETE FROM globals WHERE locale = 'de-DE' AND document_id IS NULL;
DELETE FROM homes WHERE locale = 'de-DE' AND document_id IS NULL;
DELETE FROM nav_menus WHERE locale = 'de-DE' AND document_id IS NULL;
```

### 4. Recreate translations

After deleting the problematic entries, use the plugin's "Translate All Published Content" button to recreate them properly.

## Alternative: Manual Fix

If you want to preserve the translations, you can manually add documentIds:

```sql
-- Generate unique documentIds for entries missing them
UPDATE articles
SET document_id = gen_random_uuid()
WHERE document_id IS NULL;

UPDATE globals
SET document_id = gen_random_uuid()
WHERE document_id IS NULL;

-- etc for other tables
```

## Prevention

The plugin has been updated to ensure new translations are created with proper documentIds. Make sure you're using the latest version of the plugin code.
