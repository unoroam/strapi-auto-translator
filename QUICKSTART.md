# Auto-Translate Plugin Quick Start Guide

## 1. Set Up Google Translate API Key

First, you need to get a Google Cloud Translation API key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Cloud Translation API
4. Create credentials (API Key)
5. Add the API key to your `.env` file:

```bash
GOOGLE_TRANSLATE_API_KEY=your-api-key-here
```

## 2. Restart Strapi

After adding the API key, restart your Strapi server:

```bash
npm run develop
```

## 3. Test the Plugin

### Via Admin Panel

1. Navigate to your Strapi admin panel
2. Look for "Auto Translate" in the left sidebar menu
3. Click on it to access the plugin interface

### Via API

You can test the translation API using curl or any HTTP client:

#### Test Simple Translation

```bash
# First, get an admin JWT token
TOKEN=$(curl -X POST http://localhost:1337/api/auth/local \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "your-admin-email",
    "password": "your-admin-password"
  }' | jq -r '.jwt')

# Test bulk translation
curl -X POST http://localhost:1337/api/auto-translate/translate-bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "texts": ["Hello World", "Welcome to Strapi"],
    "targetLanguage": "es"
  }'
```

#### Translate a Content Entry

Assuming you have an article with ID 1:

```bash
curl -X POST http://localhost:1337/api/auto-translate/translate-entry \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contentType": "api::article.article",
    "id": 1,
    "targetLanguage": "fr"
  }'
```

## 4. Integration Examples

### Automatic Translation on Content Creation

Add this to your content type's lifecycle (e.g., `src/api/article/content-types/article/lifecycles.js`):

```javascript
module.exports = {
  async afterCreate(event) {
    const { result } = event;
    const translationService = strapi
      .plugin("auto-translate")
      .service("translation");

    // Automatically translate to Spanish
    const translated = await translationService.translateEntry(
      result,
      "api::article.article",
      "es",
    );

    console.log("Translated content:", translated);
  },
};
```

### Using Accept-Language Header

Make a request with Accept-Language header to get automatically translated responses:

```bash
curl -X GET http://localhost:1337/api/articles/1 \
  -H "Accept-Language: fr-FR,fr;q=0.9"
```

## 5. Troubleshooting

### Plugin not showing in admin panel

1. Make sure the plugin is enabled in `config/plugins.js`
2. Delete `.cache` and `build` folders
3. Restart Strapi

### Translation not working

1. Check if API key is set correctly
2. Check Strapi logs for error messages
3. Verify Google Cloud Translation API is enabled for your project

### API returns 403 Forbidden

Make sure you're using a valid admin JWT token in the Authorization header.

## Support

For issues or questions, check the plugin README or Strapi documentation.
