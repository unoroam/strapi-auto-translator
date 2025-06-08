# Strapi Auto-Translate Plugin

A Strapi v5 plugin that automatically translates content from English to selected languages using the Google Translate API.

## Features

- Automatic translation of content from English to multiple target languages
- Support for text, string, and rich text fields
- Bulk translation capabilities
- Admin UI for easy configuration and testing
- RESTful API endpoints for programmatic access

## Installation

1. The plugin is already installed in your Strapi project at `src/plugins/auto-translate`

2. Install the Google Cloud Translate dependency (if not already installed):

```bash
npm install @google-cloud/translate
```

3. Set up your Google Translate API key as an environment variable:

```bash
export GOOGLE_TRANSLATE_API_KEY="your-google-translate-api-key"
```

## Configuration

The plugin is configured in `config/plugins.js`:

```javascript
module.exports = ({ env }) => ({
  "auto-translate": {
    enabled: true,
    resolve: "./src/plugins/auto-translate",
  },
});
```

## Usage

### Admin Panel

1. Navigate to the Auto Translate plugin in the Strapi admin panel
2. Select your target language from the dropdown
3. Use the provided API endpoints to translate your content

### API Endpoints

All endpoints require admin authentication.

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

#### Get Available Languages

```http
GET /api/auto-translate/languages
```

#### Get Plugin Configuration

```http
GET /api/auto-translate/config
```

### Programmatic Usage

You can also use the translation service directly in your Strapi code:

```javascript
const translationService = strapi
  .plugin("auto-translate")
  .service("translation");

// Translate text
const translatedText = await translationService.translateText(
  "Hello World",
  "es", // target language
  "en", // source language
);

// Translate an entire entry
const translatedEntry = await translationService.translateEntry(
  originalEntry,
  "api::article.article",
  "fr",
);
```

## Supported Languages

The plugin supports translation to the following languages by default:

- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- Chinese (zh)
- Japanese (ja)
- Korean (ko)
- Arabic (ar)
- Russian (ru)
- Dutch (nl)
- Polish (pl)
- Turkish (tr)
- Hindi (hi)

## Development

### Plugin Structure

```
src/plugins/auto-translate/
├── admin/              # Admin panel UI
│   └── src/
│       ├── components/
│       ├── pages/
│       └── index.js
├── server/             # Server-side logic
│   ├── controllers/
│   ├── services/
│   └── routes/
├── package.json
├── strapi-admin.js
└── strapi-server.js
```

### Extending the Plugin

To add more target languages, update the `targetLanguages` array in `strapi-server.js`.

To customize the translation behavior, modify the `translation.js` service.

## Troubleshooting

1. **API Key Not Set**: Make sure the `GOOGLE_TRANSLATE_API_KEY` environment variable is set
2. **Translation Fails**: Check the Strapi logs for error messages
3. **Fields Not Translating**: Ensure the fields are of type `string`, `text`, or `richtext`

## License

MIT
