module.exports = ({ strapi }) => ({
  /**
   * Translate a single entry
   */
  async translateEntry(ctx) {
    const { contentType, id, targetLanguage } = ctx.request.body;

    if (!contentType || !id || !targetLanguage) {
      return ctx.badRequest(
        "Missing required parameters: contentType, id, targetLanguage"
      );
    }

    try {
      // Fetch the original entry
      const entry = await strapi.entityService.findOne(contentType, id);

      if (!entry) {
        return ctx.notFound("Entry not found");
      }

      // Translate the entry
      const translatedEntry = await strapi
        .plugin("auto-translate")
        .service("translation")
        .translateEntry(entry, contentType, targetLanguage);

      return ctx.send({
        data: translatedEntry,
        meta: {
          contentType,
          targetLanguage,
          sourceLanguage: "en",
        },
      });
    } catch (error) {
      strapi.log.error("Translation error:", error);
      return ctx.badRequest("Translation failed: " + error.message);
    }
  },

  /**
   * Get available languages
   */
  async getLanguages(ctx) {
    try {
      const languages = await strapi
        .plugin("auto-translate")
        .service("translation")
        .getAvailableLanguages();

      return ctx.send({
        data: languages,
      });
    } catch (error) {
      strapi.log.error("Error fetching languages:", error);
      return ctx.badRequest("Failed to fetch languages: " + error.message);
    }
  },

  /**
   * Bulk translate multiple fields
   */
  async translateBulk(ctx) {
    const { texts, targetLanguage, sourceLanguage = "en" } = ctx.request.body;

    if (!texts || !targetLanguage) {
      return ctx.badRequest(
        "Missing required parameters: texts, targetLanguage"
      );
    }

    try {
      const translationService = strapi
        .plugin("auto-translate")
        .service("translation");

      const translations = await Promise.all(
        texts.map((text) =>
          translationService.translateText(text, targetLanguage, sourceLanguage)
        )
      );

      return ctx.send({
        data: translations,
        meta: {
          targetLanguage,
          sourceLanguage,
          count: translations.length,
        },
      });
    } catch (error) {
      strapi.log.error("Bulk translation error:", error);
      return ctx.badRequest("Bulk translation failed: " + error.message);
    }
  },

  /**
   * Get plugin configuration
   */
  async getConfig(ctx) {
    const config = strapi.config.get("plugin::auto-translate");
    console.log("Plugin config:", config); // Debug log

    // Don't expose the API key
    const { googleApiKey, ...safeConfig } = config;

    return ctx.send({
      data: {
        ...safeConfig,
        hasApiKey: !!googleApiKey,
      },
    });
  },

  /**
   * Get available locales from i18n
   */
  async getLocales(ctx) {
    try {
      const translationService = strapi
        .plugin("auto-translate")
        .service("translation");

      const locales = await translationService.getAvailableLocales();

      // Get detailed locale information if possible
      let detailedLocales = [];
      try {
        const i18nLocales = await strapi
          .plugin("i18n")
          .service("locales")
          .find();
        detailedLocales = i18nLocales.map((locale) => ({
          code: locale.code,
          name: locale.name,
          isDefault: locale.isDefault || false,
        }));
      } catch (e) {
        // Fallback to simple locale list
        detailedLocales = locales.map((code) => ({
          code,
          name: code.toUpperCase(),
          isDefault: code === "en",
        }));
      }

      return ctx.send({
        data: detailedLocales.filter((locale) => !locale.isDefault), // Exclude default locale (source)
      });
    } catch (error) {
      strapi.log.error("Error fetching locales:", error);
      return ctx.badRequest("Failed to fetch locales: " + error.message);
    }
  },

  /**
   * Translate all published content and create new locale entries
   */
  async translateAllPublished(ctx) {
    const { targetLanguage, sourceLanguage = "en" } = ctx.request.body;

    if (!targetLanguage) {
      return ctx.badRequest("Missing required parameter: targetLanguage");
    }

    try {
      const translationService = strapi
        .plugin("auto-translate")
        .service("translation");

      // Run the translation process synchronously
      const results = await translationService.translateAllPublishedContent(
        targetLanguage,
        sourceLanguage
      );

      return ctx.send({
        message: `Translation completed: ${results.success} entries translated successfully, ${results.failed} failed, ${results.skipped} skipped`,
        data: results,
      });
    } catch (error) {
      strapi.log.error("Error during bulk translation:", error);
      return ctx.badRequest("Bulk translation failed: " + error.message);
    }
  },

  /**
   * Fix localization issues for a specific entry
   */
  async fixLocalizationIssues(ctx) {
    const { contentType, entryId } = ctx.request.body;

    if (!contentType || !entryId) {
      return ctx.badRequest(
        "Missing required parameters: contentType, entryId"
      );
    }

    try {
      await strapi
        .plugin("auto-translate")
        .service("translation")
        .fixLocalizationIssues(contentType, entryId);

      return ctx.send({
        message: `Localization issues fixed for ${contentType} ID ${entryId}`,
      });
    } catch (error) {
      strapi.log.error("Error fixing localization issues:", error);
      return ctx.badRequest(
        "Failed to fix localization issues: " + error.message
      );
    }
  },
});
