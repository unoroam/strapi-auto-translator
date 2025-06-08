/**
 * Example: Using Auto-Translate Plugin with Strapi Lifecycle Hooks
 *
 * This example shows how to automatically translate content when it's created or updated.
 * Add this code to your content type's lifecycle hooks (e.g., src/api/article/content-types/article/lifecycles.js)
 */

module.exports = {
  async afterCreate(event) {
    const { result, params } = event;

    // Check if translation is requested
    if (params.data.autoTranslate && params.data.targetLanguages) {
      const translationService = strapi
        .plugin("auto-translate")
        .service("translation");

      try {
        // Translate to each target language
        for (const targetLang of params.data.targetLanguages) {
          const translatedContent = await translationService.translateEntry(
            result,
            event.model.uid,
            targetLang,
          );

          // Create a new entry with the translated content
          await strapi.entityService.create(event.model.uid, {
            data: {
              ...translatedContent,
              locale: targetLang, // If using i18n plugin
              originalId: result.id, // Reference to original
            },
          });
        }

        strapi.log.info(
          `Content translated to ${params.data.targetLanguages.join(", ")}`,
        );
      } catch (error) {
        strapi.log.error("Translation failed:", error);
      }
    }
  },

  async beforeUpdate(event) {
    const { params } = event;

    // Check if translation update is requested
    if (params.data.updateTranslations) {
      const translationService = strapi
        .plugin("auto-translate")
        .service("translation");

      try {
        // Find related translations (assuming you have a relation field)
        const originalEntry = await strapi.entityService.findOne(
          event.model.uid,
          params.where.id,
          {
            populate: ["translations"],
          },
        );

        if (originalEntry.translations) {
          for (const translation of originalEntry.translations) {
            const translatedContent = await translationService.translateEntry(
              params.data,
              event.model.uid,
              translation.locale,
            );

            // Update the translated entry
            await strapi.entityService.update(event.model.uid, translation.id, {
              data: translatedContent,
            });
          }
        }

        strapi.log.info("Translations updated successfully");
      } catch (error) {
        strapi.log.error("Translation update failed:", error);
      }
    }
  },
};

/**
 * Example API Usage:
 *
 * POST /api/articles
 * {
 *   "data": {
 *     "title": "Hello World",
 *     "content": "This is my article content",
 *     "autoTranslate": true,
 *     "targetLanguages": ["es", "fr", "de"]
 *   }
 * }
 *
 * This will create the original article and automatically create translated versions
 * in Spanish, French, and German.
 */
