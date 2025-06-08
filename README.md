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

4. Configure internationalization in your Strapi project by enabling locales in Settings > Internationalization (Strapi v5 has built-in i18n support).

## Usage

### Admin Panel

1. Navigate to the Auto Translate plugin in the Strapi admin panel
2. Select your target language from the dropdown (based on your configured locales)
3. Use the translation features to translate your content

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

// Get available locales from Strapi's built-in i18n
const locales = await translationService.getAvailableLocales();
```

## Supported Languages

The plugin supports translation to any languages configured in your Strapi project. Configure your target languages in the Strapi admin panel under Settings > Internationalization (Strapi v5 includes built-in internationalization support).

## Requirements

- Strapi v5.0.0 or higher (includes built-in internationalization)
- Valid Google Translate API key

## License

MIT
