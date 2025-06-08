# Strapi Auto-Translator Plugin

A Strapi v5 plugin that automatically translates content from English to selected languages using the Google Translate API.

## Features

- Automatic translation of content from English to multiple target languages
- Support for text, string, and rich text fields
- Bulk translation capabilities
- Admin UI for easy configuration and testing
- RESTful API endpoints for programmatic access
- Support for fixing localization issues
- Translate all published content at once

## Installation

1. Install the plugin via npm:

```bash
npm install strapi-auto-translator
```

2. Add the plugin to your `config/plugins.js` file:

```javascript
module.exports = ({ env }) => ({
  "auto-translate": {
    enabled: true,
  },
});
```

3. Set up your Google Translate API key as an environment variable:

```bash
export GOOGLE_TRANSLATE_API_KEY="your-google-translate-api-key"
```

4. Install and configure the Strapi i18n plugin to define your target languages.

## Usage

### Admin Panel

1. Navigate to the Auto Translate plugin in the Strapi admin panel
2. Select your target language from the dropdown (based on your i18n configuration)
3. Use the translation features to translate your content

### API Endpoints

All endpoints require admin authentication and are prefixed with `/api/auto-translate`.

#### Translate a Single Entry

```http
POST /api/auto-translate/translate-entry
Content-Type: application/json

{
  "contentType": "api::article.article",
  "id": 1,
  "targetLanguage": "es"
}
```

#### Bulk Translate Text

```http
POST /api/auto-translate/translate-bulk
Content-Type: application/json

{
  "texts": ["Hello", "World"],
  "targetLanguage": "fr",
  "sourceLanguage": "en"
}
```

#### Translate All Published Content

```http
POST /api/auto-translate/translate-all-published
Content-Type: application/json

{
  "targetLanguage": "es"
}
```

#### Get Available Locales

```http
GET /api/auto-translate/locales
```

### Programmatic Usage

```javascript
const translationService = strapi
  .plugin("auto-translate")
  .service("translation");

// Translate text
const translatedText = await translationService.translateText(
  "Hello World",
  "es", // target language
  "en" // source language
);

// Translate an entire entry
const translatedEntry = await translationService.translateEntry(
  originalEntry,
  "api::article.article",
  "fr"
);

// Get available locales from i18n plugin
const locales = await translationService.getAvailableLocales();
```

## Supported Languages

The plugin supports translation to any languages configured in your Strapi i18n plugin. Configure your target languages in the Strapi admin panel under Settings > Internationalization.

## Requirements

- Strapi v5.0.0 or higher
- Strapi i18n plugin installed and configured
- Valid Google Translate API key

## License

MIT
